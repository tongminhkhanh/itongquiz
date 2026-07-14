# Share Phiếu Kết Quả Phụ Huynh — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm nút chia sẻ Facebook, Zalo, Copy link vào trang phiếu kết quả cho phụ huynh, kèm Open Graph meta tags để preview đẹp.

**Architecture:** Phase 1 — tạo `ShareBar` component độc lập, tích hợp vào `PhieuLinkSection` (giáo viên tạo link) và trang public phiếu phụ huynh. Phase 2 — thêm Open Graph `generateMetadata` động cho từng phiếu public trên Next.js App Router.

**Tech Stack:** React 18, TypeScript, Next.js App Router, Tailwind CSS, lucide-react

## Global Constraints
- Không dùng Zalo SDK / Facebook App ID — dùng share URL trực tiếp (sharer.php, zalo.me/share)
- `navigator.share()` chỉ hiện trên mobile có Web Share API
- `navigator.clipboard.writeText` chỉ gọi trong HTTPS hoặc localhost
- Tất cả copy tiếng Việt
- File tối đa ~200 dòng, 1 file = 1 responsibility
- Không dùng `window.location` hardcode — URL lấy từ prop hoặc `process.env.NEXT_PUBLIC_BASE_URL`
- Không import thêm dependency ngoài lucide-react đã có

---

## Phase 1 — ShareBar Component + Tích hợp UI

### Task 1: Tạo `ShareBar` component

**Files:**
- Create: `src/features/results/components/ShareBar.tsx`

**Interfaces:**
- Consumes: `url: string`, `studentName: string`, `title?: string`
- Produces: `export default ShareBar` — React.FC

- [ ] **Step 1: Tạo file**

```tsx
// src/features/results/components/ShareBar.tsx
import React, { useCallback, useState } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';

interface ShareBarProps {
  url: string;
  studentName: string;
  title?: string;
}

const isMobile = () =>
  typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent);

const ShareBar: React.FC<ShareBarProps> = ({ url, studentName, title }) => {
  const [copied, setCopied] = useState(false);
  const shareTitle = title ?? `Phiếu kết quả bài tập của ${studentName}`;

  const handleNativeShare = useCallback(async () => {
    if (!navigator.share) return;
    try { await navigator.share({ title: shareTitle, url }); } catch { /* cancelled */ }
  }, [url, shareTitle]);

  const handleFacebook = useCallback(() => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      '_blank', 'noopener,noreferrer,width=600,height=400'
    );
  }, [url]);

  const handleZalo = useCallback(() => {
    window.open(
      `https://zalo.me/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(shareTitle)}`,
      '_blank', 'noopener,noreferrer,width=600,height=400'
    );
  }, [url, shareTitle]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [url]);

  const showNative = isMobile() && typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-semibold text-gray-500">Chia sẻ:</span>

      {showNative ? (
        <button
          onClick={handleNativeShare}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          Chia sẻ
        </button>
      ) : (
        <>
          <button
            onClick={handleFacebook}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors"
            style={{ background: '#1877F2' }}
          >
            <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
              <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
            </svg>
            Facebook
          </button>

          <button
            onClick={handleZalo}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors"
            style={{ background: '#0068FF' }}
          >
            <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4.9 16.1c-.7.3-1.5.5-2.3.5-1.1 0-2.2-.3-3.1-.9-.5.1-2.9.8-3.2.9-.3 0-.4-.1-.3-.4l.7-2.2c-1-1.1-1.6-2.5-1.6-4 0-3.3 2.7-6 6-6s6 2.7 6 6c0 2.2-1.2 4.2-3.2 5.1z"/>
            </svg>
            Zalo
          </button>
        </>
      )}

      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        {copied
          ? <Check className="w-3.5 h-3.5 text-green-500" />
          : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Đã sao chép' : 'Sao chép link'}
      </button>
    </div>
  );
};

export default ShareBar;
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit src/features/results/components/ShareBar.tsx
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/features/results/components/ShareBar.tsx
git commit -m "feat(results): add ShareBar component with Facebook, Zalo, native share, copy"
```

---

### Task 2: Tích hợp ShareBar vào `PhieuLinkSection`

**Files:**
- Modify: `src/features/results/components/PhieuLinkSection.tsx`

**Interfaces:**
- Consumes: `ShareBar` từ `./ShareBar`, `link.url` (đã có), `phieuInput.student_name` (đã có trong Props)
- Produces: không thay đổi interface — chỉ thêm UI

- [ ] **Step 1: Thêm import ShareBar**

Thêm vào dòng import cuối cùng của PhieuLinkSection.tsx:

```tsx
import ShareBar from './ShareBar';
```

- [ ] **Step 2: Thêm `<ShareBar />` vào block `{link && (...)}`**

Tìm block:
```tsx
{link && (
  <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
```

Thay bằng:
```tsx
{link && (
  <div className="space-y-2">
    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-600 hover:underline flex-1 truncate"
      >
        {link.url}
      </a>

      <button
        onClick={handleCopy}
        title="Copy link"
        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </button>

      <button
        onClick={handleRevoke}
        disabled={isRevoking}
        title="Thu hồi link"
        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50"
      >
        {isRevoking
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Trash2 className="w-4 h-4" />}
      </button>
    </div>
    <ShareBar url={link.url} studentName={phieuInput.student_name} />
  </div>
)}
```

- [ ] **Step 3: Build check**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/features/results/components/PhieuLinkSection.tsx
git commit -m "feat(results): integrate ShareBar into PhieuLinkSection below copy/revoke row"
```

---

### Task 3: Tích hợp ShareBar vào trang public phiếu phụ huynh

**Files:**
- Locate & Modify: trang render phiếu public (tìm bằng `publicToken`)

**Interfaces:**
- Consumes: `ShareBar`, `phieu.student_name`, `publicToken` (từ route params)
- Produces: UI chia sẻ ở cuối trang phiếu

- [ ] **Step 1: Tìm file trang public**

```bash
grep -r "publicToken\|public_token\|PhieuKetQuaCardV2" src/app --include="*.tsx" -l
```

Ghi lại đường dẫn file tìm được.

- [ ] **Step 2: Import ShareBar**

```tsx
import ShareBar from '@/features/results/components/ShareBar';
```

- [ ] **Step 3: Thêm ShareBar sau `<PhieuKetQuaCardV2 />`**

```tsx
{/* Sau PhieuKetQuaCardV2 */}
<div className="mt-4 flex justify-center">
  <div className="w-full" style={{ maxWidth: 480 }}>
    <ShareBar
      url={`${process.env.NEXT_PUBLIC_BASE_URL}/phieu/${token}`}
      studentName={phieu.student_name}
      title={`Phiếu kết quả bài tập của ${phieu.student_name}`}
    />
  </div>
</div>
```

- [ ] **Step 4: Build check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add <file-trang-public>
git commit -m "feat(results): add ShareBar to public parent phieu page"
```

---

## Phase 2 — Open Graph Động

### Task 4: Thêm `generateMetadata` động cho trang public phiếu

**Files:**
- Modify: `app/phieu/[token]/page.tsx` (hoặc path tương đương — xác định ở Task 3)
- Modify: `.env` (thêm `NEXT_PUBLIC_BASE_URL`)

**Interfaces:**
- Consumes: `fetchPhieuByToken(token: string): Promise<PhieuNhanXet | null>` — hàm đã tồn tại trong codebase
- Produces: `generateMetadata` export với `og:title`, `og:description`, `og:url`, `og:type`

- [ ] **Step 1: Kiểm tra `.env` đã có `NEXT_PUBLIC_BASE_URL` chưa**

```bash
grep 'NEXT_PUBLIC_BASE_URL' .env .env.local 2>/dev/null
```

Nếu chưa có, thêm vào `.env`:
```
NEXT_PUBLIC_BASE_URL=https://thitong.site
```

- [ ] **Step 2: Thêm `generateMetadata` vào page file**

```tsx
// Thêm trước default export của page component
import type { Metadata } from 'next';

export async function generateMetadata(
  { params }: { params: { token: string } }
): Promise<Metadata> {
  const phieu = await fetchPhieuByToken(params.token);
  if (!phieu) return { title: 'Phiếu kết quả' };

  const title = `Phiếu kết quả bài tập của ${phieu.student_name}`;
  const description = [
    `Môn: ${phieu.mon_hoc ?? '---'}`,
    `Điểm: ${phieu.diem_so ?? '---'}`,
    `Xếp loại: ${phieu.xep_loai ?? '---'}`,
  ].join(' | ');
  const url = `${process.env.NEXT_PUBLIC_BASE_URL}/phieu/${params.token}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'article',
    },
  };
}
```

- [ ] **Step 3: Build check**

```bash
npx tsc --noEmit && npm run build
```

Expected: build success, no type errors

- [ ] **Step 4: Test Open Graph**

Mở `https://developers.facebook.com/tools/debug/` → paste URL phiếu → nhấn "Scrape Again" → xem preview có title/description đúng không.

- [ ] **Step 5: Commit**

```bash
git add app/phieu/[token]/page.tsx .env
git commit -m "feat(results): add dynamic Open Graph meta for public phieu page"
```

---
