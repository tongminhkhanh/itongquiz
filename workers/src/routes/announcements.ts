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
        const row = await db.prepare('SELECT * FROM announcements WHERE id = ?').bind('1').first<{
            id: string;
            content: string;
            is_active: string;
            updated_at: string;
            banner_title: string;
            banner_subtitle: string;
            banner_link: string;
            banner_image: string;
            is_banner_active: string;
            days_to_live: number;
        }>();
        if (!row) {
            return jsonResponse({ status: 'success', announcement: null });
        }
        return jsonResponse({
            status: 'success',
            announcement: {
                id: row.id,
                content: row.content || '',
                isActive: row.is_active === 'true' || row.is_active === 'TRUE',
                updatedAt: row.updated_at,
                bannerTitle: row.banner_title || '',
                bannerSubtitle: row.banner_subtitle || '',
                bannerLink: row.banner_link || '',
                bannerImage: row.banner_image || '',
                isBannerActive: row.is_banner_active === 'true' || row.is_banner_active === 'TRUE',
                daysToLive: Number(row.days_to_live || 7),
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
                `UPDATE announcements SET 
                    content = ?, is_active = ?, updated_at = ?,
                    banner_title = ?, banner_subtitle = ?, banner_link = ?, 
                    banner_image = ?, is_banner_active = ?, days_to_live = ?
                 WHERE id = ?`
            ).bind(
                body.content || '',
                body.isActive ? 'true' : 'false',
                new Date().toISOString(),
                body.bannerTitle || '',
                body.bannerSubtitle || '',
                body.bannerLink || '',
                body.bannerImage || '',
                body.isBannerActive ? 'true' : 'false',
                body.daysToLive || 7,
                '1'
            ).run();
        } else {
            await db.prepare(
                `INSERT INTO announcements (
                    id, content, is_active, updated_at,
                    banner_title, banner_subtitle, banner_link, 
                    banner_image, is_banner_active, days_to_live
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
                '1',
                body.content || '',
                body.isActive ? 'true' : 'false',
                new Date().toISOString(),
                body.bannerTitle || '',
                body.bannerSubtitle || '',
                body.bannerLink || '',
                body.bannerImage || '',
                body.isBannerActive ? 'true' : 'false',
                body.daysToLive || 7
            ).run();
        }
        return jsonResponse({ status: 'success', message: 'Announcement saved successfully' });
    }

    return errorResponse('Not found: ' + path, 404);
}
