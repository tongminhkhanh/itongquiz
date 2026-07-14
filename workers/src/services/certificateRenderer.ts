// Certificate Renderer — resvg-wasm based
// Cloudflare Workers KHÔNG có OffscreenCanvas / createImageBitmap → phải dùng WASM.
// @resvg/resvg-wasm đã có sẵn trong workers/package.json dependencies.
import { Resvg, initWasm } from '@resvg/resvg-wasm';
// @ts-ignore - wrangler compiles .wasm imports to WebAssembly.Module
import resvgWasmModule from '@resvg/resvg-wasm/index_bg.wasm';
import type { FieldConfig } from '../types/certificates';
import { loadRobotoFonts } from './fontLoader';

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

// resvg-wasm chỉ init 1 lần cho toàn bộ isolate
let wasmReady = false;
let wasmInitPromise: Promise<void> | null = null;

async function ensureWasmReady(): Promise<void> {
  if (wasmReady) return;
  if (!wasmInitPromise) {
    wasmInitPromise = (async () => {
      await initWasm(resvgWasmModule as unknown as WebAssembly.Module);
      wasmReady = true;
    })();
  }
  await wasmInitPromise;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32 KB — tránh call-stack overflow của String.fromCharCode
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

function detectImageMime(buffer: ArrayBuffer): string {
  const b = new Uint8Array(buffer);
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'image/png';
  if (b.length >= 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'image/jpeg';
  if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif';
  if (b.length >= 12 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return 'image/png';
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function renderCertificate(params: RenderParams): Promise<Uint8Array> {
  await ensureWasmReady();
  const { bgImageArrayBuffer, fieldsConfig, data, width = 1200, height = 848 } = params;

  // 1. Ảnh nền → data URL nhúng vào SVG
  const mime = detectImageMime(bgImageArrayBuffer);
  const bgBase64 = arrayBufferToBase64(bgImageArrayBuffer);
  const bgHref = `data:${mime};base64,${bgBase64}`;

  // 2. Từng field → <text>
  const textNodes = fieldsConfig
    .map((field) => {
      const rawValue = data[field.key as keyof typeof data];
      if (rawValue === undefined || rawValue === null || rawValue === '') return '';
      const value = escapeXml(String(rawValue));
      const anchor =
        field.align === 'left' ? 'start' :
        field.align === 'right' ? 'end' :
        'middle';
      const weight = field.fontWeight === 'bold' ? '700' : '400';
      const color = field.color ?? '#000000';
      const size = field.fontSize ?? 32;
      const maxWidthAttr = field.maxWidth
        ? ` textLength="${field.maxWidth}" lengthAdjust="spacingAndGlyphs"`
        : '';
      // dominant-baseline="middle" tương đương textBaseline='middle' bên Canvas
      return `<text x="${field.x}" y="${field.y}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}" dominant-baseline="middle"${maxWidthAttr}>${value}</text>`;
    })
    .join('');

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<image href="${bgHref}" xlink:href="${bgHref}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>` +
    textNodes +
    `</svg>`;

  // 3. Render SVG → PNG bằng resvg-wasm
  // Tải Roboto để render được tiếng Việt có dấu. Nếu font fetch lỗi → fallback default.
  let fontBuffers: ArrayBuffer[] = [];
  try {
    const fonts = await loadRobotoFonts();
    fontBuffers = [fonts.regular, fonts.bold];
  } catch (err) {
    console.warn('[certificateRenderer] Roboto font load failed, using default font:', err);
  }

  const resvg = new Resvg(svg, {
    background: 'rgba(255,255,255,1)',
    fitTo: { mode: 'width', value: width },
    font: {
      loadSystemFonts: false,
      defaultFontFamily: 'Roboto',
      fontBuffers: fontBuffers.length ? (fontBuffers as any) : undefined,
    },
  });
  const rendered = resvg.render();
  const pngBytes = rendered.asPng();
  rendered.free();
  resvg.free();
  return pngBytes;
}
