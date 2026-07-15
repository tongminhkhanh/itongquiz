// Certificate Batch Processor
// Renders PNG for each student in a batch and saves to R2
import type { Env } from '../types';
import type { FieldConfig } from '../types/certificates';
import { renderCertificate } from './certificateRenderer';
import { loadFont } from './fontLoader';

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
  r2PublicUrl: string
): Promise<void> {
  let hasRenderError = false;

  try {
    // 1. Lấy template
    const template = await env.DB.prepare(
      'SELECT * FROM certificate_templates WHERE id = ?'
    ).bind(templateId).first();

    if (!template) {
      console.error(`Template ${templateId} không tồn tại`);
      return;
    }

    // 2. Lấy ảnh nền từ R2
    const bgObject = await env.R2.get(template.background_image_key);
    if (!bgObject) {
      console.error('Không tìm thấy ảnh nền');
      return;
    }
    const bgBuffer = await bgObject.arrayBuffer();

    // 3. Load fonts (có thể cache sau này)
    const fonts: Record<string, ArrayBuffer> = {};
    try {
      fonts['Roboto'] = await loadFont(env, 'Roboto-Regular');
      fonts['Roboto-Bold'] = await loadFont(env, 'Roboto-Bold');
    } catch (fontError) {
      console.warn('Không thể load font tùy chỉnh, sử dụng font mặc định', fontError);
    }

    // 4. Parse fields_config
    const fieldsConfig: FieldConfig[] = JSON.parse(template.fields_config || '[]');

    // 5. Render song song cho từng học sinh
    const renderPromises = students.map(async (student) => {
      try {
        const pngBuffer = await renderCertificate({
          bgImageArrayBuffer: bgBuffer,
          fieldsConfig,
          data: {
            student_name: student.student_name,
            score: student.student_score ? `${student.student_score}/10` : '',
            quiz_title: student.quiz_title || '',
            date: new Date().toISOString().split('T')[0],
            teacher_name: teacherName,
            custom_note: customNote,
          },
          fonts,
        });

        // Upload lên R2
        const key = `certs/${batchId}/${student.student_id}.png`;
        await env.R2.put(key, pngBuffer, {
          httpMetadata: { contentType: 'image/png' },
        });

        const imageUrl = `${r2PublicUrl}/${key}`;

        // Cập nhật DB
        await env.DB.prepare(`
          UPDATE certificates 
          SET image_url = ?, sent_at = ?
          WHERE batch_id = ? AND student_id = ?
        `).bind(imageUrl, new Date().toISOString(), batchId, student.student_id).run();

      } catch (error) {
        console.error(`Lỗi render cho học sinh ${student.student_name}:`, error);
        hasRenderError = true;
      }
    });

    await Promise.allSettled(renderPromises);

    // Cập nhật trạng thái batch
    const finalStatus = hasRenderError ? 'partial' : 'sent';
    await env.DB.prepare(`
      UPDATE certificate_batches SET status = ? WHERE id = ?
    `).bind(finalStatus, batchId).run();

    // Gửi thông báo cho học sinh
    for (const student of students) {
      try {
        await env.DB.prepare(`
          INSERT INTO notifications (id, user_id, type, title, message, data)
          VALUES (lower(hex(randomblob(8))), ?, 'certificate_received', ?, ?, ?)
        `).bind(
          student.student_id,
          'Bạn có chứng nhận mới!',
          `Bạn vừa nhận được chứng nhận: ${batchTitle || 'Chứng nhận mới' }`,
          JSON.stringify({ batch_id: batchId, certificate_id: student.student_id })
        ).run();
      } catch (err) {
        console.error('Lỗi gửi notification:', err);
      }
    }

  } catch (error) {
    console.error('Lỗi xử lý batch:', error);
    await env.DB.prepare(`
      UPDATE certificate_batches SET status = 'failed' WHERE id = ?
    `).bind(batchId).run();
  }
}