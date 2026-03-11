# Phase 01: Landing & Login Page
Status: ✅ Complete
Dependencies: None

## Objective
Xây dựng một màn hình Landing Component riêng biệt, cấu trúc 2 cột.

## Requirements
### Functional
- [x] Render 2 cột layout trên Desktop, rớt xuống 1 cột kéo dọc trên Mobile.
- [x] Chứa Form Login hiện tại (`LoginModal` content) nhưng đặt thả trực tiếp lên màn hình (không dùng Modal).
- [x] Thêm nút Toggle chế độ Đăng nhập (Student vs Teacher).
- [x] Kết nối `authStore` và `classroomStore` đăng nhập chuẩn chỉ.

### UI/UX
- [x] Cột trái: Thêm Gradient CSS, Slogan lớn "Khơi Dậy Tiềm Năng", 3 gạch đầu dòng giới thiệu (+ Icon Lucide). Hình ảnh khối 3D thả nổi (chọn từ Fluent Emoji).
- [x] Cột phải: Form nền trắng, shadow lơ lửng. Nút Submit là màu Button chuyển Gradient sinh động.
- [x] Font: Hiện tại ứng dụng dùng chung font (Nunito/Pound), có thể tối ưu thêm CSS.

## Files to Create/Modify
- `src/components/HomePage/LoginLandingPage.tsx`
- `src/components/HomePage/LoginLandingPage.css` (Nên dùng Tailwind nếu có thể)

## Test Criteria
- [ ] Xem trên Tablet/Mobile vẫn hiển thị đẹp (cột dọc).
- [ ] Đăng nhập thành công với vai trò Học sinh.
- [ ] Đăng nhập thành công với vai trò Giáo viên.

---
Next Phase: Phase 02
