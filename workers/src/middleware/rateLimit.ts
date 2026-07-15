// D1-backed fixed-window rate limiting for Cloudflare Workers.

import { Env } from '../types';
import { errorResponse } from '../utils/response';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: Request) => string;
}

interface RateLimitRow {
  count: number;
  window_start: string;
}

const DEFAULT_OPTIONS: RateLimitOptions = {
  windowMs: 60 * 1000,
  maxRequests: 60,
};

function getClientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP')
    || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    || 'unknown';
}

function getRateLimitKey(request: Request, options: RateLimitOptions): string {
  if (options.keyGenerator) return options.keyGenerator(request);
  const url = new URL(request.url);
  return `ratelimit:${request.method}:${url.pathname}:${getClientIp(request)}`;
}

/**
 * Counts the current request atomically in a fixed window.
 * The production schema stores one aggregate row per key:
 * key, count, window_start, updated_at.
 */
export async function rateLimit(
  request: Request,
  env: Env,
  options: Partial<RateLimitOptions> = {},
): Promise<Response | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const key = getRateLimitKey(request, opts);
  const now = new Date();
  const nowIso = now.toISOString();
  const cutoffIso = new Date(now.getTime() - opts.windowMs).toISOString();

  try {
    const row = await env.DB.prepare(`
      INSERT INTO rate_limits (key, count, window_start, updated_at)
      VALUES (?, 1, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        count = CASE
          WHEN rate_limits.window_start <= ? THEN 1
          ELSE rate_limits.count + 1
        END,
        window_start = CASE
          WHEN rate_limits.window_start <= ? THEN excluded.window_start
          ELSE rate_limits.window_start
        END,
        updated_at = excluded.updated_at
      RETURNING count, window_start
    `).bind(key, nowIso, nowIso, cutoffIso, cutoffIso).first<RateLimitRow>();

    if (Number(row?.count || 0) > opts.maxRequests) {
      return errorResponse('Too many requests. Please try again later.', 429);
    }

    return null;
  } catch (error) {
    console.error('[RateLimit] Error:', error);
    // Fail open so an unavailable limiter does not take down authentication or public APIs.
    return null;
  }
}

export async function ensureRateLimitTable(db: D1Database): Promise<void> {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      window_start TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    )
  `).run();
}
