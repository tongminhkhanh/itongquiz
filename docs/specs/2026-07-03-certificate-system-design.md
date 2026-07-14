# Spec: Hệ thống Giấy Chứng Nhận (Certificate System)

## Objective

Xây dựng tính năng cho phép giáo viên phát Giấy Chứng Nhận (PNG) cho học sinh sau khi hoàn thành bài thi/quiz. Học sinh xem và tải ảnh chứng nhận trong tab "Thành tích" trên tài khoản cá nhân.

### User Stories

**Admin trường:**
- Tôi muốn upload và quản lý template chứng nhận (ảnh nền + cấu hình toạ độ text)
- Tôi muốn kích hoạt / tắt template để giáo viên chỉ dùng template đã duyệt

**Giáo viên:**
- Tôi muốn vào trang "Quản lý Chứng nhận" để tạo đợt phát mới
- Tôi muốn chọn template, chọn lớp/học sinh, điền lời nhận xét
- Tôi muốn preview chứng nhận ngay trong browser trước khi gửi
- Tôi muốn gửi hàng loạt cho cả lớp hoặc chọn lẻ từng học sinh

**Học sinh:**
- Tôi muốn vào tab "Thành tích" trên thanh nav để xem tất cả chứng nhận đã nhận
- Tôi muốn tải ảnh PNG chứng nhận về điện thoại/máy tính
- Tôi muốn chia sẻ chứng nhận lên Zalo/Facebook dễ dàng

### Success Criteria
- Giáo viên có thể tạo và gửi đợt chứng nhận cho 30+ học sinh trong < 2 phút
- PNG render đúng font, đúng layout trên mọi template
- Học sinh nhận chứng nhận ngay sau khi giáo viên bấm "Gửi"
- Ảnh PNG chất lượng tốt (min 1200×800px), tải về < 3 giây

---

## Tech Stack

| Layer | Công nghệ |
|---|---|
| Frontend | React + TypeScript + Vite (đang dùng) |
| Preview client | HTML/CSS DOM → `html2canvas` hoặc `dom-to-image-more` |
| Worker render | Cloudflare Worker + `@resvg/resvg-wasm` hoặc Canvas API |
| Storage | Cloudflare R2 (bucket: `phieu-og-images` đang có sẵn) |
| Database | Cloudflare D1 (`itongquiz-db`) |
| API | REST qua Worker (`quiz-api.thitong.site`) |

---

## Database Schema

```sql
-- Template do admin trường tạo/upload
CREATE TABLE certificate_templates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  school_id TEXT NOT NULL,
  name TEXT NOT NULL,                  -- "Học sinh xuất sắc", "Hoàn thành khoá học"
  bg_image_r2_key TEXT NOT NULL,       -- key ảnh nền trong R2
  thumbnail_r2_key TEXT,               -- ảnh thumbnail preview nhỏ
  fields_config TEXT NOT NULL,         -- JSON: mảng field definitions
  -- fields_config example:
  -- [{"key":"student_name","x":400,"y":280,"fontSize":36,"fontWeight":"bold",
  --   "color":"#1a1a1a","align":"center","maxWidth":600},
  --  {"key":"score","x":400,"y":350,"fontSize":28,"color":"#c0392b"},
  --  {"key":"quiz_title","x":400,"y":200,"fontSize":22},
  --  {"key":"date","x":400,"y":420,"fontSize":18,"color":"#666"},
  --  {"key":"teacher_name","x":600,"y":520,"fontSize":18},
  --  {"key":"custom_note","x":400,"y":460,"fontSize":16,"color":"#555","maxWidth":700}]
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT NOT NULL             -- admin user_id
);

-- Đợt phát chứng nhận của giáo viên
CREATE TABLE certificate_batches (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  teacher_id TEXT NOT NULL,
  class_id TEXT,                       -- NULL nếu GV chọn lẻ không theo lớp
  quiz_id TEXT,                        -- bài thi liên quan (nullable)
  template_id TEXT NOT NULL REFERENCES certificate_templates(id),
  title TEXT NOT NULL,                 -- "Đợt thi HK1 2026"
  custom_note TEXT,                    -- lời nhận xét chung của GV
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent')),
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Từng chứng nhận phát cho từng học sinh
CREATE TABLE certificates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  batch_id TEXT NOT NULL REFERENCES certificate_batches(id),
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,          -- snapshot tên tại thời điểm phát
  student_score REAL,                  -- điểm snapshot
  quiz_title TEXT,                     -- snapshot tên bài
  png_r2_key TEXT,                     -- key file PNG trên R2 (NULL khi chưa render)
  render_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(render_status IN ('pending','done','error')),
  issued_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_revoked INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_certificates_student ON certificates(student_id);
CREATE INDEX idx_certificates_batch ON certificates(batch_id);
CREATE INDEX idx_batches_teacher ON certificate_batches(teacher_id);
```

---

## Architecture — Hybrid Approach

```
┌─────────────────────────────────────────────────────┐
│                 GIÁO VIÊN (Browser)                  │
│                                                       │
│  1. Chọn template + học sinh + lời nhận xét          │
│  2. Preview HTML/CSS real-time (dom-to-image)        │
│  3. Bấm "Gửi" → POST /api/certificates/batch        │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│              CLOUDFLARE WORKER                        │
│                                                       │
│  4. Tạo batch record + certificate records (D1)      │
│  5. Với mỗi học sinh: render PNG (Canvas/resvg)      │
│     - Fetch ảnh nền từ R2                            │
│     - Chồng text (tên, điểm, ngày, lời GV)          │
│  6. Upload PNG → R2 (key: certs/{cert_id}.png)       │
│  7. Update render_status = 'done'                    │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│              HỌC SINH (Tab "Thành tích")             │
│                                                       │
│  8. GET /api/certificates/my → list chứng nhận       │
│  9. Tải PNG trực tiếp từ R2 public URL               │
│  10. Download / Chia sẻ Zalo/Facebook                │
└─────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Admin
```
GET    /api/admin/certificate-templates          - Danh sách templates
POST   /api/admin/certificate-templates          - Tạo template mới
       body: { name, bg_image_r2_key, fields_config }
PATCH  /api/admin/certificate-templates/:id      - Sửa / toggle active
DELETE /api/admin/certificate-templates/:id      - Xoá template
```

### Giáo viên
```
GET    /api/certificate-templates               - Templates active của trường
GET    /api/certificate-batches                 - Danh sách đợt phát của GV
POST   /api/certificate-batches                 - Tạo batch + render + gửi
       body: { template_id, quiz_id?, title, custom_note, student_ids[] }
GET    /api/certificate-batches/:id/students    - Chi tiết học sinh trong batch
```

### Học sinh
```
GET    /api/certificates/my                     - Chứng nhận của tôi
       response: [{ id, title, issued_at, teacher_name, png_url, ... }]
```

### Worker internal (render)
```
POST   /api/internal/render-certificate         - Trigger render 1 cert
       body: { cert_id }                        - Worker gọi nội bộ
```

---

## Frontend Components

### Học sinh
```
src/features/certificates/
  StudentAchievementsPage.tsx    - Tab "Thành tích" trong nav
  CertificateCard.tsx            - Card hiển thị 1 chứng nhận + nút tải
  useCertificates.ts             - Hook fetch danh sách
```

### Giáo viên
```
src/features/certificates/
  TeacherCertificatesPage.tsx    - Trang "Quản lý Chứng nhận"
  BatchCreateModal.tsx           - Modal tạo đợt: chọn template, lớp, HS
  CertificatePreview.tsx         - Preview HTML/CSS real-time
  BatchHistoryList.tsx           - Lịch sử các đợt đã phát
```

### Admin
```
src/features/certificates/
  AdminTemplatesPage.tsx         - Upload & quản lý template
  TemplateFieldEditor.tsx        - Kéo thả toạ độ field trên ảnh nền
```

---

## Preview Flow (Client-side)

1. Fetch ảnh nền template từ R2 public URL → `<img>` element
2. Overlay các `<div>` text theo `fields_config` (absolute position)
3. `dom-to-image-more` capture toàn bộ container → Blob PNG
4. Hiển thị trong `<img>` preview, kèm nút "Xem thử tải về"
5. Khi GV hài lòng → POST batch → Worker render phiên bản chính thức

---

## Worker Render Flow (Server-side)

1. Fetch `fields_config` từ D1 theo `template_id`
2. Fetch ảnh nền từ R2 → ArrayBuffer
3. Tạo OffscreenCanvas (hoặc dùng resvg nếu template SVG)
4. Draw ảnh nền
5. Draw text từng field theo toạ độ x/y/fontSize/color/align
6. Export PNG → Uint8Array
7. PUT lên R2: `certs/{cert_id}.png`
8. UPDATE `certificates` set `png_r2_key`, `render_status = 'done'`

---

## Commands

```bash
# Dev frontend
cd itongquiz && npm run dev

# Dev worker
cd workers && npx wrangler dev --config wrangler.toml

# Deploy worker
cd workers && npx wrangler deploy --config wrangler.toml

# D1 migration
npx wrangler d1 execute itongquiz-db --file=migrations/add_certificates.sql --remote

# Build frontend
cd itongquiz && npm run build
```

---

## Project Structure (files mới)

```
workers/
  src/
    routes/
      certificates.ts          - API endpoints certificates
      adminTemplates.ts        - API admin templates
    services/
      certificateRenderer.ts   - Canvas render logic
      r2Upload.ts              - Upload PNG lên R2

itongquiz/src/
  features/
    certificates/
      StudentAchievementsPage.tsx
      CertificateCard.tsx
      CertificatePreview.tsx
      TeacherCertificatesPage.tsx
      BatchCreateModal.tsx
      BatchHistoryList.tsx
      AdminTemplatesPage.tsx
      TemplateFieldEditor.tsx
      useCertificates.ts
      useBatches.ts
      certificates.types.ts

data/migrations/
  add_certificates.sql         - 3 bảng mới + indexes
```

---

## Code Style

Theo pattern hiện tại của project:

```typescript
// certificates.types.ts
export interface Certificate {
  id: string;
  batchId: string;
  title: string;
  teacherName: string;
  studentScore: number | null;
  quizTitle: string | null;
  pngUrl: string;           // R2 public URL
  issuedAt: string;         // ISO date string
}

export interface CertificateTemplate {
  id: string;
  name: string;
  bgImageUrl: string;
  fieldsConfig: FieldConfig[];
  isActive: boolean;
}

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
```

---

## Testing Strategy

- **Unit:** `vitest` — test `certificateRenderer.ts` với mock canvas
- **Integration:** test API endpoints với D1 local (`wrangler dev`)
- **Manual:** Tạo 1 template test, phát cho 3 học sinh test, kiểm tra PNG tải về
- **No e2e bắt buộc** cho MVP, thêm sau nếu cần

---

## Boundaries

**Always do:**
- Validate `student_ids` thuộc lớp của giáo viên trước khi tạo batch
- PNG lưu R2 với path `certs/{cert_id}.png` (không trùng)
- Auth check: học sinh chỉ xem cert của chính mình

**Ask first:**
- Thêm tính năng thu hồi chứng nhận (`is_revoked`)
- Gửi thông báo push/email khi nhận cert
- Cho phép học sinh chia sẻ cert lên feed công khai

**Never do:**
- Expose R2 key nội bộ ra response API (chỉ trả public URL)
- Cho giáo viên phát cert cho học sinh không thuộc lớp mình
- Render PNG phía client rồi lưu thẳng (phải qua Worker)

---

## Decisions (đã xác nhận)

1. **Template field editor:** Kéo thả — `TemplateFieldEditor` nằm trong MVP Phase 1
2. **Font chữ Worker:** Roboto (bundle WASM vào Worker, hỗ trợ tiếng Việt đầy đủ)
3. **Giới hạn batch:** Tối đa 100 HS/batch — validate server-side, báo lỗi nếu vượt
4. **Template ảnh mẫu:** Chờ ảnh mẫu từ bạn → đo toạ độ → cập nhật `fields_config` mặc định
5. **Render async với queue:** Dùng Cloudflare Queue (hoặc D1 job table) — Worker nhận request → enqueue từng cert → consumer Worker render lần lượt, tránh timeout 30s

---

## MVP Scope (Phase 1)

✅ Trong scope:
- 3 bảng D1 mới
- Admin upload template (form đơn giản, toạ độ nhập tay)
- Giáo viên tạo batch, chọn HS, preview HTML/CSS, gửi
- Worker render PNG → R2
- Học sinh xem tab "Thành tích", tải PNG

❌ Defer sang Phase 2:
- Thông báo push/email
- Thu hồi chứng nhận
- Thống kê đợt phát
