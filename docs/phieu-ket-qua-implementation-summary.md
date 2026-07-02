# Phiếu Kết Quả Nhận Xét - Implementation Summary

Ngày cập nhật: 02/07/2026

## Nguồn yêu cầu

- `C:/itongquiz1/phieu-ket-qua-nhan-xet-spec.md`
- `C:/itongquiz1/thitong-phieu-config.md`

## Skill đã dùng

- `app-builder`: dùng phần `feature-building.md` để map phạm vi triển khai tính năng full-stack vào cấu trúc repo hiện có.
- `analyze-project`: đã đọc nhưng không áp dụng sâu vì skill này thiên về phân tích hậu kiểm session, không khớp trực tiếp với yêu cầu triển khai tính năng.

## Mapping implement

### Frontend

| Yêu cầu | Implement |
|---|---|
| Tab "Phiếu KQ" trong màn bài nộp | `src/features/homework/components/AssignmentSubmissionsView.tsx` |
| Tạo phiếu hàng loạt cho học sinh đã chấm | `src/features/homework/components/PhieuBatchPanel.tsx` |
| Card xem/sửa phiếu | `src/features/homework/components/PhieuKetQuaCard.tsx` |
| Types domain phiếu | `src/features/homework/types/phieu.types.ts` |
| Service tạo/lấy phiếu | `src/features/homework/services/phieuService.ts` |
| Service publish batch/link | `src/features/homework/services/phieuBatchService.ts` |
| Trang public phụ huynh | `src/pages/PhieuPublicPage.tsx` |
| Route public `/phieu/p/:publicToken` | `App.tsx` |
| API adapter action mới | `src/services/apiAdapter.ts` |

### Backend Worker

| Yêu cầu | Implement |
|---|---|
| Public subdomain `phieu.thitong.site/p/{token}` | `workers/src/routes/phieu.ts` |
| Bot OG HTML preview | `workers/src/routes/phieu.ts` |
| Redirect người dùng thật về SPA | `workers/src/routes/phieu.ts` |
| Public API lấy phiếu theo token | `workers/src/routes/phieu.ts` |
| Legacy actions: `upsert_phieu`, `get_phieu_by_submission`, `publish_phieu_batch`, `deactivate_public_phieu_link` | `workers/src/routes/legacy.ts` |
| Gắn route public trước auth | `workers/src/index.ts` |

### Database / Deploy

| Yêu cầu | Implement |
|---|---|
| Bảng `phieu_nhanxet`, `phieu_batch`, `phieu_batch_items`, `phieu_public_links` | `workers/migrations/0019_add_phieu_nhanxet.sql` |
| Schema tổng hợp | `workers/schema.sql` |
| Rewrite SPA cho `/phieu/*` | `vercel.json` |
| Header noindex public route | `vercel.json` |
| OG image trung tính | `public/og-phieu.png` |

## Các file đã tạo mới

- `src/features/homework/types/phieu.types.ts`
- `src/features/homework/services/phieuService.ts`
- `src/features/homework/services/phieuBatchService.ts`
- `src/features/homework/components/PhieuKetQuaCard.tsx`
- `src/features/homework/components/PhieuBatchPanel.tsx`
- `src/pages/PhieuPublicPage.tsx`
- `workers/src/routes/phieu.ts`
- `workers/migrations/0019_add_phieu_nhanxet.sql`
- `public/og-phieu.png`

## Các file đã chỉnh

- `App.tsx`
- `src/features/homework/components/AssignmentSubmissionsView.tsx`
- `src/services/apiAdapter.ts`
- `vercel.json`
- `workers/src/index.ts`
- `workers/src/routes/legacy.ts`
- `workers/schema.sql`

## Luồng đã triển khai

1. Giáo viên vào bài tập trong Homework Center.
2. Mở tab `PHIEU KQ`.
3. Chọn học sinh đã được chấm điểm.
4. Chọn phong cách nhận xét: `nhe_nhang`, `nghiem_tuc`, `vui_ve`.
5. Bấm tạo nhận xét hàng loạt.
6. Hệ thống tạo/lưu phiếu nháp theo `submission_id`.
7. Giáo viên có thể sửa nhận xét trên card.
8. Bấm xuất link phụ huynh.
9. Worker sinh public token khó đoán và trả link dạng `https://phieu.thitong.site/p/{publicToken}`.
10. Phụ huynh mở link và được redirect về `https://thitong.site/phieu/p/{publicToken}`.
11. SPA public page tải đúng 1 phiếu theo token, không cần đăng nhập.

## Bảo mật đã bám theo spec

- Public link mặc định là 1 học sinh / 1 link.
- Public page không trả danh sách học sinh cả lớp.
- Token public dùng chuỗi random dài, không dùng mã ngắn.
- Public API kiểm tra `is_active = 1`.
- Public API kiểm tra `expires_at IS NULL OR expires_at > datetime('now')`.
- Route public trả `X-Robots-Tag: noindex, nofollow`.
- OG metadata không đưa tên học sinh vào preview.

## GitNexus impact

Đã chạy `npx gitnexus impact` cho các symbol cũ đã chạm:

| Symbol | Risk | Ghi chú |
|---|---|---|
| `App` | LOW | Thêm route public lazy load |
| `callApi` | LOW | Thêm action mapping |
| `fetch` trong Worker | LOW | Thêm public phieu handler trước auth |
| `AssignmentSubmissionsView` | LOW | Thêm tab `PHIEU KQ` |
| `handleLegacyAction` | HIGH | Symbol dùng trong legacy `/api/gas`; thay đổi chỉ thêm case mới, không sửa case cũ |

GitNexus status: index up-to-date.

## Validation đã chạy

- `npx vite build`: passed.
- `npx tsc --noEmit`: passed.
- `npx tsc -p workers/tsconfig.json --noEmit`: passed.
- `npm run build`: chưa pass trong sandbox vì `scripts/generate_sitemap.cjs` bị `fetch failed` do network restricted; `npx vite build` đã pass để xác nhận code frontend.

## Việc cần làm khi deploy thật

1. Chạy migration D1 `workers/migrations/0019_add_phieu_nhanxet.sql`.
2. Cấu hình Cloudflare DNS:
   - `CNAME phieu -> thitong.site`
   - Proxy bật.
3. Thêm Worker route:
   - `phieu.thitong.site/*`
4. Deploy Worker và Vercel.
5. Test:
   - Tạo phiếu 1 học sinh.
   - Tạo phiếu batch 10 học sinh.
   - Publish link riêng từng học sinh.
   - Mở trực tiếp `/phieu/p/:publicToken`.
   - F5 ở route public.
   - Test link hết hạn.
   - Test link bị thu hồi.
   - Test bot preview với user-agent `facebookexternalhit` hoặc Zalo.

## Lưu ý

- Phần nhận xét AI hiện là generator cục bộ theo style để hoàn thiện luồng end-to-end mà không phụ thuộc API key mới.
- Có thể nâng cấp bước sinh nhận xét sang Gemini server-side sau, theo hướng dùng API key hệ thống trong Worker.
- Worktree hiện có nhiều thay đổi ngoài phạm vi tính năng này từ trước; phần summary này chỉ ghi lại các thay đổi liên quan đến Phiếu Kết Quả Nhận Xét.
