import type { QuizReviewMode } from './quizQualityPolicy';

export interface QuizGenerationRolloutPolicyInput {
  fastPathEnabled: boolean;
  deferredImagesEnabled: boolean;
  requestedReviewMode: QuizReviewMode;
}

export interface QuizGenerationRolloutPolicy {
  effectiveReviewMode: QuizReviewMode;
  shouldDeferImages: boolean;
}

export const resolveQuizGenerationRolloutPolicy = ({
  fastPathEnabled,
  deferredImagesEnabled,
  requestedReviewMode,
}: QuizGenerationRolloutPolicyInput): QuizGenerationRolloutPolicy => ({
  effectiveReviewMode: fastPathEnabled ? requestedReviewMode : 'strict',
  shouldDeferImages: deferredImagesEnabled,
});
