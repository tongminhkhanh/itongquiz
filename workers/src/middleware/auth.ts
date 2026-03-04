// Auth middleware - verify API token

import { errorResponse } from '../utils/response';
import { Env } from '../types';

export function verifyToken(request: Request, env: Env): Response | null {
    // Skip auth for OPTIONS (CORS preflight)
    if (request.method === 'OPTIONS') return null;

    // Get token from header or body
    const headerToken = request.headers.get('X-API-Token') || request.headers.get('Authorization')?.replace('Bearer ', '');

    if (headerToken === env.API_SECRET_TOKEN) return null;

    // Token will also be checked from body in the route handler for backwards compatibility
    return null; // Allow through - individual routes handle auth from body too
}
