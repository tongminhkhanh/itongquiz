// JWT utilities for authentication
// Uses jose library for Cloudflare Workers compatibility

import { SignJWT, jwtVerify } from 'jose';

export interface JWTPayload {
    username: string;
    role: 'student' | 'teacher' | 'admin';
    fullName?: string;
    classId?: string;
    iat?: number;
    exp?: number;
}

/**
 * Sign a JWT token with user information
 * @param payload User information to encode
 * @param secret JWT secret from environment
 * @param expiresIn Expiration time (default: 7 days)
 */
export async function signJWT(
    payload: Omit<JWTPayload, 'iat' | 'exp'>,
    secret: string,
    expiresIn: string = '7d'
): Promise<string> {
    const encoder = new TextEncoder();
    const secretKey = encoder.encode(secret);

    const jwt = await new SignJWT(payload as any)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(secretKey);

    return jwt;
}

/**
 * Verify and decode a JWT token
 * @param token JWT token to verify
 * @param secret JWT secret from environment
 * @returns Decoded payload or null if invalid
 */
export async function verifyJWT(
    token: string,
    secret: string
): Promise<JWTPayload | null> {
    try {
        const encoder = new TextEncoder();
        const secretKey = encoder.encode(secret);

        const { payload } = await jwtVerify(token, secretKey);

        return payload as JWTPayload;
    } catch (error) {
        console.error('[JWT] Verification failed:', error);
        return null;
    }
}

/**
 * Extract JWT from cookie header
 * @param request Request object
 * @returns JWT token or null
 */
export function extractJWTFromCookie(request: Request): string | null {
    const cookieHeader = request.headers.get('Cookie');
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(';').map(c => c.trim());
    const authCookie = cookies.find(c => c.startsWith('auth_token='));

    if (!authCookie) return null;

    return authCookie.split('=')[1];
}

/**
 * Create Set-Cookie header for JWT
 * @param token JWT token
 * @param maxAge Max age in seconds (default: 7 days)
 * @returns Set-Cookie header value
 */
export function createJWTCookie(token: string, maxAge: number = 7 * 24 * 60 * 60): string {
    return [
        `auth_token=${token}`,
        'HttpOnly',
        'Secure',
        'SameSite=Lax',
        `Max-Age=${maxAge}`,
        'Path=/',
    ].join('; ');
}

/**
 * Create Set-Cookie header to clear JWT
 * @returns Set-Cookie header value that clears the cookie
 */
export function clearJWTCookie(): string {
    return [
        'auth_token=',
        'HttpOnly',
        'Secure',
        'SameSite=Lax',
        'Max-Age=0',
        'Path=/',
    ].join('; ');
}
