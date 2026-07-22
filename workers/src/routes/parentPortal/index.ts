import type { Env } from '../../types';
import { errorResponse } from '../../utils/response';
import { handleTeacherLinkRoutes } from './teacherLinkRoutes';

export async function handleParentPortalRoutes(
  request: Request,
  env: Env,
  path: string,
  method: string,
): Promise<Response> {
  const teacherLinkResponse = await handleTeacherLinkRoutes(request, env, path, method);
  if (teacherLinkResponse) return teacherLinkResponse;
  return errorResponse('Parent Portal route not found', 404);
}
