// Certificate Renderer — OffscreenCanvas + Roboto
// Runs inside Cloudflare Worker runtime
import type { FieldConfig } from '../types/certificates';

export interface RenderParams {
  bgImageArrayBuffer: ArrayBuffer;   // ảnh nền fetch từ R2
  fieldsConfig: FieldConfig[];
  data: {
    student_name: string;
    score: string;                   // ví dụ: "95/100"
    quiz_title: string;
    date: string;                    // ví dụ: "03/07/2026"
    teacher_name: string;
    custom_note: string;
  };
  width?: number;                    // mặc định 1200
  height?: number;                   // mặc định 848
}

export async function renderCertificate(params: RenderParams): Promise<Uint8Array> {
  const { bgImageArrayBuffer, fieldsConfig, data, width = 1200, height = 848 } = params;

  // OffscreenCanvas có sẵn trong Cloudflare Worker runtime
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;

  if (!ctx) throw new Error('Cannot get canvas context');

  // 1. Vẽ ảnh nền
  const blob = new Blob([bgImageArrayBuffer]);
  const imgBitmap = await createImageBitmap(blob);
  ctx.drawImage(imgBitmap, 0, 0, width, height);

  // 2. Vẽ từng field theo fieldsConfig
  for (const field of fieldsConfig) {
    const value = data[field.key as keyof typeof data] ?? '';
    if (!value) continue;

    const weight = field.fontWeight === 'bold' ? '700' : '400';
    ctx.font = `${weight} ${field.fontSize}px "Roboto", Arial, sans-serif`;
    ctx.fillStyle = field.color ?? '#000000';
    ctx.textAlign = (field.align as CanvasTextAlign) ?? 'center';
    ctx.textBaseline = 'middle';

    if (field.maxWidth) {
      ctx.fillText(value, field.x, field.y, field.maxWidth);
    } else {
      ctx.fillText(value, field.x, field.y);
    }
  }

  // 3. Export PNG
  const outputBlob = await canvas.convertToBlob({ type: 'image/png', quality: 1 });
  const arrayBuffer = await outputBlob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}
