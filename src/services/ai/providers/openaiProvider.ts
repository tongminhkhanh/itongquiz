/**
 * @module openaiProvider
 * Generates quiz JSON through the authenticated Worker AI proxy.
 */

import { SYSTEM_INSTRUCTION } from '../../../config/constants';
import { shouldTryNextModel } from '../utils/aiResponseParser';
import { parseAndRepairJSON, validateAndFixQuiz } from '../utils/jsonRepair';
import { fileToBase64 } from '../utils/networkHelpers';
import { requestWorkerAiText } from '../workerAiClient';
import { validateQuizWithAI } from '../../geminiService';

type ImageLibraryItem = { id: string; name: string; data?: string };
type StepCallback = (step: 'generating' | 'reviewing' | 'completed') => void;

const formatMathSigns = (text: string): string =>
  text
    .replace(/\s\*\s/g, ' x ')
    .replace(/\)\s*\*\s*/g, ') x ')
    .replace(/\s*\*\s*\(/g, ' x (')
    .replace(/([a-zA-Z0-9?])\s*\*\s*([a-zA-Z0-9?(])/g, '$1 x $2')
    .replace(/([a-zA-Z0-9?]+)\s+\/\s+([a-zA-Z0-9?]+)/g, '$1 : $2');

const resolveImageLibrary = (
  quiz: Record<string, unknown>,
  imageLibrary: ImageLibraryItem[],
): Record<string, unknown> => {
  if (!imageLibrary.length || !quiz.questions) return quiz;
  const questions = (quiz.questions as Record<string, unknown>[]).map((question) => {
    if (question.type === 'IMAGE_QUESTION' && question.image) {
      const item = imageLibrary.find((image) => image.id === question.image || image.name === question.image);
      if (item?.data) return { ...question, image: item.data };
    }
    return question;
  });
  return { ...quiz, questions };
};

const buildUserContent = async (
  promptText: string,
  file: File | null | undefined,
  imageLibrary: ImageLibraryItem[],
): Promise<unknown[]> => {
  const userContent: unknown[] = [{ type: 'text', text: promptText }];

  if (file) {
    const base64Data = await fileToBase64(file);
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    userContent.unshift({ type: 'text', text: 'T?I LI?U ??NH K?M - ?u ti?n n?i dung file.' });
    userContent.splice(1, 0, isPdf
      ? { type: 'input_file', file_data: `data:${file.type};base64,${base64Data}`, filename: file.name }
      : { type: 'image_url', image_url: { url: `data:${file.type};base64,${base64Data}` } });
  }

  if (imageLibrary.length > 0) {
    userContent.push({ type: 'text', text: 'TH? VI?N H?NH ?NH:' });
    for (const image of imageLibrary) {
      if (image.data?.startsWith('http')) {
        userContent.push({ type: 'text', text: `Image ID: ${image.id} (${image.name})` });
        userContent.push({ type: 'image_url', image_url: { url: image.data } });
      }
    }
  }
  return userContent;
};

export const generateWithOpenAIResilient = async (
  promptText: string,
  _apiKey: string,
  file?: File | null,
  imageLibrary?: ImageLibraryItem[],
  baseUrl: string = 'https://api.thitong.site/v1',
  onStepChange?: StepCallback,
): Promise<unknown> => {
  const isMux = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.includes('thitong.site');
  const modelCandidates = isMux
    ? ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3-flash-preview']
    : ['gpt-4o'];
  const imageLibraryItems = imageLibrary || [];
  const userContent = await buildUserContent(promptText, file, imageLibraryItems);
  const messages = [
    { role: 'system', content: SYSTEM_INSTRUCTION },
    { role: 'user', content: userContent },
  ];

  let lastError: unknown;
  for (let modelIndex = 0; modelIndex < modelCandidates.length; modelIndex++) {
    const model = modelCandidates[modelIndex];
    try {
      const text = await requestWorkerAiText({
        model,
        messages,
        temperature: 0.4,
        response_format: { type: 'json_object' },
      });
      const draft = validateAndFixQuiz(parseAndRepairJSON(formatMathSigns(text))) as Record<string, unknown>;
      let finalQuiz = draft;
      if (onStepChange) {
        onStepChange('reviewing');
        try {
          finalQuiz = validateAndFixQuiz(await validateQuizWithAI(draft, '')) as Record<string, unknown>;
        } catch (reviewError) {
          console.warn('[openaiProvider] Reviewer failed, using generator draft.', reviewError);
        }
      }
      return resolveImageLibrary(finalQuiz, imageLibraryItems);
    } catch (error) {
      lastError = error;
      const canTryNext = modelIndex < modelCandidates.length - 1 && shouldTryNextModel(error);
      if (!canTryNext) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('AI kh?ng tr? v? k?t qu? n?o.');
};
