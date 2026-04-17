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
    
    // Check if origin is in whitelist or is from your specific network
    const isAllowed = ALLOWED_ORIGINS.includes(normalizedOrigin) || 
                     normalizedOrigin.includes('103.47.224.66');
    
    const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0];

    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Token, x-target-url, x-target-token',
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
