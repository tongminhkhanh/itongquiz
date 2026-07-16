import { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';
import { parseBody } from '../utils/helpers';
import { withD1Retry } from '../utils/d1';
import { requireAdmin, verifyJWTMiddleware } from '../middleware/jwtAuth';
import { auditStatement } from '../utils/audit';
import { extractJWTFromRequest } from '../utils/jwt';

type AnnouncementStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'EXPIRED' | 'ARCHIVED';
type AnnouncementAudience = 'ALL' | 'TEACHERS' | 'STUDENTS';

type AnnouncementRow = {
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
    status: AnnouncementStatus;
    audience: AnnouncementAudience;
    starts_at: string | null;
    ends_at: string | null;
    created_by: string | null;
    updated_by: string | null;
    created_at: string | null;
};

function requestId(request: Request): string {
    return request.headers.get('cf-ray') || request.headers.get('x-request-id') || crypto.randomUUID();
}

function mapAnnouncement(row: AnnouncementRow) {
    const now = Date.now();
    const starts = row.starts_at ? Date.parse(row.starts_at) : null;
    const ends = row.ends_at ? Date.parse(row.ends_at) : null;
    const effectiveStatus: AnnouncementStatus = row.status !== 'ARCHIVED' && ends !== null && ends <= now
        ? 'EXPIRED'
        : row.status;
    return {
        id: row.id,
        content: row.content || '',
        isActive: row.is_active === 'true' || row.is_active === 'TRUE',
        updatedAt: row.updated_at,
        bannerTitle: row.banner_title || '',
        bannerSubtitle: row.banner_subtitle || '',
        bannerLink: row.banner_link || '',
        bannerImage: row.banner_image || '',
        isBannerActive: row.is_banner_active === 'true' || row.is_banner_active === 'TRUE',
        daysToLive: Number(row.days_to_live ?? 7),
        status: row.status,
        effectiveStatus,
        audience: row.audience,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        createdAt: row.created_at,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
        isCurrentlyVisible: ['PUBLISHED', 'SCHEDULED'].includes(row.status)
            && (starts === null || starts <= now)
            && (ends === null || ends > now),
    };
}

function safeLink(value: unknown): string | null {
    if (value === undefined || value === null || value === '') return '';
    if (typeof value !== 'string' || value.length > 2048) return null;
    if (value.startsWith('/') && !value.startsWith('//')) return value;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' ? url.toString() : null;
    } catch {
        return null;
    }
}

function safeImage(value: unknown, request: Request, env: Env): string | null {
    const link = safeLink(value);
    if (link === null || link === '' || link.startsWith('/')) return link;
    const allowed = new Set<string>([new URL(request.url).host]);
    if (env.R2_PUBLIC_URL) {
        try { allowed.add(new URL(env.R2_PUBLIC_URL).host); } catch { /* ignored */ }
    }
    for (const host of (env.ANNOUNCEMENT_IMAGE_HOSTS || '').split(',').map((item) => item.trim()).filter(Boolean)) {
        allowed.add(host);
    }
    return allowed.has(new URL(link).host) ? link : null;
}

function validateBody(body: Record<string, any>, request: Request, env: Env): { value?: any; error?: Response } {
    const title = typeof body.bannerTitle === 'string' ? body.bannerTitle.trim() : '';
    const subtitle = typeof body.bannerSubtitle === 'string' ? body.bannerSubtitle.trim() : '';
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (title.length > 160 || subtitle.length > 300 || content.length > 1000) {
        return { error: errorResponse('Nội dung thông báo vượt quá độ dài cho phép.', 400) };
    }
    const link = safeLink(body.bannerLink);
    const image = safeImage(body.bannerImage, request, env);
    if (link === null) return { error: errorResponse('Liên kết chỉ được dùng HTTPS hoặc đường dẫn nội bộ.', 400) };
    if (image === null) return { error: errorResponse('Ảnh thông báo không thuộc host media được phép.', 400) };
    const audience: AnnouncementAudience = ['ALL', 'TEACHERS', 'STUDENTS'].includes(body.audience)
        ? body.audience : 'ALL';
    const status: AnnouncementStatus = ['DRAFT', 'SCHEDULED', 'PUBLISHED'].includes(body.status)
        ? body.status : 'DRAFT';
    const startsAt = body.startsAt ? new Date(body.startsAt) : null;
    const endsAt = body.endsAt ? new Date(body.endsAt) : null;
    if ((startsAt && Number.isNaN(startsAt.getTime())) || (endsAt && Number.isNaN(endsAt.getTime()))) {
        return { error: errorResponse('Thời gian thông báo không hợp lệ.', 400) };
    }
    if (endsAt && startsAt && endsAt <= startsAt) {
        return { error: errorResponse('Thời gian kết thúc phải sau thời gian bắt đầu.', 400) };
    }
    if (status === 'SCHEDULED' && !startsAt) {
        return { error: errorResponse('Thông báo lên lịch phải có thời gian bắt đầu.', 400) };
    }
    return { value: {
        title, subtitle, content, link, image, audience, status,
        startsAt: status === 'PUBLISHED' && !startsAt ? new Date().toISOString() : startsAt?.toISOString() || null,
        endsAt: endsAt?.toISOString() || null,
        isBannerActive: Boolean(body.isBannerActive),
        isActive: Boolean(body.isActive),
    } };
}

async function audienceForRequest(request: Request, env: Env): Promise<AnnouncementAudience> {
    const token = extractJWTFromRequest(request);
    if (!token || !env.JWT_SECRET) return 'ALL';
    const result = await verifyJWTMiddleware(request, env);
    if (result instanceof Response) return 'ALL';
    const payload = result.user;
    if (payload?.role === 'student') return 'STUDENTS';
    if (payload?.role === 'teacher' || payload?.role === 'admin') return 'TEACHERS';
    return 'ALL';
}

export async function handleAnnouncementRoutes(request: Request, env: Env, path: string, method: string): Promise<Response> {
    const db = env.DB;
    const publicPath = path === '/api/announcements' || path === '/api/announcements/current';

    if (publicPath && method === 'GET') {
        const audience = await audienceForRequest(request, env);
        const now = new Date().toISOString();
        const audienceSql = audience === 'ALL' ? "audience = 'ALL'" : 'audience IN (\'ALL\', ?)';
        const statement = db.prepare(`
            SELECT * FROM announcements
            WHERE status IN ('PUBLISHED', 'SCHEDULED')
              AND (starts_at IS NULL OR starts_at <= ?)
              AND (ends_at IS NULL OR ends_at > ?)
              AND ${audienceSql}
            ORDER BY CASE WHEN audience = 'ALL' THEN 1 ELSE 0 END, updated_at DESC
            LIMIT 1
        `);
        const row = await withD1Retry(
            () => (audience === 'ALL' ? statement.bind(now, now) : statement.bind(now, now, audience)).first<AnnouncementRow>(),
            'GET /api/announcements/current',
        );
        return jsonResponse({ status: 'success', announcement: row ? mapAnnouncement(row) : null });
    }

    const authResult = await verifyJWTMiddleware(request, env);
    if (authResult instanceof Response) return authResult;
    if (!requireAdmin(authResult.user)) return errorResponse('Forbidden', 403);
    if (!path.startsWith('/api/admin/announcements') && !(path === '/api/announcements' && method === 'POST')) {
        return errorResponse('Not found: ' + path, 404);
    }

    if (path === '/api/admin/announcements' && method === 'GET') {
        const rows = await db.prepare('SELECT * FROM announcements ORDER BY updated_at DESC').all<AnnouncementRow>();
        return jsonResponse({ status: 'success', data: (rows.results || []).map(mapAnnouncement) });
    }

    const legacySave = path === '/api/announcements' && method === 'POST';
    if ((path === '/api/admin/announcements' && method === 'POST') || legacySave) {
        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');
        const validation = validateBody(legacySave ? { ...body, status: body.isBannerActive || body.isActive ? 'PUBLISHED' : 'DRAFT' } : body, request, env);
        if (validation.error) return validation.error;
        const value = validation.value;
        const id = legacySave ? '1' : `announcement-${crypto.randomUUID()}`;
        const now = new Date().toISOString();
        const existing = legacySave ? await db.prepare('SELECT id FROM announcements WHERE id = ?').bind(id).first() : null;
        const statement = existing
            ? db.prepare(`
                UPDATE announcements SET content = ?, is_active = ?, updated_at = ?, banner_title = ?,
                    banner_subtitle = ?, banner_link = ?, banner_image = ?, is_banner_active = ?,
                    days_to_live = ?, status = ?, audience = ?, starts_at = ?, ends_at = ?, updated_by = ?
                WHERE id = ?
            `).bind(value.content, String(value.isActive), now, value.title, value.subtitle, value.link, value.image,
                String(value.isBannerActive), Number(body.daysToLive ?? 7), value.status, value.audience,
                value.startsAt, value.endsAt, authResult.user.username, id)
            : db.prepare(`
                INSERT INTO announcements
                (id, content, is_active, updated_at, banner_title, banner_subtitle, banner_link,
                 banner_image, is_banner_active, days_to_live, status, audience, starts_at, ends_at,
                 created_by, updated_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(id, value.content, String(value.isActive), now, value.title, value.subtitle, value.link,
                value.image, String(value.isBannerActive), Number(body.daysToLive ?? 7), value.status,
                value.audience, value.startsAt, value.endsAt, authResult.user.username,
                authResult.user.username, now);
        await db.batch([statement, auditStatement(db, {
            actorUsername: authResult.user.username,
            action: existing ? 'ANNOUNCEMENT_UPDATED' : 'ANNOUNCEMENT_CREATED',
            targetType: 'announcement', targetId: id, requestId: requestId(request),
            after: { status: value.status, audience: value.audience, startsAt: value.startsAt, endsAt: value.endsAt },
        })]);
        return jsonResponse({ status: 'success', data: { id, updatedAt: now } }, existing ? 200 : 201);
    }

    const match = path.match(/^\/api\/admin\/announcements\/([^/]+)(?:\/(publish|cancel|archive))?$/);
    if (!match) return errorResponse('Not found: ' + path, 404);
    const id = decodeURIComponent(match[1]);
    const action = match[2];
    const current = await db.prepare('SELECT * FROM announcements WHERE id = ?').bind(id).first<AnnouncementRow>();
    if (!current) return errorResponse('Không tìm thấy thông báo.', 404);
    const body = await parseBody(request) || {};
    if (body.expectedUpdatedAt && body.expectedUpdatedAt !== current.updated_at) {
        return errorResponse('Thông báo đã được người khác cập nhật. Vui lòng tải lại.', 409);
    }
    const now = new Date().toISOString();

    if (!action && method === 'PUT') {
        const validation = validateBody(body, request, env);
        if (validation.error) return validation.error;
        const value = validation.value;
        await db.batch([
            db.prepare(`
                UPDATE announcements SET content = ?, is_active = ?, updated_at = ?, banner_title = ?,
                    banner_subtitle = ?, banner_link = ?, banner_image = ?, is_banner_active = ?,
                    status = ?, audience = ?, starts_at = ?, ends_at = ?, updated_by = ? WHERE id = ?
            `).bind(value.content, String(value.isActive), now, value.title, value.subtitle, value.link,
                value.image, String(value.isBannerActive), value.status, value.audience,
                value.startsAt, value.endsAt, authResult.user.username, id),
            auditStatement(db, {
                actorUsername: authResult.user.username, action: 'ANNOUNCEMENT_UPDATED',
                targetType: 'announcement', targetId: id, requestId: requestId(request),
                before: mapAnnouncement(current), after: value,
            }),
        ]);
        return jsonResponse({ status: 'success', data: { id, updatedAt: now } });
    }

    if (method === 'POST' && action) {
        const nextStatus: AnnouncementStatus = action === 'publish' ? 'PUBLISHED' : action === 'archive' ? 'ARCHIVED' : 'DRAFT';
        const startsAt = action === 'publish' ? (current.starts_at || now) : current.starts_at;
        await db.batch([
            db.prepare('UPDATE announcements SET status = ?, starts_at = ?, updated_at = ?, updated_by = ? WHERE id = ?')
                .bind(nextStatus, startsAt, now, authResult.user.username, id),
            auditStatement(db, {
                actorUsername: authResult.user.username, action: `ANNOUNCEMENT_${action.toUpperCase()}`,
                targetType: 'announcement', targetId: id, requestId: requestId(request),
                before: { status: current.status }, after: { status: nextStatus },
            }),
        ]);
        return jsonResponse({ status: 'success', data: { id, status: nextStatus, updatedAt: now } });
    }

    return errorResponse('Method not allowed', 405);
}
