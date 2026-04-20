/**
 * @module geminiService
 * Public API facade for AI-powered quiz generation and PDF text extraction.
 *
 * This file is intentionally thin (~130 lines). All heavy logic has been
 * extracted into feature-scoped modules under `src/services/ai/`:
 *
 *   utils/networkHelpers.ts   — URL routing, base64 conversion
 *   utils/aiResponseParser.ts — Parsing AI response formats
 *   utils/jsonRepair.ts       — JSON repair, LaTeX fixes, quiz validation
 *   prompts/quizPromptBuilder.ts — buildPrompt & all prompt constants
 *   providers/geminiProvider.ts  — Gemini via localhost proxy
 *   providers/openaiProvider.ts  — OpenAI-compatible + LLM-Mux + Workers fallback
 *   providers/perplexityProvider.ts — Perplexity Sonar
 */

import { REVIEWER_INSTRUCTION } from '../config/constants';
import { generateImage, checkImageServiceAvailability } from './imageGenerationService';
import { QuestionType } from '../types';

import {
  shouldUseCliproxyDevProxy,
  resolvePublicProviderBaseUrl,
  resolveTargetUrl,
} from './ai/utils/networkHelpers';
import {
  extractAIContent,
  extractAIErrorMessage,
} from './ai/utils/aiResponseParser';
import { parseAndRepairJSON, validateAndFixQuiz } from './ai/utils/jsonRepair';
import { buildPrompt } from './ai/prompts/quizPromptBuilder';
import { generateWithGemini } from './ai/providers/geminiProvider';
import { generateWithOpenAIResilient } from './ai/providers/openaiProvider';
import { generateWithPerplexity } from './ai/providers/perplexityProvider';

// ─────────────────────────────────────────────────────────
//  TYPES (re-exported for backward compatibility)
// ─────────────────────────────────────────────────────────

export type AIProvider = 'gemini' | 'perplexity' | 'openai' | 'llm-mux' | 'localhost' | 'native-ocr';

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
  imageLibrary?: Array<{ id: string; name: string; data?: string }>;
  customPrompt?: string;
  isPdfMode?: boolean;
}

// ─────────────────────────────────────────────────────────
//  AI VALIDATOR (needs to be in this file because providers import it)
// ─────────────────────────────────────────────────────────

export const validateQuizWithAI = async (
  quizJson: any,
  apiKey: string
): Promise<any> => {
  const MODEL_NAME = 'gemini-2.0-flash';
  const configuredBaseUrl =
    (import.meta as any).env.VITE_LOCALHOST_AI_URL || 'http://localhost:3000/v1';
  const reviewerBaseUrl = resolvePublicProviderBaseUrl(configuredBaseUrl, 'https://api.thitong.site/v1');
  const API_URL = `${reviewerBaseUrl}/chat/completions`;

  const messages = [
    { role: 'system', content: REVIEWER_INSTRUCTION },
    {
      role: 'user',
      content: `Hãy soát lỗi và sửa lại file JSON bản thảo đề thi dưới đây:\n\n${JSON.stringify(quizJson, null, 2)}`,
    },
  ];

  const requestBody = {
    model: MODEL_NAME,
    messages,
    temperature: 0.1,
    response_format: { type: 'json_object' },
  };

  const maxRetries = 2;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const targetUrl = resolveTargetUrl(
        API_URL.endsWith('/chat/completions') ? API_URL : `${reviewerBaseUrl}/chat/completions`
      );
      const fetchUrl = shouldUseCliproxyDevProxy(targetUrl)
        ? '/api/cliproxy/chat/completions'
        : targetUrl;

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error(`Reviewer request failed with status: ${response.status}`);

      const data = await response.json();
      const aiError = extractAIErrorMessage(data);
      if (aiError) throw new Error(aiError);

      const text = extractAIContent(data);
      if (!text) throw new Error('AI Reviewer không trả về kết quả nào.');

      return validateAndFixQuiz(parseAndRepairJSON(text));
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        console.error('[AI Validation Chain] Lỗi rà soát:', error);
        return validateAndFixQuiz(quizJson); // Fallback to original
      }
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
};

// ─────────────────────────────────────────────────────────
//  MAIN ORCHESTRATOR
// ─────────────────────────────────────────────────────────

export const generateQuiz = async (
  topic: string,
  classLevel: string,
  content: string,
  file?: File | null,
  options?: QuizGenerationOptions,
  customApiKey?: string,
  provider: AIProvider = 'localhost',
  onStepChange?: (step: 'generating' | 'reviewing' | 'completed') => void
): Promise<any> => {
  let envKey = '';
  let actualProvider = provider;

  if (provider === 'localhost') {
    envKey = (import.meta as any).env.VITE_LOCALHOST_AI_KEY || (import.meta as any).env.VITE_CLIPROXY_TOKEN || '';
  } else if (provider === 'perplexity') {
    envKey = (import.meta as any).env.VITE_PERPLEXITY_API_KEY || '';
  } else if (provider === 'openai') {
    envKey = (import.meta as any).env.VITE_OPENAI_API_KEY || '';
  } else if (provider === 'llm-mux') {
    envKey = (import.meta as any).env.VITE_LLM_MUX_API_KEY || (import.meta as any).env.VITE_CLIPROXY_TOKEN || '';
  } else {
    envKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.VITE_API_KEY || '';

    // Smart fallback: auto-route to proxy if native Gemini key is missing
    if (!envKey && !customApiKey) {
      const proxyKey = (import.meta as any).env.VITE_CLIPROXY_TOKEN || (import.meta as any).env.VITE_LLM_MUX_API_KEY;
      if (proxyKey) { envKey = proxyKey; actualProvider = 'llm-mux'; }
    }
  }

  const apiKey = (customApiKey || envKey || '').trim();
  if (!apiKey && actualProvider !== 'llm-mux') {
    throw new Error(`Vui lòng nhập API Key cho ${provider.toUpperCase()} trong phần Cấu hình.`);
  }

  const promptText = buildPrompt(topic, classLevel, content, options);
  const requestedCount = options?.questionCount || 10;

  let result: unknown;

  if (actualProvider === 'localhost') {
    const baseUrl = (import.meta as any).env.VITE_LOCALHOST_AI_URL || 'https://ai.thitong.site/v1';
    result = await generateWithOpenAIResilient(promptText, apiKey, file, options?.imageLibrary, baseUrl, onStepChange);
  } else if (actualProvider === 'perplexity') {
    result = await generateWithPerplexity(promptText, apiKey);
  } else if (actualProvider === 'openai') {
    result = await generateWithOpenAIResilient(promptText, apiKey, file, options?.imageLibrary, undefined, onStepChange);
  } else if (actualProvider === 'llm-mux') {
    const configuredBaseUrl = (import.meta as any).env.VITE_LLM_MUX_BASE_URL || (import.meta as any).env.VITE_CLIPROXY_API || '';
    const baseUrl = resolvePublicProviderBaseUrl(configuredBaseUrl, 'https://api.thitong.site/v1');
    result = await generateWithOpenAIResilient(promptText, apiKey, file, options?.imageLibrary, baseUrl, onStepChange);
  } else {
    result = await generateWithGemini(promptText, apiKey, file, options?.imageLibrary, onStepChange);
  }

  // Enforce requested question count
  const resultObj = result as Record<string, unknown>;
  if (resultObj?.questions && (resultObj.questions as unknown[]).length > requestedCount) {
    console.warn(`[generateQuiz] ⚠️ Slicing from ${(resultObj.questions as unknown[]).length} to ${requestedCount}`);
    resultObj.questions = (resultObj.questions as unknown[]).slice(0, requestedCount);
  }

  // AI Image Generation post-processing (IMAGE-NANO-SKILL)
  if (resultObj?.questions) {
    const imageQuestions = (resultObj.questions as Record<string, unknown>[]).filter(
      (q) => q.type === 'IMAGE_QUESTION' && typeof q.image === 'string' && (q.image as string).startsWith('IMAGE_PROMPT:')
    );

    if (imageQuestions.length > 0) {
      const isServiceAvailable = await checkImageServiceAvailability();
      for (let i = 0; i < (resultObj.questions as Record<string, unknown>[]).length; i++) {
        const q = (resultObj.questions as Record<string, unknown>[])[i];
        if (q.type === 'IMAGE_QUESTION' && typeof q.image === 'string' && (q.image as string).startsWith('IMAGE_PROMPT:')) {
          const prompt = (q.image as string).replace('IMAGE_PROMPT:', '').trim();
          if (isServiceAvailable) {
            const imgResult = await generateImage(prompt);
            q.image = imgResult.success && imgResult.data
              ? imgResult.data
              : `https://placehold.co/600x400?text=${encodeURIComponent(prompt.substring(0, 20))}`;
          } else {
            q.image = `https://placehold.co/600x400?text=${encodeURIComponent(prompt.substring(0, 20))}`;
          }
        }
      }
    }
  }

  return result;
};

// ─────────────────────────────────────────────────────────
//  PDF TEXT EXTRACTION  (kept here for backward compat)
// ─────────────────────────────────────────────────────────

export { extractTextFromPdf } from './ai/extractTextFromPdf';
