// Auth middleware - verify API token

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

    // 4. Verify token from header for REST API routes
    const headerToken = request.headers.get('X-API-Token') || request.headers.get('Authorization')?.replace('Bearer ', '');

    if (headerToken === env.API_SECRET_TOKEN) return null;

    // If no valid token in header, block the request
    return errorResponse('Unauthorized: Missing or invalid API token', 401);
}
