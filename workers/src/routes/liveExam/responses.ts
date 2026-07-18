import { errorResponse } from '../../utils/response';
import * as LiveExamService from '../../services/liveExamService';

export function liveExamErrorResponse(
  error: unknown,
  fallback: string,
  defaultStatus = 500,
): Response {
  if (error instanceof LiveExamService.LiveExamServiceError) {
    return errorResponse(error.message, error.status);
  }
  const message = error instanceof Error && error.message ? error.message : fallback;
  return errorResponse(message, defaultStatus);
}

export function calculateTimeRemaining(endsAt: string): number {
  return Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000));
}
