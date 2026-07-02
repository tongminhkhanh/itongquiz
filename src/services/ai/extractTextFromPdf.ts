/**
 * @module extractTextFromPdf
 * Extracts raw text from a PDF or image file using AI (OCR mode).
 * Supports: Native OCR (Tesseract), LLM-Mux (OpenAI-compatible), Gemini Direct API.
 */

import type { AIProvider } from '../geminiService';
import {
  resolvePublicProviderBaseUrl,
  shouldUseCliproxyDevProxy,
  resolveTargetUrl,
  fileToBase64,
} from './utils/networkHelpers';
import { extractAIContent } from './utils/aiResponseParser';

const OCR_PROMPT = `🔍 CHẾ ĐỘ TRÍCH XUẤT VĂN BẢN (OCR) - KHÔNG TRẢ VỀ JSON

📝 QUY TẮC BẮT BUỘC:
1. ĐỌC và TRÍCH XUẤT nguyên văn tất cả nội dung trong file
2. SỬA LỖI OCR phổ biến (l↔1, O↔0, dấu tiếng Việt sai)
3. GIỮ NGUYÊN cấu trúc: số thứ tự câu hỏi, A/B/C/D, đoạn văn
4. ĐỊNH DẠNG: Mỗi câu cách nhau 1 dòng trống, đáp án thụt lề
5. Hình ảnh ghi: [Hình: mô tả ngắn]

⚠️ CHỈ TRẢ VỀ VĂN BẢN THUẦN TÚY - KHÔNG JSON, KHÔNG MARKDOWN CODE BLOCK`;

const OCR_SYSTEM = `Bạn là trợ lý OCR chuyên nghiệp. Trả về VĂN BẢN THUẦN TÚY, không phải JSON.
Sửa lỗi OCR nhưng KHÔNG thay đổi nội dung. Giữ nguyên cấu trúc đề thi.`;

// ─────────────────────────────────────────────────────────
//  NATIVE OCR (Tesseract at localhost:8000)
// ─────────────────────────────────────────────────────────

const extractWithNativeOCR = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('http://localhost:8000/extract', { method: 'POST', body: formData });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Lỗi OCR Backend (${response.status}): ${(errorData as { detail?: string }).detail || response.statusText}`);
  }

  const data = await response.json() as { success: boolean; text?: string };
  if (!data.success) throw new Error('OCR Backend trả về lỗi');
  return data.text || '';
};

// ─────────────────────────────────────────────────────────
//  LLM-MUX (OpenAI-compatible)
// ─────────────────────────────────────────────────────────

const extractWithLlmMux = async (file: File, base64Data: string, apiKey: string): Promise<string> => {
  const configuredBaseUrl =
    (import.meta as any).env.VITE_LLM_MUX_BASE_URL || (import.meta as any).env.VITE_CLIPROXY_API || '';
  const baseUrl = resolvePublicProviderBaseUrl(configuredBaseUrl, 'https://api.thitong.site/v1');
  const API_URL = `${baseUrl}/chat/completions`;

  const isPDF = file.type === 'application/pdf';
  const userContent: unknown[] = [{ type: 'text', text: OCR_PROMPT }];

  if (isPDF) {
    userContent.push({ type: 'input_file', file_data: `data:${file.type};base64,${base64Data}`, filename: file.name });
  } else {
    userContent.push({ type: 'image_url', image_url: { url: `data:${file.type};base64,${base64Data}` } });
  }

  const messages = [{ role: 'system', content: OCR_SYSTEM }, { role: 'user', content: userContent }];

  let fetchUrl = resolveTargetUrl(API_URL.endsWith('/chat/completions') ? API_URL : `${baseUrl}/chat/completions`);
  fetchUrl = shouldUseCliproxyDevProxy(fetchUrl) ? '/api/cliproxy/chat/completions' : fetchUrl;

  const fetchHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) fetchHeaders.Authorization = `Bearer ${apiKey}`;

  const WORKERS_API_URL = (import.meta as any).env.VITE_WORKERS_API_URL || 'https://phieu.thitong.site';
  const workerToken = (import.meta as any).env.VITE_API_SECRET_TOKEN || '';
  if (!apiKey && workerToken) {
    Object.assign(fetchHeaders, { 'X-API-Token': workerToken, 'x-target-url': API_URL, 'x-target-token': '' });
  }

  try {
    const response = await fetch(!apiKey && workerToken ? `${WORKERS_API_URL}/api/ai/chat` : fetchUrl, {
      method: 'POST',
      headers: fetchHeaders,
      body: JSON.stringify({ model: 'gemini-2.0-flash', messages, temperature: 0.2 }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Lỗi LLM-Mux API (${response.status}): ${(errorData as { error?: { message?: string } }).error?.message || response.statusText}`);
    }

    const data = await response.json();
    const text = extractAIContent(data);
    if (!text) throw new Error('AI trả về dữ liệu rỗng.');
    return text.trim();
  } catch (err) {
    if ((err as { name?: string }).name === 'TypeError' && (err as Error).message === 'Failed to fetch') {
      throw new Error('Không thể kết nối đến Proxy Server. Vui lòng kiểm tra lại cấu hình.');
    }
    throw err;
  }
};

// ─────────────────────────────────────────────────────────
//  GEMINI DIRECT API
// ─────────────────────────────────────────────────────────

const extractWithGeminiDirect = async (file: File, base64Data: string, apiKey: string): Promise<string> => {
  const MODEL_NAME = 'gemini-2.0-flash';
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [{ parts: [{ text: OCR_PROMPT }, { inline_data: { mime_type: file.type, data: base64Data } }] }],
    system_instruction: { parts: [{ text: OCR_SYSTEM }] },
    generation_config: { temperature: 0.2 },
  };

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 429 || response.status === 503) {
        attempt++;
        if (attempt >= maxRetries) throw new Error('Hệ thống đang quá tải. Vui lòng chờ 1-2 phút rồi thử lại.');
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }
      throw new Error(`Lỗi API (${response.status}): ${(errorData as { error?: { message?: string } }).error?.message || response.statusText}`);
    }

    const data = await response.json() as { candidates?: { content: { parts: { text?: string }[] } }[] };
    if (!data.candidates?.length) throw new Error('AI không trả về kết quả nào.');
    const text = data.candidates[0].content.parts[0].text;
    if (!text) throw new Error('AI trả về dữ liệu rỗng.');
    return text.trim();
  }

  throw new Error('Không thể trích xuất văn bản sau nhiều lần thử.');
};

// ─────────────────────────────────────────────────────────
//  PUBLIC API
// ─────────────────────────────────────────────────────────

export const extractTextFromPdf = async (
  file: File,
  provider: AIProvider = 'gemini',
  customApiKey?: string
): Promise<string> => {
  // Native OCR
  if (provider === 'native-ocr') {
    try {
      return await extractWithNativeOCR(file);
    } catch (err) {
      if ((err as { name?: string }).name === 'TypeError' && (err as Error).message === 'Failed to fetch') {
        throw new Error('Không thể kết nối đến OCR Backend (localhost:8000). Vui lòng đảm bảo bạn đã chạy "uvicorn main:app".');
      }
      throw err;
    }
  }

  if (provider !== 'gemini' && provider !== 'llm-mux') {
    throw new Error('Chức năng trích xuất văn bản từ PDF chỉ hỗ trợ với Gemini, LLM-Mux hoặc Native OCR.');
  }

  const base64Data = await fileToBase64(file);

  // Auto-fallback: Gemini → LLM-Mux if no native key
  let actualProvider = provider;
  if (provider === 'gemini') {
    const geminiKey = (
      customApiKey ||
      (import.meta as any).env.VITE_GEMINI_API_KEY ||
      (import.meta as any).env.VITE_API_KEY ||
      ''
    ).trim();
    if (!geminiKey) {
      const proxyKey = (import.meta as any).env.VITE_CLIPROXY_TOKEN || (import.meta as any).env.VITE_LLM_MUX_API_KEY;
      if (proxyKey) actualProvider = 'llm-mux';
    }
  }

  if (actualProvider === 'llm-mux') {
    const envKey =
      (import.meta as any).env.VITE_LLM_MUX_API_KEY ||
      (import.meta as any).env.VITE_CLIPROXY_TOKEN ||
      '';
    return extractWithLlmMux(file, base64Data, (customApiKey || envKey || '').trim());
  }

  // Gemini Direct
  const envKey =
    (import.meta as any).env.VITE_GEMINI_API_KEY ||
    (import.meta as any).env.VITE_API_KEY ||
    '';
  const apiKey = (customApiKey || envKey || '').trim();
  if (!apiKey) throw new Error('Vui lòng nhập Gemini API Key trong phần Cấu hình.');

  return extractWithGeminiDirect(file, base64Data, apiKey);
};
