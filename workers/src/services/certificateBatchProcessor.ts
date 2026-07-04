// Certificate Batch Processor
// Renders PNG for each student in a batch and saves to R2
import type { Env } from '../types';
import type { FieldConfig } from '../types/certificates';
import { renderCertificate } from './certificateRenderer';

export interface BatchStudent {
  student_id: string;
  student_name: string;
  student_score: number | null;
  quiz_title: string | null;
}

export async function processBatch(
  env: Env,
  batchId: string,
  templateId: string,
  students: BatchStudent[],
  teacherName: string,
  customNote: string,
  _R2_PUBLIC_URL: string
): Promise<void> {
  let hasRenderError = false;
  let fieldsConfig: FieldConfig[] = [];
  let bgBuffer: ArrayBuffer | null = null;

  try {
    // 1. Lấy template
    const template = await env.DB.prepare(
      'SELECT * FROM certificate_templates WHERE id = ?'
    ).bind(templateId).first<{ bg_image_r2_key: string; fields_config: string }>();

    if (!template) throw new Error(`Template ${templateId} not found`);

    fieldsConfig = JSON.parse(template.fields_config);

    // 2. Fetch ảnh nền từ R2 (một lần, dùng lại cho tất cả HS)
    const bgObj = await (env as any).OG_IMAGES.get(template.bg_image_r2_key);
    if (!bgObj) throw new Error(`Background image not found: ${template.bg_image_r2_key}`);
    bgBuffer = await bgObj.arrayBuffer();
  } catch (err) {
    hasRenderError = true;
    await env.DB.prepare(
      `UPDATE certificates SET render_status = 'error', error_message = ? WHERE batch_id = ?`
    ).bind(String(err), batchId).run();
  }

  // 3. Render từng cert
  for (const student of students) {
    const certRow = await env.DB.prepare(
      `SELECT id FROM certificates WHERE batch_id = ? AND student_id = ?`
    ).bind(batchId, student.student_id).first<{ id: string }>();

    if (!certRow) continue;

    if (!bgBuffer) continue;

    try {
      const now = new Date();
      const d = now.getDate().toString().padStart(2, '0');
      const m = (now.getMonth() + 1).toString().padStart(2, '0');
      const y = now.getFullYear();
      const dateStr = `${d}/${m}/${y}`;

      const pngBytes = await renderCertificate({
        bgImageArrayBuffer: bgBuffer,
        fieldsConfig,
        data: {
          student_name: student.student_name,
          score: student.student_score != null ? `${student.student_score}` : '',
          quiz_title: student.quiz_title ?? '',
          date: dateStr,
          teacher_name: teacherName,
          custom_note: customNote,
        },
      });

      const r2Key = `certs/${certRow.id}.png`;
      await (env as any).OG_IMAGES.put(r2Key, pngBytes, {
        httpMetadata: { contentType: 'image/png' },
      });

      await env.DB.prepare(
        `UPDATE certificates SET png_r2_key = ?, render_status = 'done' WHERE id = ?`
      ).bind(r2Key, certRow.id).run();

    } catch (err) {
      hasRenderError = true;
      await env.DB.prepare(
        `UPDATE certificates SET render_status = 'error', error_message = ? WHERE id = ?`
      ).bind(String(err), certRow.id).run();
    }
  }

  // 4. Cập nhật batch status theo kết quả render thật, không báo sent khi toàn bộ render lỗi
  const summary = await env.DB.prepare(
    `SELECT
       SUM(CASE WHEN render_status = 'done' THEN 1 ELSE 0 END) as done_count,
       SUM(CASE WHEN render_status = 'error' THEN 1 ELSE 0 END) as error_count
     FROM certificates
     WHERE batch_id = ?`
  ).bind(batchId).first<{ done_count: number | null; error_count: number | null }>();

  const doneCount = Number(summary?.done_count || 0);
  const status = hasRenderError && doneCount === 0 ? 'error' : 'sent';

  await env.DB.prepare(
    `UPDATE certificate_batches SET status = ?, sent_at = datetime('now') WHERE id = ?`
  ).bind(status, batchId).run();
}
