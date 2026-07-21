import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Quiz } from '../src/types';
import { QuestionType } from '../src/types';
import { useAssignmentStore } from '../src/stores/useAssignmentStore';
import { useClassStore } from '../src/stores/useClassStore';
import { useAuthStore } from '../stores/authStore';
import {
    consumeTeacherAiQuota,
    getTeacherAiQuota,
} from '../src/services/teacherAiQuotaService';
import { generateQuiz } from '../src/services/geminiService';
import { showError } from '../src/utils/toast';

vi.mock('../src/services/geminiService', async () => {
    const actual = await vi.importActual<typeof import('../src/services/geminiService')>('../src/services/geminiService');
    return {
        ...actual,
        extractTextFromPdf: vi.fn(),
        generateQuiz: vi.fn(),
    };
});

vi.mock('../src/services/trangNguyenGeminiService', () => ({
    generateTrangNguyenQuiz: vi.fn(),
}));

vi.mock('../src/services/teacherAiQuotaService', () => ({
    getTeacherAiQuota: vi.fn(),
    consumeTeacherAiQuota: vi.fn(),
}));

vi.mock('../src/utils/toast', () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
}));

import { useCreateQuizLogic } from '../src/features/quiz-generator/hooks/useCreateQuizLogic';

const mockedGetQuota = vi.mocked(getTeacherAiQuota);
const mockedConsumeQuota = vi.mocked(consumeTeacherAiQuota);
const mockedGenerateQuiz = vi.mocked(generateQuiz);
const mockedShowError = vi.mocked(showError);

function resetStores(addAssignment = vi.fn(async () => null)) {
    useAuthStore.setState({
        isLoggedIn: true,
        username: 'teacher_test',
        teacherName: 'Teacher Test',
        isAdmin: false,
        teacherClass: '4A',
        token: 'test-token',
        isLoggingIn: false,
        loginError: false,
    });

    useClassStore.setState({
        classes: [],
        isLoading: false,
        error: null,
        fetchClasses: vi.fn(async () => undefined),
        addClass: vi.fn(async () => null),
        removeClass: vi.fn(async () => true),
        restoreClass: vi.fn(async () => true),
        clearError: vi.fn(),
    });

    useAssignmentStore.setState({
        assignments: [],
        isLoading: false,
        error: null,
        fetchAssignments: vi.fn(async () => undefined),
        fetchTeacherAssignments: vi.fn(async () => undefined),
        fetchAllAssignments: vi.fn(async () => undefined),
        fetchStudentAssignments: vi.fn(async () => undefined),
        addAssignment,
        removeAssignment: vi.fn(async () => true),
        updateAssignmentDeadline: vi.fn(async () => true),
        updateAssignmentStatus: vi.fn(async () => true),
        startAssignmentAttempt: vi.fn(async () => true),
        resetAssignments: vi.fn(),
        clearError: vi.fn(),
    });
}

const createManualQuiz = (title: string): Quiz => ({
    id: `quiz-manual-${title.toLowerCase().replace(/\s+/g, '-')}`,
    title,
    classLevel: '4A',
    timeLimit: 15,
    questions: [],
    createdAt: '2026-07-21T00:00:00.000Z',
    createdBy: 'Teacher Test',
    category: 'toan',
    tags: [],
    requireCode: false,
    showOnHome: true,
});

function renderCreationHook(overrides: Partial<{
    editingQuiz: Quiz | null;
    onSaveQuiz: (quiz: Quiz) => Promise<void>;
    onUpdateQuiz: (quiz: Quiz) => Promise<void>;
    onSuccess: () => void;
}> = {}) {
    const options = {
        editingQuiz: null,
        onSaveQuiz: vi.fn(async () => undefined),
        onUpdateQuiz: vi.fn(async () => undefined),
        onSuccess: vi.fn(),
        ...overrides,
    };

    return {
        options,
        ...renderHook(() => useCreateQuizLogic(options)),
    };
}

describe('quiz creation workflows', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        mockedGetQuota.mockResolvedValue({
            username: 'teacher_test',
            role: 'teacher',
            usageDate: '2026-07-18',
            dailyLimit: 5,
            usedCount: 1,
            remaining: 4,
            canGenerate: true,
            unlimited: false,
        });
        mockedConsumeQuota.mockResolvedValue({
            username: 'teacher_test',
            role: 'teacher',
            usageDate: '2026-07-18',
            dailyLimit: 5,
            usedCount: 2,
            remaining: 3,
            canGenerate: true,
            unlimited: false,
        });
        mockedGenerateQuiz.mockResolvedValue({
            title: 'Generated fractions quiz',
            timeLimit: 20,
            questions: [{
                id: 'q-1',
                type: QuestionType.MCQ,
                question: '1/2 + 1/2 = ?',
                options: ['0', '1', '2', '3'],
                correctAnswer: 'B',
            }],
        });
        resetStores();
    });

    it('validates before consuming quota or calling the AI service', async () => {
        const { result } = renderCreationHook();

        await act(async () => result.current.handleGenerate('practice'));

        expect(mockedShowError).toHaveBeenCalledWith('Vui lòng nhập chủ đề bài học');
        expect(mockedConsumeQuota).not.toHaveBeenCalled();
        expect(mockedGenerateQuiz).not.toHaveBeenCalled();
    });

    it('consumes quota and stores the generated quiz', async () => {
        const { result } = renderCreationHook();
        act(() => {
            result.current.setTopic('Fractions');
            result.current.setQuizTitle('Fractions review');
        });

        await act(async () => result.current.handleGenerate('practice'));

        expect(mockedConsumeQuota).toHaveBeenCalledWith('teacher_test');
        expect(mockedGenerateQuiz).toHaveBeenCalledTimes(1);
        expect(result.current.generatedQuiz).toEqual(expect.objectContaining({
            title: 'Generated fractions quiz',
            classLevel: '4A',
            timeLimit: 20,
            questions: [expect.objectContaining({ id: 'q-1' })],
        }));
        expect(result.current.aiUsageCount).toBe(2);
        expect(result.current.isGenerating).toBe(false);
        expect(result.current.generationStep).toBe('completed');
    });

    it('does not call the AI service when quota consumption fails', async () => {
        mockedConsumeQuota.mockRejectedValueOnce(new Error('Daily quota reached'));
        const { result } = renderCreationHook();
        act(() => result.current.setTopic('Fractions'));

        await act(async () => result.current.handleGenerate('practice'));

        expect(mockedGenerateQuiz).not.toHaveBeenCalled();
        expect(mockedShowError).toHaveBeenCalledWith('Daily quota reached');
    });

    it('saves a manual quiz, opens the link modal and resets the form', async () => {
        const onSaveQuiz = vi.fn(async () => undefined);
        const onSuccess = vi.fn();
        const { result } = renderCreationHook({ onSaveQuiz, onSuccess });

        act(() => {
            result.current.setQuizTitle('Manual quiz');
            result.current.setGeneratedQuiz(createManualQuiz('Manual quiz'));
        });
        const createdQuiz = result.current.generatedQuiz;
        expect(createdQuiz).not.toBeNull();

        await act(async () => result.current.handleSaveQuiz());

        expect(onSaveQuiz).toHaveBeenCalledWith(createdQuiz);
        expect(onSuccess).toHaveBeenCalledTimes(1);
        expect(result.current.showLinkModal).toBe(true);
        expect(result.current.savedQuizLink).toContain(`?quiz=${createdQuiz?.id}`);
        expect(result.current.generatedQuiz).toBeNull();
        expect(result.current.quizTitle).toBe('');
    });

    it('creates an assignment after saving when assignment options are enabled', async () => {
        const addAssignment = vi.fn(async () => null);
        resetStores(addAssignment);
        const { result } = renderCreationHook();

        act(() => {
            result.current.setQuizTitle('Assigned quiz');
            result.current.setAssignToClass(true);
            result.current.setSelectedClassId('class-4a');
            result.current.setDeadline('2026-07-25');
            result.current.setMaxAttempts(2);
            result.current.setGeneratedQuiz(createManualQuiz('Assigned quiz'));
        });

        await act(async () => result.current.handleSaveQuiz());

        expect(addAssignment).toHaveBeenCalledWith(expect.objectContaining({
            classId: 'class-4a',
            quizId: expect.any(String),
            quizTitle: 'Assigned quiz',
            type: 'quiz',
            settings: expect.objectContaining({ maxAttempts: 2 }),
        }));
    });

    it('uses the update callback when editing an existing quiz', async () => {
        const editingQuiz: Quiz = {
            id: 'quiz-existing',
            title: 'Existing quiz',
            classLevel: '4A',
            timeLimit: 15,
            questions: [],
            createdAt: '2026-07-01T00:00:00.000Z',
        };
        const onSaveQuiz = vi.fn(async () => undefined);
        const onUpdateQuiz = vi.fn(async () => undefined);
        const { result } = renderCreationHook({ editingQuiz, onSaveQuiz, onUpdateQuiz });

        await waitFor(() => expect(result.current.generatedQuiz?.id).toBe('quiz-existing'));
        await act(async () => result.current.handleSaveQuiz());

        expect(onUpdateQuiz).toHaveBeenCalledWith(expect.objectContaining({ id: 'quiz-existing' }));
        expect(onSaveQuiz).not.toHaveBeenCalled();
    });
});
