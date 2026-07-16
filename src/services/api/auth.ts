import type { AuthPolicy } from './types';

/** Prefixes/exact paths that require the student JWT instead of the teacher JWT. */
const STUDENT_ROUTE_PREFIXES = [
    '/api/game-loop',
    '/api/game-state',
    '/api/pets',
    '/api/shop',
    '/api/leaderboard',
];
const STUDENT_ROUTE_EXACT = '/api/student-login';

export function getStoredJWTToken(path = ''): string {
    try {
        const studentToken = localStorage.getItem('itongquiz_jwt_token') || '';
        const teacherToken = localStorage.getItem('itongquiz_teacher_jwt_token') || '';

        const prefersStudentToken =
            STUDENT_ROUTE_PREFIXES.some(prefix => path.startsWith(prefix)) ||
            path === STUDENT_ROUTE_EXACT;

        if (prefersStudentToken && studentToken) return studentToken;
        if (teacherToken) return teacherToken;
        if (studentToken) return studentToken;

        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
            const parsed = JSON.parse(authStorage);
            if (parsed?.state?.token) return parsed.state.token;
        }

        const genericToken =
            localStorage.getItem('token') ||
            localStorage.getItem('jwt') ||
            localStorage.getItem('access_token') ||
            '';
        if (genericToken) return genericToken;

        return '';
    } catch {
        return '';
    }
}

export function getJWTPurpose(token: string | null | undefined): 'session' | 'password_change' | null {
    if (!token) return null;
    try {
        const segment = token.split('.')[1];
        if (!segment) return null;
        const padded = segment.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - segment.length % 4) % 4);
        const bytes = Uint8Array.from(atob(padded), char => char.charCodeAt(0));
        const payload = JSON.parse(new TextDecoder().decode(bytes));
        return payload?.purpose === 'password_change' ? 'password_change' : payload?.purpose === 'session' ? 'session' : null;
    } catch {
        return null;
    }
}

export function buildAuthHeaders(
    policy: AuthPolicy,
    path: string,
): Record<string, string> {
    const headers: Record<string, string> = {};

    if (policy === 'studentSession') {
        const token = localStorage.getItem('itongquiz_jwt_token') || '';
        if (token) headers['Authorization'] = `Bearer ${token}`;
    } else if (policy === 'session') {
        const token = getStoredJWTToken(path);
        if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    // 'public': không gửi bất kỳ auth header nào
    // 'legacyToken': không gửi X-API-Token nữa (đã bỏ shared secret)
    // Chỉ giữ lại để tương thích ngược tạm thời

    return headers;
}
