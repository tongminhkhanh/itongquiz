import type { AiWorkflow } from './aiAction';

export type QuizReviewMode = 'fast' | 'strict';

export interface QuizQualityPolicyInput {
  workflow: AiWorkflow;
  reviewMode: QuizReviewMode;
}

export const shouldRunAiReviewer = ({
  workflow,
  reviewMode,
}: QuizQualityPolicyInput): boolean => (
  workflow === 'QUIZ_CREATE' && reviewMode === 'strict'
);
