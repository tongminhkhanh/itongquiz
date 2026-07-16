import { Env } from '../types';
import { errorResponse } from './response';

const WINDOW_MS = 15 * 60 * 1000;
const ACCOUNT_LIMIT = 10;
const IP_LIMIT = 100;

function clientIp(request: Request): string {
    return request.headers.get('CF-Connecting-IP')
        || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
        || 'unknown';
}

function keys(request: Request, username: string): { account: string; ip: string } {
    const ip = clientIp(request);
    return {
        account: `login-failure:account:${ip}:${username.trim().toLowerCase()}`,
        ip: `login-failure:ip:${ip}`,
    };
}

async function count(db: D1Database, key: string, cutoffIso: string): Promise<number> {
    const row = await db.prepare(
        'SELECT count, window_start FROM rate_limits WHERE key = ? LIMIT 1'
    ).bind(key).first<{ count: number; window_start: string }>();
    if (!row || !row.window_start || row.window_start <= cutoffIso) return 0;
    return Number(row.count || 0);
}

function incrementStatement(db: D1Database, key: string, nowIso: string, cutoffIso: string): D1PreparedStatement {
    return db.prepare(`
        INSERT INTO rate_limits (key, count, window_start, updated_at)
        VALUES (?, 1, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
            count = CASE WHEN rate_limits.window_start <= ? THEN 1 ELSE rate_limits.count + 1 END,
            window_start = CASE WHEN rate_limits.window_start <= ? THEN excluded.window_start ELSE rate_limits.window_start END,
            updated_at = excluded.updated_at
    `).bind(key, nowIso, nowIso, cutoffIso, cutoffIso);
}

export async function checkLoginLimit(request: Request, env: Env, username: string): Promise<Response | null> {
    const cutoffIso = new Date(Date.now() - WINDOW_MS).toISOString();
    const key = keys(request, username);
    try {
        const [accountCount, ipCount] = await Promise.all([
            count(env.DB, key.account, cutoffIso),
            count(env.DB, key.ip, cutoffIso),
        ]);
        if (accountCount >= ACCOUNT_LIMIT || ipCount >= IP_LIMIT) {
            return errorResponse('Quá nhiều lần đăng nhập không thành công. Vui lòng thử lại sau.', 429);
        }
    } catch (error) {
        console.error('[LoginRateLimit] Check failed:', error);
    }
    return null;
}

export async function recordLoginFailure(request: Request, env: Env, username: string): Promise<void> {
    const key = keys(request, username);
    const now = new Date();
    const nowIso = now.toISOString();
    const cutoffIso = new Date(now.getTime() - WINDOW_MS).toISOString();
    try {
        await env.DB.batch([
            incrementStatement(env.DB, key.account, nowIso, cutoffIso),
            incrementStatement(env.DB, key.ip, nowIso, cutoffIso),
        ]);
    } catch (error) {
        console.error('[LoginRateLimit] Record failed:', error);
    }
}

export async function clearLoginFailures(request: Request, env: Env, username: string): Promise<void> {
    const key = keys(request, username);
    try {
        await env.DB.prepare('DELETE FROM rate_limits WHERE key = ?').bind(key.account).run();
    } catch (error) {
        console.error('[LoginRateLimit] Clear failed:', error);
    }
}
