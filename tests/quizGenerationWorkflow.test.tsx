import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuestionType, type Question } from '../src/types';
import { useQuizGeneration } from '../src/features/quiz-generator/hooks/useQuizGeneration';

const aiMocks = vi.hoisted(() => ({
  extractTextFromPdf: vi.fn(),
  generateQuiz: vi.fn(),
}));
const quotaMocks = vi.hoisted(() => ({
  refresh: vi.fn(async () => undefined),
}));

vi.mock('../src/services/geminiService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/services/geminiService')>();
  return {
    ...actual,
    extractTextFromPdf: aiMocks.extractTextFromPdf,
    generateQuiz: aiMocks.generateQuiz,
  };
});

vi.mock('../src/features/quiz-generator/hooks/useTeacherAiQuota', () => ({
  useTeacherAiQuota: () => ({
    aiUsageCount: 0,
    aiUsageRemaining: 5,
    hasAiQuota: true,
    dailyAiLimit: 5,
    consume: vi.fn(async () => true),
    refresh: quotaMocks.refresh,
  }),
}));

vi.mock('../src/features/quiz-generator/domain/quizCreationValidation', () => ({
  validateQuizGenerationInput: () => ({
    error: null,
    questionCount: 1,
    enabledTypes: [QuestionType.MCQ],
  }),
}));

vi.mock('../src/utils/toast', () => ({
  showError: vi.fn(),
}));

const makeForm = (uploadedFile: File | null = null) => ({
  quizMode: uploadedFile ? 'pdf' : 'exam',
  setQuizMode: vi.fn(),
  uploadedFile,
  topic: 'Phân số',
  classLevel: '4',
  selectedTypes: { [QuestionType.MCQ]: true },
  difficultyLevels: { level1: 1, level2: 0, level3: 0 },
  category: 'toan',
  content: 'Yêu cầu của giáo viên',
  aiProvider: 'llm-mux',
  quizTitle: 'Đề kiểm tra',
  promptProfile: { useThongTu27: true, learnerMode: 'default' },
  imageLibrary: [],
  customPrompt: '',
  manualTimeLimit: 15,
  requireCode: false,
  accessCode: '',
  showOnHome: false,
  tags: [],
  generatedQuiz: null,
  setAiDetectedCategory: vi.fn(),
  setAiDetectedLesson: vi.fn(),
  setAiSuggestedTags: vi.fn(),
  setGeneratedQuiz: vi.fn(),
});

const renderGeneration = (form: ReturnType<typeof makeForm>) => renderHook(() => useQuizGeneration({
  form: form as never,
  editingQuiz: null,
  isTeacherAccount: true,
  username: 'teacher-a',
  teacherName: 'Cô A',
}));

beforeEach(() => {
  vi.clearAllMocks();
  aiMocks.extractTextFromPdf.mockResolvedValue(`NỘI DUNG OCR ${'đủ dài '.repeat(30)}`);
  aiMocks.generateQuiz.mockResolvedValue({ title: 'Đề đã tạo', questions: [] });
});

describe('quiz AI workflow', () => {
  it('uses the same action id for OCR, generate and review context', async () => {
    const form = makeForm(new File(['pdf'], 'nguon.pdf', { type: 'application/pdf' }));
    const { result } = renderGeneration(form);

    await act(async () => {
      await result.current.handleGenerate('pdf');
    });

    const ocrContext = aiMocks.extractTextFromPdf.mock.calls[0][2];
    const generationContext = aiMocks.generateQuiz.mock.calls[0][8];
    expect(ocrContext.action.actionId).toBe(generationContext.action.actionId);
    expect(ocrContext.stage).toBe('OCR');
    expect(generationContext.stage).toBe('GENERATE');
    expect(generationContext.action.workflow).toBe('QUIZ_CREATE');
  });

  it('does not attach the original file after OCR succeeds', async () => {
    const form = makeForm(new File(['pdf'], 'nguon.pdf', { type: 'application/pdf' }));
    const { result } = renderGeneration(form);

    await act(async () => {
      await result.current.handleGenerate('pdf');
    });

    expect(aiMocks.generateQuiz.mock.calls[0][3]).toBeUndefined();
    expect(String(aiMocks.generateQuiz.mock.calls[0][2])).toContain('NỘI DUNG OCR');
  });

  it('uses a new QUESTION_REGENERATE action for a manual single-question retry', async () => {
    const form = makeForm();
    const { result } = renderGeneration(form);
    const question = {
      id: 'q-1',
      type: QuestionType.MCQ,
      question: '1 + 1 = ?',
      options: ['1', '2'],
      correctAnswer: 'B',
      explanation: 'Vì 1 + 1 = 2.',
      difficulty: 1,
    } as Question;

    await act(async () => {
      await result.current.handleRegenerateSingle(question);
    });

    const generationContext = aiMocks.generateQuiz.mock.calls[0][8];
    expect(generationContext.action.workflow).toBe('QUESTION_REGENERATE');
    expect(generationContext.stage).toBe('REGENERATE');
  });

  it('exposes cancellation for the active generation request', async () => {
    const form = makeForm();
    let receivedSignal: AbortSignal | undefined;
    aiMocks.generateQuiz.mockImplementation(async (...args: unknown[]) => {
      const context = args[8] as { signal?: AbortSignal };
      receivedSignal = context?.signal;
      await new Promise<void>((resolve) => {
        context.signal?.addEventListener('abort', () => resolve(), { once: true });
      });
      throw new DOMException('Aborted', 'AbortError');
    });
    const { result } = renderGeneration(form);

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.handleGenerate('exam');
    });
    await vi.waitFor(() => expect(receivedSignal).toBeDefined());

    act(() => result.current.cancelGeneration());
    await act(async () => pending);

    expect(receivedSignal?.aborted).toBe(true);
  });
});
