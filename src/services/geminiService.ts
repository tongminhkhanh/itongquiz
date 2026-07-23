/**
 * Public facade for AI-powered quiz generation.
 * Provider credentials remain server-side in Cloudflare Worker secrets.
 */

import { REVIEWER_INSTRUCTION } from '../config/constants';
import { generateImage, checkImageServiceAvailability } from './imageGenerationService';
import { QuestionType } from '../types';
import { parseAndRepairJSON, validateAndFixQuiz } from './ai/utils/jsonRepair';
import { buildPrompt } from './ai/prompts/quizPromptBuilder';
import { generateWithGemini } from './ai/providers/geminiProvider';
import { generateWithOpenAIResilient } from './ai/providers/openaiProvider';
import { generateWithPerplexity } from './ai/providers/perplexityProvider';
import { requestWorkerAiText } from './ai/workerAiClient';
import type { QuizAiExecutionContext } from './ai/aiAction';
import type {
  QuizBlueprint,
  QuizBlueprintV3,
} from '../features/quiz-generator/domain/quizBlueprint';
import { auditGeneratedQuiz } from './ai/quizAudit';
import {
  buildQuizRepairPrompt,
  createQuizRepairPlan,
  mergeRepairedQuestions,
  QuizGenerationValidationError,
} from './ai/quizRepair';
import {
  parseGeneratedQuiz,
  type GeneratedQuizPayload,
} from './ai/schemas/quizGenerationSchema';

export type AIProvider = 'gemini' | 'perplexity' | 'openai' | 'llm-mux' | 'localhost' | 'native-ocr';
export type LearnerPromptMode = 'default' | 'gifted' | 'remedial';
export type QuizGenerationStep = 'generating' | 'reviewing' | 'repairing' | 'completed';

export interface PromptProfileOptions {
  useThongTu27: boolean;
  learnerMode: LearnerPromptMode;
}

export const AI_CORE_SUBJECT_IDS = [
  'toan',
  'tieng-viet',
  'tieng-anh',
  'tu-nhien-xa-hoi',
  'tin-hoc',
] as const;

export interface QuizGenerationOptions {
  title: string;
  blueprint?: QuizBlueprint;
  blueprintV3?: QuizBlueprintV3;
  promptVersion?: 'ai-blueprint-v3';
  questionCount: number;
  questionTypes: QuestionType[];
  difficultyLevels?: { level1: number; level2: number; level3: number };
  promptProfile?: PromptProfileOptions;
  imageLibrary?: Array<{ id: string; name: string; data?: string }>;
  customPrompt?: string;
  isPdfMode?: boolean;
}

const toWorkerOptions = (execution?: QuizAiExecutionContext) => execution ? {
  action: {
    ...execution.action,
    stage: execution.stage,
  },
  signal: execution.signal,
} : undefined;

export const validateQuizWithAI = async (
  quizJson: unknown,
  _apiKey: string = '',
  execution?: QuizAiExecutionContext,
): Promise<unknown> => {
  try {
    const text = await requestWorkerAiText({
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'system', content: REVIEWER_INSTRUCTION },
        {
          role: 'user',
          content: `Hãy soát lại và sửa JSON đề thi sau. Chỉ trả về JSON hợp lệ:\n${JSON.stringify(quizJson)}`,
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }, toWorkerOptions(execution));
    return validateAndFixQuiz(parseAndRepairJSON(text));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown reviewer error';
    console.warn(`[AI Validation Chain] Reviewer unavailable; using validated draft. ${message}`);
    return validateAndFixQuiz(quizJson);
  }
};

const runDeterministicQualityPipeline = async (
  result: unknown,
  blueprint: QuizBlueprint,
  execution: QuizAiExecutionContext | undefined,
  onStepChange?: (step: QuizGenerationStep) => void,
): Promise<GeneratedQuizPayload> => {
  const parsedDraft = parseGeneratedQuiz(validateAndFixQuiz(result));
  let finalQuiz = parsedDraft;
  let issues = auditGeneratedQuiz(finalQuiz, blueprint);

  if (issues.some((issue) => !issue.repairable)) {
    throw new QuizGenerationValidationError(issues);
  }

  const canUseAuxiliaryStages = execution?.action.workflow === 'QUIZ_CREATE';
  if (issues.length > 0) {
    if (!canUseAuxiliaryStages) {
      throw new QuizGenerationValidationError(issues);
    }

    const repairInput = { blueprint, quiz: finalQuiz, issues };
    const repairPlan = createQuizRepairPlan(repairInput);
    let repairedQuiz: GeneratedQuizPayload;

    if (repairPlan.requestedCount > 0) {
      onStepChange?.('repairing');
      const repairedText = await requestWorkerAiText({
        model: 'gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Bạn sửa đúng các câu bị lỗi trong đề. Chỉ trả về JSON hợp lệ.',
          },
          {
            role: 'user',
            content: buildQuizRepairPrompt(repairInput),
          },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }, toWorkerOptions({ ...execution, stage: 'REPAIR' }));
      repairedQuiz = parseGeneratedQuiz(
        validateAndFixQuiz(parseAndRepairJSON(repairedText)),
      );
    } else {
      repairedQuiz = { ...finalQuiz, questions: [] };
    }

    finalQuiz = mergeRepairedQuestions(finalQuiz, repairedQuiz, issues);
    issues = auditGeneratedQuiz(finalQuiz, blueprint);
    if (issues.length > 0) {
      throw new QuizGenerationValidationError(issues);
    }
  }

  if (canUseAuxiliaryStages) {
    onStepChange?.('reviewing');
    try {
      const reviewedRaw = await validateQuizWithAI(
        finalQuiz,
        '',
        { ...execution, stage: 'REVIEW' },
      );
      const reviewedQuiz = parseGeneratedQuiz(reviewedRaw);
      if (auditGeneratedQuiz(reviewedQuiz, blueprint).length === 0) {
        finalQuiz = reviewedQuiz;
      }
    } catch (error) {
      console.warn('[AI Validation Chain] Reviewer output was ignored.', error);
    }
  }

  return finalQuiz;
};

const resolveGeneratedImages = async (result: unknown): Promise<unknown> => {
  if (!result || typeof result !== 'object') return result;
  const resultObject = result as Record<string, unknown>;
  if (!Array.isArray(resultObject.questions)) return result;

  const imageQuestions = (resultObject.questions as Record<string, unknown>[]).filter(
    (question) => question.type === 'IMAGE_QUESTION'
      && typeof question.image === 'string'
      && question.image.startsWith('IMAGE_PROMPT:'),
  );

  if (imageQuestions.length === 0) return resultObject;
  const imageServiceAvailable = await checkImageServiceAvailability();
  for (const question of resultObject.questions as Record<string, unknown>[]) {
    if (question.type !== 'IMAGE_QUESTION'
      || typeof question.image !== 'string'
      || !question.image.startsWith('IMAGE_PROMPT:')) continue;

    const prompt = question.image.replace('IMAGE_PROMPT:', '').trim();
    if (imageServiceAvailable) {
      const generated = await generateImage(prompt);
      question.image = generated.success && generated.data
        ? generated.data
        : `https://placehold.co/600x400?text=${encodeURIComponent(prompt.slice(0, 20))}`;
    } else {
      question.image = `https://placehold.co/600x400?text=${encodeURIComponent(prompt.slice(0, 20))}`;
    }
  }
  return resultObject;
};

export const generateQuiz = async (
  topic: string,
  classLevel: string,
  content: string,
  file?: File | null,
  options?: QuizGenerationOptions,
  _customApiKey?: string,
  provider: AIProvider = 'llm-mux',
  onStepChange?: (step: QuizGenerationStep) => void,
  execution?: QuizAiExecutionContext,
): Promise<any> => {
  onStepChange?.('generating');
  const promptText = buildPrompt(topic, classLevel, content, options);
  const requestedCount = options?.blueprint?.totalQuestions ?? options?.questionCount ?? 10;
  let result: unknown;

  if (provider === 'perplexity') {
    result = await generateWithPerplexity(promptText, '', execution);
  } else if (provider === 'openai') {
    result = await generateWithOpenAIResilient(
      promptText,
      '',
      file,
      options?.imageLibrary,
      '',
      onStepChange,
      execution,
    );
  } else if (provider === 'llm-mux' || provider === 'localhost') {
    result = await generateWithOpenAIResilient(
      promptText,
      '',
      file,
      options?.imageLibrary,
      'https://api.thitong.site/v1',
      onStepChange,
      execution,
    );
  } else {
    result = await generateWithGemini(
      promptText,
      '',
      file,
      options?.imageLibrary,
      onStepChange,
      execution,
    );
  }

  if (options?.blueprint) {
    result = await runDeterministicQualityPipeline(
      result,
      options.blueprint,
      execution,
      onStepChange,
    );
  } else if (result && typeof result === 'object') {
    const legacyResult = result as Record<string, unknown>;
    if (Array.isArray(legacyResult.questions) && legacyResult.questions.length > requestedCount) {
      legacyResult.questions = legacyResult.questions.slice(0, requestedCount);
    }
  }

  result = await resolveGeneratedImages(result);
  onStepChange?.('completed');
  return result;
};

export { extractTextFromPdf } from './ai/extractTextFromPdf';
