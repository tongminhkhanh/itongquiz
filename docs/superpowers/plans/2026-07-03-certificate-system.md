# Certificate System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng hệ thống phát Giấy Chứng Nhận PNG cho học sinh: Admin quản lý template (kéo thả field), Giáo viên tạo đợt phát (preview HTML/CSS → Worker render PNG → R2), Học sinh xem & tải trong tab "Thành tích".

**Architecture:** Hybrid approach — client preview bằng HTML/CSS + `dom-to-image-more`, khi GV gửi thì Worker Cloudflare render PNG thật bằng OffscreenCanvas + Roboto font (WASM), lưu R2, cập nhật D1. Batch lớn (>1 HS) dùng Cloudflare Queue để tránh Worker timeout 30s.

**Tech Stack:** React + TypeScript + Vite (frontend) | Cloudflare Worker + D1 + R2 + Queue (backend) | `dom-to-image-more` (client preview) | OffscreenCanvas + Roboto font (server render) | `@fontsource/roboto` (font bundle)

## Global Constraints
- Tối đa 100 HS/batch — validate cả client lẫn server
- PNG chất lượng tối thiểu 1200×800px
- R2 key format: `certs/{cert_id}.png`
- Auth: học sinh chỉ được đọc cert của chính mình; GV chỉ phát cho HS trong lớp mình
- Font: Roboto Regular + Bold bundle vào Worker (hỗ trợ Unicode tiếng Việt)
- D1 database: `itongquiz-db`; R2 bucket: `phieu-og-images`
- Worker route mới thêm vào `workers/src/index.ts` theo pattern hiện có

---

## Task 1: Database Migration — 3 bảng mới

**Files:**
- Create: `data/migrations/004_add_certificates.sql`
- Modify: `workers/src/db/schema.ts` (thêm types)

**Interfaces:**
- Produces: `certificate_templates`, `certificate_batches`, `certificates` tables
- Produces types: `CertificateTemplate`, `CertificateBatch`, `Certificate` (dùng Task 2+)

- [ ] **Step 1: Tạo file migration**

Tạo `data/migrations/004_add_certificates.sql`:

```sql
-- Template do admin trường tạo
CREATE TABLE IF NOT EXISTS certificate_templates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  school_id TEXT NOT NULL,
  name TEXT NOT NULL,
  bg_image_r2_key TEXT NOT NULL,
  thumbnail_r2_key TEXT,
  fields_config TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT NOT NULL
);

-- Đợt phát của giáo viên
CREATE TABLE IF NOT EXISTS certificate_batches (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  teacher_id TEXT NOT NULL,
  class_id TEXT,
  quiz_id TEXT,
  template_id TEXT NOT NULL REFERENCES certificate_templates(id),
  title TEXT NOT NULL,
  custom_note TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sending','sent','error')),
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Từng chứng nhận cho từng học sinh
CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  batch_id TEXT NOT NULL REFERENCES certificate_batches(id),
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_score REAL,
  quiz_title TEXT,
  png_r2_key TEXT,
  render_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(render_status IN ('pending','done','error')),
  error_message TEXT,
  issued_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_revoked INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_certs_student ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certs_batch ON certificates(batch_id);
CREATE INDEX IF NOT EXISTS idx_batches_teacher ON certificate_batches(teacher_id);
CREATE INDEX IF NOT EXISTS idx_templates_school ON certificate_templates(school_id);
```

- [ ] **Step 2: Chạy migration lên D1 remote**

```bash
cd workers
npx wrangler d1 execute itongquiz-db --file=../data/migrations/004_add_certificates.sql --remote --config wrangler.toml
```

Expected output: `✅ Successfully executed ... queries`

- [ ] **Step 3: Thêm TypeScript types**

Mở file types hiện có của worker (tìm trong `workers/src/`). Nếu có `types.ts` hoặc `db/schema.ts`, thêm vào cuối file. Nếu không có, tạo `workers/src/types/certificates.ts`:

```typescript
export interface FieldConfig {
  key: 'student_name' | 'score' | 'quiz_title' | 'date' | 'teacher_name' | 'custom_note';
  x: number;
  y: number;
  fontSize: number;
  fontWeight?: 'normal' | 'bold';
  color?: string;
  align?: 'left' | 'center' | 'right';
  maxWidth?: number;
}

export interface CertificateTemplate {
  id: string;
  school_id: string;
  name: string;
  bg_image_r2_key: string;
  thumbnail_r2_key: string | null;
  fields_config: string; // JSON string của FieldConfig[]
  is_active: number;
  created_at: string;
  created_by: string;
}

export interface CertificateBatch {
  id: string;
  teacher_id: string;
  class_id: string | null;
  quiz_id: string | null;
  template_id: string;
  title: string;
  custom_note: string | null;
  status: 'draft' | 'sending' | 'sent' | 'error';
  sent_at: string | null;
  created_at: string;
}

export interface Certificate {
  id: string;
  batch_id: string;
  student_id: string;
  student_name: string;
  student_score: number | null;
  quiz_title: string | null;
  png_r2_key: string | null;
  render_status: 'pending' | 'done' | 'error';
  error_message: string | null;
  issued_at: string;
  is_revoked: number;
}
```

- [ ] **Step 4: Commit**

```bash
git add data/migrations/004_add_certificates.sql workers/src/types/certificates.ts
git commit -m "feat: add certificate system DB migration and types"
```

---

## Task 2: Worker — Certificate Renderer Service

Core logic render PNG trên server dùng OffscreenCanvas + Roboto font.

**Files:**
- Create: `workers/src/services/certificateRenderer.ts`
- Create: `workers/src/services/fontLoader.ts`

**Interfaces:**
- Consumes: `CertificateTemplate`, `FieldConfig` (Task 1)
- Produces: `renderCertificate(params): Promise<Uint8Array>` → PNG bytes

- [ ] **Step 1: Tải Roboto font vào Worker**

Tải file font Roboto hỗ trợ Unicode:
```bash
cd workers
npm install @fontsource/roboto
```

Tạo `workers/src/services/fontLoader.ts`:

```typescript
// Import font binary trực tiếp (Cloudflare Worker hỗ trợ import binary)
import robotoRegular from '@fontsource/roboto/files/roboto-latin-400-normal.woff';
import robotoBold from '@fontsource/roboto/files/roboto-latin-700-normal.woff';

export async function loadFonts(ctx: OffscreenCanvasRenderingContext2D | null) {
  // Không dùng FontFace API trong Worker — pass font trực tiếp vào canvas font string
  // Roboto được bundle sẵn, không cần fetch
  return {
    regular: 'normal 400 16px Roboto, Arial, sans-serif',
    bold: 'normal 700 16px Roboto, Arial, sans-serif',
  };
}

export { robotoRegular, robotoBold };
```

> **Lưu ý:** Nếu Worker không hỗ trợ import `.woff` trực tiếp, fetch Roboto từ Google Fonts CDN trong Worker và cache với `caches.default`. Xem Step 2.

- [ ] **Step 2: Tạo `certificateRenderer.ts`**

Tạo `workers/src/services/certificateRenderer.ts`:

```typescript
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
```

- [ ] **Step 3: Test render thủ công**

Khởi động wrangler dev local:
```bash
cd workers
npx wrangler dev --config wrangler.toml
```
Gọi thử qua `curl` hoặc browser sau khi thêm route `/api/test-render` tạm thời (xóa sau).

- [ ] **Step 4: Commit**

```bash
git add workers/src/services/certificateRenderer.ts workers/src/services/fontLoader.ts
git commit -m "feat: add server-side PNG certificate renderer with OffscreenCanvas"
```

---

## Task 3: Worker — API Routes (Admin Templates)

**Files:**
- Create: `workers/src/routes/adminCertificates.ts`
- Modify: `workers/src/index.ts` (register routes)

**Interfaces:**
- Consumes: `CertificateTemplate` type (Task 1)
- Produces: REST endpoints `/api/admin/certificate-templates`

- [ ] **Step 1: Tạo route file admin**

Tạo `workers/src/routes/adminCertificates.ts`:

```typescript
import type { Env } from '../types'; // import Env type hiện có của project
import type { CertificateTemplate } from '../types/certificates';

// GET /api/admin/certificate-templates
export async function handleGetTemplates(request: Request, env: Env): Promise<Response> {
  const user = (request as any).user; // JWT user được gắn bởi middleware hiện có
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const templates = await env.DB.prepare(
    'SELECT * FROM certificate_templates WHERE school_id = ? ORDER BY created_at DESC'
  ).bind(user.school_id).all<CertificateTemplate>();

  return Response.json({ data: templates.results });
}

// POST /api/admin/certificate-templates
export async function handleCreateTemplate(request: Request, env: Env): Promise<Response> {
  const user = (request as any).user;
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json() as {
    name: string;
    bg_image_r2_key: string;
    fields_config: string; // JSON string
  };

  if (!body.name || !body.bg_image_r2_key) {
    return Response.json({ error: 'name and bg_image_r2_key are required' }, { status: 400 });
  }

  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

  await env.DB.prepare(
    `INSERT INTO certificate_templates (id, school_id, name, bg_image_r2_key, fields_config, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, user.school_id, body.name, body.bg_image_r2_key, body.fields_config ?? '[]', user.id).run();

  return Response.json({ data: { id } }, { status: 201 });
}

// PATCH /api/admin/certificate-templates/:id
export async function handleUpdateTemplate(request: Request, env: Env, id: string): Promise<Response> {
  const user = (request as any).user;
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json() as Partial<{
    name: string;
    fields_config: string;
    is_active: number;
  }>;

  // Build dynamic SET clause
  const fields: string[] = [];
  const values: unknown[] = [];
  if (body.name !== undefined) { fields.push('name = ?'); values.push(body.name); }
  if (body.fields_config !== undefined) { fields.push('fields_config = ?'); values.push(body.fields_config); }
  if (body.is_active !== undefined) { fields.push('is_active = ?'); values.push(body.is_active); }

  if (fields.length === 0) return Response.json({ error: 'Nothing to update' }, { status: 400 });

  values.push(id, user.school_id);
  await env.DB.prepare(
    `UPDATE certificate_templates SET ${fields.join(', ')} WHERE id = ? AND school_id = ?`
  ).bind(...values).run();

  return Response.json({ ok: true });
}
```

- [ ] **Step 2: Register route trong `workers/src/index.ts`**

Tìm pattern router hiện có trong `index.ts` (có thể dùng `if (pathname.startsWith(...))` hoặc Hono/itty-router). Thêm:

```typescript
import { handleGetTemplates, handleCreateTemplate, handleUpdateTemplate } from './routes/adminCertificates';

// Trong router block:
if (pathname === '/api/admin/certificate-templates') {
  if (method === 'GET') return handleGetTemplates(request, env);
  if (method === 'POST') return handleCreateTemplate(request, env);
}
const templateMatch = pathname.match(/^\/api\/admin\/certificate-templates\/([\w-]+)$/);
if (templateMatch) {
  if (method === 'PATCH') return handleUpdateTemplate(request, env, templateMatch[1]);
}
```

- [ ] **Step 3: Test API admin**

```bash
# Gọi API tạo template
curl -X POST http://localhost:8787/api/admin/certificate-templates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Test Template","bg_image_r2_key":"templates/test.png","fields_config":"[]"}'
# Expected: {"data":{"id":"..."}}, status 201
```

- [ ] **Step 4: Commit**

```bash
git add workers/src/routes/adminCertificates.ts workers/src/index.ts
git commit -m "feat: add admin certificate template API routes"
```

---

## Task 4: Worker — API Routes (Teacher Batch + Student)

**Files:**
- Create: `workers/src/routes/certificates.ts`
- Create: `workers/src/services/certificateBatchProcessor.ts`
- Modify: `workers/src/index.ts`

**Interfaces:**
- Consumes: `renderCertificate()` (Task 2), DB tables (Task 1)
- Produces: `/api/certificate-batches`, `/api/certificates/my`

- [ ] **Step 1: Tạo batch processor service**

Tạo `workers/src/services/certificateBatchProcessor.ts`:

```typescript
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
  R2_PUBLIC_URL: string
): Promise<void> {
  // 1. Lấy template
  const template = await env.DB.prepare(
    'SELECT * FROM certificate_templates WHERE id = ?'
  ).bind(templateId).first<{ bg_image_r2_key: string; fields_config: string }>();

  if (!template) throw new Error(`Template ${templateId} not found`);

  const fieldsConfig: FieldConfig[] = JSON.parse(template.fields_config);

  // 2. Fetch ảnh nền từ R2 (một lần, dùng lại cho tất cả HS)
  const bgObj = await env.OG_IMAGES.get(template.bg_image_r2_key);
  if (!bgObj) throw new Error(`Background image not found: ${template.bg_image_r2_key}`);
  const bgBuffer = await bgObj.arrayBuffer();

  // 3. Render từng cert
  for (const student of students) {
    const certRow = await env.DB.prepare(
      `SELECT id FROM certificates WHERE batch_id = ? AND student_id = ?`
    ).bind(batchId, student.student_id).first<{ id: string }>();

    if (!certRow) continue;

    try {
      const now = new Date();
      const dateStr = `${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getFullYear()}`;

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
      await env.OG_IMAGES.put(r2Key, pngBytes, {
        httpMetadata: { contentType: 'image/png' },
      });

      await env.DB.prepare(
        `UPDATE certificates SET png_r2_key = ?, render_status = 'done' WHERE id = ?`
      ).bind(r2Key, certRow.id).run();

    } catch (err) {
      await env.DB.prepare(
        `UPDATE certificates SET render_status = 'error', error_message = ? WHERE id = ?`
      ).bind(String(err), certRow.id).run();
    }
  }

  // 4. Cập nhật batch status = 'sent'
  await env.DB.prepare(
    `UPDATE certificate_batches SET status = 'sent', sent_at = datetime('now') WHERE id = ?`
  ).bind(batchId).run();
}
```

- [ ] **Step 2: Tạo route file certificates**

Tạo `workers/src/routes/certificates.ts`:

```typescript
import type { Env } from '../types';
import type { Certificate } from '../types/certificates';
import { processBatch, type BatchStudent } from '../services/certificateBatchProcessor';

// POST /api/certificate-batches  (Giáo viên tạo + gửi batch)
export async function handleCreateBatch(request: Request, env: Env): Promise<Response> {
  const user = (request as any).user;
  if (!user || user.role !== 'teacher') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
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
  ).bind(batchId, user.id, body.class_id ?? null, body.quiz_id ?? null,
    body.template_id, body.title, body.custom_note ?? null).run();

  // Tạo certificate records cho từng HS
  const insertStmts = body.students.map(s =>
    env.DB.prepare(
      `INSERT INTO certificates (id, batch_id, student_id, student_name, student_score, quiz_title)
       VALUES (lower(hex(randomblob(8))), ?, ?, ?, ?, ?)`
    ).bind(batchId, s.student_id, s.student_name, s.student_score ?? null, s.quiz_title ?? null)
  );
  await env.DB.batch(insertStmts);

  // Render PNG (async, không block response nếu dùng waitUntil)
  const teacherName = user.name ?? user.email ?? '';
  const ctx = (request as any).ctx as ExecutionContext | undefined;

  const renderPromise = processBatch(
    env, batchId, body.template_id, body.students,
    teacherName, body.custom_note ?? '', env.R2_PUBLIC_URL
  );

  if (ctx?.waitUntil) {
    ctx.waitUntil(renderPromise);
    return Response.json({ data: { batch_id: batchId, status: 'sending' } }, { status: 202 });
  } else {
    // Fallback: đợi render xong mới trả về (chấp nhận chậm hơn)
    await renderPromise;
    return Response.json({ data: { batch_id: batchId, status: 'sent' } }, { status: 201 });
  }
}

// GET /api/certificate-batches  (Giáo viên xem lịch sử)
export async function handleGetBatches(request: Request, env: Env): Promise<Response> {
  const user = (request as any).user;
  if (!user || user.role !== 'teacher') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const batches = await env.DB.prepare(
    `SELECT b.*, t.name as template_name,
            COUNT(c.id) as total_certs,
            SUM(CASE WHEN c.render_status = 'done' THEN 1 ELSE 0 END) as done_certs
     FROM certificate_batches b
     LEFT JOIN certificate_templates t ON b.template_id = t.id
     LEFT JOIN certificates c ON b.id = c.batch_id
     WHERE b.teacher_id = ?
     GROUP BY b.id
     ORDER BY b.created_at DESC
     LIMIT 50`
  ).bind(user.id).all();

  return Response.json({ data: batches.results });
}

// GET /api/certificates/my  (Học sinh xem chứng nhận)
export async function handleGetMyCertificates(request: Request, env: Env): Promise<Response> {
  const user = (request as any).user;
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const certs = await env.DB.prepare(
    `SELECT c.id, c.student_name, c.student_score, c.quiz_title, c.png_r2_key,
            c.render_status, c.issued_at,
            b.title as batch_title,
            t.name as template_name
     FROM certificates c
     JOIN certificate_batches b ON c.batch_id = b.id
     JOIN certificate_templates t ON b.template_id = t.id
     WHERE c.student_id = ? AND c.is_revoked = 0 AND c.render_status = 'done'
     ORDER BY c.issued_at DESC`
  ).bind(user.id).all<Certificate & { batch_title: string; template_name: string }>();

  // Map r2_key → public URL
  const R2_PUBLIC_URL = env.R2_PUBLIC_URL;
  const data = certs.results.map(c => ({
    ...c,
    png_url: c.png_r2_key ? `${R2_PUBLIC_URL}/${c.png_r2_key}` : null,
  }));

  return Response.json({ data });
}
```

- [ ] **Step 3: Register routes trong `index.ts`**

```typescript
import { handleCreateBatch, handleGetBatches, handleGetMyCertificates } from './routes/certificates';

// Thêm vào router:
if (pathname === '/api/certificate-batches') {
  if (method === 'POST') return handleCreateBatch(request, env);
  if (method === 'GET') return handleGetBatches(request, env);
}
if (pathname === '/api/certificates/my') {
  if (method === 'GET') return handleGetMyCertificates(request, env);
}
```

- [ ] **Step 4: Commit**

```bash
git add workers/src/routes/certificates.ts workers/src/services/certificateBatchProcessor.ts workers/src/index.ts
git commit -m "feat: add certificate batch API and student certificates endpoint"
```

---

## Task 5: Admin Upload Template UI

**Files:**
- Create: `itongquiz/src/features/certificates/types.ts`
- Create: `itongquiz/src/features/certificates/AdminTemplatesPage.tsx`
- Create: `itongquiz/src/features/certificates/TemplateFieldEditor.tsx`
- Modify: Router/nav admin (tìm file router hiện có)

**Interfaces:**
- Consumes: `/api/admin/certificate-templates` (Task 3)
- Produces: Trang admin quản lý template, kéo thả field positions

- [ ] **Step 1: Tạo shared types frontend**

Tạo `itongquiz/src/features/certificates/types.ts`:

```typescript
export interface FieldConfig {
  key: 'student_name' | 'score' | 'quiz_title' | 'date' | 'teacher_name' | 'custom_note';
  label: string;       // hiển thị trong editor
  x: number;
  y: number;
  fontSize: number;
  fontWeight?: 'normal' | 'bold';
  color?: string;
  align?: 'left' | 'center' | 'right';
  maxWidth?: number;
}

export interface CertificateTemplate {
  id: string;
  name: string;
  bg_image_r2_key: string;
  fields_config: string;  // JSON string
  is_active: number;
  created_at: string;
}

export interface CertificateItem {
  id: string;
  batch_title: string;
  template_name: string;
  student_name: string;
  student_score: number | null;
  quiz_title: string | null;
  png_url: string;
  issued_at: string;
}

export const DEFAULT_FIELDS: FieldConfig[] = [
  { key: 'student_name', label: 'Tên học sinh', x: 600, y: 300, fontSize: 36, fontWeight: 'bold', color: '#1a1a1a', align: 'center' },
  { key: 'score',        label: 'Điểm số',       x: 600, y: 370, fontSize: 28, color: '#c0392b', align: 'center' },
  { key: 'quiz_title',   label: 'Tên bài thi',  x: 600, y: 220, fontSize: 22, color: '#333', align: 'center' },
  { key: 'date',         label: 'Ngày',          x: 600, y: 440, fontSize: 18, color: '#666', align: 'center' },
  { key: 'teacher_name', label: 'Giáo viên',     x: 900, y: 560, fontSize: 18, color: '#333', align: 'center' },
  { key: 'custom_note',  label: 'Lời nhận xét', x: 600, y: 500, fontSize: 16, color: '#555', align: 'center', maxWidth: 800 },
];
```

- [ ] **Step 2: Tạo `TemplateFieldEditor.tsx`**

Component kéo thả field lên preview ảnh nền:

```tsx
import React, { useState, useRef } from 'react';
import type { FieldConfig } from './types';

interface Props {
  bgImageUrl: string;        // URL ảnh nền (R2 public)
  fields: FieldConfig[];
  onChange: (fields: FieldConfig[]) => void;
  canvasWidth?: number;      // mặc định 1200
  canvasHeight?: number;     // mặc định 848
}

export function TemplateFieldEditor({ bgImageUrl, fields, onChange, canvasWidth = 1200, canvasHeight = 848 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null); // field.key
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Scale: hiển thị 100% width container, scale tỏa độ thực
  const getScale = () => {
    const container = containerRef.current;
    if (!container) return 1;
    return container.offsetWidth / canvasWidth;
  };

  const handleMouseDown = (e: React.MouseEvent, key: string) => {
    e.preventDefault();
    const scale = getScale();
    const field = fields.find(f => f.key === key)!;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setDragging(key);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return;
    const scale = getScale();
    const containerRect = containerRef.current.getBoundingClientRect();
    const newX = Math.round((e.clientX - containerRect.left - dragOffset.x) / scale + (fields.find(f=>f.key===dragging)?.fontSize??16)/2);
    const newY = Math.round((e.clientY - containerRect.top - dragOffset.y) / scale + (fields.find(f=>f.key===dragging)?.fontSize??16)/2);
    onChange(fields.map(f => f.key === dragging ? { ...f, x: newX, y: newY } : f));
  };

  const handleMouseUp = () => setDragging(null);

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none"
      style={{ aspectRatio: `${canvasWidth}/${canvasHeight}` }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <img src={bgImageUrl} className="w-full h-full object-cover" alt="template bg" />
      {fields.map(field => {
        const scale = getScale();
        return (
          <div
            key={field.key}
            className="absolute cursor-move border border-dashed border-blue-400 bg-blue-50/30 px-1 rounded"
            style={{
              left: `${(field.x / canvasWidth) * 100}%`,
              top: `${(field.y / canvasHeight) * 100}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${field.fontSize * scale}px`,
              fontWeight: field.fontWeight === 'bold' ? 700 : 400,
              color: field.color ?? '#000',
              textAlign: field.align ?? 'center',
              whiteSpace: 'nowrap',
            }}
            onMouseDown={e => handleMouseDown(e, field.key)}
          >
            {field.label}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Tạo `AdminTemplatesPage.tsx`**

Tạo `itongquiz/src/features/certificates/AdminTemplatesPage.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { TemplateFieldEditor } from './TemplateFieldEditor';
import { DEFAULT_FIELDS, type CertificateTemplate, type FieldConfig } from './types';

export function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [bgImageR2Key, setBgImageR2Key] = useState('');
  const [bgPreviewUrl, setBgPreviewUrl] = useState('');
  const [fields, setFields] = useState<FieldConfig[]>(DEFAULT_FIELDS);
  const R2_PUBLIC = import.meta.env.VITE_R2_PUBLIC_URL ?? 'https://r2.thitong.site';

  useEffect(() => { fetchTemplates(); }, []);

  async function fetchTemplates() {
    const res = await fetch('/api/admin/certificate-templates', { credentials: 'include' });
    const json = await res.json();
    setTemplates(json.data ?? []);
  }

  async function handleSave() {
    if (!newName || !bgImageR2Key) return;
    await fetch('/api/admin/certificate-templates', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName,
        bg_image_r2_key: bgImageR2Key,
        fields_config: JSON.stringify(fields),
      }),
    });
    setCreating(false);
    setNewName('');
    setBgImageR2Key('');
    setBgPreviewUrl('');
    setFields(DEFAULT_FIELDS);
    fetchTemplates();
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Ảnh chứng nhận — Quản lý Template</h1>
      <button onClick={() => setCreating(true)} className="btn btn-primary mb-6">
        + Tạo template mới
      </button>

      {creating && (
        <div className="card mb-6 p-4 border">
          <h2 className="font-semibold mb-3">Template mới</h2>
          <input placeholder="Tên template" value={newName} onChange={e => setNewName(e.target.value)}
            className="input mb-2 w-full" />
          <input placeholder="R2 key ảnh nền (ví dụ: templates/cert-bg.png)" value={bgImageR2Key}
            onChange={e => { setBgImageR2Key(e.target.value); setBgPreviewUrl(`${R2_PUBLIC}/${e.target.value}`); }}
            className="input mb-4 w-full" />

          {bgPreviewUrl && (
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">Kéo thả để đặt vị trí các trường:</p>
              <TemplateFieldEditor
                bgImageUrl={bgPreviewUrl}
                fields={fields}
                onChange={setFields}
              />
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleSave} className="btn btn-primary">Lưu template</button>
            <button onClick={() => setCreating(false)} className="btn btn-ghost">Hủy</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {templates.map(t => (
          <div key={t.id} className="card border p-4">
            <p className="font-semibold">{t.name}</p>
            <p className="text-sm text-gray-500">Key: {t.bg_image_r2_key}</p>
            <span className={`badge ${t.is_active ? 'badge-success' : 'badge-ghost'}`}>
              {t.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add itongquiz/src/features/certificates/
git commit -m "feat: add admin certificate template UI with drag-drop field editor"
```

---

## Task 6: Teacher — Trang Quản lý Chứng nhận + Preview

**Files:**
- Create: `itongquiz/src/features/certificates/CertificatePreview.tsx`
- Create: `itongquiz/src/features/certificates/BatchCreateModal.tsx`
- Create: `itongquiz/src/features/certificates/TeacherCertificatesPage.tsx`
- Install: `dom-to-image-more` (client preview)

**Interfaces:**
- Consumes: `/api/certificate-templates`, `/api/certificate-batches` (Task 4)
- Produces: GV tạo đợt, preview, gửi

- [ ] **Step 1: Cài `dom-to-image-more`**

```bash
cd itongquiz
npm install dom-to-image-more
```

- [ ] **Step 2: Tạo `CertificatePreview.tsx`**

```tsx
import React, { useRef } from 'react';
import domtoimage from 'dom-to-image-more';
import type { FieldConfig } from './types';

interface Props {
  bgImageUrl: string;
  fieldsConfig: FieldConfig[];
  sampleData: {
    student_name: string; score: string; quiz_title: string;
    date: string; teacher_name: string; custom_note: string;
  };
  canvasWidth?: number;
  canvasHeight?: number;
}

export function CertificatePreview({ bgImageUrl, fieldsConfig, sampleData, canvasWidth = 1200, canvasHeight = 848 }: Props) {
  const previewRef = useRef<HTMLDivElement>(null);

  async function handleDownloadPreview() {
    if (!previewRef.current) return;
    const blob = await domtoimage.toBlob(previewRef.current, { width: canvasWidth, height: canvasHeight });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'preview-chung-nhan.png'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-2">
      <div
        ref={previewRef}
        className="relative overflow-hidden"
        style={{ width: '100%', aspectRatio: `${canvasWidth}/${canvasHeight}` }}
      >
        <img src={bgImageUrl} className="absolute inset-0 w-full h-full object-cover" alt="" />
        {fieldsConfig.map(field => {
          const value = sampleData[field.key as keyof typeof sampleData] ?? '';
          return (
            <div
              key={field.key}
              className="absolute"
              style={{
                left: `${(field.x / canvasWidth) * 100}%`,
                top: `${(field.y / canvasHeight) * 100}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: `${(field.fontSize / canvasWidth) * 100}cqw`,
                fontWeight: field.fontWeight === 'bold' ? 700 : 400,
                color: field.color ?? '#000',
                textAlign: field.align ?? 'center',
              }}
            >
              {value}
            </div>
          );
        })}
      </div>
      <button onClick={handleDownloadPreview} className="btn btn-sm btn-outline">
        Tải preview PNG
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Tạo `BatchCreateModal.tsx`**

Tạo `itongquiz/src/features/certificates/BatchCreateModal.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { CertificatePreview } from './CertificatePreview';
import type { CertificateTemplate, FieldConfig } from './types';

interface Student { id: string; name: string; score?: number; }
interface Props {
  classId?: string;
  quizId?: string;
  students: Student[];
  teacherName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function BatchCreateModal({ classId, quizId, students, teacherName, onClose, onSuccess }: Props) {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set(students.map(s => s.id)));
  const [title, setTitle] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [sending, setSending] = useState(false);
  const R2_PUBLIC = import.meta.env.VITE_R2_PUBLIC_URL ?? 'https://r2.thitong.site';

  useEffect(() => {
    fetch('/api/certificate-templates', { credentials: 'include' })
      .then(r => r.json())
      .then(j => setTemplates(j.data ?? []));
  }, []);

  const fieldsConfig: FieldConfig[] = selectedTemplate
    ? JSON.parse(selectedTemplate.fields_config)
    : [];

  const sampleData = {
    student_name: students[0]?.name ?? 'Nguyễn Văn A',
    score: students[0]?.score != null ? String(students[0].score) : '95',
    quiz_title: 'Khảo sát cuối kỳ',
    date: new Date().toLocaleDateString('vi-VN'),
    teacher_name: teacherName,
    custom_note: customNote || 'Chúc mừng em đã hoàn thành xuất sắc!',
  };

  async function handleSend() {
    if (!selectedTemplate || !title || selectedStudentIds.size === 0) return;
    setSending(true);
    try {
      const selectedStudents = students
        .filter(s => selectedStudentIds.has(s.id))
        .map(s => ({ student_id: s.id, student_name: s.name, student_score: s.score ?? null, quiz_title: null }));

      await fetch('/api/certificate-batches', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          title, custom_note: customNote,
          class_id: classId, quiz_id: quizId,
          students: selectedStudents,
        }),
      });
      onSuccess();
      onClose();
    } finally {
      setSending(false);
    }
  }

  const toggleStudent = (id: string) =>
    setSelectedStudentIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <dialog open className="modal modal-open">
      <div className="modal-box max-w-4xl">
        <h3 className="font-bold text-lg mb-4">Phát Giấy Chứng Nhận</h3>

        {/* Bước 1: Chọn template */}
        <div className="mb-4">
          <label className="font-medium block mb-1">Chọn template:</label>
          <div className="flex gap-2 flex-wrap">
            {templates.map(t => (
              <button key={t.id}
                className={`btn btn-sm ${selectedTemplate?.id === t.id ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setSelectedTemplate(t)}>
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Bước 2: Thông tin */}
        <input placeholder="Tiêu đề đợt phát (ví dụ: Kiểm tra HK1)" value={title}
          onChange={e => setTitle(e.target.value)} className="input input-bordered w-full mb-2" />
        <textarea placeholder="Lời nhận xét chung (tùy chọn)" value={customNote}
          onChange={e => setCustomNote(e.target.value)} className="textarea textarea-bordered w-full mb-4" rows={2} />

        {/* Bước 3: Chọn học sinh */}
        <div className="mb-4">
          <label className="font-medium block mb-1">Chọn học sinh ({selectedStudentIds.size}/{students.length}):</label>
          <div className="max-h-40 overflow-y-auto border rounded p-2 grid grid-cols-2 gap-1">
            {students.map(s => (
              <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={selectedStudentIds.has(s.id)}
                  onChange={() => toggleStudent(s.id)} className="checkbox checkbox-sm" />
                <span className="text-sm">{s.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Preview */}
        {selectedTemplate && (
          <div className="mb-4">
            <p className="font-medium mb-1">Preview (dựa theo học sinh đầu tiên):</p>
            <CertificatePreview
              bgImageUrl={`${R2_PUBLIC}/${selectedTemplate.bg_image_r2_key}`}
              fieldsConfig={fieldsConfig}
              sampleData={sampleData}
            />
          </div>
        )}

        <div className="modal-action">
          <button onClick={onClose} className="btn">Hủy</button>
          <button onClick={handleSend} disabled={sending || !selectedTemplate || !title}
            className="btn btn-primary">
            {sending ? 'Đang gửi...' : `Gửi cho ${selectedStudentIds.size} học sinh`}
          </button>
        </div>
      </div>
    </dialog>
  );
}
```

- [ ] **Step 4: Tạo `TeacherCertificatesPage.tsx`**

Tạo `itongquiz/src/features/certificates/TeacherCertificatesPage.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { BatchCreateModal } from './BatchCreateModal';

export function TeacherCertificatesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { fetchBatches(); }, []);

  async function fetchBatches() {
    const res = await fetch('/api/certificate-batches', { credentials: 'include' });
    const json = await res.json();
    setBatches(json.data ?? []);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Ảnh Chứng Nhận — Quản lý</h1>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary">
          + Phát chứng nhận
        </button>
      </div>

      {/* Lịch sử đợt phát */}
      <div className="space-y-3">
        {batches.map(b => (
          <div key={b.id} className="card border p-4">
            <div className="flex justify-between">
              <div>
                <p className="font-semibold">{b.title}</p>
                <p className="text-sm text-gray-500">{b.template_name} • {b.total_certs} học sinh</p>
              </div>
              <div className="text-right">
                <span className={`badge ${
                  b.status === 'sent' ? 'badge-success' :
                  b.status === 'sending' ? 'badge-warning' : 'badge-ghost'
                }`}>{b.status}</span>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(b.created_at).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>
            <div className="mt-2 text-sm">
              ✅ {b.done_certs}/{b.total_certs} đã render
            </div>
          </div>
        ))}
        {batches.length === 0 && (
          <p className="text-gray-400 text-center py-8">Chưa có đợt phát nào.</p>
        )}
      </div>

      {showCreate && (
        <BatchCreateModal
          students={[]} teacherName="" // TODO: truyền vào từ context/lớp học cụ thể
          onClose={() => setShowCreate(false)}
          onSuccess={() => { fetchBatches(); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add itongquiz/src/features/certificates/
git commit -m "feat: add teacher certificate management page with preview and batch send"
```

---

## Task 7: Học sinh — Tab "Thành tích"

**Files:**
- Create: `itongquiz/src/features/certificates/StudentAchievementsPage.tsx`
- Create: `itongquiz/src/features/certificates/CertificateCard.tsx`
- Modify: Student nav (tìm file nav hiện có của student, thêm mục "Thành tích")
- Modify: Router (thêm route `/achievements`)

**Interfaces:**
- Consumes: `/api/certificates/my` (Task 4)
- Produces: Tab "Thành tích" trong nav học sinh, danh sách cert, nút tải PNG

- [ ] **Step 1: Tạo `CertificateCard.tsx`**

```tsx
import React from 'react';
import type { CertificateItem } from './types';

interface Props { cert: CertificateItem; }

export function CertificateCard({ cert }: Props) {
  function handleDownload() {
    const a = document.createElement('a');
    a.href = cert.png_url;
    a.download = `chung-nhan-${cert.id}.png`;
    a.target = '_blank';
    a.click();
  }

  return (
    <div className="card bg-base-100 shadow border hover:shadow-md transition-shadow">
      <figure className="relative">
        <img
          src={cert.png_url}
          alt={cert.batch_title}
          className="w-full aspect-[3/2] object-cover rounded-t-xl"
          loading="lazy"
        />
      </figure>
      <div className="card-body p-4">
        <h3 className="card-title text-base">{cert.batch_title}</h3>
        <p className="text-sm text-gray-500">{cert.template_name}</p>
        {cert.student_score != null && (
          <p className="text-sm">Điểm: <span className="font-bold text-primary">{cert.student_score}</span></p>
        )}
        <p className="text-xs text-gray-400">
          {new Date(cert.issued_at).toLocaleDateString('vi-VN')}
        </p>
        <div className="card-actions mt-2">
          <button onClick={handleDownload} className="btn btn-primary btn-sm w-full">
            ⬇️ Tải ảnh PNG
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Tạo `StudentAchievementsPage.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import { CertificateCard } from './CertificateCard';
import type { CertificateItem } from './types';

export function StudentAchievementsPage() {
  const [certs, setCerts] = useState<CertificateItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/certificates/my', { credentials: 'include' })
      .then(r => r.json())
      .then(j => { setCerts(j.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><span className="loading loading-spinner" /></div>;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🏆 Thành tích của tôi</h1>
      {certs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">🎓</p>
          <p>Bạn chưa nhận được giấy chứng nhận nào.</p>
          <p className="text-sm">Hoàn thành bài thi và giáo viên sẽ phát chứng nhận cho bạn!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {certs.map(cert => <CertificateCard key={cert.id} cert={cert} />)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Thêm vào student nav + router**

Tìm file nav của student (tìm trong `src/` bằng grep `StudentNav` hoặc `BottomNav`):

```bash
grep -r "StudentNav\|BottomNav\|student.*nav\|nav.*student" itongquiz/src --include="*.tsx" -l
```

Thêm item "Thành tích" vào nav list:
```tsx
{ path: '/achievements', label: 'Thành tích', icon: <TrophyIcon /> }
```

Thêm vào router:
```tsx
import { StudentAchievementsPage } from '@/features/certificates/StudentAchievementsPage';
// ...
<Route path="/achievements" element={<StudentAchievementsPage />} />
```

- [ ] **Step 4: Deploy worker + frontend**

```bash
# Deploy worker
cd workers
npx wrangler deploy --config wrangler.toml

# Build + deploy frontend
cd ../itongquiz
npm run build
# (deploy Vercel tự động qua git push hoặc chạy vercel deploy)
```

- [ ] **Step 5: Commit**

```bash
git add itongquiz/src/features/certificates/ itongquiz/src/
git commit -m "feat: add student achievements tab with certificate cards and download"
```

---

## Tổng kết thứ tự tasks

| Task | Phụ thuộc | Ước tính |
|------|-----------|----------|
| Task 1: DB Migration | — | 30 phút |
| Task 2: Certificate Renderer | Task 1 | 45 phút |
| Task 3: Admin API Routes | Task 1 | 30 phút |
| Task 4: Teacher/Student API | Task 2, Task 3 | 45 phút |
| Task 5: Admin UI (kéo thả) | Task 3 | 60 phút |
| Task 6: Teacher UI + Preview | Task 4, Task 5 | 60 phút |
| Task 7: Student Tab | Task 4 | 30 phút |

**Tổng: ~5 giờ**
