import { certificateError } from './responses';
import type { CertificateRenderPreviewRequest, PreviewInput } from './previewTypes';

export async function parsePreviewRequest(request: Request): Promise<Response | PreviewInput> {
  let body: CertificateRenderPreviewRequest;
  try {
    body = await request.json<CertificateRenderPreviewRequest>();
  } catch {
    return certificateError('CERTIFICATE_INVALID_JSON', 'Request body must be valid JSON');
  }
  const templateId = typeof body.template_id === 'string' ? body.template_id.trim() : '';
  const classId = typeof body.class_id === 'string' ? body.class_id.trim() : '';
  const studentId = typeof body.student_id === 'string' ? body.student_id.trim() : '';
  const quizId = typeof body.quiz_id === 'string' && body.quiz_id.trim() ? body.quiz_id.trim() : null;
  const achievementPrefix = typeof body.achievement_prefix === 'string'
    ? body.achievement_prefix.trim()
    : null;
  const dateLine = typeof body.date_line === 'string' ? body.date_line.trim() : null;
  if (!templateId || !classId || !studentId) {
    return certificateError(
      'CERTIFICATE_VALIDATION_ERROR',
      'template_id, class_id and student_id are required',
    );
  }
  if ((achievementPrefix?.length ?? 0) > 160 || (dateLine?.length ?? 0) > 200) {
    return certificateError('CERTIFICATE_VALIDATION_ERROR', 'Preview text exceeds the allowed length');
  }
  return { templateId, classId, studentId, quizId, achievementPrefix, dateLine };
}
