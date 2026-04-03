import { Env } from '../types';
import { errorResponse, generateId, jsonResponse } from '../utils/response';
import { extractIdFromPath, parseBody } from '../utils/helpers';

type GiftOrderStatus = 'CREATED' | 'VOUCHER_ISSUED' | 'DELIVERED' | 'CANCELLED_REFUNDED';

interface GiftOrderRow {
    id: string;
    student_id: string;
    class_id: string;
    item_snapshot: string;
    price_coins: number;
    status: GiftOrderStatus;
    voucher_code: string;
    delivered_by?: string;
    delivered_at?: string;
    cancel_reason?: string;
    created_at: string;
    updated_at: string;
    student_name?: string;
    student_username?: string;
    class_name?: string;
}

const nowIso = () => new Date().toISOString();

const toBool = (value: unknown): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        return normalized === 'true' || normalized === '1';
    }
    return false;
};

const normalizeStatus = (value: unknown): GiftOrderStatus | 'ALL' | null => {
    const raw = String(value || '').trim().toUpperCase();
    if (!raw) return null;
    if (raw === 'ALL') return 'ALL';
    if (raw === 'CREATED') return 'CREATED';
    if (raw === 'VOUCHER_ISSUED') return 'VOUCHER_ISSUED';
    if (raw === 'DELIVERED') return 'DELIVERED';
    if (raw === 'CANCELLED_REFUNDED') return 'CANCELLED_REFUNDED';
    return null;
};

const parseJson = <T>(raw: unknown, fallback: T): T => {
    if (typeof raw !== 'string' || !raw.trim()) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
};

const mapCatalogItem = (row: any) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    priceCoins: Number(row.price_coins) || 0,
    imageUrl: row.image_url || '',
    isActive: Number(row.is_active) === 1,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
});

const mapOrder = (row: GiftOrderRow) => ({
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name || '',
    studentUsername: row.student_username || '',
    classId: row.class_id,
    className: row.class_name || '',
    itemSnapshot: parseJson(row.item_snapshot, {}),
    priceCoins: Number(row.price_coins) || 0,
    status: row.status,
    voucherCode: row.voucher_code,
    deliveredBy: row.delivered_by || undefined,
    deliveredAt: row.delivered_at || undefined,
    cancelReason: row.cancel_reason || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

const mapEvent = (row: any) => ({
    id: row.id,
    type: row.event_type,
    orderId: row.order_id || undefined,
    studentId: row.student_id || undefined,
    actor: row.actor || undefined,
    createdAt: row.created_at || '',
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
});

const appendEvent = async (
    db: D1Database,
    event: {
        type: string;
        orderId?: string;
        studentId?: string;
        actor?: string;
        metadata?: Record<string, unknown>;
    }
) => {
    await db.prepare(
        'INSERT INTO gift_order_events (id, event_type, order_id, student_id, actor, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
        generateId('gevo'),
        event.type,
        event.orderId || '',
        event.studentId || '',
        event.actor || '',
        JSON.stringify(event.metadata || {}),
        nowIso()
    ).run();
};

const getCoinsByStudentId = async (db: D1Database, studentId: string): Promise<number> => {
    const student = await db.prepare('SELECT coins FROM students WHERE id = ?').bind(studentId).first<any>();
    return Number(student?.coins) || 0;
};

const getOrderById = async (db: D1Database, orderId: string): Promise<GiftOrderRow | null> => {
    return await db.prepare(`
        SELECT
            o.*,
            s.full_name AS student_name,
            s.username AS student_username,
            c.name AS class_name
        FROM gift_orders o
        LEFT JOIN students s ON s.id = o.student_id
        LEFT JOIN classes c ON c.id = o.class_id
        WHERE o.id = ?
    `).bind(orderId).first<GiftOrderRow>();
};

const resolveActorAccess = async (
    db: D1Database,
    actorUsername: string
): Promise<{ isAdmin: boolean; teacherClass: string }> => {
    const username = String(actorUsername || '').trim();
    if (!username) {
        return { isAdmin: false, teacherClass: '' };
    }

    const teacher = await db.prepare(`
        SELECT role, class
        FROM teachers
        WHERE username = ?
        LIMIT 1
    `).bind(username).first<any>();

    if (!teacher) {
        return { isAdmin: false, teacherClass: '' };
    }

    const isAdmin = String(teacher.role || '').trim().toLowerCase() === 'admin';
    const teacherClass = String(teacher.class || '').trim();
    return { isAdmin, teacherClass };
};

const ensureCanManageOrder = (order: GiftOrderRow, actorIsAdmin: boolean, actorTeacherClass: string) => {
    if (actorIsAdmin) return;
    if (!actorTeacherClass || actorTeacherClass !== order.class_id) {
        throw new Error('Ban khong co quyen xu ly don cua lop nay.');
    }
};

const generateVoucherCode = () => {
    const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
    const suffix = Date.now().toString().slice(-4);
    return `VCH-${randomPart}-${suffix}`;
};

const ensureCatalogSeed = async (db: D1Database) => {
    const countRow = await db.prepare('SELECT COUNT(*) AS cnt FROM gift_catalog_items').first<{ cnt: number }>();
    const count = Number(countRow?.cnt) || 0;
    if (count > 0) return;

    const now = nowIso();
    await db.batch([
        db.prepare('INSERT INTO gift_catalog_items (id, name, category, price_coins, image_url, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)')
            .bind('gift_snack_01', 'Sua chua', 'SNACK', 120, 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Cup%20with%20straw/3D/cup_with_straw_3d.png', now, now),
        db.prepare('INSERT INTO gift_catalog_items (id, name, category, price_coins, image_url, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)')
            .bind('gift_supply_01', 'But chi HB', 'SUPPLY', 180, 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Pencil/3D/pencil_3d.png', now, now),
        db.prepare('INSERT INTO gift_catalog_items (id, name, category, price_coins, image_url, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)')
            .bind('gift_privilege_01', 'Doi cho ngoi 1 buoi', 'PRIVILEGE', 400, 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Crown/3D/crown_3d.png', now, now),
    ]);
};

export async function handleGiftShopRoutes(request: Request, env: Env, path: string, method: string): Promise<Response> {
    const db = env.DB;
    const url = new URL(request.url);

    if (path === '/api/gift-shop/catalog' && method === 'GET') {
        await ensureCatalogSeed(db);
        const rows = await db.prepare(`
            SELECT *
            FROM gift_catalog_items
            WHERE is_active = 1
            ORDER BY category ASC, name ASC
        `).all();
        return jsonResponse((rows.results || []).map(mapCatalogItem));
    }

    if (path === '/api/gift-shop/catalog' && method === 'POST') {
        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');
        if (!toBool(body.actorIsAdmin)) return errorResponse('Forbidden', 403);

        const name = String(body.name || '').trim();
        const category = String(body.category || '').trim().toUpperCase();
        const imageUrl = String(body.imageUrl || '').trim();
        const priceCoins = Math.max(0, Math.floor(Number(body.priceCoins) || 0));
        const isActive = toBool(body.isActive ?? true) ? 1 : 0;

        if (!name || !category || !imageUrl || priceCoins <= 0) {
            return errorResponse('Invalid catalog payload');
        }

        const id = String(body.id || generateId('gift')).trim();
        const now = nowIso();

        await db.prepare(`
            INSERT INTO gift_catalog_items (id, name, category, price_coins, image_url, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(id, name, category, priceCoins, imageUrl, isActive, now, now).run();

        await appendEvent(db, {
            type: 'CATALOG_CREATED',
            metadata: { itemId: id, priceCoins },
        });

        const item = await db.prepare('SELECT * FROM gift_catalog_items WHERE id = ?').bind(id).first<any>();
        if (!item) return errorResponse('Failed to create catalog item', 500);
        return jsonResponse(mapCatalogItem(item));
    }

    if (path.startsWith('/api/gift-shop/catalog/') && method === 'PUT') {
        const itemId = extractIdFromPath(path, '/api/gift-shop/catalog');
        if (!itemId) return errorResponse('Missing catalog item ID');

        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');
        if (!toBool(body.actorIsAdmin)) return errorResponse('Forbidden', 403);

        const name = String(body.name || '').trim();
        const category = String(body.category || '').trim().toUpperCase();
        const imageUrl = String(body.imageUrl || '').trim();
        const priceCoins = Math.max(0, Math.floor(Number(body.priceCoins) || 0));
        const isActive = toBool(body.isActive ?? true) ? 1 : 0;

        if (!name || !category || !imageUrl || priceCoins <= 0) {
            return errorResponse('Invalid catalog payload');
        }

        const now = nowIso();
        await db.prepare(`
            UPDATE gift_catalog_items
            SET name = ?, category = ?, price_coins = ?, image_url = ?, is_active = ?, updated_at = ?
            WHERE id = ?
        `).bind(name, category, priceCoins, imageUrl, isActive, now, itemId).run();

        await appendEvent(db, {
            type: 'CATALOG_UPDATED',
            metadata: { itemId, priceCoins },
        });

        const item = await db.prepare('SELECT * FROM gift_catalog_items WHERE id = ?').bind(itemId).first<any>();
        if (!item) return errorResponse('Catalog item not found', 404);
        return jsonResponse(mapCatalogItem(item));
    }

    if (path.startsWith('/api/gift-shop/catalog/') && method === 'DELETE') {
        const itemId = extractIdFromPath(path, '/api/gift-shop/catalog');
        if (!itemId) return errorResponse('Missing catalog item ID');

        const actorIsAdmin = toBool(url.searchParams.get('actorIsAdmin'));
        if (!actorIsAdmin) return errorResponse('Forbidden', 403);
        const actorUsername = String(url.searchParams.get('actorUsername') || '').trim() || 'admin';

        const existingItem = await db.prepare('SELECT * FROM gift_catalog_items WHERE id = ?').bind(itemId).first<any>();
        if (!existingItem) return errorResponse('Catalog item not found', 404);

        const now = nowIso();
        await db.prepare(`
            UPDATE gift_catalog_items
            SET is_active = 0, updated_at = ?
            WHERE id = ?
        `).bind(now, itemId).run();

        await appendEvent(db, {
            type: 'CATALOG_DELETED',
            actor: actorUsername,
            metadata: { itemId },
        });

        const item = await db.prepare('SELECT * FROM gift_catalog_items WHERE id = ?').bind(itemId).first<any>();
        if (!item) return errorResponse('Catalog item not found', 404);
        return jsonResponse(mapCatalogItem(item));
    }

    if (path === '/api/gift-shop/orders' && method === 'GET') {
        const studentId = String(url.searchParams.get('studentId') || '').trim();
        const classId = String(url.searchParams.get('classId') || '').trim();
        const actorUsername = String(url.searchParams.get('actorUsername') || '').trim();
        const actorAccess = await resolveActorAccess(
            db,
            actorUsername
        );
        const status = normalizeStatus(url.searchParams.get('status'));
        const hasStudentScope = Boolean(studentId);
        const hasStaffScope = actorAccess.isAdmin || Boolean(actorAccess.teacherClass);

        // Allow student self-history requests (studentId only), while preserving teacher/admin rules.
        if (!hasStudentScope && !hasStaffScope) {
            return errorResponse('Teacher class assignment not found', 403);
        }

        if (!actorAccess.isAdmin && actorAccess.teacherClass && classId && classId !== actorAccess.teacherClass) {
            return errorResponse('Forbidden', 403);
        }

        const effectiveClassId = actorAccess.isAdmin
            ? classId
            : (actorAccess.teacherClass || '');
        const conditions: string[] = [];
        const params: unknown[] = [];

        if (studentId) {
            conditions.push('o.student_id = ?');
            params.push(studentId);
        }
        if (effectiveClassId) {
            conditions.push('o.class_id = ?');
            params.push(effectiveClassId);
        }
        if (status && status !== 'ALL') {
            conditions.push('o.status = ?');
            params.push(status);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const query = `
            SELECT
                o.*,
                s.full_name AS student_name,
                s.username AS student_username,
                c.name AS class_name
            FROM gift_orders o
            LEFT JOIN students s ON s.id = o.student_id
            LEFT JOIN classes c ON c.id = o.class_id
            ${whereClause}
            ORDER BY datetime(o.updated_at) DESC
        `;

        let stmt = db.prepare(query);
        if (params.length > 0) {
            stmt = stmt.bind(...params);
        }
        const rows = await stmt.all<GiftOrderRow>();
        return jsonResponse((rows.results || []).map(mapOrder));
    }

    if (path === '/api/gift-shop/purchase' && method === 'POST') {
        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        const studentId = String(body.studentId || '').trim();
        const itemId = String(body.itemId || '').trim();
        const idempotencyKey = String(body.idempotencyKey || '').trim();
        if (!studentId || !itemId || !idempotencyKey) {
            return errorResponse('Missing studentId, itemId, or idempotencyKey');
        }

        const existingOrder = await db.prepare(`
            SELECT
                o.*,
                s.full_name AS student_name,
                s.username AS student_username,
                c.name AS class_name
            FROM gift_orders o
            LEFT JOIN students s ON s.id = o.student_id
            LEFT JOIN classes c ON c.id = o.class_id
            WHERE o.idempotency_key = ? AND o.student_id = ?
            LIMIT 1
        `).bind(idempotencyKey, studentId).first<GiftOrderRow>();

        if (existingOrder) {
            const coins = await getCoinsByStudentId(db, studentId);
            return jsonResponse({
                orderId: existingOrder.id,
                voucherCode: existingOrder.voucher_code,
                newCoins: coins,
                status: existingOrder.status,
                idempotencyReplay: true,
                order: mapOrder(existingOrder),
            });
        }

        const item = await db.prepare(`
            SELECT *
            FROM gift_catalog_items
            WHERE id = ? AND is_active = 1
            LIMIT 1
        `).bind(itemId).first<any>();
        if (!item) return errorResponse('Gift item not found', 404);

        const student = await db.prepare(`
            SELECT id, full_name, username, class_id, coins
            FROM students
            WHERE id = ?
            LIMIT 1
        `).bind(studentId).first<any>();
        if (!student) return errorResponse('Student not found', 404);

        const currentCoins = Number(student.coins) || 0;
        const priceCoins = Number(item.price_coins) || 0;
        if (currentCoins < priceCoins) {
            return errorResponse('Insufficient coins', 400);
        }

        const orderId = generateId('gord');
        const voucherCode = generateVoucherCode();
        const now = nowIso();
        const itemSnapshot = {
            id: item.id,
            name: item.name,
            category: item.category,
            priceCoins,
            imageUrl: item.image_url || '',
            isActive: Number(item.is_active) === 1,
            createdAt: item.created_at || now,
            updatedAt: item.updated_at || now,
        };

        try {
            await db.batch([
                db.prepare('UPDATE students SET coins = coins - ? WHERE id = ?')
                    .bind(priceCoins, studentId),
                db.prepare(`
                    INSERT INTO gift_orders
                    (id, idempotency_key, student_id, class_id, item_snapshot, price_coins, status, voucher_code, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'VOUCHER_ISSUED', ?, ?, ?)
                `).bind(orderId, idempotencyKey, studentId, student.class_id, JSON.stringify(itemSnapshot), priceCoins, voucherCode, now, now),
                db.prepare(`
                    INSERT INTO gift_vouchers (code, order_id, student_id, issued_at, status)
                    VALUES (?, ?, ?, ?, 'ISSUED')
                `).bind(voucherCode, orderId, studentId, now),
                db.prepare(`
                    INSERT INTO gift_wallet_ledger (id, student_id, delta_coins, reason, ref_order_id, created_at)
                    VALUES (?, ?, ?, 'PURCHASE', ?, ?)
                `).bind(generateId('gled'), studentId, -priceCoins, orderId, now),
                db.prepare(`
                    INSERT INTO gift_order_events (id, event_type, order_id, student_id, actor, metadata, created_at)
                    VALUES (?, 'ORDER_CREATED', ?, ?, ?, ?, ?)
                `).bind(generateId('gevo'), orderId, studentId, student.username || '', JSON.stringify({ itemId, priceCoins }), now),
                db.prepare(`
                    INSERT INTO gift_order_events (id, event_type, order_id, student_id, actor, metadata, created_at)
                    VALUES (?, 'VOUCHER_ISSUED', ?, ?, ?, ?, ?)
                `).bind(generateId('gevo'), orderId, studentId, student.username || '', JSON.stringify({ voucherCode }), now),
            ]);
        } catch (error: any) {
            const errorText = String(error?.message || '');
            if (errorText.includes('gift_orders.idempotency_key')) {
                const replayOrder = await db.prepare(`
                    SELECT
                        o.*,
                        s.full_name AS student_name,
                        s.username AS student_username,
                        c.name AS class_name
                    FROM gift_orders o
                    LEFT JOIN students s ON s.id = o.student_id
                    LEFT JOIN classes c ON c.id = o.class_id
                    WHERE o.idempotency_key = ? AND o.student_id = ?
                    LIMIT 1
                `).bind(idempotencyKey, studentId).first<GiftOrderRow>();

                if (!replayOrder) throw error;

                const coins = await getCoinsByStudentId(db, studentId);
                return jsonResponse({
                    orderId: replayOrder.id,
                    voucherCode: replayOrder.voucher_code,
                    newCoins: coins,
                    status: replayOrder.status,
                    idempotencyReplay: true,
                    order: mapOrder(replayOrder),
                });
            }
            throw error;
        }

        const createdOrder = await getOrderById(db, orderId);
        if (!createdOrder) return errorResponse('Failed to create order', 500);
        const newCoins = await getCoinsByStudentId(db, studentId);

        return jsonResponse({
            orderId,
            voucherCode,
            newCoins,
            status: createdOrder.status,
            idempotencyReplay: false,
            order: mapOrder(createdOrder),
        });
    }

    if (path.match(/^\/api\/gift-shop\/orders\/[^/]+\/deliver$/) && method === 'PATCH') {
        const orderId = extractIdFromPath(path, '/api/gift-shop/orders');
        if (!orderId) return errorResponse('Missing order ID');

        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        const actorUsername = String(body.username || '').trim() || 'system';
        const actorAccess = await resolveActorAccess(
            db,
            actorUsername
        );

        const order = await getOrderById(db, orderId);
        if (!order) return errorResponse('Order not found', 404);

        try {
            ensureCanManageOrder(order, actorAccess.isAdmin, actorAccess.teacherClass);
        } catch (error: any) {
            return errorResponse(error.message || 'Forbidden', 403);
        }

        if (order.status !== 'VOUCHER_ISSUED') {
            return errorResponse('Order is not in a deliverable state', 400);
        }

        const now = nowIso();
        await db.batch([
            db.prepare(`
                UPDATE gift_orders
                SET status = 'DELIVERED', delivered_by = ?, delivered_at = ?, updated_at = ?
                WHERE id = ?
            `).bind(actorUsername, now, now, orderId),
            db.prepare(`
                UPDATE gift_vouchers
                SET status = 'USED'
                WHERE order_id = ?
            `).bind(orderId),
            db.prepare(`
                INSERT INTO gift_order_events (id, event_type, order_id, student_id, actor, metadata, created_at)
                VALUES (?, 'ORDER_DELIVERED', ?, ?, ?, ?, ?)
            `).bind(generateId('gevo'), orderId, order.student_id, actorUsername, '{}', now),
        ]);

        const delivered = await getOrderById(db, orderId);
        if (!delivered) return errorResponse('Order not found after update', 500);
        return jsonResponse(mapOrder(delivered));
    }

    if (path.match(/^\/api\/gift-shop\/orders\/[^/]+\/cancel$/) && method === 'PATCH') {
        const orderId = extractIdFromPath(path, '/api/gift-shop/orders');
        if (!orderId) return errorResponse('Missing order ID');

        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        const reason = String(body.reason || '').trim() || 'Cancelled by staff';
        const actorUsername = String(body.username || '').trim() || 'system';
        const actorAccess = await resolveActorAccess(
            db,
            actorUsername
        );

        const order = await getOrderById(db, orderId);
        if (!order) return errorResponse('Order not found', 404);

        try {
            ensureCanManageOrder(order, actorAccess.isAdmin, actorAccess.teacherClass);
        } catch (error: any) {
            return errorResponse(error.message || 'Forbidden', 403);
        }

        if (order.status === 'DELIVERED') {
            return errorResponse('Delivered order cannot be cancelled', 400);
        }
        if (order.status === 'CANCELLED_REFUNDED') {
            return errorResponse('Order has already been cancelled', 400);
        }

        const now = nowIso();
        const refundAmount = Number(order.price_coins) || 0;
        await db.batch([
            db.prepare('UPDATE students SET coins = coins + ? WHERE id = ?')
                .bind(refundAmount, order.student_id),
            db.prepare(`
                UPDATE gift_orders
                SET status = 'CANCELLED_REFUNDED', cancel_reason = ?, delivered_by = ?, delivered_at = ?, updated_at = ?
                WHERE id = ?
            `).bind(reason, actorUsername, now, now, orderId),
            db.prepare(`
                UPDATE gift_vouchers
                SET status = 'CANCELLED'
                WHERE order_id = ?
            `).bind(orderId),
            db.prepare(`
                INSERT INTO gift_wallet_ledger (id, student_id, delta_coins, reason, ref_order_id, created_at)
                VALUES (?, ?, ?, 'REFUND', ?, ?)
            `).bind(generateId('gled'), order.student_id, refundAmount, orderId, now),
            db.prepare(`
                INSERT INTO gift_order_events (id, event_type, order_id, student_id, actor, metadata, created_at)
                VALUES (?, 'ORDER_CANCELLED', ?, ?, ?, ?, ?)
            `).bind(generateId('gevo'), orderId, order.student_id, actorUsername, JSON.stringify({ reason }), now),
            db.prepare(`
                INSERT INTO gift_order_events (id, event_type, order_id, student_id, actor, metadata, created_at)
                VALUES (?, 'WALLET_REFUNDED', ?, ?, ?, ?, ?)
            `).bind(generateId('gevo'), orderId, order.student_id, actorUsername, JSON.stringify({ amount: refundAmount }), now),
        ]);

        const cancelled = await getOrderById(db, orderId);
        if (!cancelled) return errorResponse('Order not found after cancel', 500);
        const newCoins = await getCoinsByStudentId(db, order.student_id);

        return jsonResponse({
            order: mapOrder(cancelled),
            newCoins,
        });
    }

    if (path === '/api/gift-shop/events' && method === 'GET') {
        const rows = await db.prepare(`
            SELECT *
            FROM gift_order_events
            ORDER BY datetime(created_at) DESC
            LIMIT 200
        `).all();
        return jsonResponse((rows.results || []).map(mapEvent));
    }

    return errorResponse('Not found: ' + path, 404);
}
