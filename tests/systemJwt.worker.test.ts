// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { signJWT } from '../workers/src/utils/jwt';
import { verifyJWTMiddleware } from '../workers/src/middleware/jwtAuth';

describe('teacher session version enforcement', () => {
    it('rejects legacy JWTs in enforce mode and accepts the current token version', async () => {
        const secret = 'a-test-secret-that-is-long-enough';
        const db = {
            prepare: () => ({ bind: () => ({ first: async () => ({ status: 'ACTIVE', token_version: 3 }) }) }),
        };
        const env = { DB: db, JWT_SECRET: secret, AUTH_MIGRATION_MODE: 'enforce' } as any;

        const legacy = await signJWT({ username: 'teacher-a', role: 'teacher' }, secret);
        const legacyResult = await verifyJWTMiddleware(new Request('https://test/api/results', {
            headers: { Authorization: `Bearer ${legacy}` },
        }), env);
        expect(legacyResult).toBeInstanceOf(Response);
        expect((legacyResult as Response).status).toBe(401);

        const current = await signJWT({ username: 'teacher-a', role: 'teacher', tokenVersion: 3, purpose: 'session' }, secret);
        const currentResult = await verifyJWTMiddleware(new Request('https://test/api/results', {
            headers: { Authorization: `Bearer ${current}` },
        }), env);
        expect(currentResult).not.toBeInstanceOf(Response);
    });
});
