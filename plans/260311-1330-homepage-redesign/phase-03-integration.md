# Phase 03: Integration & Routing
Status: ✅ Complete
Dependencies: Phase 02

## Objective
Thay thế `HomePage.tsx` bằng cơ chế luồng hiển thị (Routing logic) kết hợp 2 component mới.

## Requirements
### Functional
- [x] Nếu KHÔNG có token đăng nhập (`isLoggedIn === false`) -> Hiển thị `LoginLandingPage`.
- [x] Nếu học sinh đăng nhập (`isStudentLoggedIn === true`) -> Hiển thị `StudentDashboardUI` (hoặc `StudentDashboard`).
- [x] Xóa bỏ Modal Login không dùng nữa tại trang chủ.
- [x] Đảm bảo Teacher Login vẫn chuyển dướng đến Dashboard dành cho giáo viên (View = 'teacher_dash').
- [x] Clear up code chết trong `HomePage.tsx` gốc.

## Files to Modify
- `src/components/HomePage/HomePage.tsx` (Hoặc biến đổi nó thành 1 file Wrapper Router).
- `src/App.tsx` (Nếu cần đổi Router setup).

## Test Criteria
- [x] Người dùng chưa đăng nhập thấy ngay trang Landing 2 cột.
- [x] Học sinh log in xong vào thẳng Dashboard màu xanh đám mây đẹp.
- [x] Bấm Đăng xuất -> Bay ra Landing 2 cột.

---
Hoàn thành tính năng.
