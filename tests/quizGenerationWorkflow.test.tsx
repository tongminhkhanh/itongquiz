import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuestionType, type Question } from '../src/types';
import { useQuizGeneration } from '../src/features/quiz-generator/hooks/useQuizGeneration';
import type { OcrDocument } from '../src/services/ai/schemas/ocrDocumentSchema';
import { GeneratedQuizSchema } from '../src/services/ai/schemas/quizGenerationSchema';
import { GENERATED_QUIZ_SCHEMA_USER_MESSAGE } from '../src/services/ai/quizGenerationErrors';
import { showError } from '../src/utils/toast';

const aiMocks = vi.hoisted(() => ({
  extractTextFromPdf: vi.fn(),
  generateQuiz: vi.fn(),
  generateImage: vi.fn(),
  finalizeAiAction: vi.fn(async () => true),
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

vi.mock('../src/services/imageGenerationService', () => ({
  generateImage: aiMocks.generateImage,
}));

vi.mock('../src/services/ai/aiActionFinalization', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/services/ai/aiActionFinalization')>();
  return {
    ...actual,
    finalizeAiAction: aiMocks.finalizeAiAction,
  };
});

vi.mock('../src/features/quiz-generator/hooks/useTeacherAiQuota', () => ({
  useTeacherAiQuota: () => ({
    aiUsageCount: 0,
    aiUsageRemaining: 5,
    hasAiQuota: true,
    dailyAiLimit: 5,
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

const showErrorMock = vi.mocked(showError);

const makeOcrDocument = (): OcrDocument => ({
  pages: [
    { pageNumber: 1, text: `NỘI DUNG OCR TRANG 1 ${'đủ dài '.repeat(20)}` },
    { pageNumber: 2, text: `NỘI DUNG OCR TRANG 2 ${'bổ sung '.repeat(20)}` },
    { pageNumber: 3, text: `NỘI DUNG OCR TRANG 3 ${'kiến thức '.repeat(20)}` },
  ],
  warnings: [],
  wasTruncated: false,
});

const makeForm = (uploadedFile: File | null = null) => {
  const form = {
    quizMode: uploadedFile ? 'pdf' : 'exam',
    setQuizMode: vi.fn(),
    quizIntent: 'EXAM',
    setQuizIntent: vi.fn(),
    uploadedFile,
    ocrDocument: null as OcrDocument | null,
    selectedOcrPageNumbers: [] as number[],
    applyOcrDocument: vi.fn((document: OcrDocument) => {
      form.ocrDocument = document;
      form.selectedOcrPageNumbers = document.pages.map((page) => page.pageNumber);
    }),
    clearOcrDocument: vi.fn(() => {
      form.ocrDocument = null;
      form.selectedOcrPageNumbers = [];
    }),
    topic: 'Phân số',
    classLevel: '4',
    selectedTypes: { [QuestionType.MCQ]: true },
    questionTypeAllocations: [{ type: QuestionType.MCQ, count: 1 }],
    difficultyLevels: { level1: 1, level2: 0, level3: 0 },
    category: 'toan',
    content: 'Yêu cầu của giáo viên',
    aiProvider: 'llm-mux',
    quizTitle: 'Đề kiểm tra',
    promptProfile: { useThongTu27: true, learnerMode: 'default' },
    explanationDetail: 'concise',
    reviewMode: 'fast',
    imageLibrary: [],
    customPrompt: '',
    manualTimeLimit: 15,
    requireCode: false,
    accessCode: '',
    showOnHome: false,
    tags: [],
    generatedQuiz: null as any,
    setAiDetectedCategory: vi.fn(),
    setAiDetectedLesson: vi.fn(),
    setAiSuggestedTags: vi.fn(),
    setGeneratedQuiz: vi.fn((next: any) => {
      form.generatedQuiz = typeof next === 'function' ? next(form.generatedQuiz) : next;
    }),
  };
  return form;
};

const renderGeneration = (
  form: ReturnType<typeof makeForm>,
  aiQuizV2Enabled = true,
) => renderHook(() => useQuizGeneration({
  form: form as never,
  editingQuiz: null,
  isTeacherAccount: true,
  username: 'teacher-a',
  teacherName: 'Cô A',
  aiQuizV2Enabled,
  aiBlueprintV3Enabled: false,
}));

const prepareAndGeneratePdf = async (
  result: ReturnType<typeof renderGeneration>['result'],
): Promise<void> => {
  await act(async () => {
    await result.current.handleGenerate('pdf');
  });
  await act(async () => {
    await result.current.handleGenerate('pdf');
  });
};

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv('VITE_FEATURE_AI_FAST_PATH', 'true');
  vi.stubEnv('VITE_FEATURE_AI_DEFER_IMAGES', 'true');
  vi.clearAllMocks();
  aiMocks.extractTextFromPdf.mockResolvedValue(makeOcrDocument());
  aiMocks.generateQuiz.mockResolvedValue({ title: 'Đề đã tạo', questions: [] });
  aiMocks.generateImage.mockResolvedValue({ success: true, data: 'https://img.test/default.png' });
});

describe('quiz AI workflow', () => {
  it('exposes generation start time and question count', async () => {
    const form = makeForm();
    const { result } = renderGeneration(form);

    expect(result.current.generationStartedAt).toBeNull();
    expect(result.current.questionCount).toBe(1);

    await act(async () => {
      await result.current.handleGenerate('exam');
    });

    expect(result.current.generationStartedAt).toEqual(expect.any(Number));
    const generationActionId = aiMocks.generateQuiz.mock.calls[0][8].action.actionId;
    expect(aiMocks.finalizeAiAction).toHaveBeenCalledWith(
      generationActionId,
      { outcome: 'SUCCEEDED' },
    );
  });

  it('uses the same action id for OCR and generate after page review', async () => {
    const form = makeForm(new File(['pdf'], 'nguon.pdf', { type: 'application/pdf' }));
    const { result } = renderGeneration(form);

    await prepareAndGeneratePdf(result);

    const ocrContext = aiMocks.extractTextFromPdf.mock.calls[0][2];
    const generationContext = aiMocks.generateQuiz.mock.calls[0][8];
    expect(ocrContext.action.actionId).toBe(generationContext.action.actionId);
    expect(ocrContext.stage).toBe('OCR');
    expect(generationContext.stage).toBe('GENERATE');
    expect(generationContext.action.workflow).toBe('QUIZ_CREATE');
    expect(form.applyOcrDocument).toHaveBeenCalledOnce();
  });

  it('does not attach the original file after OCR succeeds', async () => {
    const form = makeForm(new File(['pdf'], 'nguon.pdf', { type: 'application/pdf' }));
    const { result } = renderGeneration(form);

    await prepareAndGeneratePdf(result);

    expect(aiMocks.generateQuiz.mock.calls[0][3]).toBeUndefined();
    expect(String(aiMocks.generateQuiz.mock.calls[0][2])).toContain('=== TRANG 1 ===');
  });

  it('generates from selected OCR pages only', async () => {
    const form = makeForm(new File(['pdf'], 'nguon.pdf', { type: 'application/pdf' }));
    const { result } = renderGeneration(form);

    await act(async () => {
      await result.current.handleGenerate('pdf');
    });
    form.selectedOcrPageNumbers = [1, 3];
    await act(async () => {
      await result.current.handleGenerate('pdf');
    });

    const content = String(aiMocks.generateQuiz.mock.calls[0][2]);
    expect(content).toContain('=== TRANG 1 ===');
    expect(content).toContain('=== TRANG 3 ===');
    expect(content).not.toContain('=== TRANG 2 ===');
  });

  it('keeps the legacy PDF flow callable in one action when V2 is disabled', async () => {
    const form = makeForm(new File(['pdf'], 'nguon.pdf', { type: 'application/pdf' }));
    const { result } = renderGeneration(form, false);

    await act(async () => {
      await result.current.handleGenerate('pdf');
    });

    expect(aiMocks.extractTextFromPdf).toHaveBeenCalledOnce();
    expect(aiMocks.generateQuiz).toHaveBeenCalledOnce();
    expect(aiMocks.generateQuiz.mock.calls[0][3]).toBeUndefined();
  });

  it('uses strict review and blocking images when rollout flags are off', async () => {
    vi.stubEnv('VITE_FEATURE_AI_FAST_PATH', 'false');
    vi.stubEnv('VITE_FEATURE_AI_DEFER_IMAGES', 'false');
    aiMocks.generateQuiz.mockResolvedValue({
      title: 'Đề rollback',
      questions: [{
        id: 'image-q',
        type: QuestionType.IMAGE_QUESTION,
        question: 'Nhìn hình và chọn đáp án',
        image: 'IMAGE_PROMPT: hình tam giác',
        options: ['Tam giác', 'Hình tròn'],
        correctAnswer: 'A',
        explanation: 'Đây là tam giác.',
        difficulty: 1,
      }],
    });
    aiMocks.generateImage.mockResolvedValue({ success: true, data: 'https://img.test/blocking.png' });
    const form = makeForm();
    const { result } = renderGeneration(form);

    await act(async () => {
      await result.current.handleGenerate('exam');
    });

    expect(aiMocks.generateQuiz.mock.calls[0][4]).toMatchObject({ reviewMode: 'strict' });
    expect(aiMocks.generateImage).toHaveBeenCalledOnce();
    expect(form.generatedQuiz.questions[0].image).toBe('https://img.test/blocking.png');
    expect(result.current.isHydratingImages).toBe(false);
    expect(result.current.generationStep).toBe('completed');
  });

  it('shows the quiz before image generation finishes and hydrates the image in place', async () => {
    let resolveImage!: (value: { success: boolean; data: string }) => void;
    aiMocks.generateQuiz.mockResolvedValue({
      title: 'Đề có ảnh',
      questions: [{
        id: 'image-q',
        type: QuestionType.IMAGE_QUESTION,
        question: 'Nhìn hình và chọn đáp án',
        image: 'IMAGE_PROMPT: hình vuông màu xanh',
        options: ['Hình vuông', 'Hình tròn'],
        correctAnswer: 'A',
        explanation: 'Đây là hình vuông.',
        difficulty: 1,
      }],
    });
    aiMocks.generateImage.mockImplementation(() => new Promise((resolve) => {
      resolveImage = resolve;
    }));
    const form = makeForm();
    const { result } = renderGeneration(form);

    await act(async () => {
      await result.current.handleGenerate('exam');
    });

    expect(form.generatedQuiz.questions[0].image).toContain('placehold.co');
    expect(result.current.isHydratingImages).toBe(true);
    expect(result.current.generationStep).toBe('generating_images');
    await vi.waitFor(() => expect(aiMocks.generateImage).toHaveBeenCalledOnce());
    const imageContext = aiMocks.generateImage.mock.calls[0][1];
    const generationContext = aiMocks.generateQuiz.mock.calls[0][8];
    expect(imageContext.action.actionId).toBe(generationContext.action.actionId);
    expect(imageContext.stage).toBe('IMAGE');

    await act(async () => {
      resolveImage({ success: true, data: 'https://img.test/final.png' });
      await Promise.resolve();
    });

    await vi.waitFor(() => expect(result.current.isHydratingImages).toBe(false));
    expect(result.current.generationStep).toBe('completed');
    expect(form.generatedQuiz.questions[0].image).toBe('https://img.test/final.png');
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

  it('shows a concise message instead of raw schema issue JSON', async () => {
    const form = makeForm();
    const schemaResult = GeneratedQuizSchema.safeParse({
      title: 'Đề lỗi',
      questions: [{
        type: QuestionType.CATEGORIZATION,
        question: 'Phân loại',
        categories: [
          { id: 'nhom-1', name: 'Nhóm 1' },
          { id: 'nhom-2', name: 'Nhóm 2' },
        ],
        items: [{ id: 'item-1', content: 'Mục lỗi', categoryId: '' }],
        explanation: 'Giải thích.',
        difficultyLevel: 1,
      }],
    });
    if (schemaResult.success) throw new Error('Expected schema fixture to be invalid.');
    aiMocks.generateQuiz.mockRejectedValue(schemaResult.error);
    const { result } = renderGeneration(form);

    await act(async () => {
      await result.current.handleGenerate('exam');
    });

    expect(showErrorMock).toHaveBeenCalledWith(GENERATED_QUIZ_SCHEMA_USER_MESSAGE);
    expect(String(showErrorMock.mock.calls[0][0])).not.toContain('too_small');
    expect(String(showErrorMock.mock.calls[0][0])).not.toContain('questions');
    expect(String(showErrorMock.mock.calls[0][0])).not.toMatch(/^\s*\[/);
    expect(aiMocks.finalizeAiAction).toHaveBeenCalledWith(
      expect.any(String),
      {
        outcome: 'FAILED',
        failureCode: 'CLIENT_SCHEMA_INVALID',
      },
    );
  });

  it('preserves actionable messages for non-schema generation errors', async () => {
    const form = makeForm();
    aiMocks.generateQuiz.mockRejectedValue(
      new Error('Đã hết lượt tạo đề AI hôm nay.'),
    );
    const { result } = renderGeneration(form);

    await act(async () => {
      await result.current.handleGenerate('exam');
    });

    expect(showErrorMock).toHaveBeenCalledWith('Đã hết lượt tạo đề AI hôm nay.');
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
