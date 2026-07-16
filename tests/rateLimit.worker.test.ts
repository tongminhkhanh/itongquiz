import { describe, expect, it, vi } from 'vitest';
import { ensureRateLimitTable, rateLimit } from '../workers/src/middleware/rateLimit';

class FakeStatement {
    bindings: unknown[] = [];
    constructor(readonly sql: string, private readonly firstResult: unknown, private readonly shouldThrow = false) {}
    bind(...values: unknown[]) { this.bindings = values; return this; }
    async first<T>(): Promise<T | null> {
        if (this.shouldThrow) throw new Error('D1 unavailable');
        return this.firstResult as T | null;
    }
    async run() {
        if (this.shouldThrow) throw new Error('D1 unavailable');
        return { success: true };
    }
}

function createEnv(firstResult: unknown, shouldThrow = false) {
    const statements: FakeStatement[] = [];
    const DB = {
        prepare: vi.fn((sql: string) => {
            const statement = new FakeStatement(sql, firstResult, shouldThrow);
            statements.push(statement);
            return statement;
        }),
    };
    return { env: { DB } as any, statements };
}

describe('D1 rate limiter production schema', () => {
    it('uses aggregate counters instead of a missing created_at column', async () => {
        const { env, statements } = createEnv({ count: 1, window_start: new Date().toISOString() });
        const response = await rateLimit(new Request('https://example.com/api/ai/test', {
            method: 'POST', headers: { 'CF-Connecting-IP': '1.2.3.4' },
        }), env, { maxRequests: 5 });

        expect(response).toBeNull();
        expect(statements[0].sql).toContain('INSERT INTO rate_limits (key, count, window_start, updated_at)');
        expect(statements[0].sql).not.toContain('created_at');
        expect(statements[0].bindings[0]).toBe('ratelimit:POST:/api/ai/test:1.2.3.4');
    });

    it('returns 429 after the limit is exceeded', async () => {
        const { env } = createEnv({ count: 6, window_start: new Date().toISOString() });
        const response = await rateLimit(new Request('https://example.com/api/ai/test'), env, { maxRequests: 5 });
        expect(response?.status).toBe(429);
    });

    it('fails open when D1 is unavailable', async () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const { env } = createEnv(null, true);
        await expect(rateLimit(new Request('https://example.com/api/ai/test'), env)).resolves.toBeNull();
        spy.mockRestore();
    });

    it('creates the aggregate schema for local setup', async () => {
        const { env, statements } = createEnv(null);
        await ensureRateLimitTable(env.DB as any);
        expect(statements[0].sql).toContain('key TEXT PRIMARY KEY');
        expect(statements[0].sql).not.toContain('created_at');
    });
});
