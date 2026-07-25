import { describe, expect, it } from 'vitest';
import { shouldRunAiReviewer } from '../src/services/ai/quizQualityPolicy';

describe('shouldRunAiReviewer', () => {
  it('skips reviewer in the default fast path', () => {
    expect(shouldRunAiReviewer({ workflow: 'QUIZ_CREATE', reviewMode: 'fast' })).toBe(false);
  });

  it('runs reviewer only for strict full-quiz creation', () => {
    expect(shouldRunAiReviewer({ workflow: 'QUIZ_CREATE', reviewMode: 'strict' })).toBe(true);
    expect(shouldRunAiReviewer({ workflow: 'QUESTION_REGENERATE', reviewMode: 'strict' })).toBe(false);
  });
});
