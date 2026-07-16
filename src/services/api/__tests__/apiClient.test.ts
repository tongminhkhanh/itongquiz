import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { executeApiAction } from '../apiClient';

const mockFetch = vi.fn() as MockedFunction<typeof fetch>;
vi.stubGlobal('fetch', mockFetch);

// Mock localStorage
const mockStorage: Record<string, string> = {};
vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
    (key: string) => mockStorage[key] ?? null,
);

function mockOk(body: unknown = {}) {
    mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(body), { status: 200 }),
    );
}
function mockError(status: number, body: unknown) {
    mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(body), { status }),
    );
}

beforeEach(() => {
    mockFetch.mockReset();
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
});

describe('executeApiAction — method and URL', () => {
    it('GET get_questions has no body, correct URL', async () => {
        mockOk([]);
        await executeApiAction('get_questions', { quizId: 'abc' });
        const [url, init] = mockFetch.mock.calls[0];
        expect(String(url)).toMatch('/api/questions?quizId=abc');
        expect((init as RequestInit).body).toBeUndefined();
        expect((init as RequestInit).method).toBe('GET');
    });

    it('DELETE delete_quiz has no body', async () => {
        mockOk();
        await executeApiAction('delete_quiz', { quizId: 'q1' });
        const [url, init] = mockFetch.mock.calls[0];
        expect(String(url)).toMatch('/api/quizzes/q1');
        expect((init as RequestInit).body).toBeUndefined();
        expect((init as RequestInit).method).toBe('DELETE');
    });

    it('PUT update_quiz sends JSON body', async () => {
        mockOk();
        await executeApiAction('update_quiz', { id: 'q2', title: 'Updated' });
        const [, init] = mockFetch.mock.calls[0];
        const body = JSON.parse((init as RequestInit).body as string);
        expect(body.title).toBe('Updated');
        expect((init as RequestInit).method).toBe('PUT');
    });
});

describe('executeApiAction — auth headers', () => {
    it('game-loop uses student JWT when both tokens present', async () => {
        mockStorage['itongquiz_jwt_token'] = 'student-tok';
        mockStorage['itongquiz_teacher_jwt_token'] = 'teacher-tok';
        mockOk({});
        await executeApiAction('get_game_loop_dashboard');
        const [, init] = mockFetch.mock.calls[0];
        const headers = (init as RequestInit).headers as Record<string, string>;
        expect(headers['Authorization']).toBe('Bearer student-tok');
    });

    it('teacher route uses teacher JWT when both tokens present', async () => {
        mockStorage['itongquiz_jwt_token'] = 'student-tok';
        mockStorage['itongquiz_teacher_jwt_token'] = 'teacher-tok';
        mockOk([]);
        await executeApiAction('get_teachers');
        const [, init] = mockFetch.mock.calls[0];
        const headers = (init as RequestInit).headers as Record<string, string>;
        expect(headers['Authorization']).toBe('Bearer teacher-tok');
    });

    it('AI route sends Bearer token (session policy)', async () => {
        mockStorage['itongquiz_teacher_jwt_token'] = 'teacher-tok';
        mockOk({});
        await executeApiAction('ai_chat', { message: 'hello' });
        const [, init] = mockFetch.mock.calls[0];
        const headers = (init as RequestInit).headers as Record<string, string>;
        expect(headers['Authorization']).toBe('Bearer teacher-tok');
    });

    it('uses an explicit one-time auth token without leaking it into the request body', async () => {
        mockStorage['itongquiz_teacher_jwt_token'] = 'stale-token';
        mockOk({ status: 'success', data: { token: 'new-session' } });
        await executeApiAction('change_password', {
            __authToken: 'password-change-token',
            newPassword: 'Mat-khau-moi-2026',
        });
        const [, init] = mockFetch.mock.calls[0];
        const headers = (init as RequestInit).headers as Record<string, string>;
        const body = JSON.parse((init as RequestInit).body as string);
        expect(headers.Authorization).toBe('Bearer password-change-token');
        expect(body.__authToken).toBeUndefined();
        expect(body.newPassword).toBe('Mat-khau-moi-2026');
    });
});

describe('executeApiAction — GAS body', () => {
    it('upsert_phieu body includes action and token without mutating payload', async () => {
        mockOk({});
        const orig = { submissionId: 's1' };
        await executeApiAction('upsert_phieu', orig);
        const [, init] = mockFetch.mock.calls[0];
        const body = JSON.parse((init as RequestInit).body as string);
        expect(body.action).toBe('upsert_phieu');
        expect(body.submissionId).toBe('s1');
        // Original not mutated
        expect(Object.keys(orig)).toEqual(['submissionId']);
    });
});

describe('executeApiAction — error handling', () => {
    it('throws correct message on 401', async () => {
        mockError(401, { message: 'Unauthorized' });
        await expect(executeApiAction('get_quizzes')).rejects.toThrow(
            'Không có quyền truy cập API (Authentication failed)',
        );
    });

    it('uses backend message for 4xx errors with message', async () => {
        mockError(400, { message: 'Validation failed' });
        await expect(executeApiAction('create_quiz', {})).rejects.toThrow('Validation failed');
    });

    it('throws network error on Failed to fetch', async () => {
        mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
        await expect(executeApiAction('get_quizzes')).rejects.toThrow(
            'Không thể kết nối mạng hoặc lỗi CORS',
        );
    });

    it('throws on unknown action', async () => {
        await expect(executeApiAction('not_an_action')).rejects.toThrow(
            'Unknown API action: not_an_action',
        );
    });
});
