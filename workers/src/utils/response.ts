// Response helpers for Workers API

export function jsonResponse<T>(data: T, status = 200, cacheSeconds = 0): Response {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (cacheSeconds > 0) {
        headers['Cache-Control'] = `public, max-age=${cacheSeconds}`;
    }
    return new Response(JSON.stringify(data), { status, headers });
}

export function successResponse<T>(data: T | null = null): Response {
    return jsonResponse({ status: 'success', data });
}

export function errorResponse(message: string, status = 400): Response {
    return jsonResponse({ status: 'error', message }, status);
}

// Generate short unique ID with prefix (matches GAS format)
export function generateId(prefix: string): string {
    const uuid = crypto.randomUUID().substring(0, 8);
    return `${prefix}-${uuid}`;
}

// SHA-256 hash for password (matches GAS hashPassword)
export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate random 6-char password (matches GAS)
export function generateRandomPassword(): string {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 6; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Sanitize input to prevent injection
export function sanitizeInput(str: unknown): string {
    if (typeof str !== 'string') return String(str ?? '');
    if (/^[=+\-@]/.test(str)) return `'${str}`;
    return str;
}
