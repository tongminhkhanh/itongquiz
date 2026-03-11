# Phase 04: Create/Edit Quiz Modal
Status: ⬜ Pending

## Objective
Xử lý giao diện "Tạo Đề / Chỉnh Sửa Đề" (Create/Edit Quiz) từ phía Teacher. Cho phép gán cứng Category (bắt buộc) và Gán Tags tùy chọn (có thể nhiều Tags).

## Requirements
### Functional
- [ ] Render trường nhập liệu Dropdown Select Box (Danh sách thẻ Môn học 1 - 6 môn + Khác).
- [ ] Tích hợp React Component `react-select` hoặc `Tags Input` (Gõ phím enter / phẩy tự biến thành thẻ) cho người dùng tự gắn Tags.
- [ ] Kết nối State của `category` và `tags` vào `handleSave` hoặc Payload API gửi lên Cloudflare Worker.

## Files to Modify
- `src/components/TeacherDashboard/DraftTab.tsx` / `CreateTab.tsx` (Tùy logic đang lưu ở file nào).

## Next Phase
- Phase 05: Kiểm thử (Testing) vòng đời API.
