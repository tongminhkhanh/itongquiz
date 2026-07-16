// CORS middleware for Workers

const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:4173',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
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

    const isProjectPreview = /^https:\/\/itongquiz1-[a-z0-9-]+-khanhs-projects-e97e400d\.vercel\.app$/i.test(normalizedOrigin);
    const isAllowed = ALLOWED_ORIGINS.includes(normalizedOrigin) || isProjectPreview;

    const headers: Record<string, string> = {
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        // SECURITY: Removed x-target-url and x-target-token to prevent SSRF abuse
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Token',
        'Access-Control-Allow-Credentials': 'true', // REQUIRED for JWT cookies with credentials: 'include'
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin',
    };
    if (isAllowed) headers['Access-Control-Allow-Origin'] = origin;
    return headers;
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
