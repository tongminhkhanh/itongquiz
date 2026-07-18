import { getStoredJWTToken } from '../api/auth';
import { getWorkersApiBaseUrl } from '../api/config';
import { extractAIContent, extractAIErrorMessage } from './utils/aiResponseParser';

export interface WorkerAiRequest extends Record<string, unknown> {
  model: string;
  messages: unknown[];
}

export interface WorkerAiResult {
  text: string;
  payloads: unknown[];
}

export interface WorkerAiRequestOptions {
  timeoutMs?: number;
}

const appendChunk = (current: string, chunk: string): string => {
  if (!chunk) return current;
  if (!current) return chunk;
  if (chunk.startsWith(current)) return chunk;
  if (current.endsWith(chunk)) return current;
  return current + chunk;
};

const parseSseResponse = async (response: Response): Promise<WorkerAiResult> => {
  if (!response.body) {
    const fallbackText = await response.text();
    return { text: fallbackText, payloads: [] };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const payloads: unknown[] = [];
  let text = '';
  let buffer = '';

  const processLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return;
    const raw = trimmed.slice(5).trim();
    if (!raw || raw === '[DONE]') return;

    try {
      const payload = JSON.parse(raw) as unknown;
      payloads.push(payload);
      text = appendChunk(text, extractAIContent(payload));
    } catch {
      text = appendChunk(text, raw);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    lines.forEach(processLine);
    if (done) break;
  }

  if (buffer) processLine(buffer);
  return { text: text.trim(), payloads };
};

export const requestWorkerAi = async (
  requestBody: WorkerAiRequest,
  options: WorkerAiRequestOptions = {},
): Promise<WorkerAiResult> => {
  const path = '/api/ai/chat';
  const token = getStoredJWTToken(path);
  if (!token) {
    throw new Error('Phi?n ??ng nh?p ?? h?t h?n. Vui l?ng ??ng nh?p l?i ?? s? d?ng AI.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? 300_000);

  try {
    const response = await fetch(`${getWorkersApiBaseUrl()}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      const message = extractAIErrorMessage(errorPayload) || `AI service error (${response.status})`;
      throw new Error(message);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) {
      return await parseSseResponse(response);
    }

    const payload = await response.json();
    const aiError = extractAIErrorMessage(payload);
    if (aiError) throw new Error(aiError);
    return { text: extractAIContent(payload).trim(), payloads: [payload] };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Y?u c?u AI qu? th?i gian. Vui l?ng th? l?i.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const requestWorkerAiText = async (
  requestBody: WorkerAiRequest,
  options?: WorkerAiRequestOptions,
): Promise<string> => {
  const result = await requestWorkerAi(requestBody, options);
  if (!result.text) throw new Error('AI kh?ng tr? v? n?i dung.');
  return result.text;
};
