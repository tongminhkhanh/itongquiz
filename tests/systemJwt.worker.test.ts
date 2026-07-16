// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { signJWT } from '../workers/src/utils/jwt';
import { verifyJWTMiddleware } from '../workers/src/middleware/jwtAuth';

describe('teacher session version enforcement', () => {
    it('rejects legacy JWTs in enforce mode and accepts the current token version', async () => {
        const secret = 'a-test-secret-that-is-long-enough';
        const db = {
            prepare: () => ({ bind: () => ({ first: async () => ({ status: 'ACTIVE', token_version: 3, must_change_password: 0 }) }) }),
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

    it('blocks every teacher route except password change while the account is pending', async () => {
        const secret = 'a-test-secret-that-is-long-enough';
        const db = {
            prepare: () => ({ bind: () => ({ first: async () => ({ status: 'ACTIVE', token_version: 1, must_change_password: 1 }) }) }),
        };
        const env = { DB: db, JWT_SECRET: secret, AUTH_MIGRATION_MODE: 'compat' } as any;
        const legacy = await signJWT({ username: 'teacher-a', role: 'teacher' }, secret);

        const blocked = await verifyJWTMiddleware(new Request('https://test/api/account/me', {
            headers: { Authorization: `Bearer ${legacy}` },
        }), env);
        expect(blocked).toBeInstanceOf(Response);
        expect((blocked as Response).status).toBe(403);
        await expect((blocked as Response).json()).resolves.toMatchObject({ message: 'Password change required' });

        const allowed = await verifyJWTMiddleware(new Request('https://test/api/account/change-password', {
            method: 'POST',
            headers: { Authorization: `Bearer ${legacy}` },
        }), env);
        expect(allowed).not.toBeInstanceOf(Response);
    });
});
