# OG Image Generator (R2 + Phieu) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sinh ảnh OG PNG từ dữ liệu phiếu nhận xét, lưu vào R2, trả URL `https://r2.thitong.site/<token>.png` để bot mạng xã hội render preview.

**Architecture:** Worker nhận request `/p/<token>/og-image`, kiểm tra R2 cache trước; nếu chưa có thì render SVG bằng `@cloudflare/pages-plugin-sentry` + convert PNG bằng `@resvg/resvg-wasm`, lưu vào R2 và trả về. `phieu.ts` hiện đang trả SVG inline — ta thay bằng redirect về URL R2 PNG.

**Tech Stack:** Cloudflare Workers, R2 (`OG_IMAGES` binding), `@resvg/resvg-wasm` (WASM PNG renderer, chạy được trên Workers), TypeScript.

## Global Constraints

- Runtime: Cloudflare Workers (không có Node.js, không có `canvas`, không có `sharp`)
- WASM size budget: `@resvg/resvg-wasm` ~2MB — nằm trong giới hạn 10MB Workers script
- R2 key format: `og/<token>.png`
- Public URL: `https://r2.thitong.site/og/<token>.png`
- `Env` interface ở `workers/src/types.ts` — mọi binding mới phải thêm vào đây
- Không cài `satori` (quá nặng, không tương thích Workers) — dùng template SVG string thuần
- Cache-Control R2: `public, max-age=604800` (7 ngày)
- Khi phiếu được update (upsert), xóa cache R2 tương ứng

---

### Task 1: Cài dependency + cập nhật Env type

**Files:**
- Modify: `workers/package.json` — thêm `@resvg/resvg-wasm`
- Modify: `workers/src/types.ts` — thêm `OG_IMAGES: R2Bucket` và `R2_PUBLIC_URL: string` vào `Env`

**Interfaces:**
- Produces: `env.OG_IMAGES` có type `R2Bucket`, `env.R2_PUBLIC_URL` có type `string`

- [ ] **Step 1: Cài package**

```bash
cd workers
cmd /c "set CLOUDFLARE_API_TOKEN=<CLOUDFLARE_API_TOKEN> && npm install @resvg/resvg-wasm"
```

Expected: `added 1 package` hoặc tương tự, exit 0.

- [ ] **Step 2: Cập nhật `workers/src/types.ts`** — thêm 2 dòng vào `Env`:

```typescript
export interface Env {
    DB: D1Database;
    API_SECRET_TOKEN: string;
    CLIPROXY_API: string;
    CLIPROXY_TOKEN: string;
    JWT_SECRET: string;
    OG_IMAGES: R2Bucket;        // R2 bucket binding
    R2_PUBLIC_URL: string;      // https://r2.thitong.site
}
```

- [ ] **Step 3: Commit**

```bash
git add workers/package.json workers/package-lock.json workers/src/types.ts
git commit -m "feat: add resvg-wasm dep + OG_IMAGES R2 binding to Env"
```

---

### Task 2: Tạo `ogImage.ts` — SVG template + PNG render

**Files:**
- Create: `workers/src/utils/ogImage.ts`

**Interfaces:**
- Consumes: `import { initWasm, Resvg } from '@resvg/resvg-wasm'`
- Produces:
  - `renderOgPng(record: PhieuRecord): Promise<Uint8Array>` — trả PNG bytes
  - `type PhieuRecord = { student_name: string; ten_bai_tap?: string; batch_title?: string; diem_so?: number; xep_loai?: string; so_cau_dung?: number; tong_cau?: number; }`

- [ ] **Step 1: Tạo `workers/src/utils/ogImage.ts`**

```typescript
import { initWasm, Resvg } from '@resvg/resvg-wasm';

// WASM chỉ init 1 lần
let wasmInitialized = false;
async function ensureWasm() {
    if (wasmInitialized) return;
    // fetch WASM từ CDN (Workers hỗ trợ fetch trong global scope)
    const wasmUrl = 'https://unpkg.com/@resvg/resvg-wasm/index_bg.wasm';
    const wasmArrayBuffer = await fetch(wasmUrl).then(r => r.arrayBuffer());
    await initWasm(wasmArrayBuffer);
    wasmInitialized = true;
}

export interface PhieuRecord {
    student_name: string;
    ten_bai_tap?: string;
    batch_title?: string;
    diem_so?: number;
    xep_loai?: string;
    so_cau_dung?: number;
    tong_cau?: number;
}

function buildSvg(r: PhieuRecord): string {
    const name    = r.student_name || 'Học sinh';
    const baiTap  = r.batch_title || r.ten_bai_tap || 'Bài kiểm tra';
    const diem    = r.diem_so != null ? `${r.diem_so}/10` : '';
    const xepLoai = r.xep_loai || '';
    const cauInfo = r.tong_cau ? `${r.so_cau_dung ?? 0}/${r.tong_cau} câu đúng` : '';

    // Màu badge theo xếp loại
    const badgeColor: Record<string, string> = {
        'Giỏi': '#22c55e', 'Khá': '#3b82f6', 'Trung bình': '#f59e0b', 'Yếu': '#ef4444'
    };
    const bColor = badgeColor[xepLoai] || '#6366f1';

    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4F46E5"/>
      <stop offset="100%" stop-color="#7C3AED"/>
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  <!-- Brand -->
  <text x="600" y="90" font-family="Arial,sans-serif" font-size="22" fill="rgba(255,255,255,0.7)" text-anchor="middle" letter-spacing="4">📚 THITONG · PHIẾU KẾT QUẢ</text>
  <!-- Tên học sinh -->
  <text x="600" y="200" font-family="Arial,sans-serif" font-size="64" font-weight="bold" fill="white" text-anchor="middle">${name}</text>
  <!-- Tên bài -->
  <text x="600" y="270" font-family="Arial,sans-serif" font-size="30" fill="rgba(255,255,255,0.85)" text-anchor="middle">${baiTap}</text>
  <!-- Điểm -->
  ${diem ? `<text x="${xepLoai ? '520' : '600'}" y="380" font-family="Arial,sans-serif" font-size="80" font-weight="bold" fill="#FDE047" text-anchor="middle">${diem}</text>` : ''}
  <!-- Xếp loại badge -->
  ${xepLoai ? `<rect x="${diem ? '620' : '500'}" y="330" width="160" height="52" rx="26" fill="${bColor}"/><text x="${diem ? '700' : '580'}" y="365" font-family="Arial,sans-serif" font-size="26" font-weight="bold" fill="white" text-anchor="middle">${xepLoai}</text>` : ''}
  <!-- Số câu -->
  ${cauInfo ? `<text x="600" y="460" font-family="Arial,sans-serif" font-size="26" fill="rgba(255,255,255,0.75)" text-anchor="middle">${cauInfo}</text>` : ''}
  <!-- Footer -->
  <text x="600" y="590" font-family="Arial,sans-serif" font-size="20" fill="rgba(255,255,255,0.5)" text-anchor="middle">thitong.site</text>
</svg>`;
}

export async function renderOgPng(record: PhieuRecord): Promise<Uint8Array> {
    await ensureWasm();
    const svg = buildSvg(record);
    const resvg = new Resvg(svg, {
        fitTo: { mode: 'width', value: 1200 },
    });
    return resvg.render().asPng();
}
```

- [ ] **Step 2: Commit**

```bash
git add workers/src/utils/ogImage.ts
git commit -m "feat: add OG image SVG template + resvg-wasm PNG renderer"
```

---

### Task 3: Cập nhật `phieu.ts` — serve PNG từ R2, xóa cache khi upsert

**Files:**
- Modify: `workers/src/routes/phieu.ts`
- Modify: `workers/src/index.ts` — truyền `env` vào `handlePhieuSubdomain`

**Interfaces:**
- Consumes: `renderOgPng(record: PhieuRecord): Promise<Uint8Array>` từ Task 2
- Consumes: `env.OG_IMAGES: R2Bucket`, `env.R2_PUBLIC_URL: string`
- `handlePhieuSubdomain(request, env)` — đổi signature nhận `Env` thay vì chỉ `D1Database`

- [ ] **Step 1: Cập nhật signature `handlePhieuSubdomain` trong `phieu.ts`**

Thay dòng đầu hàm:
```typescript
// TRƯỚC
export async function handlePhieuSubdomain(request: Request, db: D1Database): Promise<Response | null>

// SAU
import { renderOgPng, PhieuRecord } from '../utils/ogImage';
import { Env } from '../types';

export async function handlePhieuSubdomain(request: Request, env: Env): Promise<Response | null> {
    const db = env.DB;
```

- [ ] **Step 2: Thay block `og-image` trong `handlePhieuSubdomain`**

Tìm đoạn:
```typescript
if (subpath === 'og-image') {
    const svg = renderOgImageSvg(record);
    return new Response(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'public, max-age=86400',
        },
    });
}
```

Thay bằng:
```typescript
if (subpath === 'og-image') {
    const r2Key = `og/${publicToken}.png`;
    // 1. Thử lấy từ R2 cache
    const cached = await env.OG_IMAGES.get(r2Key);
    if (cached) {
        return new Response(cached.body, {
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=604800',
                'X-Cache': 'HIT',
            },
        });
    }
    // 2. Render PNG mới
    const png = await renderOgPng(record as PhieuRecord);
    // 3. Lưu vào R2 (không await để không chậm response)
    env.OG_IMAGES.put(r2Key, png, {
        httpMetadata: { contentType: 'image/png', cacheControl: 'public, max-age=604800' },
    });
    return new Response(png, {
        headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=604800',
            'X-Cache': 'MISS',
        },
    });
}
```

- [ ] **Step 3: Xóa R2 cache khi upsert phiếu — trong `handleUpsertPhieu`**

Thêm ở cuối `handleUpsertPhieu` (sau khi insert/update thành công), trước `return`:
```typescript
// Xóa OG cache nếu có public token
const link = await db.prepare('SELECT public_token FROM phieu_public_links WHERE phieu_id = ?')
    .bind(id).first<{ public_token: string }>();
if (link?.public_token && env.OG_IMAGES) {
    await env.OG_IMAGES.delete(`og/${link.public_token}.png`);
}
```

Lưu ý: `handleUpsertPhieu` cần nhận thêm `env: Env` — cập nhật signature và nơi gọi nó trong `index.ts`.

- [ ] **Step 4: Cập nhật `index.ts` — truyền `env` thay vì `env.DB`**

Tìm:
```typescript
const phieuSubdomainResponse = await handlePhieuSubdomain(request, env.DB);
```
Thay:
```typescript
const phieuSubdomainResponse = await handlePhieuSubdomain(request, env);
```

- [ ] **Step 5: Cập nhật OG HTML meta tag trong `renderOgHtml` — trỏ về PNG thay vì SVG**

Trong hàm `renderOgHtml` (trong `phieu.ts`), tìm dòng `og:image` và sửa extension:
```typescript
// TRƯỚC
`<meta property="og:image" content="https://phieu.thitong.site/p/${token}/og-image">`
// SAU  
`<meta property="og:image" content="https://r2.thitong.site/og/${token}.png">`
```

- [ ] **Step 6: Commit**

```bash
git add workers/src/routes/phieu.ts workers/src/index.ts
git commit -m "feat: serve OG image PNG from R2 with cache, invalidate on upsert"
```

---

### Task 4: Deploy + Smoke Test

**Files:**
- No new files — chỉ deploy và verify

- [ ] **Step 1: TypeScript check**

```bash
cd workers && npx tsc --noEmit
```
Expected: exit 0, không có lỗi.

- [ ] **Step 2: Deploy lên Cloudflare**

```bash
cmd /c "set CLOUDFLARE_API_TOKEN=<CLOUDFLARE_API_TOKEN> && set CLOUDFLARE_ACCOUNT_ID=<CLOUDFLARE_ACCOUNT_ID> && npx wrangler deploy"
```
Expected: `Deployed itongquiz-api ... (version ...)`

- [ ] **Step 3: Lấy 1 public_token thật từ D1**

```bash
cmd /c "set CLOUDFLARE_API_TOKEN=<CLOUDFLARE_API_TOKEN> && set CLOUDFLARE_ACCOUNT_ID=<CLOUDFLARE_ACCOUNT_ID> && npx wrangler d1 execute itongquiz-db --command \"SELECT public_token FROM phieu_public_links LIMIT 1;\" --remote"
```

- [ ] **Step 4: Smoke test OG endpoint**

```bash
curl -I https://phieu.thitong.site/p/<TOKEN_TỪ_STEP3>/og-image
```
Expected:
```
HTTP/2 200
content-type: image/png
x-cache: MISS   ← lần đầu
```

```bash
curl -I https://phieu.thitong.site/p/<TOKEN>/og-image
```
Expected:
```
content-type: image/png
x-cache: HIT    ← lần 2, đọc từ R2
```

- [ ] **Step 5: Verify ảnh R2 public URL**

```bash
curl -I https://r2.thitong.site/og/<TOKEN>.png
```
Expected: `HTTP/2 200`, `content-type: image/png`

- [ ] **Step 6: Commit final**

```bash
git add -A
git commit -m "feat: OG image PNG via R2 - production verified"
```
