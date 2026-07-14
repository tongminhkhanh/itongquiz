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

export function buildAuthHeaders(
    policy: AuthPolicy,
    path: string,
): Record<string, string> {
    const headers: Record<string, string> = {};

    if (policy === 'session') {
        const token = getStoredJWTToken(path);
        if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    // 'public': không gửi bất kỳ auth header nào
    // 'legacyToken': không gửi X-API-Token nữa (đã bỏ shared secret)
    // Chỉ giữ lại để tương thích ngược tạm thời

    return headers;
}
