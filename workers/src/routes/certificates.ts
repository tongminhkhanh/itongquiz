// ============================================
// GET /api/my-certificates (Cho học sinh)
// ============================================
export async function handleGetMyCertificates(request: Request, env: Env): Promise<Response> {
  const authResult = await verifyJWTMiddleware(request, env);
  if (authResult instanceof Response) return authResult;

  const { results } = await env.DB.prepare(`
    SELECT 
      c.id, 
      cb.title,
      c.image_url,
      c.sent_at as received_at,
      c.student_score as score,
      u.name as teacher_name
    FROM certificates c
    JOIN certificate_batches cb ON c.batch_id = cb.id
    JOIN users u ON cb.teacher_id = u.id
    WHERE c.student_id = ?
    ORDER BY c.sent_at DESC
  `).bind(authResult.user.id).all();

  return jsonResponse({ certificates: results });
}

// Export tất cả handler (thêm vào index.ts)
export {
  handleCreateBatch as createBatch,
  handleGetBatches as getBatches,
  handleGetBatchDetail as getBatchDetail,
  handleCertificatePreview as preview,
  handleUploadTemplate as uploadTemplate,
  handleGetTemplates as getTemplates,
  handleGetMyCertificates as getMyCertificates,
};