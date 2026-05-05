// Logout Route Handler
// Clears JWT authentication cookie

import { Env } from '../types';
import { jsonResponse } from '../utils/response';
import { clearJWTCookie } from '../utils/jwt';

export async function handleLogoutRoute(request: Request, env: Env): Promise<Response> {
    // Create success response
    const response = jsonResponse({
        status: 'success',
        message: 'Logged out successfully',
    });

    // Clear JWT cookie
    const headers = new Headers(response.headers);
    headers.append('Set-Cookie', clearJWTCookie());

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}
