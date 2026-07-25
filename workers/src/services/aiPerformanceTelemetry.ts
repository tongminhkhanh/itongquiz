import type { AiStageMetricInput } from '../../../shared/ai-performance.contract';

export async function recordAiStageMetric(
  db: D1Database,
  input: AiStageMetricInput,
): Promise<void> {
  await db.prepare(`
    INSERT INTO ai_generation_stage_metrics (
      action_id,
      username,
      workflow,
      stage,
      model,
      status,
      request_bytes,
      ttfb_ms,
      error_code,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    input.actionId,
    input.username,
    input.workflow,
    input.stage,
    input.model,
    input.status,
    input.requestBytes,
    input.ttfbMs,
    input.errorCode ?? null,
    input.createdAt,
  ).run();
}
