/**
 * Extracts text from PDF/image files without exposing provider credentials.
 * Remote OCR always goes through the authenticated Cloudflare Worker.
 */

import type { AIProvider } from '../geminiService';
import { fileToBase64 } from './utils/networkHelpers';
import { requestWorkerAiText } from './workerAiClient';

const OCR_PROMPT = `CH? ?? TR?CH XU?T V?N B?N (OCR)
1. ??c v? tr?ch xu?t nguy?n v?n to?n b? n?i dung.
2. S?a l?i OCR ph? bi?n nh?ng kh?ng thay ??i ? ngh?a.
3. Gi? c?u tr?c c?u h?i v? c?c l?a ch?n A/B/C/D.
4. Ch? tr? v? v?n b?n thu?n t?y, kh?ng JSON, kh?ng code block.`;

const OCR_SYSTEM = 'B?n l? tr? l? OCR. Ch? tr? v? v?n b?n thu?n t?y v? gi? nguy?n c?u tr?c t?i li?u.';

const extractWithNativeOcr = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('http://localhost:8000/extract', { method: 'POST', body: formData });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { detail?: string };
    throw new Error(`L?i OCR Backend (${response.status}): ${payload.detail || response.statusText}`);
  }
  const payload = await response.json() as { success: boolean; text?: string };
  if (!payload.success) throw new Error('OCR Backend tr? v? l?i.');
  return payload.text || '';
};

const extractWithWorker = async (file: File): Promise<string> => {
  const base64Data = await fileToBase64(file);
  const userContent: unknown[] = [{ type: 'text', text: OCR_PROMPT }];
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    userContent.push({
      type: 'input_file',
      file_data: `data:${file.type || 'application/pdf'};base64,${base64Data}`,
      filename: file.name,
    });
  } else {
    userContent.push({ type: 'image_url', image_url: { url: `data:${file.type};base64,${base64Data}` } });
  }

  return requestWorkerAiText({
    model: 'gemini-2.5-flash',
    messages: [
      { role: 'system', content: OCR_SYSTEM },
      { role: 'user', content: userContent },
    ],
    temperature: 0.1,
  });
};

export const extractTextFromPdf = async (
  file: File,
  provider: AIProvider = 'gemini',
  _customApiKey?: string,
): Promise<string> => {
  if (provider === 'native-ocr') {
    try {
      return await extractWithNativeOcr(file);
    } catch (error: unknown) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Kh?ng th? k?t n?i OCR Backend t?i localhost:8000.');
      }
      throw error;
    }
  }

  if (!['gemini', 'llm-mux', 'localhost', 'openai'].includes(provider)) {
    throw new Error('Provider OCR kh?ng ???c h? tr?.');
  }
  return extractWithWorker(file);
};
