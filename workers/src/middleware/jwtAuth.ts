// JWT Authentication Middleware
// Validates JWT tokens and attaches user context to requests

import { Env } from '../types';
import { errorResponse } from '../utils/response';
import { extractJWTFromCookie, verifyJWT, JWTPayload } from '../utils/jwt';

// Extend Request type to include user context
export interface AuthenticatedRequest extends Request {
    user?: JWTPayload;
}

/**
 * Verify JWT token and attach user to request
 * Returns error response if JWT is invalid or missing
 * Returns null if JWT is valid (allows request to proceed)
 */
export async function verifyJWTMiddleware(
    request: Request,
    env: Env
): Promise<{ user: JWTPayload } | Response> {
    const token = extractJWTFromCookie(request);

    if (!token) {
        return errorResponse('Unauthorized: Missing authentication token', 401);
    }

    if (!env.JWT_SECRET) {
        console.error('[JWT Middleware] JWT_SECRET not configured');
        return errorResponse('Authentication service unavailable', 503);
    }

    const payload = await verifyJWT(token, env.JWT_SECRET);

    if (!payload) {
        return errorResponse('Unauthorized: Invalid or expired token', 401);
    }

    // Return user context to be attached to request
    return { user: payload };
}

/**
 * Check if user has admin role
 */
export function requireAdmin(user: JWTPayload): boolean {
    return user.role === 'admin';
}

/**
 * Check if user has teacher or admin role
 */
export function requireTeacher(user: JWTPayload): boolean {
    return user.role === 'admin' || user.role === 'teacher';
}

/**
 * Check if user owns the resource or is admin
 */
export function requireOwnership(user: JWTPayload, resourceOwner: string): boolean {
    return user.role === 'admin' || user.username === resourceOwner;
}

/**
 * Check if user is a student
 */
export function isStudent(user: JWTPayload): boolean {
    return user.role === 'student';
}
