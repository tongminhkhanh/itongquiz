// CORS middleware for Workers

const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:4173',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://103.47.224.66:3000',
    'http://103.47.224.66:3001',
    'http://103.47.224.66:3002',
    'https://thitong.site',
    'https://www.thitong.site',
    'https://itongquiz1.vercel.app',
];


export function corsHeaders(request: Request): Record<string, string> {
    const origin = request.headers.get('Origin') || '';
    const normalizedOrigin = origin.replace(/\/$/, '');

    const isAllowed = ALLOWED_ORIGINS.includes(normalizedOrigin);

    const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0];

    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        // SECURITY: Removed x-target-url and x-target-token to prevent SSRF abuse
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Token',
        'Access-Control-Max-Age': '86400',
    };
}

export function handleCors(request: Request): Response | null {
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: corsHeaders(request),
        });
    }
    return null;
}
