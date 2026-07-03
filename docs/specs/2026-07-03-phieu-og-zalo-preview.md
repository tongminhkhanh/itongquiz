# Spec: Zalo / Social Link Preview cho Phiếu Kết Quả

**Ngày:** 2026-07-03  
**Tác giả:** AI + Owner  
**Trạng thái:** Draft — chờ review

---

## Objective

### Vấn đề
Khi giáo viên copy link `https://phieu.thitong.site/p/:token` vào Zalo, Messenger, Facebook hoặc iMessage,
Zalo crawler không đọc được Open Graph tags vì trang là SPA (React) — HTML trả về rỗng.
Kết quả: link hiển thị dạng URL trần, không có thumbnail, tiêu đề hay mô tả.

### Mục tiêu
Khi Zalo/Facebook/Telegram crawler gọi `phieu.thitong.site/p/:token`, Cloudflare Worker
phải trả về một HTML tĩnh **đầy đủ Open Graph tags được cá nhân hóa theo học sinh**:
- Tên học sinh
- Tên bài tập
- Điểm số và xếp loại
- Ảnh OG có branding ThiTong (ảnh tĩnh cố định — không sinh ảnh động)

### Người dùng hưởng lợi
- **Giáo viên**: link gửi phụ huynh trông chuyên nghiệp, tăng uy tín
- **Phụ huynh**: nhìn vào preview đã biết đây là phiếu của con mình, điểm bao nhiêu

### Điều kiện thành công
1. Paste link phiếu vào Zalo → hiện preview với tên HS + điểm số trong description
2. Ảnh thumbnail xuất hiện (không còn URL trần)
3. Người dùng thật bấm link vẫn được redirect đúng về SPA
4. Bot detection không chặn nhầm người dùng thật
5. File `og-phieu.png` tồn tại ở `public/` và được deploy lên Cloudflare Pages

---

## Tech Stack

| Layer | Tech |
|---|---|
| Edge runtime | Cloudflare Worker (TypeScript) |
| Database | Cloudflare D1 (SQLite) |
| Frontend | React SPA trên Cloudflare Pages |
| Subdomain phiếu | `phieu.thitong.site` → Worker |
| OG Image | Ảnh PNG tĩnh host trên `thitong.site/og-phieu.png` |

---

## Commands

```bash
# Dev worker local
cd itongquiz/workers && npx wrangler dev

# Deploy worker
cd itongquiz/workers && npx wrangler deploy

# Build frontend (Cloudflare Pages)
npm run build

# Kiểm tra OG tags
curl -A "ZaloBot" https://phieu.thitong.site/p/<token>
# → phải trả về HTML với og:title, og:description, og:image
```

---

## Project Structure

```
workers/
  src/
    routes/
      phieu.ts          ← SỬA: renderOgHtml() — cá nhân hóa tags
    utils/
      ogMeta.ts         ← TẠO MỚI: helper buildOgDescription()
public/
  og-phieu.png          ← TẠO MỚI: ảnh thumbnail 1200×630px
docs/
  specs/
    2026-07-03-phieu-og-zalo-preview.md  ← file này
```

---

## Phân tích vấn đề hiện tại

### Code hiện tại (`renderOgHtml`)

```typescript
// ❌ Vấn đề 1: og:title chỉ có tên bài tập, thiếu tên học sinh
const title = escapeHtml(record.batch_title || record.ten_bai_tap || 'Phieu Ket Qua');

// ❌ Vấn đề 2: og:description là text cứng, không cá nhân hóa
<meta property="og:description" content="Xem phieu ket qua va nhan xet giao vien..."/>

// ❌ Vấn đề 3: og:image trỏ file chưa chắc tồn tại
<meta property="og:image" content="https://thitong.site/og-phieu.png"/>

// ❌ Vấn đề 4: text không dấu tiếng Việt (xem phieu ket qua va nhan xet)
```

### Sau khi fix

```typescript
// ✅ og:title: Tên học sinh + bài tập
"Phiếu kết quả: Nguyễn Văn A - Toán cuối kỳ"

// ✅ og:description: Cá nhân hóa với điểm + xếp loại
"Điểm: 9.5/10 · Xếp loại: Xuất sắc · Số câu đúng: 19/20"

// ✅ og:image: Ảnh banner ThiTong chuẩn 1200×630
"https://thitong.site/og-phieu.png"

// ✅ Tiếng Việt có dấu đầy đủ
```

---

## Design Chi Tiết

### 1. Cập nhật `renderOgHtml()` trong `workers/src/routes/phieu.ts`

```typescript
function renderOgHtml(record: any, publicToken: string): string {
    const studentName = escapeHtml(record.student_name || 'Học sinh');
    const baiTap     = escapeHtml(record.batch_title || record.ten_bai_tap || 'Bài kiểm tra');
    const diem       = record.diem_so != null ? `${record.diem_so}/10` : '';
    const xepLoai    = escapeHtml(record.xep_loai || '');
    const soCauDung  = record.so_cau_dung ?? '';
    const tongCau    = record.tong_cau ?? '';

    const ogTitle = `Phiếu kết quả: ${studentName} – ${baiTap}`;
    const ogDesc  = [
        diem      ? `Điểm: ${diem}`           : null,
        xepLoai   ? `Xếp loại: ${xepLoai}`    : null,
        tongCau   ? `Số câu đúng: ${soCauDung}/${tongCau}` : null,
    ].filter(Boolean).join(' · ') || 'Xem phiếu kết quả học tập từ ThiTong';

    const ogImage = 'https://thitong.site/og-phieu.png';
    const url     = `https://${PUBLIC_PHIEU_HOST}/p/${encodeURIComponent(publicToken)}`;

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${escapeHtml(ogTitle)} | ThiTong</title>
  <meta name="description" content="${escapeHtml(ogDesc)}"/>
  <meta property="og:type"        content="website"/>
  <meta property="og:site_name"   content="ThiTong"/>
  <meta property="og:title"       content="${escapeHtml(ogTitle)}"/>
  <meta property="og:description" content="${escapeHtml(ogDesc)}"/>
  <meta property="og:image"       content="${ogImage}"/>
  <meta property="og:image:width"  content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:url"         content="${url}"/>
  <meta property="og:locale"      content="vi_VN"/>
  <meta name="twitter:card"        content="summary_large_image"/>
  <meta name="twitter:title"       content="${escapeHtml(ogTitle)}"/>
  <meta name="twitter:description" content="${escapeHtml(ogDesc)}"/>
  <meta name="twitter:image"       content="${ogImage}"/>
  <meta http-equiv="refresh" content="0;url=${url}"/>
</head>
<body>
  <h1>${escapeHtml(ogTitle)}</h1>
  <p>Đang chuyển hướng đến phiếu kết quả...</p>
  <a href="${url}">Nhấn đây nếu không tự chuyển</a>
</body>
</html>`;
}
```

> **Lưu ý quan trọng**: Thêm `<meta http-equiv="refresh" content="0;url=${url}"/>` để fallback redirect  
> nếu JS bị tắt hoặc Zalo mở WebView thay vì browser. Kết hợp với `302 redirect` cho người dùng thật.

### 2. Cập nhật Bot Detection Regex

Current regex bỏ sót một số Zalo UA variant:

```typescript
// Hiện tại
const isBot = /bot|crawl|facebookexternalhit|zalo|telegram|twitter|linkedin/i.test(userAgent);

// Cập nhật — bổ sung WhatsApp, Viber, Slack
const isBot = /bot|crawl|spider|facebookexternalhit|zalo|zalocrawler|telegram|whatsapp|viber|slack|twitter|linkedin|line|kakaotalk/i.test(userAgent);
```

### 3. Tạo ảnh `public/og-phieu.png`

- **Kích thước:** 1200 × 630 px (chuẩn OG)
- **Nội dung:** Banner ThiTong có logo + text "Phiếu Kết Quả Học Tập" + màu brand (#4F46E5 tím)
- **Nguồn gốc:** Dựa trên mẫu phiếu có sẵn (file ảnh user đã cung cấp)
- **Path deploy:** `public/og-phieu.png` → Cloudflare Pages serve tại `https://thitong.site/og-phieu.png`
- **Cache:** Cloudflare Pages mặc định cache lâu dài cho file tĩnh — OK

### 4. Không thay đổi flow redirect

Flow hiện tại giữ nguyên:
```
User thật  → GET /p/:token → Worker → 302 redirect → SPA React
Bot/Crawler → GET /p/:token → Worker → 200 HTML (OG tags) + meta refresh
```

---

## Code Style

Theo pattern hiện tại trong `phieu.ts`:

```typescript
// Naming: camelCase cho function, snake_case cho DB fields
// Helper functions: pure, không side-effect, ở cuối file
// Escape HTML: dùng escapeHtml() đã có sẵn
// Không throw — return Response trực tiếp
```

---

## Testing Strategy

### Manual Test
```bash
# 1. Kiểm tra bot response
curl -A "ZaloBot" https://phieu.thitong.site/p/<real_token>
# Expected: HTML với og:title chứa tên học sinh

# 2. Kiểm tra user redirect
curl -I https://phieu.thitong.site/p/<real_token>
# Expected: HTTP 302, Location: https://thitong.site/phieu/p/...

# 3. Kiểm tra ảnh OG
curl -I https://thitong.site/og-phieu.png
# Expected: HTTP 200, Content-Type: image/png

# 4. Dùng Zalo OG Debugger (nếu có)
# Hoặc paste link vào nhóm Zalo thật để kiểm tra
```

### Unit Test (nếu có test runner)
```typescript
// Test renderOgHtml với record có đầy đủ fields
// Test renderOgHtml với record thiếu student_name
// Test escapeHtml với ký tự đặc biệt trong tên HS
```

---

## Boundaries

- **Always:**
  - Escape tất cả user-generated content trong HTML output
  - Giữ nguyên logic redirect cho user thật (302)
  - Deploy worker + pages cùng lúc

- **Ask first:**
  - Thay đổi domain `phieu.thitong.site` hoặc routing
  - Thêm cache layer cho OG response (hiện tại 5 phút là đủ)
  - Sinh ảnh OG động (Option C — scope riêng)

- **Never:**
  - Trả về dữ liệu nhạy cảm trong OG tags (số điện thoại, email GV)
  - Cache bot response quá 10 phút (phiếu có thể bị thu hồi)
  - Bỏ `X-Robots-Tag: noindex` — trang phiếu không được index bởi Google

---

## Phạm vi thực hiện (Scope)

### ✅ Trong scope
- Sửa `renderOgHtml()` để cá nhân hóa tags
- Cập nhật bot detection regex
- Tạo file `public/og-phieu.png` (ảnh tĩnh)
- Deploy worker + pages

### ❌ Ngoài scope (để sau)
- Sinh ảnh OG động với tên học sinh từng người (Option C)
- Cache phân tán OG response
- OG tags cho trang batch nhiều học sinh

---

## Open Questions

1. **`og-phieu.png` đã tồn tại chưa?** — Cần kiểm tra `public/og-phieu.png`. Nếu chưa có, cần thiết kế ảnh 1200×630px.
2. **Zalo có cache OG không?** — Zalo cache mạnh, sau khi fix cần share link mới (chưa từng share) để test, hoặc dùng Zalo OG Debugger.
3. **`record.student_name` luôn có giá trị không?** — Cần kiểm tra D1 query trong `getPublicPhieuRecord()` có JOIN với phieu_nhanxet đầy đủ không.

---

## Success Criteria (Testable)

| # | Điều kiện | Cách kiểm tra |
|---|-----------|---------------|
| 1 | `og:title` chứa tên học sinh và tên bài | `curl -A ZaloBot ... \| grep og:title` |
| 2 | `og:description` chứa điểm số | `curl -A ZaloBot ... \| grep og:description` |
| 3 | `og:image` trả về HTTP 200 | `curl -I https://thitong.site/og-phieu.png` |
| 4 | User thật nhận 302 redirect | `curl -I https://phieu.thitong.site/p/:token` |
| 5 | Paste link vào Zalo → preview hiện ảnh + tiêu đề | Manual test trên Zalo mobile |
