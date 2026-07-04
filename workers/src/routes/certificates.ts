// Certificate Routes — Teacher (batch) + Student (my certs)
import type { Env } from '../types';
import type { Certificate } from '../types/certificates';
import { processBatch, type BatchStudent } from '../services/certificateBatchProcessor';
import { verifyJWTMiddleware, requireTeacher } from '../middleware/jwtAuth';

// POST /api/certificate-batches  (Giáo viên tạo + gửi batch)
export async function handleCreateBatch(request: Request, env: Env): Promise<Response> {
  const authResult = await verifyJWTMiddleware(request, env);
  if (authResult instanceof Response) return authResult;
  const user = authResult.user;
  if (!requireTeacher(user)) {
    return Response.json({ error: 'Forbidden: teacher role required' }, { status: 403 });
  }

  const body = await request.json() as {
    template_id: string;
    title: string;
    custom_note?: string;
    quiz_id?: string;
    class_id?: string;
    students: BatchStudent[];
  };

  if (!body.template_id || !body.title || !body.students?.length) {
    return Response.json({ error: 'template_id, title, students required' }, { status: 400 });
  }
  if (body.students.length > 100) {
    return Response.json({ error: 'Maximum 100 students per batch' }, { status: 400 });
  }

  // Tạo batch record
  const batchId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  await env.DB.prepare(
    `INSERT INTO certificate_batches (id, teacher_id, class_id, quiz_id, template_id, title, custom_note, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'sending')`
  ).bind(
    batchId, user.id,
    body.class_id ?? null, body.quiz_id ?? null,
    body.template_id, body.title, body.custom_note ?? null
  ).run();

  // Tạo certificate records cho từng HS
  const insertStmts = body.students.map(s =>
    env.DB.prepare(
      `INSERT INTO certificates (id, batch_id, student_id, student_name, student_score, quiz_title)
       VALUES (lower(hex(randomblob(8))), ?, ?, ?, ?, ?)`
    ).bind(batchId, s.student_id, s.student_name, s.student_score ?? null, s.quiz_title ?? null)
  );
  await env.DB.batch(insertStmts);

  // Render PNG
  const teacherName: string = (user as any).name ?? (user as any).email ?? '';
  const r2PublicUrl: string = (env as any).R2_PUBLIC_URL ?? '';

  const renderPromise = processBatch(
    env, batchId, body.template_id, body.students,
    teacherName, body.custom_note ?? '', r2PublicUrl
  );

  // Dùng waitUntil nếu có ExecutionContext
  const ctx = (request as any).__executionContext as ExecutionContext | undefined;
  if (ctx?.waitUntil) {
    ctx.waitUntil(renderPromise);
    return Response.json({ data: { batch_id: batchId, status: 'sending' } }, { status: 202 });
  } else {
    await renderPromise;
    return Response.json({ data: { batch_id: batchId, status: 'sent' } }, { status: 201 });
  }
}

// GET /api/certificate-batches  (Giáo viên xem lịch sử)
export async function handleGetBatches(request: Request, env: Env): Promise<Response> {
  const authResult = await verifyJWTMiddleware(request, env);
  if (authResult instanceof Response) return authResult;
  const user = authResult.user;
  if (!requireTeacher(user)) {
    return Response.json({ error: 'Forbidden: teacher role required' }, { status: 403 });
  }

  const batchesResult = await env.DB.prepare(
    `SELECT b.*, t.name as template_name,
            COUNT(c.id) as total_certs,
            SUM(CASE WHEN c.render_status = 'done' THEN 1 ELSE 0 END) as done_certs,
            SUM(CASE WHEN c.render_status = 'error' THEN 1 ELSE 0 END) as error_certs
     FROM certificate_batches b
     LEFT JOIN certificate_templates t ON b.template_id = t.id
     LEFT JOIN certificates c ON b.id = c.batch_id
     WHERE b.teacher_id = ?
     GROUP BY b.id
     ORDER BY b.created_at DESC
     LIMIT 50`
  ).bind(user.id).all();

  const batches = batchesResult.results.map((batch: any) => {
    const total = Number(batch.total_certs || 0);
    const done = Number(batch.done_certs || 0);
    const errors = Number(batch.error_certs || 0);
    const effectiveStatus = batch.status === 'sent' && total > 0 && done === 0 && errors > 0
      ? 'error'
      : batch.status;
    return { ...batch, status: effectiveStatus };
  });

  return Response.json({ data: batches });
}

// GET /api/certificates/my  (Học sinh xem chứng nhận)
export async function handleGetMyCertificates(request: Request, env: Env): Promise<Response> {
  const authResult = await verifyJWTMiddleware(request, env);
  if (authResult instanceof Response) return authResult;
  const user = authResult.user;

  const certs = await env.DB.prepare(
    `SELECT c.id, c.student_id, c.student_name, c.student_score, c.quiz_title, c.png_r2_key,
            c.render_status, c.error_message, c.issued_at,
            b.title as batch_title,
            b.teacher_id as teacher_name,
            t.name as template_name
     FROM certificates c
     JOIN certificate_batches b ON c.batch_id = b.id
     JOIN certificate_templates t ON b.template_id = t.id
     WHERE c.student_id = ? AND c.is_revoked = 0
     ORDER BY c.issued_at DESC`
  ).bind(user.id).all<Certificate & { batch_title: string; template_name: string }>();

  const r2PublicUrl: string = (env as any).R2_PUBLIC_URL ?? '';
  const data = certs.results.map(c => ({
    ...c,
    png_url: c.png_r2_key ? `${r2PublicUrl}/${c.png_r2_key}` : null,
  }));

  return Response.json({ data });
}

export async function handleCertificateRoutes(
  request: Request,
  env: Env,
  path: string,
  method: string
): Promise<Response | null> {
  if (path === '/api/certificate-batches') {
    if (method === 'POST') return handleCreateBatch(request, env);
    if (method === 'GET')  return handleGetBatches(request, env);
  }
  if (path === '/api/certificates/my' && method === 'GET') {
    return handleGetMyCertificates(request, env);
  }
  return null;
}
