import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requestWorkerAiText } from '../workerAiClient';

beforeEach(() => {
  vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('legacy-token-that-must-be-ignored');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('requestWorkerAiText', () => {
  it('uses the HttpOnly cookie session and ignores readable legacy storage', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: 'N?i dung an to?n' } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await expect(requestWorkerAiText({ model: 'gemini-2.5-flash', messages: [{ role: 'user', content: 'test' }] }))
      .resolves.toBe('N?i dung an to?n');

    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain('/api/ai/chat');
    expect((init?.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(init?.credentials).toBe('include');
  });

  it('combines OpenAI-compatible SSE deltas', async () => {
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
