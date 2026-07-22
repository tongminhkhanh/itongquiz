/**
 * Extracts text from PDF/image files without exposing provider credentials.
 * Remote OCR always goes through the authenticated Cloudflare Worker.
 */

import type { AIProvider } from '../geminiService';
import type { QuizAiExecutionContext } from './aiAction';
import { fileToBase64 } from './utils/networkHelpers';
import { requestWorkerAiText } from './workerAiClient';

const OCR_PROMPT = `CHẾ ĐỘ TRÍCH XUẤT VĂN BẢN (OCR)
1. Đọc và trích xuất nguyên văn toàn bộ nội dung.
2. Sửa lỗi OCR phổ biến nhưng không thay đổi ý nghĩa.
3. Giữ cấu trúc câu hỏi và các lựa chọn A/B/C/D.
4. Chỉ trả về văn bản thuần túy, không JSON, không code block.`;

const OCR_SYSTEM = 'Bạn là trợ lý OCR. Chỉ trả về văn bản thuần túy và giữ nguyên cấu trúc tài liệu.';

const toWorkerOptions = (execution?: QuizAiExecutionContext) => execution ? {
  action: {
    ...execution.action,
    stage: execution.stage,
  },
  signal: execution.signal,
} : undefined;

const extractWithNativeOcr = async (
  file: File,
  execution?: QuizAiExecutionContext,
): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('http://localhost:8000/extract', {
    method: 'POST',
    body: formData,
    signal: execution?.signal,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { detail?: string };
    throw new Error(`Lỗi OCR Backend (${response.status}): ${payload.detail || response.statusText}`);
  }
  const payload = await response.json() as { success: boolean; text?: string };
  if (!payload.success) throw new Error('OCR Backend trả về lỗi.');
  return payload.text || '';
};

const extractWithWorker = async (
  file: File,
  execution?: QuizAiExecutionContext,
): Promise<string> => {
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
  }, toWorkerOptions(execution));
};

export const extractTextFromPdf = async (
  file: File,
  provider: AIProvider = 'gemini',
  execution?: QuizAiExecutionContext,
): Promise<string> => {
  if (provider === 'native-ocr') {
    try {
      return await extractWithNativeOcr(file, execution);
    } catch (error: unknown) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Không thể kết nối OCR Backend tại localhost:8000.');
      }
      throw error;
    }
  }

  if (!['gemini', 'llm-mux', 'localhost', 'openai'].includes(provider)) {
    throw new Error('Provider OCR không được hỗ trợ.');
  }
  return extractWithWorker(file, execution);
};
