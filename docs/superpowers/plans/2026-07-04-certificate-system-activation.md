# Certificate System Activation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kích hoạt toàn bộ hệ thống chứng nhận end-to-end: DB migration → deploy Worker → upload ảnh nền → tạo template đầu tiên → test cấp batch cho học sinh.

**Architecture:** Frontend (React + MobX) đã hoàn chỉnh, backend (Cloudflare Worker + D1) đã có code nhưng chưa deploy migration và chưa có ảnh nền R2. Render PNG dùng OffscreenCanvas trong Worker runtime, ảnh lưu bucket R2 `phieu-og-images`, URL public `https://r2.thitong.site`.

**Tech Stack:** Cloudflare D1 (SQLite), Cloudflare R2, Cloudflare Worker (TypeScript), OffscreenCanvas, wrangler CLI (chạy trên Windows CMD/PowerShell — không dùng bash)

## Global Constraints

- Wrangler chỉ chạy được trên **Windows CMD hoặc PowerShell** (không phải bash/WSL) vì Node không được cài trong WSL
- API base URL: `https://phieu.thitong.site`
- R2 bucket binding: `OG_IMAGES`, bucket name: `phieu-og-images`, public URL: `https://r2.thitong.site`
- D1 database: `itongquiz-db`, id: `340c3a89-3941-43b1-bc81-fb37b8b6ac00`
- Worker source: `workers/` folder, deploy bằng `npx wrangler deploy` từ thư mục `workers/`
- Migration file: `data/migrations/004_add_certificates.sql` — đã có sẵn, chưa chạy
- `OffscreenCanvas` và `createImageBitmap` có sẵn trong Worker runtime, **không cần thêm thư viện nào**
- Mọi API call đều cần header `Authorization: Bearer <token>` (token lấy từ đăng nhập tài khoản admin/teacher)
- `school_id` trong `certificate_templates` là `user.school_id` từ JWT — đảm bảo account admin có trường này

---

### Task 1: Chạy SQL Migration lên D1 Production

**Files:**
- Read: `data/migrations/004_add_certificates.sql`
- No code change needed

**Mục tiêu:** Tạo 3 bảng `certificate_templates`, `certificate_batches`, `certificates` + indexes trên D1 production.

- [ ] **Step 1: Mở Windows PowerShell hoặc CMD (không dùng WSL/bash)**

- [ ] **Step 2: Di chuyển vào thư mục workers**
```cmd
cd C:\itongquiz1\itongquiz1\workers
```

- [ ] **Step 3: Chạy migration lên D1 production**
```cmd
npx wrangler d1 execute itongquiz-db --file=../data/migrations/004_add_certificates.sql --remote
```
Expected output:
```
✅ Successfully executed SQL on remote database itongquiz-db
```

- [ ] **Step 4: Verify bảng đã tạo**
```cmd
npx wrangler d1 execute itongquiz-db --command="SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'cert%'" --remote
```
Expected output (3 hàng):
```
certificate_templates
certificate_batches
certificates
```

- [ ] **Step 5: Commit trạng thái đã chạy migration**
```bash
git add data/migrations/004_add_certificates.sql
git commit -m "chore: run migration 004 - certificate tables created on D1 production"
```

---

### Task 2: Upload Ảnh Nền Chứng Nhận lên R2

**Files:**
- Cần chuẩn bị file ảnh nền (PNG/JPG, kích thước khuyến nghị: 1200×848px)
- Upload vào R2 bucket `phieu-og-images` với key `cert-backgrounds/mau-1.png`

**Mục tiêu:** Có ít nhất 1 ảnh nền trong R2 để tạo template đầu tiên.

- [ ] **Step 1: Chuẩn bị ảnh nền**

Tạo hoặc tải ảnh chứng nhận kích thước **1200×848px** (landscape A4 ratio), lưu tạm tại `C:\itongquiz1\itongquiz1\assets\cert-bg-mau1.png`.

Gợi ý nhanh: dùng Canva → template "Certificate" → export PNG 1200×848px.

- [ ] **Step 2: Upload lên R2 qua Wrangler (Windows PowerShell)**
```powershell
cd C:\itongquiz1\itongquiz1\workers
npx wrangler r2 object put phieu-og-images/cert-backgrounds/mau-1.png --file=../assets/cert-bg-mau1.png --remote
```
Expected:
```
✅ Uploaded phieu-og-images/cert-backgrounds/mau-1.png
```

- [ ] **Step 3: Verify ảnh có thể truy cập public**

Mở browser: `https://r2.thitong.site/cert-backgrounds/mau-1.png`

Expected: ảnh hiển thị (không 403/404). Nếu 403 → R2 bucket chưa bật public access → vào Cloudflare Dashboard → R2 → `phieu-og-images` → Settings → Public Access → Enable.

- [ ] **Step 4: (Optional) Upload thumbnail nhỏ**
```powershell
npx wrangler r2 object put phieu-og-images/cert-thumbnails/mau-1-thumb.png --file=../assets/cert-bg-mau1-thumb.png --remote
```

---

### Task 3: Deploy Worker lên Production

**Files:**
- `workers/src/routes/certificates.ts` — đã có
- `workers/src/routes/adminCertificates.ts` — đã có
- `workers/src/services/certificateBatchProcessor.ts` — đã có
- `workers/src/services/certificateRenderer.ts` — đã có
- `workers/src/index.ts` — đã wire routes ở line 25-26, 99-102

**Mục tiêu:** Deploy code Worker mới (có certificate routes) lên production.

- [ ] **Step 1: Build check TypeScript (Windows PowerShell)**
```powershell
cd C:\itongquiz1\itongquiz1\workers
npx tsc --noEmit
```
Expected: 0 errors. Nếu có lỗi → fix trước khi deploy.

- [ ] **Step 2: Deploy Worker**
```powershell
npx wrangler deploy
```
Expected:
```
✅ Deployed itongquiz-api to phieu.thitong.site
```

- [ ] **Step 3: Smoke test API certificate đang live**
```powershell
curl -X GET https://phieu.thitong.site/api/admin/certificate-templates `
  -H "Authorization: Bearer <admin_token>"
```
Expected:
```json
{ "data": [] }
```
(Mảng rỗng vì chưa có template — đây là kết quả đúng)

- [ ] **Step 4: Commit**
```bash
git add workers/src/
git commit -m "feat: deploy certificate routes to production worker"
```

---

### Task 4: Tạo Certificate Template Đầu Tiên

**Files:**
- Không sửa code — gọi API trực tiếp

**Mục tiêu:** Tạo template trong DB bằng API POST, dùng ảnh nền đã upload ở Task 2.

- [ ] **Step 1: Lấy token admin**

Đăng nhập tài khoản admin trên app → F12 → Application → Local Storage → copy giá trị `authToken` hoặc xem request header `Authorization`.

- [ ] **Step 2: Gọi API tạo template**
```powershell
$body = @{
  name = "Mẫu Chứng Nhận 2026"
  bg_image_r2_key = "cert-backgrounds/mau-1.png"
  fields_config = '[{"key":"student_name","x":600,"y":320,"fontSize":36,"fontWeight":"bold","color":"#1a365d","align":"center"},{"key":"quiz_title","x":600,"y":400,"fontSize":24,"color":"#2d3748","align":"center"},{"key":"score","x":600,"y":460,"fontSize":28,"fontWeight":"bold","color":"#c05621","align":"center"},{"key":"date","x":600,"y":680,"fontSize":18,"color":"#4a5568","align":"center"},{"key":"teacher_name","x":300,"y":720,"fontSize":18,"fontWeight":"bold","color":"#2d3748","align":"center"},{"key":"custom_note","x":600,"y":530,"fontSize":18,"color":"#718096","align":"center"}]'
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://phieu.thitong.site/api/admin/certificate-templates" `
  -Method POST `
  -Headers @{ Authorization = "Bearer <admin_token>"; "Content-Type" = "application/json" } `
  -Body $body
```
Expected:
```json
{ "data": { "id": "abcd1234..." } }
```
Copy `id` này để dùng ở Task 5.

- [ ] **Step 3: Verify template xuất hiện trong Admin UI**

Mở app → Dashboard → sidebar → "Mẫu chứng nhận" → template "Mẫu Chứng Nhận 2026" phải hiển thị.

---

### Task 5: Test Cấp Batch Chứng Nhận (End-to-End)

**Files:**
- Không sửa code — test qua UI

**Mục tiêu:** Giáo viên tạo batch, Worker render PNG, học sinh thấy chứng nhận.

- [ ] **Step 1: Đăng nhập tài khoản giáo viên**

Mở app → đăng nhập teacher account.

- [ ] **Step 2: Mở tab "Cấp Chứng nhận"**

Sidebar → nhóm "Chứng nhận" → "🏅 Cấp Chứng nhận".

- [ ] **Step 3: Tạo batch mới**

Click nút "+ Cấp mới" → điền:
- Tiêu đề: `Chứng nhận hoàn thành Toán HK2`
- Chọn template: `Mẫu Chứng Nhận 2026`
- Ghi chú: `Xuất sắc!`
- Thêm 2-3 học sinh test với tên, điểm, tên bài thi
- Click "Cấp Chứng nhận"

Expected: Modal đóng, batch mới xuất hiện với status `sending`.

- [ ] **Step 4: Chờ ~5-10 giây → reload trang**

Batch phải chuyển sang status `sent`. Nếu vẫn `sending` → xem Worker logs:
```powershell
cd C:\itongquiz1\itongquiz1\workers
npx wrangler tail --format=pretty
```
Lọc các dòng có `renderCertificate` hoặc `error`.

- [ ] **Step 5: Đăng nhập tài khoản học sinh → xem chứng nhận**

Mở app → đăng nhập student account → Achievements → tab "Chứng nhận" → ảnh PNG phải hiển thị và có nút tải về.

- [ ] **Step 6: Verify PNG trực tiếp trên R2**
```powershell
cd C:\itongquiz1\itongquiz1\workers
npx wrangler d1 execute itongquiz-db --command="SELECT id, student_name, render_status, png_r2_key FROM certificates LIMIT 5" --remote
```
Expected: `render_status = 'done'` và `png_r2_key = 'certs/<id>.png'`.

Mở browser: `https://r2.thitong.site/certs/<id>.png` → ảnh chứng nhận đã render với tên học sinh đúng.

---

### Task 6: (Nếu OffscreenCanvas lỗi) Fallback sang SVG Text

**Files:**
- Modify: `workers/src/services/certificateRenderer.ts`

**Mục tiêu:** Nếu `OffscreenCanvas` / `createImageBitmap` không khả dụng trong môi trường Worker → dùng SVG text overlay thay thế.

> ⚠️ Chỉ làm task này nếu Task 5 thất bại với lỗi `OffscreenCanvas is not defined` hoặc `createImageBitmap is not defined` trong wrangler tail.

- [ ] **Step 1: Xác nhận lỗi từ wrangler tail**
```
Error: OffscreenCanvas is not defined
```

- [ ] **Step 2: Thay thế renderer bằng SVG overlay**

Sửa `workers/src/services/certificateRenderer.ts`:

```typescript
// Fallback: SVG text overlay — trả về SVG thay vì PNG
import type { FieldConfig } from '../types/certificates';

export interface RenderParams {
  bgImageArrayBuffer: ArrayBuffer;
  fieldsConfig: FieldConfig[];
  data: {
    student_name: string;
    score: string;
    quiz_title: string;
    date: string;
    teacher_name: string;
    custom_note: string;
  };
  width?: number;
  height?: number;
}

export async function renderCertificate(params: RenderParams): Promise<Uint8Array> {
  const { fieldsConfig, data, width = 1200, height = 848 } = params;

  // Base64 encode ảnh nền
  const base64 = btoa(
    new Uint8Array(params.bgImageArrayBuffer).reduce((s, b) => s + String.fromCharCode(b), '')
  );

  const textElements = fieldsConfig.map(field => {
    const value = data[field.key as keyof typeof data] ?? '';
    if (!value) return '';
    const anchor = field.align === 'left' ? 'start' : field.align === 'right' ? 'end' : 'middle';
    const weight = field.fontWeight === 'bold' ? 'bold' : 'normal';
    return `<text
      x="${field.x}" y="${field.y}"
      font-size="${field.fontSize}"
      font-weight="${weight}"
      fill="${field.color ?? '#000000'}"
      text-anchor="${anchor}"
      dominant-baseline="middle"
      font-family="Arial, sans-serif"
    >${value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</text>`;
  }).join('\n');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image href="data:image/png;base64,${base64}" width="${width}" height="${height}" />
  ${textElements}
</svg>`;

  return new TextEncoder().encode(svg);
}
```

- [ ] **Step 3: Cập nhật R2 put để lưu `.svg` thay `.png`**

Sửa `workers/src/services/certificateBatchProcessor.ts` line `const r2Key`:
```typescript
// Đổi từ:
const r2Key = `certs/${certRow.id}.png`;
await (env as any).OG_IMAGES.put(r2Key, pngBytes, {
  httpMetadata: { contentType: 'image/png' },
});

// Thành:
const r2Key = `certs/${certRow.id}.svg`;
await (env as any).OG_IMAGES.put(r2Key, pngBytes, {
  httpMetadata: { contentType: 'image/svg+xml' },
});
```

- [ ] **Step 4: Deploy lại**
```powershell
cd C:\itongquiz1\itongquiz1\workers
npx wrangler deploy
```

- [ ] **Step 5: Test lại từ Step 3 của Task 5**

- [ ] **Step 6: Commit**
```bash
git add workers/src/services/certificateRenderer.ts workers/src/services/certificateBatchProcessor.ts
git commit -m "fix: fallback SVG renderer for certificate when OffscreenCanvas unavailable"
```

---

### Task 7: Bật R2 Public Access cho bucket (nếu cần)

**Mục tiêu:** Đảm bảo URL `https://r2.thitong.site/certs/<id>.png` accessible công khai.

> Làm task này nếu ảnh 403 hoặc học sinh không xem được.

- [ ] **Step 1: Vào Cloudflare Dashboard**

Truy cập: `https://dash.cloudflare.com` → Account → R2 → `phieu-og-images`.

- [ ] **Step 2: Enable Public Access**

Settings tab → Public Access → Allow Access → Connect custom domain `r2.thitong.site` (nếu chưa kết nối).

- [ ] **Step 3: Verify**
```
https://r2.thitong.site/cert-backgrounds/mau-1.png  → 200 OK
https://r2.thitong.site/certs/<test-cert-id>.png    → 200 OK  
```

---

## Thứ Tự Thực Hiện

```
Task 1 (Migration D1) 
  → Task 2 (Upload ảnh R2) 
    → Task 3 (Deploy Worker) 
      → Task 4 (Tạo template qua API)
        → Task 5 (Test E2E)
          → Task 6 (Fallback nếu lỗi canvas) [tuỳ điều kiện]
          → Task 7 (R2 Public Access) [tuỳ điều kiện]
```

Task 1-3 có thể làm **song song** nếu có 2 người. Task 4 phụ thuộc Task 1+2+3 xong.
