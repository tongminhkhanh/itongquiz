// Announcements API Routes
// GET /api/announcements - Get current announcement
// POST /api/announcements - Save/update announcement

import { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';
import { parseBody } from '../utils/helpers';

export async function handleAnnouncementRoutes(request: Request, env: Env, path: string, method: string): Promise<Response> {
    const db = env.DB;

    // GET /api/announcements
    if (path === '/api/announcements' && method === 'GET') {
        const row = await db.prepare('SELECT * FROM announcements WHERE id = ?').bind('1').first();
        if (!row) {
            return jsonResponse({ status: 'success', announcement: null });
        }
        return jsonResponse({
            status: 'success',
            announcement: {
                id: (row as any).id,
                content: (row as any).content || '',
                isActive: (row as any).is_active === 'true' || (row as any).is_active === 'TRUE',
                updatedAt: (row as any).updated_at,
            },
        });
    }

    // POST /api/announcements
    if (path === '/api/announcements' && method === 'POST') {
        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        const existing = await db.prepare('SELECT id FROM announcements WHERE id = ?').bind('1').first();
        if (existing) {
            await db.prepare(
                `UPDATE announcements SET content = ?, is_active = ?, updated_at = ? WHERE id = ?`
            ).bind(body.content || '', body.isActive ? 'true' : 'false', new Date().toISOString(), '1').run();
        } else {
            await db.prepare(
                `INSERT INTO announcements (id, content, is_active, updated_at) VALUES (?, ?, ?, ?)`
            ).bind('1', body.content || '', body.isActive ? 'true' : 'false', new Date().toISOString()).run();
        }
        return jsonResponse({ status: 'success', message: 'Announcement saved successfully' });
    }

    return errorResponse('Not found: ' + path, 404);
}
