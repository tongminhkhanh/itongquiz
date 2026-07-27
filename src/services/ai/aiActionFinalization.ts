import { z } from 'zod';
import { getWorkersApiBaseUrl } from '../api/config';
import { GeneratedQuizSchemaError } from './quizGenerationErrors';
import { QuizGenerationValidationError } from './quizRepair';

export type AiActionClientFailureCode =
  | 'CLIENT_SCHEMA_INVALID'
  | 'CLIENT_VALIDATION_FAILED'
  | 'CLIENT_GENERATION_FAILED'
  | 'CLIENT_ABORTED';

export interface AiActionFinalization {
  outcome: 'SUCCEEDED' | 'FAILED';
  failureCode?: AiActionClientFailureCode;
}

export const getAiActionClientFailureCode = (
  error: unknown,
  aborted: boolean,
): AiActionClientFailureCode => {
  if (aborted) return 'CLIENT_ABORTED';
  if (error instanceof GeneratedQuizSchemaError || error instanceof z.ZodError) {
    return 'CLIENT_SCHEMA_INVALID';
  }
  if (error instanceof QuizGenerationValidationError) return 'CLIENT_VALIDATION_FAILED';
  return 'CLIENT_GENERATION_FAILED';
};

export const finalizeAiAction = async (
  actionId: string,
  finalization: AiActionFinalization,
): Promise<boolean> => {
  try {
    const response = await fetch(`${getWorkersApiBaseUrl()}/api/ai/actions/finalize`, {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionId, ...finalization }),
    });

    if (response.ok) return true;
    // Frontend is deployed before Worker during rollout, so a missing endpoint is non-blocking.
    if (response.status === 404) return false;
    console.warn(`[AI Action] Finalization was not accepted (${response.status}).`);
    return false;
  } catch {
    // Finalization telemetry must never hide a successfully generated quiz from the teacher.
    console.warn('[AI Action] Finalization request could not be sent.');
    return false;
  }
};
