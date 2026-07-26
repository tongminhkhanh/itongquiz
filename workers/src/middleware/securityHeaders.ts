export function withSecurityHeaders(response: Response): Response {
    const headers = new Headers(response.headers);
    headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Referrer-Policy', 'no-referrer');
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    headers.set('Content-Security-Policy', "default-src 'none'; base-uri 'none'; frame-ancestors 'none'");

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}
