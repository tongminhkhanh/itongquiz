const PBKDF2_PREFIX = '$pbkdf2-sha256$';
const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array): string {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function derivePassword(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
    const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
        material,
        HASH_BYTES * 8,
    );
    return new Uint8Array(bits);
}

export function isPbkdf2Password(value: string): boolean {
    return value.startsWith(PBKDF2_PREFIX);
}

export async function hashPasswordPbkdf2(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const hash = await derivePassword(password, salt, PBKDF2_ITERATIONS);
    return `${PBKDF2_PREFIX}${PBKDF2_ITERATIONS}$${bytesToBase64Url(salt)}$${bytesToBase64Url(hash)}`;
}

export async function verifyPasswordPbkdf2(password: string, encoded: string): Promise<boolean> {
    const parts = encoded.split('$');
    if (parts.length !== 5 || parts[1] !== 'pbkdf2-sha256') return false;
    const iterations = Number(parts[2]);
    if (!Number.isInteger(iterations) || iterations < 1) return false;
    try {
        const salt = base64UrlToBytes(parts[3]);
        const expected = base64UrlToBytes(parts[4]);
        const actual = await derivePassword(password, salt, iterations);
        if (actual.byteLength !== expected.byteLength) return false;
        const subtle = crypto.subtle as SubtleCrypto & {
            timingSafeEqual?: (a: ArrayBufferView, b: ArrayBufferView) => boolean;
        };
        if (subtle.timingSafeEqual) return subtle.timingSafeEqual(actual, expected);
        let difference = 0;
        for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
        return difference === 0;
    } catch {
        return false;
    }
}

export function validateNewPassword(password: unknown): string | null {
    if (typeof password !== 'string') return 'Mật khẩu mới không hợp lệ.';
    if (password.length < 10) return 'Mật khẩu phải có ít nhất 10 ký tự.';
    if (password.length > 128) return 'Mật khẩu không được vượt quá 128 ký tự.';
    return null;
}

export function generateTemporaryPassword(length = 20): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}
