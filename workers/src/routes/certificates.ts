import { verifyJWTMiddleware, requireTeacher } from '../middleware/jwtAuth';
import { jsonResponse } from '../utils/response';
import type { Env } from '../types';
import type {
  CertificateApiError,
  CertificateApiSuccess,
  CertificateBatchSummary,
  CreateCertificateBatchRequest,
  CreateCertificateBatchResult,
  StudentCertificateItem,
} from '../../../shared/certificates.contract';

function certificateError(code: string, message: string, status = 400): Response {
  return jsonResponse<CertificateApiError>({ error: { code, message } }, status);
}

function certificateSuccess<T>(data: T, status = 200): Response {
  return jsonResponse<CertificateApiSuccess<T>>({ data }, status);
}

function normalizeLookupText(value: string): string {
  return value.trim().toLocaleLowerCase('vi-VN');
}

// POST /api/certificate-batches
export async function handleCreateBatch(request: Request, env: Env): Promise<Response> {
  const authResult = await verifyJWTMiddleware(request, env);
  if (authResult instanceof Response) return authResult;
  if (!requireTeacher(authResult.user)) {
    return certificateError('CERTIFICATE_FORBIDDEN', 'Forbidden', 403);
  }

  let body: CreateCertificateBatchRequest;
  try {
    const parsed = await request.json<unknown>();
    if (!parsed || typeof parsed !== 'object') {
      return certificateError('CERTIFICATE_INVALID_JSON', 'Request body must be a JSON object');
    }
    body = parsed as CreateCertificateBatchRequest;
  } catch {
    return certificateError('CERTIFICATE_INVALID_JSON', 'Request body must be valid JSON');
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const requestId = typeof body.request_id === 'string' ? body.request_id.trim() : '';
  const classId = typeof body.class_id === 'string' ? body.class_id.trim() : '';
  const templateId = typeof body.template_id === 'string' ? body.template_id.trim() : '';
  const quizId = typeof body.quiz_id === 'string' && body.quiz_id.trim() ? body.quiz_id.trim() : null;
  const message = typeof body.message === 'string' && body.message.trim() ? body.message.trim() : null;
  const hasValidStudentIds = Array.isArray(body.student_ids)
    && body.student_ids.every((studentId) => typeof studentId === 'string');
  const studentIds = hasValidStudentIds
    ? Array.from(new Set(body.student_ids.map((studentId) => studentId.trim()).filter(Boolean)))
    : [];
  if (!requestId || !title || !classId || !templateId || studentIds.length === 0) {
    return certificateError(
      'CERTIFICATE_VALIDATION_ERROR',
      'request_id, title, class_id, template_id and at least one student_id are required',
    );
  }
  if (studentIds.length > 100) {
    return certificateError('CERTIFICATE_BATCH_TOO_LARGE', 'A batch can contain at most 100 students');
  }
  if (requestId.length > 128 || title.length > 200 || (message?.length ?? 0) > 500) {
    return certificateError('CERTIFICATE_VALIDATION_ERROR', 'One or more fields exceed the allowed length');
  }

  const teacherId = authResult.user.id ?? authResult.user.username;
  const existing = await env.DB.prepare(`
    SELECT id, status FROM certificate_batches WHERE teacher_id = ? AND request_id = ?
  `).bind(teacherId, requestId).first<{ id: string; status: CreateCertificateBatchResult['status'] }>();
  if (existing) {
    return certificateSuccess<CreateCertificateBatchResult>({
      batch_id: existing.id,
      status: existing.status,
    });
  }

  const classroom = await env.DB.prepare(`
    SELECT id, name, teacher_username FROM classes WHERE id = ?
  `).bind(classId).first<{ id: string; name: string; teacher_username: string }>();
  if (!classroom) {
    return certificateError('CERTIFICATE_CLASS_NOT_FOUND', 'Class not found', 404);
  }
  if (authResult.user.role !== 'admin' && classroom.teacher_username !== authResult.user.username) {
    return certificateError('CERTIFICATE_CLASS_FORBIDDEN', 'You do not own this class', 403);
  }

  const studentPlaceholders = studentIds.map(() => '?').join(', ');
  const { results: roster } = await env.DB.prepare(`
    SELECT id, full_name FROM students
    WHERE class_id = ? AND id IN (${studentPlaceholders})
  `).bind(classId, ...studentIds).all<{ id: string; full_name: string }>();
  if (roster.length !== studentIds.length) {
    return certificateError(
      'CERTIFICATE_STUDENT_SCOPE_INVALID',
      'One or more students do not belong to the selected class',
      403,
    );
  }

  const template = await env.DB.prepare(`
    SELECT id, school_id, created_by, is_active
    FROM certificate_templates WHERE id = ?
  `).bind(templateId).first<{
    id: string;
    school_id: string | null;
    created_by: string;
    is_active: number;
  }>();
  if (!template || !template.is_active) {
    return certificateError('CERTIFICATE_TEMPLATE_NOT_FOUND', 'Active template not found', 404);
  }
  const schoolId = authResult.user.school_id ?? authResult.user.username;
  const canUseTemplate = authResult.user.role === 'admin'
    || template.school_id === null
    || template.created_by === 'admin'
    || template.school_id === schoolId;
  if (!canUseTemplate) {
    return certificateError('CERTIFICATE_TEMPLATE_FORBIDDEN', 'Template is outside your scope', 403);
  }

  let quiz: { id: string; title: string } | null = null;
  if (quizId) {
    quiz = await env.DB.prepare(`
      SELECT id, title FROM quizzes WHERE id = ?
    `).bind(quizId).first<{ id: string; title: string }>();
    if (!quiz) {
      return certificateError('CERTIFICATE_QUIZ_NOT_FOUND', 'Quiz not found', 404);
    }
    if (authResult.user.role !== 'admin') {
      const quizAccess = await env.DB.prepare(`
        SELECT q.id
        FROM quizzes q
        WHERE q.id = ? AND (
          q.created_by = ? OR EXISTS (
            SELECT 1 FROM assignments a
            WHERE a.quiz_id = q.id AND a.class_id = ?
          )
        )
      `).bind(quizId, authResult.user.username, classId).first();
      if (!quizAccess) {
        return certificateError('CERTIFICATE_QUIZ_FORBIDDEN', 'Quiz is outside your scope', 403);
      }
    }
  }

  const latestResultByName = new Map<string, { score: number | null; quiz_title: string | null }>();
  if (quiz) {
    const { results } = await env.DB.prepare(`
      SELECT student_name, score, quiz_title
      FROM results
      WHERE quiz_id = ? AND class_name = ? AND answers != '{"status":"STARTED"}'
      ORDER BY submitted_at DESC
    `).bind(quiz.id, classroom.name).all<{
      student_name: string;
      score: number | null;
      quiz_title: string | null;
    }>();
    for (const result of results) {
      const key = normalizeLookupText(result.student_name);
      if (!latestResultByName.has(key)) latestResultByName.set(key, result);
    }
  }

  const batchId = `batch-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [env.DB.prepare(`
    INSERT INTO certificate_batches (
      id, teacher_id, request_id, class_id, quiz_id, template_id, title, message,
      status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `).bind(
    batchId,
    teacherId,
    requestId,
    classId,
    quizId,
    templateId,
    title,
    message,
    now,
    now,
  )];

  for (const student of roster) {
    const result = latestResultByName.get(normalizeLookupText(student.full_name));
    statements.push(env.DB.prepare(`
      INSERT INTO certificates (
        id, batch_id, student_id, student_name, student_score, quiz_title,
        status, issued_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).bind(
      `cert-${crypto.randomUUID()}`,
      batchId,
      student.id,
      student.full_name,
      result?.score ?? null,
      result?.quiz_title ?? quiz?.title ?? null,
      now,
      now,
    ));
  }

  try {
    await env.DB.batch(statements);
  } catch (error) {
    const racedBatch = await env.DB.prepare(`
      SELECT id, status FROM certificate_batches WHERE teacher_id = ? AND request_id = ?
    `).bind(teacherId, requestId).first<{
      id: string;
      status: CreateCertificateBatchResult['status'];
    }>();
    if (racedBatch) {
      return certificateSuccess<CreateCertificateBatchResult>({
        batch_id: racedBatch.id,
        status: racedBatch.status,
      });
    }
    throw error;
  }

  if (env.CERTIFICATE_QUEUE) {
    await env.CERTIFICATE_QUEUE.send({ batchId });
  }

  return certificateSuccess<CreateCertificateBatchResult>({
    batch_id: batchId,
    status: 'pending',
  }, 201);
}

// GET /api/certificate-batches
export async function handleGetBatches(request: Request, env: Env): Promise<Response> {
  const authResult = await verifyJWTMiddleware(request, env);
  if (authResult instanceof Response) return authResult;
  if (!requireTeacher(authResult.user)) {
    return certificateError('CERTIFICATE_FORBIDDEN', 'Forbidden', 403);
  }

  const teacherId = authResult.user.id ?? authResult.user.username;
  const { results } = await env.DB.prepare(`
    SELECT
      cb.id,
      cb.title,
      cb.message,
      cb.status,
      ct.name AS template_name,
      COUNT(c.id) AS total_certificates,
      SUM(CASE WHEN c.status = 'sent' THEN 1 ELSE 0 END) AS sent_certificates,
      SUM(CASE WHEN c.status = 'failed' THEN 1 ELSE 0 END) AS failed_certificates,
      cb.created_at,
      cb.sent_at
    FROM certificate_batches cb
    LEFT JOIN certificate_templates ct ON ct.id = cb.template_id
    LEFT JOIN certificates c ON c.batch_id = cb.id
    WHERE cb.teacher_id = ?
    GROUP BY cb.id
    ORDER BY cb.created_at DESC
  `).bind(teacherId).all<CertificateBatchSummary>();

  return certificateSuccess(results);
}

// GET /api/certificate-batches/:id
export async function handleGetBatchDetail(request: Request, env: Env, batchId: string): Promise<Response> {
  const authResult = await verifyJWTMiddleware(request, env);
  if (authResult instanceof Response) return authResult;
  if (!requireTeacher(authResult.user)) {
    return certificateError('CERTIFICATE_FORBIDDEN', 'Forbidden', 403);
  }

  const teacherId = authResult.user.id ?? authResult.user.username;
  const batch = await env.DB.prepare(`
    SELECT cb.*, ct.name AS template_name,
      COUNT(c.id) AS total_certificates,
      SUM(CASE WHEN c.status = 'sent' THEN 1 ELSE 0 END) AS sent_certificates,
      SUM(CASE WHEN c.status = 'failed' THEN 1 ELSE 0 END) AS failed_certificates
    FROM certificate_batches cb
    LEFT JOIN certificate_templates ct ON ct.id = cb.template_id
    LEFT JOIN certificates c ON c.batch_id = cb.id
    WHERE cb.id = ? AND cb.teacher_id = ?
    GROUP BY cb.id
  `).bind(batchId, teacherId).first();

  if (!batch) {
    return certificateError('CERTIFICATE_BATCH_NOT_FOUND', 'Batch not found', 404);
  }

  const { results: certificates } = await env.DB.prepare(`
    SELECT c.*, COALESCE(NULLIF(c.student_name, ''), s.full_name) AS student_name
    FROM certificates c
    LEFT JOIN students s ON c.student_id = s.id
    WHERE c.batch_id = ?
    ORDER BY c.issued_at DESC
  `).bind(batchId).all();

  return certificateSuccess({ batch, certificates });
}

// POST /api/certificate-batches/:id/retry
export async function handleRetryBatch(request: Request, env: Env, batchId: string): Promise<Response> {
  const authResult = await verifyJWTMiddleware(request, env);
  if (authResult instanceof Response) return authResult;
  if (!requireTeacher(authResult.user)) {
    return certificateError('CERTIFICATE_FORBIDDEN', 'Forbidden', 403);
  }

  const teacherId = authResult.user.id ?? authResult.user.username;
  const batch = await env.DB.prepare(`
    SELECT id FROM certificate_batches WHERE id = ? AND teacher_id = ?
  `).bind(batchId, teacherId).first();

  if (!batch) {
    return certificateError('CERTIFICATE_BATCH_NOT_FOUND', 'Batch not found', 404);
  }

  await env.DB.prepare(`
    UPDATE certificate_batches
    SET status = 'pending', error_message = NULL, updated_at = ?
    WHERE id = ?
  `).bind(new Date().toISOString(), batchId).run();

  await env.DB.prepare(`
    UPDATE certificates
    SET status = 'pending', error_message = NULL, updated_at = ?
    WHERE batch_id = ? AND status = 'failed'
  `).bind(new Date().toISOString(), batchId).run();

  if (env.CERTIFICATE_QUEUE) {
    await env.CERTIFICATE_QUEUE.send({ batchId });
  }

  return certificateSuccess({ batch_id: batchId, status: 'pending' as const });
}

// GET /api/certificates/preview/:id
export async function handleCertificatePreview(request: Request, env: Env, certId: string): Promise<Response> {
  const authResult = await verifyJWTMiddleware(request, env);
  if (authResult instanceof Response) return authResult;

  const cert = await env.DB.prepare(`
    SELECT c.*, cb.title, cb.template_id, cb.teacher_id,
      COALESCE(NULLIF(c.student_name, ''), s.full_name) AS student_name
    FROM certificates c
    JOIN certificate_batches cb ON c.batch_id = cb.id
    LEFT JOIN students s ON c.student_id = s.id
    WHERE c.id = ?
  `).bind(certId).first<{
    student_id: string;
    teacher_id: string;
    status: string;
    [key: string]: unknown;
  }>();

  if (!cert) {
    return certificateError('CERTIFICATE_NOT_FOUND', 'Certificate not found', 404);
  }

  const requesterId = authResult.user.id ?? authResult.user.username;
  const canPreview = authResult.user.role === 'admin'
    || (authResult.user.role === 'teacher' && cert.teacher_id === requesterId)
    || (authResult.user.role === 'student'
      && cert.student_id === authResult.user.id
      && cert.status !== 'revoked');
  if (!canPreview) {
    return certificateError('CERTIFICATE_PREVIEW_FORBIDDEN', 'Certificate is outside your scope', 403);
  }

  return certificateSuccess(cert);
}

// GET /api/certificates/:id/image
export async function handleGetCertificateImage(request: Request, env: Env, certId: string): Promise<Response> {
  const authResult = await verifyJWTMiddleware(request, env);
  if (authResult instanceof Response) return authResult;

  const cert = await env.DB.prepare(`
    SELECT c.student_id, c.status, c.png_r2_key, cb.teacher_id
    FROM certificates c
    JOIN certificate_batches cb ON c.batch_id = cb.id
    WHERE c.id = ?
  `).bind(certId).first<{
    student_id: string;
    status: string;
    png_r2_key: string | null;
    teacher_id: string;
  }>();

  if (!cert) {
    return certificateError('CERTIFICATE_NOT_FOUND', 'Certificate not found', 404);
  }

  const requesterId = authResult.user.id ?? authResult.user.username;
  const canRead = authResult.user.role === 'admin'
    || (authResult.user.role === 'teacher' && cert.teacher_id === requesterId)
    || (authResult.user.role === 'student' && cert.student_id === authResult.user.id);
  if (!canRead) {
    return certificateError('CERTIFICATE_IMAGE_FORBIDDEN', 'Certificate image is outside your scope', 403);
  }
  if (cert.status !== 'sent' || !cert.png_r2_key) {
    return certificateError('CERTIFICATE_IMAGE_NOT_READY', 'Certificate image is not ready', 409);
  }

  const image = await env.CERT_IMAGES.get(cert.png_r2_key);
  if (!image) {
    return certificateError('CERTIFICATE_IMAGE_NOT_FOUND', 'Certificate image not found', 404);
  }

  return new Response(image.body, {
    headers: {
      'Content-Type': image.httpMetadata?.contentType ?? 'image/png',
      'Cache-Control': 'private, no-store',
      ETag: image.httpEtag,
    },
  });
}

// Legacy teacher template upload was incompatible with the canonical schema.
// Template mutation remains under /api/admin/certificate-templates.
export async function handleUploadTemplate(): Promise<Response> {
  return certificateError(
    'CERTIFICATE_TEMPLATE_ADMIN_ONLY',
    'Use the admin certificate template endpoint',
    405,
  );
}

// GET /api/certificates/templates
export async function handleGetTemplates(request: Request, env: Env): Promise<Response> {
  const authResult = await verifyJWTMiddleware(request, env);
  if (authResult instanceof Response) return authResult;
  if (!requireTeacher(authResult.user)) {
    return certificateError('CERTIFICATE_FORBIDDEN', 'Forbidden', 403);
  }

  const schoolId = authResult.user.school_id ?? authResult.user.username;
  const { results } = await env.DB.prepare(`
    SELECT id, name, description, thumbnail_r2_key, is_active
    FROM certificate_templates
    WHERE is_active = 1 AND (school_id = ? OR school_id IS NULL OR created_by = 'admin')
    ORDER BY created_at DESC
  `).bind(schoolId).all();

  return certificateSuccess(results);
}

// GET /api/certificates/my
export async function handleGetMyCertificates(request: Request, env: Env): Promise<Response> {
  const authResult = await verifyJWTMiddleware(request, env);
  if (authResult instanceof Response) return authResult;
  if (authResult.user.role !== 'student' || !authResult.user.id) {
    return certificateError('CERTIFICATE_STUDENT_REQUIRED', 'Student role required', 403);
  }

  const { results } = await env.DB.prepare(`
    SELECT
      c.id,
      c.batch_id,
      cb.title,
      t.full_name AS teacher_name,
      c.student_score,
      c.quiz_title,
      c.image_url,
      c.issued_at,
      c.sent_at,
      c.status
    FROM certificates c
    JOIN certificate_batches cb ON c.batch_id = cb.id
    JOIN teachers t ON cb.teacher_id = t.username
    WHERE c.student_id = ? AND c.status = 'sent'
    ORDER BY c.sent_at DESC, c.issued_at DESC
  `).bind(authResult.user.id).all<StudentCertificateItem>();

  return certificateSuccess(results);
}

// GET /api/certificates/notifications
export async function handleGetNotifications(request: Request, env: Env): Promise<Response> {
  const authResult = await verifyJWTMiddleware(request, env);
  if (authResult instanceof Response) return authResult;

  const userId = authResult.user.id ?? authResult.user.username;
  const { results } = await env.DB.prepare(`
    SELECT id, type, title, body, data, is_read, created_at
    FROM notifications
    WHERE user_id = ? AND user_role = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).bind(userId, authResult.user.role).all<{
    id: string;
    type: string;
    title: string;
    body: string | null;
    data: string;
    is_read: number;
    created_at: string;
  }>();

  return certificateSuccess(results.map((notification) => {
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(notification.data || '{}') as Record<string, unknown>;
    } catch {
      data = {};
    }
    return { ...notification, data, is_read: notification.is_read === 1 };
  }));
}

// PATCH /api/certificates/notifications/:id/read
export async function handleMarkNotificationRead(
  request: Request,
  env: Env,
  notificationId: string,
): Promise<Response> {
  const authResult = await verifyJWTMiddleware(request, env);
  if (authResult instanceof Response) return authResult;

  const userId = authResult.user.id ?? authResult.user.username;
  const notification = await env.DB.prepare(`
    SELECT id FROM notifications WHERE id = ? AND user_id = ? AND user_role = ?
  `).bind(notificationId, userId, authResult.user.role).first();
  if (!notification) {
    return certificateError('NOTIFICATION_NOT_FOUND', 'Notification not found', 404);
  }

  await env.DB.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ?`)
    .bind(notificationId).run();
  return certificateSuccess({ id: notificationId, is_read: true });
}

export async function handleCertificateRoutes(
  request: Request,
  env: Env,
  path: string,
  method: string,
): Promise<Response> {
  if (path === '/api/certificates/notifications' && method === 'GET') {
    return handleGetNotifications(request, env);
  }

  const notificationReadMatch = path.match(/^\/api\/certificates\/notifications\/([^/]+)\/read$/);
  if (notificationReadMatch && method === 'PATCH') {
    return handleMarkNotificationRead(request, env, notificationReadMatch[1]);
  }

  if (path === '/api/certificate-batches' && method === 'POST') {
    return handleCreateBatch(request, env);
  }
  if (path === '/api/certificate-batches' && method === 'GET') {
    return handleGetBatches(request, env);
  }

  const retryMatch = path.match(/^\/api\/certificate-batches\/([^/]+)\/retry$/);
  if (retryMatch && method === 'POST') {
    return handleRetryBatch(request, env, retryMatch[1]);
  }

  const batchDetailMatch = path.match(/^\/api\/certificate-batches\/([^/]+)$/);
  if (batchDetailMatch && method === 'GET') {
    return handleGetBatchDetail(request, env, batchDetailMatch[1]);
  }

  const previewMatch = path.match(/^\/api\/certificates\/preview\/([^/]+)$/);
  if (previewMatch && method === 'GET') {
    return handleCertificatePreview(request, env, previewMatch[1]);
  }

  const imageMatch = path.match(/^\/api\/certificates\/([^/]+)\/image$/);
  if (imageMatch && method === 'GET') {
    return handleGetCertificateImage(request, env, imageMatch[1]);
  }

  if (path === '/api/certificates/templates' && method === 'GET') {
    return handleGetTemplates(request, env);
  }
  if (path === '/api/certificates/templates' && method === 'POST') {
    return handleUploadTemplate();
  }
  if ((path === '/api/certificates/my' || path === '/api/my-certificates') && method === 'GET') {
    return handleGetMyCertificates(request, env);
  }

  return certificateError('CERTIFICATE_ROUTE_NOT_FOUND', `Certificate route not found: ${path}`, 404);
}

export {
  handleCreateBatch as createBatch,
  handleGetBatches as getBatches,
  handleGetBatchDetail as getBatchDetail,
  handleCertificatePreview as preview,
  handleGetCertificateImage as getCertificateImage,
  handleUploadTemplate as uploadTemplate,
  handleGetTemplates as getTemplates,
  handleGetMyCertificates as getMyCertificates,
  handleGetNotifications as getNotifications,
  handleMarkNotificationRead as markNotificationRead,
};
