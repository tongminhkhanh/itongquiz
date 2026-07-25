export type AiStageMetricStatus = 'SUCCEEDED' | 'FAILED';

export interface AiStageMetricInput {
  actionId: string;
  username: string;
  workflow: string;
  stage: string;
  model: string;
  status: AiStageMetricStatus;
  requestBytes: number;
  ttfbMs: number | null;
  errorCode?: string;
  createdAt: string;
}
