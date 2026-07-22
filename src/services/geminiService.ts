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

export type AIProvider = 'gemini' | 'perplexity' | 'openai' | 'llm-mux' | 'localhost' | 'native-ocr';
export type LearnerPromptMode = 'default' | 'gifted' | 'remedial';

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
    console.warn('[AI Validation Chain] Reviewer unavailable; using validated draft.', error);
    return validateAndFixQuiz(quizJson);
  }
};

export const generateQuiz = async (
  topic: string,
  classLevel: string,
  content: string,
  file?: File | null,
  options?: QuizGenerationOptions,
  _customApiKey?: string,
  provider: AIProvider = 'llm-mux',
  onStepChange?: (step: 'generating' | 'reviewing' | 'completed') => void,
  execution?: QuizAiExecutionContext,
): Promise<any> => {
  onStepChange?.('generating');
  const promptText = buildPrompt(topic, classLevel, content, options);
  const requestedCount = options?.questionCount || 10;
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

  const resultObject = result as Record<string, unknown>;
  if (Array.isArray(resultObject?.questions) && resultObject.questions.length > requestedCount) {
    resultObject.questions = resultObject.questions.slice(0, requestedCount);
  }

  if (Array.isArray(resultObject?.questions)) {
    const imageQuestions = (resultObject.questions as Record<string, unknown>[]).filter(
      (question) => question.type === 'IMAGE_QUESTION'
        && typeof question.image === 'string'
        && question.image.startsWith('IMAGE_PROMPT:'),
    );

    if (imageQuestions.length > 0) {
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
    }
  }

  onStepChange?.('completed');
  return result;
};

export { extractTextFromPdf } from './ai/extractTextFromPdf';
