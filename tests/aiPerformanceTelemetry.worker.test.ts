import { describe, expect, it, vi } from 'vitest';
import { recordAiStageMetric } from '../workers/src/services/aiPerformanceTelemetry';

describe('recordAiStageMetric', () => {
  it('stores only timing metadata and never stores prompt content', async () => {
    const run = vi.fn(async () => ({ success: true }));
    const bind = vi.fn(() => ({ run }));
    const prepare = vi.fn(() => ({ bind }));
    const db = { prepare } as unknown as D1Database;

    await recordAiStageMetric(db, {
      actionId: 'ai-1234567890abcdefghij',
      username: 'teacher-a',
      workflow: 'QUIZ_CREATE',
      stage: 'GENERATE',
      model: 'gemini-2.5-flash',
      status: 'SUCCEEDED',
      requestBytes: 4800,
      ttfbMs: 12500,
      createdAt: '2026-07-25T00:00:00.000Z',
    });

    expect(prepare).toHaveBeenCalledOnce();
    expect(bind).toHaveBeenCalledWith(
      'ai-1234567890abcdefghij',
      'teacher-a',
      'QUIZ_CREATE',
      'GENERATE',
      'gemini-2.5-flash',
      'SUCCEEDED',
      4800,
      12500,
      null,
      '2026-07-25T00:00:00.000Z',
    );
    expect(JSON.stringify(bind.mock.calls)).not.toContain('messages');
  });
});
