import { errorResponse, jsonResponse } from '../utils/response';

const PUBLIC_PHIEU_HOST = 'phieu.thitong.site';
const PUBLIC_APP_ORIGIN = 'https://thitong.site';

export async function handlePhieuSubdomain(request: Request, db: D1Database): Promise<Response | null> {
    const url = new URL(request.url);
    if (url.hostname !== PUBLIC_PHIEU_HOST) return null;

    const [scope, publicToken] = url.pathname.replace(/^\//, '').split('/');
    if (scope !== 'p' || !publicToken) {
        return new Response('Khong tim thay phieu', { status: 404 });
    }

    const record = await getPublicPhieuRecord(db, publicToken);
    if (!record) {
        return new Response('Phieu da het han hoac khong ton tai', { status: 404 });
    }

    const userAgent = request.headers.get('User-Agent') || '';
    const isBot = /bot|crawl|facebookexternalhit|zalo|telegram|twitter|linkedin/i.test(userAgent);

    await db.prepare('UPDATE phieu_public_links SET view_count = view_count + 1 WHERE public_token = ?')
        .bind(publicToken)
        .run();

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

    return new Response(JSON.stringify({
        status: 'success',
        data: {
            title: record.batch_title || record.ten_bai_tap || 'Phieu Ket Qua Hoc Tap',
            phieu: mapPhieu(record),
        },
    }), {
        headers: {
            'Content-Type': 'application/json',
            'X-Robots-Tag': 'noindex, nofollow',
        },
    });
}

export async function handleUpsertPhieu(db: D1Database, body: any): Promise<Response> {
    const data = body.data || body;
    if (!data.submission_id) return errorResponse('Missing submission_id');
    if (!data.student_id) return errorResponse('Missing student_id');

    const now = new Date().toISOString();
    const existing = await db.prepare('SELECT id, version FROM phieu_nhanxet WHERE submission_id = ?')
        .bind(data.submission_id)
        .first<any>();
    const id = data.id || existing?.id || `phieu-${crypto.randomUUID().slice(0, 12)}`;
    const score = Number(data.diem_so) || 0;
    const xepLoai = data.xep_loai || getXepLoai(score);

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
            data.created_by || 'teacher',
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
            data.created_by || 'teacher',
            now,
            now
        ).run();
    }

    const saved = await db.prepare('SELECT * FROM phieu_nhanxet WHERE id = ?').bind(id).first<any>();
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
    const phieuIds: string[] = Array.isArray(data.phieuIds) ? data.phieuIds : [];
    if (phieuIds.length === 0) return errorResponse('Missing phieuIds');

    const now = new Date().toISOString();
    const batchId = `pb-${crypto.randomUUID().slice(0, 12)}`;
    const expiresInDays = Number(data.expiresInDays) || 30;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

    await db.prepare(`
        INSERT INTO phieu_batch (id, assignment_id, class_id, teacher_id, title, created_at, expires_at, view_count, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)
    `).bind(
        batchId,
        data.assignmentId || '',
        data.classId || '',
        data.teacherId || 'teacher',
        data.title || 'Phieu Ket Qua Hoc Tap',
        now,
        expiresAt
    ).run();

    const links = [];
    for (const phieuId of phieuIds) {
        const phieu = await db.prepare('SELECT id, student_name FROM phieu_nhanxet WHERE id = ?')
            .bind(phieuId)
            .first<any>();
        if (!phieu) continue;

        const publicToken = createPublicToken();
        const linkId = `pl-${crypto.randomUUID().slice(0, 12)}`;
        await db.prepare('INSERT OR IGNORE INTO phieu_batch_items (batch_id, phieu_id, student_name) VALUES (?, ?, ?)')
            .bind(batchId, phieu.id, phieu.student_name)
            .run();
        await db.prepare(`
            INSERT INTO phieu_public_links (id, phieu_id, batch_id, public_token, is_active, expires_at, view_count, created_at)
            VALUES (?, ?, ?, ?, 1, ?, 0, ?)
        `).bind(linkId, phieu.id, batchId, publicToken, expiresAt, now).run();
        await db.prepare("UPDATE phieu_nhanxet SET status = 'published', updated_at = ? WHERE id = ?")
            .bind(now, phieu.id)
            .run();

        links.push({
            phieuId: phieu.id,
            studentName: phieu.student_name,
            publicToken,
            url: `https://${PUBLIC_PHIEU_HOST}/p/${publicToken}`,
        });
    }

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
        SELECT p.*, b.title as batch_title
        FROM phieu_public_links l
        JOIN phieu_nhanxet p ON p.id = l.phieu_id
        LEFT JOIN phieu_batch b ON b.id = l.batch_id
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
        xep_loai: row.xep_loai || 'Trung binh',
        nhan_xet_mode: row.nhan_xet_mode || 'ai',
        nhan_xet_style: row.nhan_xet_style || 'nhe_nhang',
        nhan_xet: row.nhan_xet || '',
        noi_dung_co_gang: row.noi_dung_co_gang || '',
        loi_dong_vien: row.loi_dong_vien || '',
        status: row.status || 'draft',
        version: Number(row.version) || 1,
        created_by: row.created_by || 'teacher',
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
    if (score >= 9) return 'Xuat sac';
    if (score >= 8) return 'Gioi';
    if (score >= 6.5) return 'Kha';
    if (score >= 5) return 'Trung binh';
    return 'Yeu';
}

function renderOgHtml(record: any, publicToken: string): string {
    const title = escapeHtml(record.batch_title || record.ten_bai_tap || 'Phieu Ket Qua Hoc Tap');
    const url = `https://${PUBLIC_PHIEU_HOST}/p/${encodeURIComponent(publicToken)}`;
    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${title} | ThiTong</title>
  <meta name="description" content="Xem phieu ket qua va nhan xet giao vien danh cho hoc sinh."/>
  <meta property="og:type" content="website"/>
  <meta property="og:site_name" content="ThiTong"/>
  <meta property="og:title" content="${title}"/>
  <meta property="og:description" content="Xem phieu ket qua va nhan xet giao vien danh cho hoc sinh."/>
  <meta property="og:image" content="https://thitong.site/og-phieu.png"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:url" content="${url}"/>
  <meta property="og:locale" content="vi_VN"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${title}"/>
  <meta name="twitter:description" content="Xem phieu ket qua va nhan xet giao vien danh cho hoc sinh."/>
  <meta name="twitter:image" content="https://thitong.site/og-phieu.png"/>
</head>
<body>
  <h1>${title}</h1>
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
