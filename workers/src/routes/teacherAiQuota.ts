import { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';
import { parseBody } from '../utils/helpers';

const TEACHER_DAILY_AI_LIMIT = 5;

const getBangkokDateKey = (date = new Date()): string => {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
};

const ensureTeacherAiQuotaTable = async (db: D1Database): Promise<void> => {
    await db.prepare(`
        CREATE TABLE IF NOT EXISTS teacher_ai_daily_usage (
            username TEXT NOT NULL,
            usage_date TEXT NOT NULL,
            used_count INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (username, usage_date)
        )
    `).run();

    await db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_teacher_ai_daily_usage_date
        ON teacher_ai_daily_usage(usage_date)
    `).run();
};

const getTeacherRole = async (db: D1Database, username: string): Promise<'admin' | 'teacher' | null> => {
    const row = await db.prepare('SELECT role FROM teachers WHERE username = ?').bind(username).first<{ role?: string }>();
    const role = String(row?.role || '').trim().toLowerCase();
    if (!role) return null;
    return role === 'admin' ? 'admin' : 'teacher';
};

const getUsedCount = async (db: D1Database, username: string, usageDate: string): Promise<number> => {
    const row = await db.prepare(`
        SELECT used_count
        FROM teacher_ai_daily_usage
        WHERE username = ?
          AND usage_date = ?
        LIMIT 1
    `).bind(username, usageDate).first<{ used_count?: number }>();

    const used = Number(row?.used_count || 0);
    return Number.isFinite(used) && used > 0 ? used : 0;
};

const buildQuotaPayload = (
    role: 'admin' | 'teacher',
    username: string,
    usageDate: string,
    usedCount: number
) => {
    if (role === 'admin') {
        return {
            username,
            role,
            usageDate,
            dailyLimit: null,
            usedCount: 0,
            remaining: null,
            canGenerate: true,
            unlimited: true,
        };
    }

    const remaining = Math.max(0, TEACHER_DAILY_AI_LIMIT - usedCount);
    return {
        username,
        role,
        usageDate,
        dailyLimit: TEACHER_DAILY_AI_LIMIT,
        usedCount,
        remaining,
        canGenerate: remaining > 0,
        unlimited: false,
    };
};

export async function handleTeacherAiQuotaRoutes(request: Request, env: Env, path: string, method: string): Promise<Response> {
    const db = env.DB;
    const url = new URL(request.url);

    if (path === '/api/teacher-ai-quota' && method === 'GET') {
        const username = String(url.searchParams.get('username') || '').trim();
        if (!username) return errorResponse('Missing username');

        const role = await getTeacherRole(db, username);
        if (!role) return errorResponse('Teacher account not found', 404);

        const usageDate = getBangkokDateKey();
        if (role === 'admin') {
            return jsonResponse({ status: 'success', data: buildQuotaPayload(role, username, usageDate, 0) });
        }

        await ensureTeacherAiQuotaTable(db);
        const usedCount = await getUsedCount(db, username, usageDate);

        return jsonResponse({
            status: 'success',
            data: buildQuotaPayload(role, username, usageDate, usedCount),
        });
    }

    if (path === '/api/teacher-ai-quota/consume' && method === 'POST') {
        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        const username = String(body.username || '').trim();
        if (!username) return errorResponse('Missing username');

        const role = await getTeacherRole(db, username);
        if (!role) return errorResponse('Teacher account not found', 404);

        const usageDate = getBangkokDateKey();
        if (role === 'admin') {
            return jsonResponse({ status: 'success', data: buildQuotaPayload(role, username, usageDate, 0) });
        }

        await ensureTeacherAiQuotaTable(db);
        const now = new Date().toISOString();

        await db.prepare(`
            INSERT INTO teacher_ai_daily_usage (username, usage_date, used_count, created_at, updated_at)
            VALUES (?, ?, 0, ?, ?)
            ON CONFLICT(username, usage_date) DO NOTHING
        `).bind(username, usageDate, now, now).run();

        const updateResult = await db.prepare(`
            UPDATE teacher_ai_daily_usage
            SET used_count = used_count + 1,
                updated_at = ?
            WHERE username = ?
              AND usage_date = ?
              AND used_count < ?
        `).bind(now, username, usageDate, TEACHER_DAILY_AI_LIMIT).run() as any;

        const changed = Number(updateResult?.meta?.changes || 0);
        const usedCount = await getUsedCount(db, username, usageDate);
        const payload = buildQuotaPayload(role, username, usageDate, usedCount);

        if (changed <= 0) {
            return jsonResponse({
                status: 'error',
                code: 'AI_DAILY_LIMIT_REACHED',
                message: `Ban da dung het ${TEACHER_DAILY_AI_LIMIT} luot tao de AI hom nay.`,
                data: payload,
            });
        }

        return jsonResponse({ status: 'success', data: payload });
    }

    return errorResponse('Not found: ' + path, 404);
}
