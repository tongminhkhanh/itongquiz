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

});
