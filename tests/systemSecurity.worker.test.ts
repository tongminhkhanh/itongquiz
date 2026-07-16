import { describe, expect, it } from 'vitest';
import {
    generateTemporaryPassword,
    hashPasswordPbkdf2,
    isPbkdf2Password,
    validateNewPassword,
    verifyPasswordPbkdf2,
} from '../workers/src/utils/password';
import { verifyToken } from '../workers/src/middleware/auth';

describe('system security password storage', () => {
    it('stores a salted PBKDF2 record and verifies only the correct password', async () => {
        const first = await hashPasswordPbkdf2('Mat-khau-rat-manh-2026');
        const second = await hashPasswordPbkdf2('Mat-khau-rat-manh-2026');
        expect(isPbkdf2Password(first)).toBe(true);
        expect(first).not.toBe(second);
        expect(first).not.toContain('Mat-khau-rat-manh-2026');
        expect(await verifyPasswordPbkdf2('Mat-khau-rat-manh-2026', first)).toBe(true);
        expect(await verifyPasswordPbkdf2('sai-mat-khau', first)).toBe(false);
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

});
