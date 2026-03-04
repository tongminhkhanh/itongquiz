// CORS middleware for Workers

const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:4173',
    'http://localhost:3000',
    'http://103.47.224.66:3000',
    'https://thitong.site',
    'https://www.thitong.site',
    'https://itongquiz1.vercel.app',
];

export function corsHeaders(request: Request): Record<string, string> {
    const origin = request.headers.get('Origin') || '';
    // Allow any origin in dev, check whitelist in prod
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
