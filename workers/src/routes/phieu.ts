import { errorResponse, jsonResponse } from '../utils/response';
import { renderOgPng, PhieuRecord } from '../utils/ogImage';
import { Env } from '../types';
import { parseBody } from '../utils/helpers';
import { verifyJWTMiddleware, requireTeacher } from '../middleware/jwtAuth';

const PUBLIC_PHIEU_HOST = 'phieu.thitong.site';
const PUBLIC_APP_ORIGIN = 'https://thitong.site';

export async function handlePhieuSubdomain(request: Request, env: Env): Promise<Response | null> {
    const db = env.DB;
    const url = new URL(request.url);
    if (url.hostname !== PUBLIC_PHIEU_HOST) return null;

    // Let all /api/* requests fall through to normal API routing
    // (phieu.thitong.site is also the main API domain)
    if (url.pathname.startsWith('/api/')) return null;

    const pathParts = url.pathname.replace(/^\//, '').split('/');
    const [scope, publicToken, subpath] = pathParts;
    if (scope !== 'p' || !publicToken) {
        return null;
    }

    const record = await getPublicPhieuRecord(db, publicToken);
    if (!record) {
        return new Response('Phieu da het han hoac khong ton tai', { status: 404 });
    }

    // Serve OG image PNG (R2 cached)
    if (subpath === 'og-image') {
        const r2Key = `og/${publicToken}.png`;
        const cached = await env.OG_IMAGES.get(r2Key);
        if (cached) {
            return new Response(cached.body, {
                headers: {
                    'Content-Type': 'image/png',
                    'Cache-Control': 'public, max-age=604800',
                    'X-Cache': 'HIT',
                },
            });
        }
        const png = await renderOgPng(record as PhieuRecord);
        // Store in R2 non-blocking
        env.OG_IMAGES.put(r2Key, png, {
            httpMetadata: { contentType: 'image/png', cacheControl: 'public, max-age=604800' },
        });
        return new Response(png, {
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=604800',
                'X-Cache': 'MISS',
            },
        });
    }

    const userAgent = request.headers.get('User-Agent') || '';
    const isBot = /bot|crawl|spider|facebookexternalhit|zalo|zalocrawler|telegram|whatsapp|viber|slack|twitter|linkedin|line|kakaotalk|discordbot|iframely/i.test(userAgent);

    // The SPA fetches the public JSON after redirect. Count that content fetch once
    // instead of counting both this redirect and the API request.
    if (isBot) {
        return new Response(renderOgHtml(record, publicToken), {
            headers: {
                'Content-Type': 'text/html; charset=UTF-8',
                'Cache-Control': 'public, max-age=300',
                'X-Robots-Tag': 'noindex, nofollow',
            },
        });
    }

    return Response.redirect(`${PUBLIC_APP_ORIGIN}/phieu/p/${encodeURIComponent(publicToken)}`, 302);
}

type PhieuScopeUser = { username: string; role: string };

const canAccessTeacherScope = (user: PhieuScopeUser, teacherUsername: unknown): boolean =>
    user.role === 'admin' || String(teacherUsername || '') === user.username;

const getSubmissionScope = async (db: D1Database, submissionId: string): Promise<any | null> =>
    db.prepare(`
        SELECT hs.id AS submission_id, hs.student_id, hs.student_name, ha.class_id, c.teacher_username
        FROM hw_submissions hs
        JOIN hw_assignments ha ON ha.id = hs.assignment_id
        JOIN classes c ON c.id = ha.class_id
        WHERE hs.id = ?
        LIMIT 1
    `).bind(submissionId).first<any>();

const getPhieuScope = async (db: D1Database, phieuId: string): Promise<any | null> =>
    db.prepare(`
        SELECT p.id, p.class_id, c.teacher_username
        FROM phieu_nhanxet p
        JOIN classes c ON c.id = p.class_id
        WHERE p.id = ?
        LIMIT 1
    `).bind(phieuId).first<any>();

const getPublicLinkScope = async (db: D1Database, publicToken: string): Promise<any | null> =>
    db.prepare(`
        SELECT p.id, p.class_id, c.teacher_username
        FROM phieu_public_links l
        JOIN phieu_nhanxet p ON p.id = l.phieu_id
        JOIN classes c ON c.id = p.class_id
        WHERE l.public_token = ?
        LIMIT 1
    `).bind(publicToken).first<any>();

type ResultScope = {
    result_id: string;
    student_id: string;
    student_name: string;
    class_id: string;
    teacher_username: string;
    mon_hoc: string;
    ten_bai_tap: string;
    ngay_lam_bai: string;
    tong_cau: number;
    so_cau_dung: number;
    so_cau_sai: number;
    diem_so: number;
};

const resultSubmissionKey = (resultId: string): string => `result:${resultId}`;

const getResultScope = async (
    db: D1Database,
    resultId: string,
    user: PhieuScopeUser,
): Promise<ResultScope | null> => db.prepare(`
    SELECT
        CAST(r.id AS TEXT) AS result_id,
        s.id AS student_id,
        r.student_name,
        c.id AS class_id,
        c.teacher_username,
        COALESCE(q.category, '') AS mon_hoc,
        r.quiz_title AS ten_bai_tap,
        r.submitted_at AS ngay_lam_bai,
        r.total_questions AS tong_cau,
        r.correct_count AS so_cau_dung,
        MAX(0, r.total_questions - r.correct_count) AS so_cau_sai,
        r.score AS diem_so
    FROM results r
    JOIN classes c
      ON LOWER(TRIM(c.name)) = LOWER(TRIM(r.class_name))
     AND COALESCE(c.archived_at, '') = ''
    JOIN students s
      ON s.class_id = c.id
     AND LOWER(TRIM(s.full_name)) = LOWER(TRIM(r.student_name))
     AND COALESCE(s.archived_at, '') = ''
    LEFT JOIN quizzes q ON q.id = r.quiz_id
    WHERE CAST(r.id AS TEXT) = ?
    ORDER BY CASE WHEN c.teacher_username = ? THEN 0 ELSE 1 END, c.id
    LIMIT 1
`).bind(resultId, user.username).first<ResultScope>();

const getResultPhieuRecord = async (db: D1Database, resultId: string): Promise<any | null> => {
    const canonicalKey = resultSubmissionKey(resultId);
    return db.prepare(`
        SELECT *
        FROM phieu_nhanxet
        WHERE submission_id IN (?, ?)
        ORDER BY CASE WHEN submission_id = ? THEN 0 ELSE 1 END
        LIMIT 1
    `).bind(canonicalKey, resultId, canonicalKey).first<any>();
};

const mapPublicLink = (row: any): any => row ? ({
    phieuId: String(row.phieu_id || row.phieuId || ''),
    studentName: String(row.student_name || row.studentName || ''),
    publicToken: String(row.public_token || row.publicToken || ''),
    url: `https://${PUBLIC_PHIEU_HOST}/p/${encodeURIComponent(String(row.public_token || row.publicToken || ''))}`,
}) : null;

const getActivePublicLinkByPhieuId = async (db: D1Database, phieuId: string): Promise<any | null> => {
    const row = await db.prepare(`
        SELECT l.phieu_id, l.batch_id, l.public_token, l.expires_at, p.student_name
        FROM phieu_public_links l
        JOIN phieu_nhanxet p ON p.id = l.phieu_id
        WHERE l.phieu_id = ?
          AND l.is_active = 1
          AND (l.expires_at IS NULL OR l.expires_at > datetime('now'))
        ORDER BY l.created_at DESC, l.id DESC
        LIMIT 1
    `).bind(phieuId).first<any>();
    return row ? { ...mapPublicLink(row), batchId: String(row.batch_id || '') } : null;
};

export async function handlePhieuRoutes(
    request: Request,
    env: Env,
    path: string,
    method: string,
): Promise<Response> {
    const authResult = await verifyJWTMiddleware(request, env);
    if (authResult instanceof Response) return authResult;
    const user = authResult.user as PhieuScopeUser;
    if (!requireTeacher(authResult.user)) {
        return errorResponse('Forbidden: Teacher access required', 403);
    }

    if (path === '/api/phieu' && method === 'POST') {
        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');
        const data = body.data || body;
        const submissionId = String(data.submission_id || data.submissionId || '').trim();
        if (!submissionId) return errorResponse('Missing submission_id');
        const scope = await getSubmissionScope(env.DB, submissionId);
        if (!scope) return errorResponse('Submission not found', 404);
        if (!canAccessTeacherScope(user, scope.teacher_username)) return errorResponse('Forbidden', 403);
        return handleUpsertPhieu(env.DB, {
            ...data,
            submission_id: scope.submission_id,
            student_id: scope.student_id,
            student_name: scope.student_name,
            class_id: scope.class_id,
            created_by: user.username,
        }, env.OG_IMAGES);
    }

    const resultMatch = path.match(/^\/api\/phieu\/results\/([^/]+)$/);
    if (resultMatch) {
        const resultId = decodeURIComponent(resultMatch[1]).trim();
        if (!resultId) return errorResponse('Missing result id');

        const scope = await getResultScope(env.DB, resultId, user);
        if (!scope) return errorResponse('Result not found or class is inactive', 404);
        if (!canAccessTeacherScope(user, scope.teacher_username)) return errorResponse('Forbidden', 403);

        const existing = await getResultPhieuRecord(env.DB, resultId);
        if (method === 'GET') {
            const link = existing ? await getActivePublicLinkByPhieuId(env.DB, existing.id) : null;
            return jsonResponse({
                status: 'success',
                data: { phieu: existing ? mapPhieu(existing) : null, link },
            });
        }

        if (method === 'POST') {
            const body = await parseBody(request);
            if (!body) return errorResponse('Invalid JSON body');
            const data = body.data || body;
            const score = Number(scope.diem_so) || 0;
            return handleUpsertPhieu(env.DB, {
                ...data,
                id: existing?.id,
                submission_id: existing?.submission_id || resultSubmissionKey(resultId),
                student_id: scope.student_id,
                student_name: scope.student_name,
                class_id: scope.class_id,
                mon_hoc: scope.mon_hoc,
                ten_bai_tap: scope.ten_bai_tap,
                ngay_lam_bai: scope.ngay_lam_bai,
                tong_cau: Number(scope.tong_cau) || 0,
                so_cau_dung: Number(scope.so_cau_dung) || 0,
                so_cau_sai: Number(scope.so_cau_sai) || 0,
                diem_so: score,
                xep_loai: getXepLoai(score),
                created_by: user.username,
            }, env.OG_IMAGES);
        }

        return errorResponse('Method not allowed', 405);
    }

    const submissionMatch = path.match(/^\/api\/phieu\/submissions\/([^/]+)$/);
    if (submissionMatch && method === 'GET') {
        const submissionId = decodeURIComponent(submissionMatch[1]);
        const scope = await getSubmissionScope(env.DB, submissionId);
        if (!scope) return errorResponse('Submission not found', 404);
        if (!canAccessTeacherScope(user, scope.teacher_username)) return errorResponse('Forbidden', 403);
        return handleGetPhieuBySubmission(env.DB, { submissionId });
    }

    if (path === '/api/phieu/batches' && method === 'POST') {
        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');
        const data = body.data || body;
        const phieuIds = Array.isArray(data.phieuIds) ? data.phieuIds.map(String).filter(Boolean) : [];
        if (phieuIds.length === 0) return errorResponse('Missing phieuIds');
        const scopes = [];
        for (const phieuId of phieuIds) {
            const scope = await getPhieuScope(env.DB, phieuId);
            if (!scope) return errorResponse('Phieu not found', 404);
            if (!canAccessTeacherScope(user, scope.teacher_username)) return errorResponse('Forbidden', 403);
            scopes.push(scope);
        }
        const classIds = new Set(scopes.map((scope) => String(scope.class_id || '')));
        if (classIds.size !== 1) return errorResponse('All phieu records must belong to one class', 400);
        return handlePublishPhieuBatch(env.DB, {
            ...data,
            phieuIds,
            classId: String(scopes[0].class_id || ''),
            teacherId: user.username,
        });
    }

    const deactivateMatch = path.match(/^\/api\/phieu\/public-links\/([^/]+)\/deactivate$/);
    if (deactivateMatch && method === 'POST') {
        const publicToken = decodeURIComponent(deactivateMatch[1]);
        const scope = await getPublicLinkScope(env.DB, publicToken);
        if (!scope) return errorResponse('Public link not found', 404);
        if (!canAccessTeacherScope(user, scope.teacher_username)) return errorResponse('Forbidden', 403);
        return handleDeactivatePublicPhieuLink(env.DB, { publicToken });
    }

    return errorResponse('Phieu route not found', 404);
}

export async function handlePublicPhieuApi(db: D1Database, path: string, method: string): Promise<Response | null> {
    const match = path.match(/^\/api\/phieu\/public\/([^/]+)$/);
    if (!match) return null;
    if (method !== 'GET') return errorResponse('Method not allowed', 405);

    const publicToken = decodeURIComponent(match[1]);
    const record = await getPublicPhieuRecord(db, publicToken);
    if (!record) return errorResponse('Phieu da het han hoac khong ton tai', 404);

    await db.prepare('UPDATE phieu_public_links SET view_count = view_count + 1 WHERE public_token = ?')
        .bind(publicToken)
        .run();
    await db.prepare(`
        UPDATE phieu_batch
        SET view_count = view_count + 1
        WHERE id = (SELECT batch_id FROM phieu_public_links WHERE public_token = ?)
    `).bind(publicToken).run();

    return new Response(JSON.stringify({
        status: 'success',
        data: {
            title: record.batch_title || record.ten_bai_tap || 'Phiếu Kết Quả Học Tập',
            phieu: mapPhieu(record),
        },
    }), {
        headers: {
            'Content-Type': 'application/json',
            'X-Robots-Tag': 'noindex, nofollow',
            'Cache-Control': 'no-store',
        },
    });
}

export async function handleUpsertPhieu(db: D1Database, body: any, ogImages?: R2Bucket): Promise<Response> {
    const data = body.data || body;
    if (!data.submission_id) return errorResponse('Missing submission_id');
    if (!data.student_id) return errorResponse('Missing student_id');

    const now = new Date().toISOString();
    const existing = await db.prepare('SELECT id, version, created_by FROM phieu_nhanxet WHERE submission_id = ?')
        .bind(data.submission_id)
        .first<any>();
    if (existing && data.id && String(data.id) !== String(existing.id)) {
        return errorResponse('Phieu id does not match submission', 409);
    }
    const id = existing?.id || data.id || `phieu-${crypto.randomUUID().slice(0, 12)}`;
    const rawScore = Number(data.diem_so);
    const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(10, rawScore)) : 0;
    const xepLoai = data.xep_loai || getXepLoai(score);
    const createdBy = existing?.created_by || data.created_by || 'teacher';

    if (existing) {
        await db.prepare(`
            UPDATE phieu_nhanxet
            SET student_id = ?, student_name = ?, class_id = ?, mon_hoc = ?, ten_bai_tap = ?,
                ngay_lam_bai = ?, tong_cau = ?, so_cau_dung = ?, so_cau_sai = ?, diem_so = ?,
                xep_loai = ?, nhan_xet_mode = ?, nhan_xet_style = ?, nhan_xet = ?,
                noi_dung_co_gang = ?, loi_dong_vien = ?, status = ?, version = version + 1,
                created_by = ?, updated_at = ?
            WHERE submission_id = ?
        `).bind(
            data.student_id,
            data.student_name,
            data.class_id,
            data.mon_hoc || '',
            data.ten_bai_tap || '',
            data.ngay_lam_bai || '',
            Number(data.tong_cau) || 0,
            Number(data.so_cau_dung) || 0,
            Number(data.so_cau_sai) || 0,
            score,
            xepLoai,
            data.nhan_xet_mode || 'ai',
            data.nhan_xet_style || 'nhe_nhang',
            data.nhan_xet || '',
            data.noi_dung_co_gang || '',
            data.loi_dong_vien || '',
            data.status || 'draft',
            createdBy,
            now,
            data.submission_id
        ).run();
    } else {
        await db.prepare(`
            INSERT INTO phieu_nhanxet (
                id, submission_id, student_id, student_name, class_id, mon_hoc, ten_bai_tap,
                ngay_lam_bai, tong_cau, so_cau_dung, so_cau_sai, diem_so, xep_loai,
                nhan_xet_mode, nhan_xet_style, nhan_xet, noi_dung_co_gang, loi_dong_vien,
                status, version, created_by, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
        `).bind(
            id,
            data.submission_id,
            data.student_id,
            data.student_name,
            data.class_id,
            data.mon_hoc || '',
            data.ten_bai_tap || '',
            data.ngay_lam_bai || '',
            Number(data.tong_cau) || 0,
            Number(data.so_cau_dung) || 0,
            Number(data.so_cau_sai) || 0,
            score,
            xepLoai,
            data.nhan_xet_mode || 'ai',
            data.nhan_xet_style || 'nhe_nhang',
            data.nhan_xet || '',
            data.noi_dung_co_gang || '',
            data.loi_dong_vien || '',
            data.status || 'draft',
            createdBy,
            now,
            now
        ).run();
    }

    const saved = await db.prepare('SELECT * FROM phieu_nhanxet WHERE submission_id = ?')
        .bind(data.submission_id)
        .first<any>();
    if (!saved) return errorResponse('Unable to load saved phieu', 500);

    // Invalidate R2 OG cache on update
    if (ogImages) {
        const link = await db.prepare('SELECT public_token FROM phieu_public_links WHERE phieu_id = ?')
            .bind(id).first<{ public_token: string }>();
        if (link?.public_token) {
            await ogImages.delete(`og/${link.public_token}.png`);
        }
    }

    return jsonResponse({ status: 'success', data: mapPhieu(saved) });
}

export async function handleGetPhieuBySubmission(db: D1Database, body: any): Promise<Response> {
    const submissionId = body.submissionId || body.submission_id || body.data?.submissionId;
    if (!submissionId) return errorResponse('Missing submissionId');

    const row = await db.prepare('SELECT * FROM phieu_nhanxet WHERE submission_id = ?')
        .bind(submissionId)
        .first<any>();
    return jsonResponse({ status: 'success', data: row ? mapPhieu(row) : null });
}

export async function handlePublishPhieuBatch(db: D1Database, body: any): Promise<Response> {
    const data = body.data || body;
    const phieuIds: string[] = Array.isArray(data.phieuIds)
        ? Array.from(new Set(data.phieuIds.map(String).map((id: string) => id.trim()).filter(Boolean)))
        : [];
    if (phieuIds.length === 0) return errorResponse('Missing phieuIds');

    const now = new Date().toISOString();
    const newBatchId = `pb-${crypto.randomUUID().slice(0, 12)}`;
    const rawDays = data.expiresInDays != null ? Number(data.expiresInDays) : NaN;
    const expiresAt = Number.isFinite(rawDays) && rawDays > 0
        ? new Date(Date.now() + rawDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const phieuRows: any[] = [];
    const linksByPhieuId = new Map<string, any>();
    for (const phieuId of phieuIds) {
        const phieu = await db.prepare('SELECT id, student_name FROM phieu_nhanxet WHERE id = ?')
            .bind(phieuId)
            .first<any>();
        if (!phieu) return errorResponse('Phieu not found', 404);
        phieuRows.push(phieu);
        const existingLink = await getActivePublicLinkByPhieuId(db, phieu.id);
        if (existingLink) linksByPhieuId.set(phieu.id, existingLink);
    }

    const missingRows = phieuRows.filter((phieu) => !linksByPhieuId.has(phieu.id));
    let insertedCount = 0;
    if (missingRows.length > 0) {
        await db.prepare(`
            INSERT INTO phieu_batch (id, assignment_id, class_id, teacher_id, title, created_at, expires_at, view_count, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)
        `).bind(
            newBatchId,
            data.assignmentId || '',
            data.classId || '',
            data.teacherId || 'teacher',
            data.title || 'Phiếu Kết Quả Học Tập',
            now,
            expiresAt
        ).run();

        for (const phieu of missingRows) {
            const publicToken = createPublicToken();
            const linkId = `pl-${crypto.randomUUID().slice(0, 12)}`;
            const inserted = await db.prepare(`
                INSERT INTO phieu_public_links (
                    id, phieu_id, batch_id, public_token, is_active, expires_at, view_count, created_at
                )
                SELECT ?, ?, ?, ?, 1, ?, 0, ?
                WHERE NOT EXISTS (
                    SELECT 1 FROM phieu_public_links
                    WHERE phieu_id = ?
                      AND is_active = 1
                      AND (expires_at IS NULL OR expires_at > datetime('now'))
                )
            `).bind(linkId, phieu.id, newBatchId, publicToken, expiresAt, now, phieu.id).run();

            if (Number((inserted as any)?.meta?.changes || 0) > 0) {
                insertedCount += 1;
                await db.prepare('INSERT OR IGNORE INTO phieu_batch_items (batch_id, phieu_id, student_name) VALUES (?, ?, ?)')
                    .bind(newBatchId, phieu.id, phieu.student_name)
                    .run();
                await db.prepare("UPDATE phieu_nhanxet SET status = 'published', updated_at = ? WHERE id = ?")
                    .bind(now, phieu.id)
                    .run();
            }

            const activeLink = await getActivePublicLinkByPhieuId(db, phieu.id);
            if (!activeLink) return errorResponse('Unable to create public link', 500);
            linksByPhieuId.set(phieu.id, activeLink);
        }

        if (insertedCount === 0) {
            await db.prepare('DELETE FROM phieu_batch WHERE id = ?').bind(newBatchId).run();
        }
    }

    const links = phieuRows.map((phieu) => {
        const link = linksByPhieuId.get(phieu.id);
        return {
            phieuId: link.phieuId,
            studentName: link.studentName,
            publicToken: link.publicToken,
            url: link.url,
        };
    });
    const batchId = insertedCount > 0
        ? newBatchId
        : String(linksByPhieuId.get(phieuRows[0].id)?.batchId || '');

    return jsonResponse({ status: 'success', data: { batchId, links } });
}

export async function handleDeactivatePublicPhieuLink(db: D1Database, body: any): Promise<Response> {
    const publicToken = body.publicToken || body.public_token || body.data?.publicToken;
    if (!publicToken) return errorResponse('Missing publicToken');
    await db.prepare('UPDATE phieu_public_links SET is_active = 0 WHERE public_token = ?')
        .bind(publicToken)
        .run();
    return jsonResponse({ status: 'success' });
}

async function getPublicPhieuRecord(db: D1Database, publicToken: string): Promise<any | null> {
    return await db.prepare(`
        SELECT p.*, b.title as batch_title, t.full_name as teacher_full_name
        FROM phieu_public_links l
        JOIN phieu_nhanxet p ON p.id = l.phieu_id
        LEFT JOIN phieu_batch b ON b.id = l.batch_id
        LEFT JOIN teachers t ON t.username = p.created_by
        WHERE l.public_token = ?
          AND l.is_active = 1
          AND (l.expires_at IS NULL OR l.expires_at > datetime('now'))
        LIMIT 1
    `).bind(publicToken).first<any>();
}

function mapPhieu(row: any): any {
    return {
        id: row.id,
        submission_id: row.submission_id,
        student_id: row.student_id,
        student_name: row.student_name,
        class_id: row.class_id,
        mon_hoc: row.mon_hoc || '',
        ten_bai_tap: row.ten_bai_tap || '',
        ngay_lam_bai: row.ngay_lam_bai || '',
        tong_cau: Number(row.tong_cau) || 0,
        so_cau_dung: Number(row.so_cau_dung) || 0,
        so_cau_sai: Number(row.so_cau_sai) || 0,
        diem_so: Number(row.diem_so) || 0,
        xep_loai: row.xep_loai || 'Trung bình',
        nhan_xet_mode: row.nhan_xet_mode || 'ai',
        nhan_xet_style: row.nhan_xet_style || 'nhe_nhang',
        nhan_xet: row.nhan_xet || '',
        noi_dung_co_gang: row.noi_dung_co_gang || '',
        loi_dong_vien: row.loi_dong_vien || '',
        status: row.status || 'draft',
        version: Number(row.version) || 1,
        created_by: row.created_by || 'teacher',
        teacher_name: row.teacher_full_name || row.teacher_name || row.created_by || '',
        created_at: row.created_at || '',
        updated_at: row.updated_at || '',
    };
}

function createPublicToken(): string {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(36).padStart(2, '0')).join('').slice(0, 32);
}

function getXepLoai(score: number): string {
    if (score >= 9) return 'Xuất sắc';
    if (score >= 8) return 'Giỏi';
    if (score >= 6.5) return 'Khá';
    if (score >= 5) return 'Trung bình';
    return 'Yếu';
}

function renderOgImageSvg(record: any): string {
    const name = escapeHtml(record.student_name || 'Hoc sinh');
    const diem = Number(record.diem_so) || 0;
    const diemText = diem % 1 === 0 ? `${diem}.0` : `${diem}`;
    const xepLoai = escapeHtml(record.xep_loai || 'Trung binh');
    const tenBai = escapeHtml(record.batch_title || record.ten_bai_tap || 'Phieu Ket Qua Hoc Tap');

    const xepLoaiColors: Record<string, string> = {
        'Xuat sac': '#22c55e',
        'Gioi': '#60a5fa',
        'Kha': '#f59e0b',
        'Trung binh': '#f97316',
        'Yeu': '#ef4444',
    };
    const badgeColor = xepLoaiColors[record.xep_loai] || '#818cf8';

    // Truncate long names
    const displayName = name.length > 28 ? name.slice(0, 26) + '...' : name;
    const displayBai = tenBai.length > 50 ? tenBai.slice(0, 48) + '...' : tenBai;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f2044"/>
      <stop offset="100%" stop-color="#0a1628"/>
    </linearGradient>
    <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#facc15"/>
      <stop offset="100%" stop-color="#fbbf24"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGrad)"/>

  <!-- Decorative glow circles -->
  <circle cx="1080" cy="100" r="220" fill="#6366f1" fill-opacity="0.07"/>
  <circle cx="120" cy="530" r="180" fill="#3b82f6" fill-opacity="0.06"/>

  <!-- Top accent bar -->
  <rect x="0" y="0" width="1200" height="6" fill="#6366f1"/>

  <!-- Brand -->
  <text x="60" y="72" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="bold" fill="#818cf8">ThiTong.site</text>
  <text x="60" y="108" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#475569">Phieu Ket Qua Hoc Tap</text>

  <!-- Bai tap -->
  <text x="60" y="155" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="#64748b">${displayBai}</text>

  <!-- Divider -->
  <line x1="60" y1="175" x2="1140" y2="175" stroke="#1e3a5f" stroke-width="1.5"/>

  <!-- Student name -->
  <text x="60" y="270" font-family="Arial, Helvetica, sans-serif" font-size="76" font-weight="bold" fill="#f1f5f9">${displayName}</text>

  <!-- Bottom section divider -->
  <line x1="60" y1="310" x2="1140" y2="310" stroke="#1e3a5f" stroke-width="1"/>

  <!-- Score label -->
  <text x="60" y="370" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="#64748b">Diem so</text>
  <!-- Score value -->
  <text x="60" y="470" font-family="Arial, Helvetica, sans-serif" font-size="110" font-weight="bold" fill="url(#scoreGrad)">${diemText}</text>
  <text x="240" y="470" font-family="Arial, Helvetica, sans-serif" font-size="48" fill="#94a3b8">/10</text>

  <!-- Xep loai badge -->
  <rect x="720" y="345" width="420" height="140" rx="20" fill="${badgeColor}" fill-opacity="0.12"/>
  <rect x="720" y="345" width="420" height="140" rx="20" stroke="${badgeColor}" stroke-width="2.5" fill="none"/>
  <text x="930" y="400" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#94a3b8" text-anchor="middle">Xep loai</text>
  <text x="930" y="465" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="bold" fill="${badgeColor}" text-anchor="middle">${xepLoai}</text>

  <!-- Footer -->
  <text x="60" y="600" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#1e3a5f">phieu.thitong.site</text>
  <text x="1140" y="600" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#1e3a5f" text-anchor="end">iTong Quiz</text>
</svg>`;
}

function renderOgHtml(record: any, publicToken: string): string {
    const title = escapeHtml(record.batch_title || record.ten_bai_tap || 'Phieu Ket Qua Hoc Tap');
    const studentName = escapeHtml(record.student_name || '');
    const diem = Number(record.diem_so) || 0;
    const diemText = diem % 1 === 0 ? `${diem}.0/10` : `${diem}/10`;
    const xepLoai = escapeHtml(record.xep_loai || '');
    const ogTitle = studentName ? `${studentName} - ${diemText} (${xepLoai})` : title;
    const ogDesc = studentName
        ? `${studentName} dat ${diemText}, xep loai ${xepLoai}. Xem phieu ket qua va nhan xet giao vien.`
        : 'Xem phieu ket qua va nhan xet giao vien danh cho hoc sinh.';
    const ogImage = `https://${PUBLIC_PHIEU_HOST}/p/${encodeURIComponent(publicToken)}/og-image`;
    const url = `https://${PUBLIC_PHIEU_HOST}/p/${encodeURIComponent(publicToken)}`;
    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${ogTitle} | ThiTong</title>
  <meta name="description" content="${ogDesc}"/>
  <meta property="og:type" content="website"/>
  <meta property="og:site_name" content="ThiTong"/>
  <meta property="og:title" content="${ogTitle}"/>
  <meta property="og:description" content="${ogDesc}"/>
  <meta property="og:image" content="${ogImage}"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:image:type" content="image/png"/>
  <meta property="og:url" content="${url}"/>
  <meta property="og:locale" content="vi_VN"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${ogTitle}"/>
  <meta name="twitter:description" content="${ogDesc}"/>
  <meta name="twitter:image" content="${ogImage}"/>
  <meta http-equiv="refresh" content="0;url=${url}"/>
</head>
<body>
  <h1>${ogTitle}</h1>
  <p>Dang chuyen huong den phieu ket qua...</p>
</body>
</html>`;
}

function escapeHtml(value: string): string {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
