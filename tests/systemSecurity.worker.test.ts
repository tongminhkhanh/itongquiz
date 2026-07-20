import { describe, expect, it } from 'vitest';
import {
    generateTemporaryPassword,
    hashPasswordPbkdf2,
    isPbkdf2Password,
    validateNewPassword,
    verifyPasswordPbkdf2,
} from '../workers/src/utils/password';
import { verifyToken } from '../workers/src/middleware/auth';
import { internalErrorResponse } from '../workers/src/utils/internalError';
import { errorResponse } from '../workers/src/utils/response';
import { vi } from 'vitest';

describe('system security password storage', () => {
    it('stores a salted PBKDF2 record and verifies only the correct password', async () => {
        const first = await hashPasswordPbkdf2('Mat-khau-rat-manh-2026');
        const second = await hashPasswordPbkdf2('Mat-khau-rat-manh-2026');
        expect(isPbkdf2Password(first)).toBe(true);
        expect(first).not.toBe(second);
        expect(first).not.toContain('Mat-khau-rat-manh-2026');
        expect(first).toMatch(/^pbkdf2_sha256\$100000\$/);
        expect(await verifyPasswordPbkdf2('Mat-khau-rat-manh-2026', first)).toBe(true);
        expect(await verifyPasswordPbkdf2('sai-mat-khau', first)).toBe(false);
    });

    it('accepts the alternate dollar/base64 PBKDF2 encoding during migration', async () => {
        const password = 'Mat-khau-tuong-thich-2026';
        const salt = new Uint8Array(16).fill(7);
        const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
        const bits = await crypto.subtle.deriveBits(
            { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 },
            material,
            256,
        );
        const base64Url = (value: Uint8Array) => {
            let binary = '';
            for (const byte of value) binary += String.fromCharCode(byte);
            return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
        };
        const encoded = `$pbkdf2-sha256$100000$${base64Url(salt)}$${base64Url(new Uint8Array(bits))}`;

        expect(isPbkdf2Password(encoded)).toBe(true);
        expect(await verifyPasswordPbkdf2(password, encoded)).toBe(true);
        expect(await verifyPasswordPbkdf2('sai-mat-khau', encoded)).toBe(false);
    });

    it('generates a 20-character one-time password using the allowed alphabet', () => {
        const value = generateTemporaryPassword();
        expect(value).toHaveLength(20);
        expect(value).toMatch(/^[A-HJ-NP-Za-km-z2-9!@#$%]+$/);
    });

    it('enforces password length boundaries', () => {
        expect(validateNewPassword('123456789')).toBeTruthy();
        expect(validateNewPassword('1234567890')).toBeNull();
        expect(validateNewPassword('x'.repeat(129))).toBeTruthy();
    });

    it('routes account and admin management through JWT authorization', () => {
        const request = (path: string) => new Request(`https://quiz-api.thitong.site${path}`);
        expect(verifyToken(request('/api/account/me'), {} as any)).toBeNull();
        expect(verifyToken(request('/api/admin/teachers'), {} as any)).toBeNull();
        expect(verifyToken(request('/api/admin/announcements'), {} as any)).toBeNull();
    });

    it('does not accept the removed shared API token on unclassified routes', () => {
        const request = new Request('https://quiz-api.thitong.site/api/unclassified', {
            headers: { 'X-API-Token': 'old-shared-token' },
        });
        const result = verifyToken(request, {} as any);
        expect(result).toBeInstanceOf(Response);
        expect((result as Response).status).toBe(401);
    });

    it('allows AI routes to reach their JWT-validating handlers', () => {
        const request = new Request('https://quiz-api.thitong.site/api/ai/chat', { method: 'POST' });
        expect(verifyToken(request, {} as any)).toBeNull();
    });

    it('returns a generic 500 response with requestId while logging the original error', async () => {
        const request = new Request('https://quiz-api.thitong.site/api/failing', {
            headers: { 'x-request-id': 'req-security-1' },
        });
        const logger = { error: vi.fn() };
        const response = internalErrorResponse(
            new Error('D1_ERROR: no such table: teachers'),
            request,
            { context: 'system-security-test', logger },
        );
        const payload = await response.json() as any;

        expect(response.status).toBe(500);
        expect(payload).toEqual({
            status: 'error',
            message: 'Internal server error',
            requestId: 'req-security-1',
        });
        expect(JSON.stringify(payload)).not.toContain('teachers');
        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('requestId=req-security-1'),
            expect.any(Error),
        );
    });

    it('keeps explicit 4xx business messages unchanged', async () => {
        const response = errorResponse('Forbidden: Teacher access required', 403);
        await expect(response.json()).resolves.toEqual({
            status: 'error',
            message: 'Forbidden: Teacher access required',
        });
    });

});
