# Phase 02: Backend API
Status: ⬜ Pending

## Objective
Thay đổi logic các API `create_quiz` và `update_quiz` bên trong **Cloudflare Workers** để tương thích với cấu trúc của Base Quizzes đã được thêm `category` và `tags`. Xây dựng thêm API Tìm kiếm/Search theo Tag hoặc Category nếu cần.

## Requirements
### Functional
- [ ] Mở rộng payload cho `create_quiz` để map thêm biến `category` (1 chọn 6) & mảng `tags`.
- [ ] Parse mảng `tags` thành format JSON String trong D1.
- [ ] Bổ sung payload `update_quiz` cho update dữ liệu Môn học, Tag.

## Files to Modify
- `workers/src/index.ts` - Tìm hàm router liên quan tới Quiz Management.

## Next Phase
- Tiền đề triển khai Frontend (Teacher UI).
