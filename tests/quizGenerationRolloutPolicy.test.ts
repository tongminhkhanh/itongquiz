import { describe, expect, it } from 'vitest';
import { resolveQuizGenerationRolloutPolicy } from '../src/services/ai/quizGenerationRolloutPolicy';

describe('quiz generation rollout policy', () => {
  it('falls back to strict review and blocking images when flags are off', () => {
    expect(resolveQuizGenerationRolloutPolicy({
      fastPathEnabled: false,
      deferredImagesEnabled: false,
      requestedReviewMode: 'fast',
    })).toEqual({
      effectiveReviewMode: 'strict',
      shouldDeferImages: false,
    });
  });

  it('honors the teacher review choice and defers images when flags are on', () => {
    expect(resolveQuizGenerationRolloutPolicy({
      fastPathEnabled: true,
      deferredImagesEnabled: true,
      requestedReviewMode: 'fast',
    })).toEqual({
      effectiveReviewMode: 'fast',
      shouldDeferImages: true,
    });
  });
});
