# Phase 01: Database Migration
Status: ⬜ Pending

## Objective
Cập nhật Cấu trúc Dữ liệu (Schema) của bảng `quizzes` trong cơ sở dữ liệu D1 để có thể lưu trữ môn học (category) và nhãn (tags).

## Requirements
### Functional
- [ ] Thêm mảng json `tags` vào bảng `quizzes` để có thể lưu chuỗi các nhãn linh hoạt như `["#ThiGiuaKy", "#NangCao"]`.
- [ ] Xây dựng file SQL migration để alter table.
- [ ] Update dữ liệu cũ, tự động gán category `all` hoặc `khac` (nếu chưa có category).

## Files to Create/Modify
- `workers/d1/migrations/000X_add_quiz_category_tags.sql` - [Tạo file migration D1 mới]

## Next Phase
- Tiền đề để sang Phase 02 (Backend API).
