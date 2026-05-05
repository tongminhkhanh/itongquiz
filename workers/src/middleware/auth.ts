// Auth middleware - verify API token or JWT
// MIGRATION NOTE: This middleware supports both legacy API token and new JWT authentication
// Game-loop routes now use JWT authentication exclusively

import { errorResponse } from '../utils/response';
import { Env } from '../types';

export function verifyToken(request: Request, env: Env): Response | null {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // 1. Skip auth for OPTIONS (CORS preflight)
    if (method === 'OPTIONS') return null;

    // 2. Allow legacy paths to be handled by body-based auth in handleLegacyGasRequest
    if (path === '/' || path === '/api/gas') return null;

    // 3. Allow public health check
    if (path === '/api/health') return null;

    // 4. Allow public visual announcements
    if (path === '/api/announcements' && method === 'GET') return null;

    // 5. SECURITY: Game-loop routes now use JWT authentication (handled in gameLoop.ts)
    // Skip legacy token check here - JWT middleware will validate in the route handler
    if (path.startsWith('/api/game-loop')) return null;

    // 6. SECURITY: Login endpoints don't require auth (they create auth)
    if (path === '/api/login' || path === '/api/student-login') return null;

    // 7. SECURITY: Logout endpoint requires JWT (handled in route)
    if (path === '/api/logout') return null;

    // 8. Verify token from header for REST API routes (legacy auth for non-JWT routes)
    const headerToken = request.headers.get('X-API-Token') || request.headers.get('Authorization')?.replace('Bearer ', '');

    if (headerToken === env.API_SECRET_TOKEN) return null;

    // If no valid token in header, block the request
    return errorResponse('Unauthorized: Missing or invalid API token', 401);
}
