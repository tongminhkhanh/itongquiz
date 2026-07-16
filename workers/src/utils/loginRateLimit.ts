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

async function count(db: D1Database, key: string, since: number): Promise<number> {
    const row = await db.prepare(
        'SELECT COUNT(*) AS count FROM rate_limits WHERE key = ? AND created_at >= ?'
    ).bind(key, since).first<{ count: number }>();
    return Number(row?.count || 0);
}

export async function checkLoginLimit(request: Request, env: Env, username: string): Promise<Response | null> {
    const since = Date.now() - WINDOW_MS;
    const key = keys(request, username);
    try {
        const [accountCount, ipCount] = await Promise.all([
            count(env.DB, key.account, since),
            count(env.DB, key.ip, since),
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
    const now = Date.now();
    try {
        await env.DB.batch([
            env.DB.prepare('DELETE FROM rate_limits WHERE created_at < ?').bind(now - WINDOW_MS),
            env.DB.prepare('INSERT INTO rate_limits (key, created_at) VALUES (?, ?)').bind(key.account, now),
            env.DB.prepare('INSERT INTO rate_limits (key, created_at) VALUES (?, ?)').bind(key.ip, now),
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
