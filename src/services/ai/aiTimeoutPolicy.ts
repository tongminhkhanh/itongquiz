import type { AiStage } from './aiAction';

export type AiTimeoutStage = AiStage | 'IMAGE';

export const AI_TIMEOUT_MS_BY_STAGE: Record<AiTimeoutStage, number> = {
  OCR: 120_000,
  GENERATE: 120_000,
  REVIEW: 60_000,
  REPAIR: 60_000,
  REGENERATE: 90_000,
  IMAGE: 90_000,
  GENERIC: 90_000,
};

export const resolveAiTimeoutMs = (
  stage: AiTimeoutStage,
  override?: number,
): number => override ?? AI_TIMEOUT_MS_BY_STAGE[stage];
