// Gamification API Routes (Pets, Game State, Shop, Leaderboard)

import { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';
import { mapPetData, mapShopItem, parseBody } from '../utils/helpers';

export async function handleGamificationRoutes(request: Request, env: Env, path: string, method: string): Promise<Response> {
    const db = env.DB;
    const url = new URL(request.url);

    // GET /api/pets?username=X
    if (path === '/api/pets' && method === 'GET') {
        const username = url.searchParams.get('username');
        if (!username) return errorResponse('Missing username parameter');

        let pet = await db.prepare('SELECT * FROM user_pets WHERE username = ?').bind(username).first<any>();
        if (!pet) {
            // Create default pet
            const petId = url.searchParams.get('petId') || 'cat_01';
            const petName = url.searchParams.get('petName') || 'Mèo Con';
            await db.prepare(
                'INSERT INTO user_pets (username, pet_id, pet_name, level, exp, exp_to_next, mood, items, last_active) VALUES (?, ?, ?, 1, 0, 100, ?, ?, ?)'
            ).bind(username, petId, petName, 'happy', '[]', new Date().toISOString()).run();
            pet = { pet_id: petId, pet_name: petName, level: 1, exp: 0, exp_to_next: 100, mood: 'happy', items: '[]', last_active: new Date().toISOString(), image_url: '' };
        }

        const stu = await db.prepare('SELECT coins FROM students WHERE username = ?').bind(username).first<any>();
        const shopItems = await db.prepare('SELECT * FROM shop_items').all();

        return jsonResponse({
            status: 'success',
            data: {
                pet: mapPetData(pet),
                coins: stu ? Number(stu.coins) || 0 : 0,
                shopItems: shopItems.results.map(mapShopItem),
            },
        });
    }

    // GET /api/game-state?username=X (alias for get pet data via POST body)
    // POST /api/game-state - Update game state (add exp + coins)
    if (path === '/api/game-state' || path.startsWith('/api/game-state')) {
        if (method === 'POST') {
            const body = await parseBody(request);
            if (!body) return errorResponse('Invalid JSON body');
            if (!body.username) return errorResponse('Missing username');

            const addExp = Number(body.addExp) || 0;
            const addCoins = Number(body.addCoins) || 0;

            // Update coins
            await db.prepare('UPDATE students SET coins = coins + ? WHERE username = ?').bind(addCoins, body.username).run();
            const updatedStu = await db.prepare('SELECT coins FROM students WHERE username = ?').bind(body.username).first<any>();

            // Update pet EXP
            let petRow = await db.prepare('SELECT * FROM user_pets WHERE username = ?').bind(body.username).first<any>();
            if (!petRow) {
                await db.prepare(
                    'INSERT INTO user_pets (username, pet_id, pet_name, level, exp, exp_to_next, mood, items, last_active) VALUES (?, ?, ?, 1, 0, 100, ?, ?, ?)'
                ).bind(body.username, 'cat_01', 'Mèo Con', 'happy', '[]', new Date().toISOString()).run();
                return jsonResponse({
                    status: 'success',
                    data: { newLevel: 1, newExp: addExp, newCoins: updatedStu?.coins || 0, leveledUp: false, mood: 'excited' },
                });
            }

            let newExp = Number(petRow.exp) + addExp;
            let newLevel = Number(petRow.level);
            let leveledUp = false;
            let newExpToNext = Number(petRow.exp_to_next) || 100;

            while (newExp >= newExpToNext) {
                newExp -= newExpToNext;
                newLevel++;
                leveledUp = true;
                newExpToNext = 100 + (newLevel - 1) * 20;
            }

            await db.prepare('UPDATE user_pets SET level = ?, exp = ?, exp_to_next = ?, mood = ?, last_active = ? WHERE username = ?')
                .bind(newLevel, newExp, newExpToNext, 'excited', new Date().toISOString(), body.username).run();

            return jsonResponse({
                status: 'success',
                data: { newLevel, newExp, newExpToNext, newCoins: updatedStu?.coins || 0, leveledUp, mood: 'excited' },
            });
        }
    }

    // POST /api/shop/buy
    if (path === '/api/shop/buy' && method === 'POST') {
        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');
        if (!body.username || !body.itemId) return errorResponse('Missing username or itemId');

        const item = await db.prepare('SELECT * FROM shop_items WHERE item_id = ?').bind(body.itemId).first<any>();
        if (!item) return jsonResponse({ status: 'error', message: 'Item not found' });

        const stu = await db.prepare('SELECT coins FROM students WHERE username = ?').bind(body.username).first<any>();
        if (!stu) return jsonResponse({ status: 'error', message: 'Student not found' });

        const currentCoins = Number(stu.coins) || 0;
        const price = Number(item.price) || 0;
        if (currentCoins < price) {
            return jsonResponse({ status: 'error', message: `Không đủ vàng! Cần ${price} nhưng chỉ có ${currentCoins}` });
        }

        // Check already owns
        const petForBuy = await db.prepare('SELECT items FROM user_pets WHERE username = ?').bind(body.username).first<any>();
        let currentItems: string[] = [];
        try { currentItems = JSON.parse(petForBuy?.items || '[]'); } catch { currentItems = []; }

        if (currentItems.includes(body.itemId)) {
            return jsonResponse({ status: 'error', message: 'Bé đã có món đồ này rồi!' });
        }

        // Deduct coins and add item
        await db.prepare('UPDATE students SET coins = coins - ? WHERE username = ?').bind(price, body.username).run();
        currentItems.push(body.itemId);
        await db.prepare('UPDATE user_pets SET items = ? WHERE username = ?').bind(JSON.stringify(currentItems), body.username).run();

        return jsonResponse({
            status: 'success',
            data: { newCoins: currentCoins - price, items: currentItems, purchasedItem: { itemId: body.itemId, name: item.name, price } },
        });
    }

    // GET /api/leaderboard
    if (path === '/api/leaderboard' && method === 'GET') {
        const pets = await db.prepare(`
            SELECT p.*, s.full_name, s.avatar
            FROM user_pets p
            LEFT JOIN students s ON p.username = s.username
            ORDER BY p.level DESC, p.exp DESC
            LIMIT 10
        `).all();

        const leaderboard = pets.results.map((p: any) => ({
            username: p.username, fullName: p.full_name || p.username,
            petId: p.pet_id, petName: p.pet_name,
            level: Number(p.level) || 1, exp: Number(p.exp) || 0,
            avatar: p.avatar || '',
        }));
        return jsonResponse({ status: 'success', data: leaderboard });
    }

    return errorResponse('Not found: ' + path, 404);
}
