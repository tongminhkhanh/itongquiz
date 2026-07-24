import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuestionType } from '../src/types';
import type { QuizGenerationOptions } from '../src/services/geminiService';
import { buildQuizSchemaRepairPrompt } from '../src/services/ai/quizRepair';

const mocks = vi.hoisted(() => ({
  generateWithOpenAIResilient: vi.fn(),
  generateWithGemini: vi.fn(),
  generateWithPerplexity: vi.fn(),
  requestWorkerAiText: vi.fn(),
}));

vi.mock('../src/services/ai/providers/openaiProvider', () => ({
  generateWithOpenAIResilient: mocks.generateWithOpenAIResilient,
}));
vi.mock('../src/services/ai/providers/geminiProvider', () => ({
  generateWithGemini: mocks.generateWithGemini,
}));
vi.mock('../src/services/ai/providers/perplexityProvider', () => ({
  generateWithPerplexity: mocks.generateWithPerplexity,
}));
vi.mock('../src/services/ai/workerAiClient', () => ({
  requestWorkerAiText: mocks.requestWorkerAiText,
}));
vi.mock('../src/services/imageGenerationService', () => ({
  generateImage: vi.fn(),
  checkImageServiceAvailability: vi.fn().mockResolvedValue(false),
}));

import { generateQuiz } from '../src/services/geminiService';

const questionByIndex: Record<number, string> = {
  1: 'Phân số nào lớn hơn một phần hai?',
  2: 'Chọn kết quả đúng của phép cộng ba phần tư với một phần tư.',
};

const makeMcq = (index: number) => ({
  id: `q-${index}`,
  type: QuestionType.MCQ,
  question: questionByIndex[index] ?? `Câu hỏi khác biệt ${index}`,
  options: ['A', 'B', 'C', 'D'],
  correctAnswer: 'A',
  explanation: `Giải thích ${index}.`,
  difficultyLevel: 2,
});

const options: QuizGenerationOptions = {
  title: 'Đề hai câu',
  questionCount: 2,
  questionTypes: [QuestionType.MCQ],
  difficultyLevels: { level1: 0, level2: 2, level3: 0 },
  blueprint: {
    intent: 'EXAM',
    sourceMode: 'TOPIC',
    totalQuestions: 2,
    typeAllocations: [{ type: QuestionType.MCQ, count: 2 }],
    difficultyLevels: { level1: 0, level2: 2, level3: 0 },
  },
};

const execution = {
  action: { actionId: 'ai-1234567890abcdefghij', workflow: 'QUIZ_CREATE' as const },
  stage: 'GENERATE' as const,
};

describe('quiz generation quality pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generateWithOpenAIResilient.mockResolvedValue({
      title: 'Bản nháp',
      questions: [makeMcq(1)],
    });
    mocks.requestWorkerAiText.mockImplementation(async (_body, requestOptions) => {
      const stage = requestOptions?.action?.stage;
      if (stage === 'REPAIR') {
        return JSON.stringify({ title: 'Phần sửa', questions: [makeMcq(2)] });
      }
      if (stage === 'REVIEW') {
        return JSON.stringify({ title: 'Đã duyệt', questions: [makeMcq(1), makeMcq(2)] });
      }
      throw new Error(`Unexpected stage ${String(stage)}`);
    });
  });

  it('builds a schema repair prompt with safe issue paths and the raw draft', () => {
    const prompt = buildQuizSchemaRepairPrompt({
      quiz: {
        title: 'Bản nháp lỗi',
        questions: [{
          type: QuestionType.CATEGORIZATION,
          items: [{ id: 'item-1', content: 'Mục', categoryId: '' }],
        }],
      },
      issues: [{
        path: ['questions', 0, 'items', 0, 'categoryId'],
        code: 'too_small',
        message: 'Invalid input',
      }],
    });

    expect(prompt).toContain('[LỖI SCHEMA]');
    expect(prompt).toContain('questions.0.items.0.categoryId');
    expect(prompt).toContain('too_small');
    expect(prompt).toContain('"title":"Bản nháp lỗi"');
    expect(prompt).toContain('Không được bỏ câu hợp lệ');
  });

  it('runs one targeted repair and one optional review with the same action', async () => {
    const steps: string[] = [];
    const result = await generateQuiz(
      'Phân số',
      '4',
      '',
      undefined,
      options,
      undefined,
      'openai',
      (step) => steps.push(step),
      execution,
    );

    expect(result.questions).toHaveLength(2);
    expect(mocks.requestWorkerAiText).toHaveBeenCalledTimes(2);
    expect(mocks.requestWorkerAiText.mock.calls.map((call) => call[1]?.action?.stage)).toEqual(['REPAIR', 'REVIEW']);
    expect(mocks.requestWorkerAiText.mock.calls.every((call) => call[1]?.action?.actionId === execution.action.actionId)).toBe(true);
    expect(steps).toContain('repairing');
    expect(steps).toContain('reviewing');
  });

  it('does not use repair or review stages for a single-question regeneration action', async () => {
    const regenerateOptions: QuizGenerationOptions = {
      ...options,
      questionCount: 1,
      blueprint: {
        ...options.blueprint!,
        totalQuestions: 1,
        typeAllocations: [{ type: QuestionType.MCQ, count: 1 }],
        difficultyLevels: { level1: 0, level2: 1, level3: 0 },
      },
      difficultyLevels: { level1: 0, level2: 1, level3: 0 },
    };
    mocks.generateWithOpenAIResilient.mockResolvedValue({
      title: 'Câu sinh lại',
      questions: [makeMcq(1)],
    });

    const result = await generateQuiz(
      'Phân số',
      '4',
      '',
      undefined,
      regenerateOptions,
      undefined,
      'openai',
      undefined,
      {
        action: {
          actionId: 'ai-abcdefghij1234567890',
          workflow: 'QUESTION_REGENERATE',
        },
        stage: 'REGENERATE',
      },
    );

    expect(result.questions).toHaveLength(1);
    expect(mocks.requestWorkerAiText).not.toHaveBeenCalled();
  });

  it('keeps the deterministically valid result when the reviewer fails', async () => {
    mocks.requestWorkerAiText.mockImplementation(async (_body, requestOptions) => {
      if (requestOptions?.action?.stage === 'REPAIR') {
        return JSON.stringify({ title: 'Phần sửa', questions: [makeMcq(2)] });
      }
      throw new Error('Reviewer unavailable');
    });

    const result = await generateQuiz(
      'Phân số',
      '4',
      '',
      undefined,
      options,
      undefined,
      'openai',
      undefined,
      execution,
    );

    expect(result.questions).toHaveLength(2);
    expect(result.questions[1].question).toBe(makeMcq(2).question);
  });
});
