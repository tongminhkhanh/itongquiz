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

    // 5. Allow public UI feature flags; writes are still protected in systemSettings.ts
    if (path === '/api/system-settings' && method === 'GET') return null;

    // 6. SECURITY: Student gamification routes use JWT authentication in route handlers.
    // Skip legacy token check here - JWT middleware will validate in each route handler.
    if (
        path.startsWith('/api/game-loop') ||
        path.startsWith('/api/game-state') ||
        path.startsWith('/api/pets') ||
        path.startsWith('/api/shop') ||
        path.startsWith('/api/leaderboard')
    ) return null;

    // 7. SECURITY: Login endpoints don't require auth (they create auth)
    if (path === '/api/login' || path === '/api/student-login') return null;

    // 8. SECURITY: Logout endpoint requires JWT (handled in route)
    if (path === '/api/logout') return null;

    // 9. SECURITY: Teacher management routes now use JWT authentication (handled in teachers.ts)
    if (path.startsWith('/api/teachers')) return null;

    // 10. SECURITY: Classroom routes now use JWT authentication (handled in classroom.ts)
    if (path.startsWith('/api/classes') || path.startsWith('/api/students') || path.startsWith('/api/assignments')) return null;

    // 11. SECURITY: Results, validation, and gift-shop routes now use JWT authentication in route handlers
    if (path.startsWith('/api/results') || path === '/api/validate') return null;
    if (path.startsWith('/api/gift-shop')) return null;

    // 12. SECURITY: Quiz/Questions routes - READ operations are public, WRITE operations use JWT (handled in quizzes.ts)
    if (path.startsWith('/api/quizzes') || path.startsWith('/api/questions')) return null;

    // 13. SECURITY: Live Exam routes use JWT authentication (handled in liveExam.ts)
    if (path.startsWith('/api/live-exam')) return null;

    // 14. SECURITY: Certificate routes use JWT authentication (handled in adminCertificates.ts / certificates.ts)
    if (path.startsWith('/api/admin/certificate-templates')) return null;
    if (path.startsWith('/api/certificate-batches') || path.startsWith('/api/certificates')) return null;

    // 14. Verify token from header for REST API routes (legacy auth for non-JWT routes)
    const headerToken = request.headers.get('X-API-Token') || request.headers.get('Authorization')?.replace('Bearer ', '');

    if (headerToken === env.API_SECRET_TOKEN) return null;

    // If no valid token in header, block the request
    return errorResponse('Unauthorized: Missing or invalid API token', 401);
}
