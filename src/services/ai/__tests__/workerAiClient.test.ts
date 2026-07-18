import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requestWorkerAiText } from '../workerAiClient';

const storage: Record<string, string> = {};

beforeEach(() => {
  for (const key of Object.keys(storage)) delete storage[key];
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => storage[key] ?? null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('requestWorkerAiText', () => {
  it('fails before network access when no JWT session exists', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await expect(requestWorkerAiText({ model: 'gemini-2.5-flash', messages: [{}] }))
      .rejects.toThrow('??ng nh?p l?i');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends the teacher JWT to the Worker and parses JSON responses', async () => {
    storage['itongquiz_teacher_jwt_token'] = 'teacher-session-token';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: 'N?i dung an to?n' } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await expect(requestWorkerAiText({ model: 'gemini-2.5-flash', messages: [{ role: 'user', content: 'test' }] }))
      .resolves.toBe('N?i dung an to?n');

    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain('/api/ai/chat');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer teacher-session-token');
    expect(init?.credentials).toBe('include');
  });

  it('combines OpenAI-compatible SSE deltas', async () => {
    storage['itongquiz_teacher_jwt_token'] = 'teacher-session-token';
    const stream = [
      'data: {"choices":[{"delta":{"content":"Xin "}}]}',
      '',
      'data: {"choices":[{"delta":{"content":"ch?o"}}]}',
      '',
      'data: [DONE]',
      '',
    ].join('\n');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(stream, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    }));

    await expect(requestWorkerAiText({ model: 'gemini-2.5-flash', messages: [{}] }))
      .resolves.toBe('Xin ch?o');
  });
});
