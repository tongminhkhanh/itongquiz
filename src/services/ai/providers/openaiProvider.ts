/**
 * @module openaiProvider
 * Generates quiz JSON via any OpenAI-compatible API endpoint.
 * Supports LLM-Mux, direct OpenAI, and the Cloudflare Workers fallback proxy.
 * Includes model-level fallback (resilient mode) and SSE streaming support.
 */

import { SYSTEM_INSTRUCTION } from '../../../config/constants';
import { extractAIContent, extractAIErrorMessage, shouldTryNextModel } from '../utils/aiResponseParser';
import { parseAndRepairJSON, validateAndFixQuiz } from '../utils/jsonRepair';
import { shouldUseCliproxyDevProxy, resolveTargetUrl, fileToBase64 } from '../utils/networkHelpers';
import { validateQuizWithAI } from '../../geminiService';

type ImageLibraryItem = { id: string; name: string; data?: string };
type StepCallback = (step: 'generating' | 'reviewing' | 'completed') => void;

// ─────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────

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

const buildUserContent = async (
  promptText: string,
  file: File | null | undefined,
  imageLibrary: ImageLibraryItem[],
  isLlmMux: boolean
): Promise<unknown[]> => {
  const userContent: unknown[] = [{ type: 'text', text: promptText }];

  if (file) {
    const base64Data = await fileToBase64(file);
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isPdf && !isLlmMux) {
      throw new Error('Provider hiện tại chưa hỗ trợ đọc PDF. Vui lòng chọn AI Provider = LLM-Mux.');
    }

    userContent.unshift({
      type: 'text',
      text: 'TÀI LIỆU ĐÍNH KÈM - ƯU TIÊN CAO NHẤT. Đọc kỹ và tạo câu hỏi từ nội dung file.',
    });

    if (isPdf) {
      userContent.splice(1, 0, {
        type: 'input_file',
        file_data: `data:${file.type};base64,${base64Data}`,
        filename: file.name,
      });
    } else if (file.type.startsWith('image/')) {
      userContent.splice(1, 0, {
        type: 'image_url',
        image_url: { url: `data:${file.type};base64,${base64Data}` },
      });
    } else {
      throw new Error(`Định dạng file chưa hỗ trợ: ${file.type || 'unknown'}. Chỉ hỗ trợ PDF hoặc ảnh.`);
    }
  }

  if (imageLibrary.length > 0) {
    userContent.push({ type: 'text', text: '\n\nTHƯ VIỆN HÌNH ẢNH (Image Library):' });
    for (const img of imageLibrary) {
      if (img.data?.startsWith('http')) {
        userContent.push({ type: 'text', text: `\nImage ID: ${img.id} (Name: ${img.name})` });
        userContent.push({ type: 'image_url', image_url: { url: img.data } });
      }
    }
  }

  return userContent;
};

const readStreamOrJson = async (response: Response): Promise<string> => {
  const contentType = response.headers.get('Content-Type') || '';

  if (contentType.includes('text/event-stream') && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (line.startsWith('data: ') && !line.includes('[DONE]')) {
          try {
            const delta = extractAIContent(JSON.parse(line.slice(6)));
            if (delta) fullContent += delta;
          } catch {
            // Ignore malformed SSE frames.
          }
        }
      }
    }

    return fullContent;
  }

  const data = await response.json();
  const aiError = extractAIErrorMessage(data);
  if (aiError) throw new Error(aiError);
  return extractAIContent(data) || '';
};

// ─────────────────────────────────────────────────────────
//  PUBLIC API
// ─────────────────────────────────────────────────────────

/**
 * Generate a quiz via an OpenAI-compatible API. Supports model-level fallbacks
 * for LLM-Mux and Cloudflare Workers proxy fallback when no API key is present.
 */
export const generateWithOpenAIResilient = async (
  promptText: string,
  apiKey: string,
  file?: File | null,
  imageLibrary?: ImageLibraryItem[],
  baseUrl: string = 'https://api.openai.com/v1',
  onStepChange?: StepCallback
): Promise<unknown> => {
  const API_URL = `${baseUrl}/chat/completions`;
  const isLlmMux =
    baseUrl.includes('localhost') ||
    baseUrl.includes('127.0.0.1') ||
    baseUrl.includes('thitong.site');

  const modelCandidates = isLlmMux
    ? ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3-flash-preview', 'gemini-3-pro-preview']
    : ['gpt-4o'];

  const imageLib = imageLibrary || [];
  const userContent = await buildUserContent(promptText, file, imageLib, isLlmMux);

  const messages = [
    { role: 'system', content: SYSTEM_INSTRUCTION },
    { role: 'user', content: userContent },
  ];

  // Build fetch URL & headers
  const WORKERS_API_URL =
    (import.meta as any).env.VITE_WORKERS_API_URL ||
    'https://phieu.thitong.site';
  const workerToken = (import.meta as any).env.VITE_API_SECRET_TOKEN || '';

  let targetUrl = resolveTargetUrl(API_URL.endsWith('/chat/completions') ? API_URL : `${baseUrl}/chat/completions`);
  let fetchUrl = shouldUseCliproxyDevProxy(targetUrl) ? '/api/cliproxy/chat/completions' : targetUrl;
  let fetchHeaders: Record<string, string> = { 'Content-Type': 'application/json' };

  if (apiKey) {
    fetchHeaders.Authorization = `Bearer ${apiKey}`;
  } else if (workerToken) {
    fetchUrl = `${WORKERS_API_URL}/api/ai/chat`;
    fetchHeaders = {
      'Content-Type': 'application/json',
      'X-API-Token': workerToken,
      'x-target-url': API_URL,
      'x-target-token': '',
    };
  }

  let lastError: unknown = null;

  for (let modelIndex = 0; modelIndex < modelCandidates.length; modelIndex++) {
    const modelName = modelCandidates[modelIndex];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300_000);

    try {
      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: fetchHeaders,
        body: JSON.stringify({ model: modelName, messages, temperature: 0.4, response_format: { type: 'json_object' } }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`AI Service Error (${response.status}): ${errText || response.statusText}`);
      }

      const fullContent = await readStreamOrJson(response);
      if (!fullContent) throw new Error('AI không trả về kết quả nào (Định dạng OpenAI không xác định).');

      const parsedQuiz = validateAndFixQuiz(parseAndRepairJSON(formatMathSigns(fullContent))) as Record<string, unknown>;

      let finalQuiz = parsedQuiz;
      if (onStepChange) {
        onStepChange('reviewing');
        try {
          const reviewedJson = await validateQuizWithAI(parsedQuiz, apiKey);
          finalQuiz = validateAndFixQuiz(reviewedJson) as Record<string, unknown>;
        } catch (reviewError) {
          console.warn('[openaiProvider] ⚠️ Reviewer failed, using generator draft.', reviewError);
        }
      }

      return resolveImageLibrary(finalQuiz, imageLib);
    } catch (error) {
      if ((error as { name?: string }).name === 'AbortError') {
        throw new Error('Yêu cầu quá thời gian (Timeout). Vui lòng thử lại.');
      }

      lastError = error;
      const canTryNext =
        isLlmMux &&
        modelIndex < modelCandidates.length - 1 &&
        shouldTryNextModel(error);

      if (canTryNext) {
        console.warn(`[openaiProvider] Model ${modelName} failed, trying next...`, error);
        continue;
      }

      console.error('openaiProvider Error:', error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('AI không trả về kết quả nào.');
};
