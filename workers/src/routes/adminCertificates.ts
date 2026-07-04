// Admin Certificate Template API
// Routes: GET/POST /api/admin/certificate-templates
//         PATCH   /api/admin/certificate-templates/:id
import type { Env } from '../types';
import type { CertificateTemplate } from '../types/certificates';

export async function handleAdminCertificateRoutes(
  request: Request,
  env: Env,
  path: string,
  method: string
): Promise<Response | null> {
  const user = (request as any).user;
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // GET /api/admin/certificate-templates
  if (path === '/api/admin/certificate-templates' && method === 'GET') {
    const templates = await env.DB.prepare(\r\n      'SELECT * FROM certificate_templates WHERE school_id = ? ORDER BY created_at DESC'\r\n    ).bind(user.school_id ?? user.username).all<CertificateTemplate>();
    return Response.json({ data: templates.results });
  }

  // POST /api/admin/certificate-templates
  if (path === '/api/admin/certificate-templates' && method === 'POST') {
    const body = await request.json() as {
      name: string;
      bg_image_r2_key: string;
      fields_config?: string;
    };

    if (!body.name || !body.bg_image_r2_key) {
      return Response.json({ error: 'name and bg_image_r2_key are required' }, { status: 400 });
    }

    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    await env.DB.prepare(
      `INSERT INTO certificate_templates (id, school_id, name, bg_image_r2_key, fields_config, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(id, user.school_id ?? user.username, body.name, body.bg_image_r2_key, body.fields_config ?? '[]', user.id).run();

    return Response.json({ data: { id } }, { status: 201 });
  }

  // PATCH /api/admin/certificate-templates/:id
  const patchMatch = path.match(/^\/api\/admin\/certificate-templates\/(\w+)$/);
  if (patchMatch && method === 'PATCH') {
    const templateId = patchMatch[1];
    const body = await request.json() as Partial<{
      name: string;
      fields_config: string;
      is_active: number;
    }>;

    const fields: string[] = [];
    const values: unknown[] = [];
    if (body.name !== undefined) { fields.push('name = ?'); values.push(body.name); }
    if (body.fields_config !== undefined) { fields.push('fields_config = ?'); values.push(body.fields_config); }
    if (body.is_active !== undefined) { fields.push('is_active = ?'); values.push(body.is_active); }

    if (fields.length === 0) return Response.json({ error: 'Nothing to update' }, { status: 400 });

    values.push(templateId, user.school_id ?? user.username);
    await env.DB.prepare(
      `UPDATE certificate_templates SET ${fields.join(', ')} WHERE id = ? AND school_id = ?`
    ).bind(...values).run();

    return Response.json({ ok: true });
  }

  return null;
}
