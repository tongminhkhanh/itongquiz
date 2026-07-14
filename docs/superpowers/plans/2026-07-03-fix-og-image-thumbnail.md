# Fix OG Image Thumbnail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix thumbnail ảnh không hiện khi share link phiếu, bằng cách sửa 2 root causes: (1) WASM fetch runtime thất bại trong Worker → 500, (2) `og:image` trỏ sai URL domain chưa được setup.

**Architecture:** Bundle WASM vào Worker thay vì fetch từ unpkg lúc runtime; đổi `og:image` URL trỏ về Worker endpoint `/p/<token>/og-image` (tự serve PNG và cache R2) thay vì `r2.thitong.site` (chưa setup public domain).

**Tech Stack:** Cloudflare Workers, TypeScript, `@resvg/resvg-wasm`, Wrangler v3, R2 Bucket

## Global Constraints

- Không thay đổi schema D1 database
- Không thay đổi public URL pattern `/p/<token>` của phiếu
- Giữ nguyên R2 bucket binding name `OG_IMAGES`
- Worker runtime: `nodejs_compat` compatibility flag đã có
- File WASM phải được bundle qua `wrangler.toml`, không fetch external URL

---

### Task 1: Bundle WASM vào Worker thay vì fetch từ unpkg

**Files:**
- Modify: `workers/wrangler.toml`
- Modify: `workers/src/utils/ogImage.ts`

**Interfaces:**
- Produces: `renderOgPng(record: PhieuRecord): Promise<Uint8Array>` — giữ nguyên signature, nhưng không còn fetch external URL

- [ ] **Step 1: Xác nhận file WASM tồn tại trong node_modules**

```bash
cd workers
dir node_modules\@resvg\resvg-wasm\index_bg.wasm
```

Expected: thấy file `index_bg.wasm`, lấy đường dẫn chính xác.

- [ ] **Step 2: Thêm wasm_modules binding vào `wrangler.toml`**

Mở `workers/wrangler.toml`, thêm section sau vào cuối file:

```toml
[wasm_modules]
REVG_WASM = "node_modules/@resvg/resvg-wasm/index_bg.wasm"
```

> **Lưu ý:** Tên binding `REVG_WASM` sẽ được dùng trong code ở bước tiếp theo.

- [ ] **Step 3: Sửa `workers/src/utils/ogImage.ts` — dùng bundled WASM thay vì fetch**

Thay toàn bộ phần `ensureWasm` và import:

```typescript
import { initWasm, Resvg } from '@resvg/resvg-wasm';

// WASM được bundle qua wrangler.toml [wasm_modules]
declare const REVG_WASM: WebAssembly.Module;

let wasmInitialized = false;
async function ensureWasm() {
    if (wasmInitialized) return;
    await initWasm(REVG_WASM);
    wasmInitialized = true;
}
```

> Xóa hoàn toàn đoạn `fetch('https://unpkg.com/@resvg/resvg-wasm/index_bg.wasm')`

- [ ] **Step 4: Build và kiểm tra compile không lỗi**

```bash
cd workers
npx wrangler deploy --dry-run
```

Expected: output `✓ Build successful` hoặc không có TypeScript error. Nếu có lỗi về `WebAssembly.Module`, thêm `/// <reference types="@cloudflare/workers-types" />` ở đầu file.

- [ ] **Step 5: Test endpoint `/og-image` trả 200**

```bash
# Deploy lên môi trường staging hoặc dùng wrangler dev
npx wrangler dev
```

Trong terminal khác:

```bash
curl -sI http://localhost:8787/p/4z362z2x2a5z6i0y2f431p6z4h4v1k3l/og-image
```

Expected: `HTTP/1.1 200 OK` và `Content-Type: image/png`

- [ ] **Step 6: Commit**

```bash
git add workers/wrangler.toml workers/src/utils/ogImage.ts
git commit -m "fix: bundle resvg WASM into worker instead of fetching from unpkg"
```

---

### Task 2: Đổi `og:image` URL trỏ về Worker endpoint

**Files:**
- Modify: `workers/src/routes/phieu.ts` (hàm `renderOgHtml`, dòng ~408)

**Interfaces:**
- Consumes: Task 1 — `/og-image` endpoint hoạt động và trả PNG
- Produces: `og:image` meta tag trỏ đúng URL có thể crawl được

- [ ] **Step 1: Tìm dòng build `ogImage` URL trong `renderOgHtml`**

Mở `workers/src/routes/phieu.ts`, tìm dòng:

```typescript
const ogImage = `https://r2.thitong.site/og/${encodeURIComponent(publicToken)}.png`;
```

Đây là dòng ~408.

- [ ] **Step 2: Thay URL trỏ về Worker endpoint**

Sửa dòng đó thành:

```typescript
const ogImage = `https://${PUBLIC_PHIEU_HOST}/p/${encodeURIComponent(publicToken)}/og-image`;
```

> `PUBLIC_PHIEU_HOST` đã được định nghĩa ở đầu file là `'phieu.thitong.site'` — dùng lại biến này, không hardcode.

- [ ] **Step 3: Xác nhận HTML output chứa URL đúng**

Dùng curl giả bot:

```bash
curl -sA "facebookexternalhit/1.1" https://phieu.thitong.site/p/<token> | findstr "og:image"
```

Expected output chứa:
```
<meta property="og:image" content="https://phieu.thitong.site/p/<token>/og-image"/>
```

- [ ] **Step 4: Commit**

```bash
git add workers/src/routes/phieu.ts
git commit -m "fix: point og:image to worker endpoint instead of r2.thitong.site"
```

---

### Task 3: Deploy và verify end-to-end

**Files:**
- Không thay đổi file nào — chỉ deploy và test

- [ ] **Step 1: Deploy lên production**

```bash
cd workers
npx wrangler deploy
```

Expected: `Uploaded itongquiz-api` và không có lỗi.

- [ ] **Step 2: Verify `/og-image` endpoint trả PNG**

```bash
curl -sI https://phieu.thitong.site/p/<token>/og-image
```

Expected:
```
HTTP/1.1 200 OK
Content-Type: image/png
Cache-Control: public, max-age=604800
```

- [ ] **Step 3: Verify bot nhận HTML với `og:image` đúng**

```bash
curl -sA "facebookexternalhit/1.1" https://phieu.thitong.site/p/<token> | findstr "og:image"
```

Expected:
```html
<meta property="og:image" content="https://phieu.thitong.site/p/<token>/og-image"/>
```

- [ ] **Step 4: Test bằng Facebook Sharing Debugger**

Mở: https://developers.facebook.com/tools/debug/

Nhập URL: `https://phieu.thitong.site/p/<token>`

Expected: thấy thumbnail ảnh preview hiện đúng.

- [ ] **Step 5: Test share link trên Zalo**

Paste link vào Zalo (mobile hoặc web). Expected: hiện ảnh thumbnail với tên học sinh và điểm số.

- [ ] **Step 6: Commit final nếu có hotfix thêm**

```bash
git add -A
git commit -m "fix: og image thumbnail now visible when sharing phieu link"
```
