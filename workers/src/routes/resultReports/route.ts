import type { Env } from '../../types';
import { handleResultReportCohort } from './cohortHandler';
import { resultReportError } from './responses';

export async function handleResultReportRoutes(
  request: Request,
  env: Env,
  path: string,
  method: string,
): Promise<Response> {
  if (path === '/api/result-reports/cohort') {
    if (method !== 'POST') {
      return resultReportError('RESULT_REPORT_METHOD_NOT_ALLOWED', 'Method not allowed', 405);
    }
    return handleResultReportCohort(request, env);
  }

  return resultReportError('RESULT_REPORT_NOT_FOUND', 'Not found', 404);
}
