import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getStoredJWTToken, buildAuthHeaders, getJWTPurpose } from '../auth';

const mockStorage: Record<string, string> = {};

beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
        (key: string) => mockStorage[key] ?? null,
    );
});

describe('getStoredJWTToken', () => {
    it('returns empty string when no tokens exist', () => {
        expect(getStoredJWTToken('/api/quizzes')).toBe('');
    });

    it('uses student token for game-loop routes even if teacher token exists', () => {
        mockStorage['itongquiz_jwt_token'] = 'student-tok';
        mockStorage['itongquiz_teacher_jwt_token'] = 'teacher-tok';
        expect(getStoredJWTToken('/api/game-loop/dashboard')).toBe('student-tok');
    });

    it('uses student token for /api/game-state routes', () => {
        mockStorage['itongquiz_jwt_token'] = 'student-tok';
        mockStorage['itongquiz_teacher_jwt_token'] = 'teacher-tok';
        expect(getStoredJWTToken('/api/game-state/attendance-status')).toBe('student-tok');
    });

    it('uses student token for /api/student-login exact match', () => {
        mockStorage['itongquiz_jwt_token'] = 'student-tok';
        mockStorage['itongquiz_teacher_jwt_token'] = 'teacher-tok';
        expect(getStoredJWTToken('/api/student-login')).toBe('student-tok');
    });

    it('uses teacher token for teacher routes', () => {
        mockStorage['itongquiz_jwt_token'] = 'student-tok';
        mockStorage['itongquiz_teacher_jwt_token'] = 'teacher-tok';
        expect(getStoredJWTToken('/api/teachers')).toBe('teacher-tok');
    });

    it('falls back to student token when no teacher token', () => {
        mockStorage['itongquiz_jwt_token'] = 'student-tok';
        expect(getStoredJWTToken('/api/quizzes')).toBe('student-tok');
    });

    it('swallows localStorage JSON parse errors and returns empty', () => {
        mockStorage['auth-storage'] = 'invalid json{';
        expect(getStoredJWTToken('/api/quizzes')).toBe('');
    });

    it('reads from auth-storage fallback', () => {
        mockStorage['auth-storage'] = JSON.stringify({ state: { token: 'fallback-tok' } });
        expect(getStoredJWTToken('/api/quizzes')).toBe('fallback-tok');
    });
});

describe('buildAuthHeaders', () => {
    it('builds Bearer header for session policy when token exists', () => {
        mockStorage['itongquiz_teacher_jwt_token'] = 'teacher-tok';
        const headers = buildAuthHeaders('session', '/api/teachers');
        expect(headers['Authorization']).toBe('Bearer teacher-tok');
        expect(headers['X-API-Token']).toBeUndefined();
    });

    it('returns no auth header for legacyToken policy (shared secret removed)', () => {
        const headers = buildAuthHeaders('legacyToken', '/api/announcements');
        expect(headers['Authorization']).toBeUndefined();
        expect(headers['X-API-Token']).toBeUndefined();
    });

    it('returns no auth header for session with no token', () => {
        const headers = buildAuthHeaders('session', '/api/quizzes');
        expect(headers['Authorization']).toBeUndefined();
    });
});

describe('getJWTPurpose', () => {
    it('detects a password-change token without trusting storage state', () => {
        const payload = btoa(JSON.stringify({ purpose: 'password_change' }))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
        expect(getJWTPurpose(`header.${payload}.signature`)).toBe('password_change');
        expect(getJWTPurpose('invalid-token')).toBeNull();
    });
});
