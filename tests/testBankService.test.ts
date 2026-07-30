import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuestionType, type Question } from '../src/types';

const { getWorkersApiBaseUrlMock } = vi.hoisted(() => ({
    getWorkersApiBaseUrlMock: vi.fn(),
}));

vi.mock('../src/services/api/config', () => ({
    getWorkersApiBaseUrl: getWorkersApiBaseUrlMock,
}));

import { testBankService } from '../src/services/testBankService';

const question = {
    id: 'question-1',
    type: QuestionType.MCQ,
    question: '2 + 2 = ?',
    options: ['4', '3', '5', '6'],
    correctAnswer: 'A',
} as Question;

beforeEach(() => {
    vi.restoreAllMocks();
    getWorkersApiBaseUrlMock.mockReset();
    getWorkersApiBaseUrlMock.mockReturnValue('https://phieu.thitong.site');
});

describe('testBankService', () => {
    it('loads a teacher test bank from the shared API base with cookie auth', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ items: [] }), { status: 200 }),
        );

        await expect(testBankService.getTestBank('teacher/admin')).resolves.toEqual([]);

        expect(fetchMock).toHaveBeenCalledWith(
            'https://phieu.thitong.site/api/test-bank/teacher/teacher%2Fadmin',
            { credentials: 'include' },
        );
    });

    it('saves a question with cookie auth and the expected JSON body', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ id: 'tb-server-id' }), { status: 200 }),
        );

        await expect(testBankService.saveQuestion('teacher-a', question, ['toan']))
            .resolves.toBe('tb-server-id');

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('https://phieu.thitong.site/api/test-bank');
        expect(init).toEqual(expect.objectContaining({
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
        }));
        expect(JSON.parse(String(init?.body))).toMatchObject({
            teacher_id: 'teacher-a',
            question_data: question,
            tags: ['toan'],
        });
    });

    it('deletes an encoded question id with cookie auth', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ status: 'success' }), { status: 200 }),
        );

        await expect(testBankService.deleteQuestion('tb/one')).resolves.toBe(true);

        expect(fetchMock).toHaveBeenCalledWith(
            'https://phieu.thitong.site/api/test-bank/tb%2Fone',
            { method: 'DELETE', credentials: 'include' },
        );
    });

    it('keeps the friendly connection error when fetch fails', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

        await expect(testBankService.getTestBank('teacher-a')).rejects.toThrow(
            'Lỗi kết nối đến server ngân hàng câu hỏi: Failed to fetch',
        );
    });
});
