/**
 * @module geminiProvider
 * Generates quiz JSON via the Gemini model accessed through a localhost OpenAI-compatible proxy.
 */

import { SYSTEM_INSTRUCTION } from '../../../config/constants';
import { extractAIContent } from '../utils/aiResponseParser';
import { parseAndRepairJSON, validateAndFixQuiz } from '../utils/jsonRepair';
import { fileToBase64, urlToBase64 } from '../utils/networkHelpers';
import { validateQuizWithAI } from '../../geminiService';

type ImageLibraryItem = { id: string; name: string; data?: string };

const formatMathSigns = (text: string): string =>
  text
    .replace(/\s\*\s/g, ' x ')
    .replace(/\)\s*\*\s*/g, ') x ')
    .replace(/\s*\*\s*\(/g, ' x (')
    .replace(/([a-zA-Z0-9?])\s*\*\s*([a-zA-Z0-9?(])/g, '$1 x $2')
    .replace(/([a-zA-Z0-9?]+)\s+\/\s+([a-zA-Z0-9?]+)/g, '$1 : $2');

const resolveImageLibrary = (
  quiz: Record<string, unknown>,
  imageLibrary: ImageLibraryItem[]
): Record<string, unknown> => {
  if (!imageLibrary.length || !quiz.questions) return quiz;
  const questions = (quiz.questions as Record<string, unknown>[]).map((q) => {
    if (q.type === 'IMAGE_QUESTION' && q.image) {
      const item = imageLibrary.find((img) => img.id === q.image || img.name === q.image);
      if (item?.data) return { ...q, image: item.data };
    }
    return q;
  });
  return { ...quiz, questions };
};

/**
 * Generate a quiz via the Gemini-compatible localhost proxy (OpenAI chat endpoint).
 */
export const generateWithGemini = async (
  promptText: string,
  apiKey: string,
  file?: File | null,
  imageLibrary?: ImageLibraryItem[],
  onStepChange?: (step: 'generating' | 'reviewing' | 'completed') => void
): Promise<unknown> => {
  const MODEL_NAME = 'gemini-2.0-flash';
  const VITE_LOCALHOST_AI_URL = (import.meta as any).env.VITE_LOCALHOST_AI_URL || 'http://localhost:3000/v1';
  const API_URL = `${VITE_LOCALHOST_AI_URL}/chat/completions`;

  const userContent: Record<string, unknown>[] = [{ type: 'text', text: promptText }];

  if (file) {
    const base64Data = await fileToBase64(file);
    const isPDF = file.type === 'application/pdf';

    userContent.unshift({ type: 'text', text: `⛔⛔⛔ TÀI LIỆU ĐÍNH KÈM - ƯU TIÊN TUYỆT ĐỐI ⛔⛔⛔\n📄 LOẠI FILE: ${isPDF ? 'PDF' : 'HÌNH ẢNH'}\n📁 TÊN FILE: ${file.name}\n\nĐỌC KỸ nội dung, trích xuất câu hỏi NGUYÊN VĂN, TỰ XÁC ĐỊNH đáp án.` });
    userContent.splice(1, 0, {
      type: 'image_url',
      image_url: { url: `data:${file.type};base64,${base64Data}` },
    });
    userContent.push({ type: 'text', text: '⏫⏫⏫ KẾT THÚC TÀI LIỆU ⏫⏫⏫' });
  }

  if (imageLibrary?.length) {
    userContent.push({ type: 'text', text: 'THƯ VIỆN HÌNH ẢNH (Image Library):' });
    for (const img of imageLibrary) {
      if (img.data?.startsWith('http')) {
        try {
          const { data, mimeType } = await urlToBase64(img.data);
          userContent.push({ type: 'text', text: `Image ID: ${img.id} (Name: ${img.name})` });
          userContent.push({ type: 'image_url', image_url: { url: `data:${mimeType};base64,${data}` } });
        } catch (err) {
          console.error(`Failed to fetch image ${img.id}:`, err);
        }
      }
    }
  }

  const messages = [
    { role: 'system', content: SYSTEM_INSTRUCTION },
    { role: 'user', content: userContent },
  ];

  const requestBody = { model: MODEL_NAME, messages, temperature: 0.4, response_format: { type: 'json_object' } };

  const maxRetries = 5;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error(`AI request failed with status: ${response.status}`);

      const data = await response.json();
      const text = extractAIContent(data);
      if (!text) throw new Error('AI không trả về kết quả nào.');

      const quizData = validateAndFixQuiz(parseAndRepairJSON(formatMathSigns(text))) as Record<string, unknown>;

      let finalQuiz = quizData;
      if (onStepChange) {
        onStepChange('reviewing');
        try {
          const reviewedJson = await validateQuizWithAI(quizData, apiKey);
          finalQuiz = validateAndFixQuiz(reviewedJson) as Record<string, unknown>;
        } catch (reviewError) {
          console.warn('[generateWithGemini] ⚠️ Reviewer failed, using generator draft:', reviewError);
        }
      }

      return resolveImageLibrary(finalQuiz, imageLibrary || []);
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) { console.error('Generate Quiz Error (Gemini Proxy):', error); throw error; }
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
};
