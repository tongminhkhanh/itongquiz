import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuestionType } from '../src/types';
import type { QuizGenerationOptions } from '../src/services/geminiService';
import { buildQuizSchemaRepairPrompt } from '../src/services/ai/quizRepair';
import {
  GeneratedQuizSchemaError,
  getQuizGenerationUserMessage,
} from '../src/services/ai/quizGenerationErrors';

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

const interactivePipelineOptions: QuizGenerationOptions = {
  title: 'Đề tương tác',
  questionCount: 2,
  questionTypes: [QuestionType.CATEGORIZATION, QuestionType.DROPDOWN],
  difficultyLevels: { level1: 1, level2: 1, level3: 0 },
  blueprint: {
    intent: 'PRACTICE',
    sourceMode: 'TOPIC',
    totalQuestions: 2,
    typeAllocations: [
      { type: QuestionType.CATEGORIZATION, count: 1 },
      { type: QuestionType.DROPDOWN, count: 1 },
    ],
    difficultyLevels: { level1: 1, level2: 1, level3: 0 },
  },
};

const malformedInteractiveDraft = {
  title: 'Bản nháp tương tác',
  questions: [
    {
      type: QuestionType.CATEGORIZATION,
      question: 'Phân loại',
      categories: [
        { id: 'nhom-1', name: 'Nhóm 1' },
        { id: 'nhom-2', name: 'Nhóm 2' },
      ],
      items: [
        { id: 'item-1', content: 'Mục hợp lệ', categoryId: 'nhom-1' },
        { id: 'item-2', content: 'Mục lỗi', categoryId: '' },
      ],
      explanation: 'Giải thích phân loại.',
      difficultyLevel: 1,
    },
    {
      type: QuestionType.DROPDOWN,
      question: 'Chọn đáp án',
      text: 'Thủ đô Việt Nam là [1].',
      blanks: ['Hà Nội'],
      explanation: 'Hà Nội là thủ đô.',
      difficultyLevel: 2,
    },
  ],
};

const repairedInteractiveDraft = {
  title: 'Bản sửa tương tác',
  questions: [
    {
      type: QuestionType.CATEGORIZATION,
      question: 'Phân loại',
      categories: [
        { id: 'nhom-1', name: 'Nhóm 1' },
        { id: 'nhom-2', name: 'Nhóm 2' },
      ],
      items: [
        { id: 'item-1', content: 'Mục hợp lệ', categoryId: 'nhom-1' },
        { id: 'item-2', content: 'Mục lỗi', categoryId: 'nhom-2' },
      ],
      explanation: 'Giải thích phân loại.',
      difficultyLevel: 1,
    },
    {
      type: QuestionType.DROPDOWN,
      question: 'Chọn đáp án',
      text: 'Thủ đô Việt Nam là [1].',
      blanks: [{
        id: '1',
        options: ['Hà Nội', 'Huế'],
        correctAnswer: 'Hà Nội',
      }],
      explanation: 'Hà Nội là thủ đô.',
      difficultyLevel: 2,
    },
  ],
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

  it('repairs an invalid provider draft once before semantic audit', async () => {
    mocks.generateWithOpenAIResilient.mockResolvedValue(malformedInteractiveDraft);
    mocks.requestWorkerAiText.mockImplementation(async (body, requestOptions) => {
      if (requestOptions?.action?.stage === 'REPAIR') {
        expect(JSON.stringify(body)).toContain('[LỖI SCHEMA]');
        return JSON.stringify(repairedInteractiveDraft);
      }
      if (requestOptions?.action?.stage === 'REVIEW') {
        return JSON.stringify(repairedInteractiveDraft);
      }
      throw new Error(`Unexpected stage ${String(requestOptions?.action?.stage)}`);
    });

    const result = await generateQuiz(
      'Từ loại',
      '4',
      '',
      undefined,
      { ...interactivePipelineOptions, reviewMode: 'fast' },
      undefined,
      'openai',
      undefined,
      execution,
    );

    expect(result.questions).toHaveLength(2);
    expect(result.questions[0].items[1].categoryId).toBe('nhom-2');
    expect(result.questions[1].blanks[0]).toEqual({
      id: '1',
      options: ['Hà Nội', 'Huế'],
      correctAnswer: 'Hà Nội',
    });
    expect(mocks.requestWorkerAiText.mock.calls.map((call) => call[1]?.action?.stage))
      .toEqual(['REPAIR']);
  });

  it('repairs only malformed questions and preserves valid provider questions', async () => {
    const validQuestion = {
      ...makeMcq(1),
      question: 'Câu hợp lệ phải được giữ nguyên.',
    };
    const invalidQuestion = {
      type: QuestionType.DROPDOWN,
      question: 'Chọn đáp án đúng.',
      text: 'Thủ đô Việt Nam là [1].',
      blanks: ['Hà Nội'],
      explanation: 'Hà Nội là thủ đô.',
      difficultyLevel: 2,
    };
    const repairedQuestion = repairedInteractiveDraft.questions[1];
    const targetedOptions: QuizGenerationOptions = {
      title: 'Đề sửa theo câu',
      questionCount: 2,
      questionTypes: [QuestionType.MCQ, QuestionType.DROPDOWN],
      difficultyLevels: { level1: 0, level2: 2, level3: 0 },
      blueprint: {
        intent: 'PRACTICE',
        sourceMode: 'TOPIC',
        totalQuestions: 2,
        typeAllocations: [
          { type: QuestionType.MCQ, count: 1 },
          { type: QuestionType.DROPDOWN, count: 1 },
        ],
        difficultyLevels: { level1: 0, level2: 2, level3: 0 },
      },
    };

    mocks.generateWithOpenAIResilient.mockResolvedValue({
      title: 'Bản nháp có một câu lỗi',
      questions: [validQuestion, invalidQuestion],
    });
    mocks.requestWorkerAiText.mockImplementation(async (body, requestOptions) => {
      expect(requestOptions?.action?.stage).toBe('REPAIR');
      const prompt = JSON.stringify(body);
      expect(prompt).toContain('questions.1');
      expect(prompt).not.toContain(validQuestion.question);
      return JSON.stringify({
        title: 'Phần sửa cấu trúc',
        questions: [repairedQuestion],
      });
    });

    const result = await generateQuiz(
      'Thủ đô',
      '4',
      '',
      undefined,
      { ...targetedOptions, reviewMode: 'fast' },
      undefined,
      'openai',
      undefined,
      execution,
    );

    expect(result.questions).toHaveLength(2);
    expect(result.questions[0]).toEqual(validQuestion);
    expect(result.questions[1]).toEqual(repairedQuestion);
    expect(mocks.requestWorkerAiText).toHaveBeenCalledTimes(1);
  });

  it('does not add a schema repair or reviewer call when the provider draft is already valid in fast mode', async () => {
    mocks.generateWithOpenAIResilient.mockResolvedValue({
      title: 'Đề hợp lệ',
      questions: [makeMcq(1), makeMcq(2)],
    });
    mocks.requestWorkerAiText.mockImplementation(async (_body, requestOptions) => {
      if (requestOptions?.action?.stage === 'REVIEW') {
        return JSON.stringify({
          title: 'Đề đã duyệt',
          questions: [makeMcq(1), makeMcq(2)],
        });
      }
      throw new Error(`Unexpected stage ${String(requestOptions?.action?.stage)}`);
    });

    const result = await generateQuiz(
      'Phân số',
      '4',
      '',
      undefined,
      { ...options, reviewMode: 'fast' },
      undefined,
      'openai',
      undefined,
      execution,
    );

    expect(result.questions).toHaveLength(2);
    expect(mocks.requestWorkerAiText).not.toHaveBeenCalled();
  });

  it('stops after one schema repair when the repaired response is still invalid', async () => {
    mocks.generateWithOpenAIResilient.mockResolvedValue(malformedInteractiveDraft);
    mocks.requestWorkerAiText.mockResolvedValue(JSON.stringify(malformedInteractiveDraft));

    await expect(generateQuiz(
      'Từ loại',
      '4',
      '',
      undefined,
      interactivePipelineOptions,
      undefined,
      'openai',
      undefined,
      execution,
    )).rejects.toMatchObject({
      name: 'GeneratedQuizSchemaError',
      code: 'AI_QUIZ_SCHEMA_INVALID',
    });

    expect(mocks.requestWorkerAiText).toHaveBeenCalledTimes(1);
  });

  it('stops after the allowed semantic REPAIR still leaves semantic issues', async () => {
    const schemaValidButSemanticallyInvalid = {
      ...repairedInteractiveDraft,
      questions: repairedInteractiveDraft.questions.map((question) => ({
        ...question,
        question: 'Câu hỏi giống nhau hoàn toàn',
      })),
    };
    mocks.generateWithOpenAIResilient.mockResolvedValue(malformedInteractiveDraft);
    mocks.requestWorkerAiText.mockResolvedValue(JSON.stringify(schemaValidButSemanticallyInvalid));

    await expect(generateQuiz(
      'Từ loại',
      '4',
      '',
      undefined,
      { ...interactivePipelineOptions, reviewMode: 'fast' },
      undefined,
      'openai',
      undefined,
      execution,
    )).rejects.toMatchObject({ name: 'QuizGenerationValidationError' });

    expect(mocks.requestWorkerAiText).toHaveBeenCalledTimes(2);
    expect(mocks.requestWorkerAiText.mock.calls.map((call) => call[1]?.action?.stage))
      .toEqual(['REPAIR', 'REPAIR']);
  });

  it('uses a second targeted repair when schema repair leaves a semantic issue', async () => {
    const schemaValidButSemanticallyInvalid = {
      ...repairedInteractiveDraft,
      questions: repairedInteractiveDraft.questions.map((question) => ({
        ...question,
        question: 'Câu hỏi giống nhau hoàn toàn',
      })),
    };
    mocks.generateWithOpenAIResilient.mockResolvedValue(malformedInteractiveDraft);
    mocks.requestWorkerAiText
      .mockResolvedValueOnce(JSON.stringify(schemaValidButSemanticallyInvalid))
      .mockResolvedValueOnce(JSON.stringify({
        title: 'Phần sửa nội dung',
        questions: [repairedInteractiveDraft.questions[1]],
      }));

    const result = await generateQuiz(
      'Từ loại',
      '4',
      '',
      undefined,
      { ...interactivePipelineOptions, reviewMode: 'fast' },
      undefined,
      'openai',
      undefined,
      execution,
    );

    expect(result.questions).toHaveLength(2);
    expect(result.questions[1].question).toBe(repairedInteractiveDraft.questions[1].question);
    expect(mocks.requestWorkerAiText.mock.calls.map((call) => call[1]?.action?.stage))
      .toEqual(['REPAIR', 'REPAIR']);
  });

  it('shows question numbers and a friendly field name without raw schema paths', () => {
    const error = new GeneratedQuizSchemaError([
      {
        path: ['questions', 3, 'options'],
        code: 'too_small',
        message: 'Array must contain at least 2 element(s)',
      },
      {
        path: ['questions', 5, 'correctAnswer'],
        code: 'invalid_string',
        message: 'Invalid',
      },
    ]);

    const message = getQuizGenerationUserMessage(error);

    expect(message).toContain('câu 4, 6');
    expect(message).toContain('phương án trả lời');
    expect(message).not.toContain('questions');
    expect(message).not.toContain('too_small');
  });

  it('does not schema-repair an invalid single-question regeneration response', async () => {
    mocks.generateWithOpenAIResilient.mockResolvedValue(malformedInteractiveDraft);

    await expect(generateQuiz(
      'Từ loại',
      '4',
      '',
      undefined,
      {
        title: 'Sinh lại câu hỏi',
        questionCount: 1,
        questionTypes: [QuestionType.CATEGORIZATION],
        difficultyLevels: { level1: 1, level2: 0, level3: 0 },
        blueprint: {
          intent: 'PRACTICE',
          sourceMode: 'TOPIC',
          totalQuestions: 1,
          typeAllocations: [{ type: QuestionType.CATEGORIZATION, count: 1 }],
          difficultyLevels: { level1: 1, level2: 0, level3: 0 },
        },
      },
      undefined,
      'openai',
      undefined,
      {
        action: {
          actionId: 'ai-invalid-regeneration-1234',
          workflow: 'QUESTION_REGENERATE',
        },
        stage: 'REGENERATE',
      },
    )).rejects.toMatchObject({
      name: 'GeneratedQuizSchemaError',
      code: 'AI_QUIZ_SCHEMA_INVALID',
    });

    expect(mocks.requestWorkerAiText).not.toHaveBeenCalled();
  });

  it('uses only GENERATE + REPAIR in fast mode', async () => {
    const steps: string[] = [];
    const result = await generateQuiz(
      'Phân số',
      '4',
      '',
      undefined,
      { ...options, reviewMode: 'fast' },
      undefined,
      'openai',
      (step) => steps.push(step),
      execution,
    );

    expect(result.questions).toHaveLength(2);
    expect(mocks.requestWorkerAiText).toHaveBeenCalledTimes(1);
    expect(mocks.requestWorkerAiText.mock.calls.map((call) => call[1]?.action?.stage)).toEqual(['REPAIR']);
    expect(steps).toContain('repairing');
    expect(steps).not.toContain('reviewing');
  });

  it('emits generating, validating and completed on a valid fast path', async () => {
    mocks.generateWithOpenAIResilient.mockResolvedValue({
      title: 'Đề hợp lệ',
      questions: [makeMcq(1), makeMcq(2)],
    });
    const steps: string[] = [];

    await generateQuiz(
      'Phân số',
      '4',
      '',
      undefined,
      { ...options, reviewMode: 'fast' },
      undefined,
      'openai',
      (step) => steps.push(step),
      execution,
    );

    expect(steps).toEqual(['generating', 'validating', 'completed']);
  });

  it('keeps reviewer for strict mode', async () => {
    const result = await generateQuiz(
      'Phân số',
      '4',
      '',
      undefined,
      { ...options, reviewMode: 'strict' },
      undefined,
      'openai',
      undefined,
      execution,
    );

    expect(result.questions).toHaveLength(2);
    expect(mocks.requestWorkerAiText.mock.calls.map((call) => call[1]?.action?.stage))
      .toEqual(['REPAIR', 'REVIEW']);
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
      { ...options, reviewMode: 'strict' },
      undefined,
      'openai',
      undefined,
      execution,
    );

    expect(result.questions).toHaveLength(2);
    expect(result.questions[1].question).toBe(makeMcq(2).question);
  });
});
