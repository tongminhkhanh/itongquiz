# Phase 02: Premium Student Dashboard
Status: ✅ Complete
Dependencies: Phase 01 (Về luồng login)

## Objective
Xây dựng một Dashboard chuẩn E-Learning cho học sinh tiểu học sau khi đăng nhập thành công. Lược bỏ các Background lộn xộn, tập trung vào Task (Daily Quests).

## Requirements
### Functional
- [x] Lấy danh sách `assignments` thông qua `classroomStore.fetchStudentAssignments`.
- [x] Bóc tách 3 khối: Daily Quests (Bài được giáo viên giao), Library (Môn học), Leaderboard/Badges (Khen thưởng).
- [x] Component hóa Navbar: Logo, Balance, Avatar.
- [x] Cập nhật số liệu Real-time (Progress bar).

### UI/UX
- [x] Glassmorphism Widget: Bo góc mềm mại, đổ bóng màu sắc kẹo ngọt.
- [x] Icon: Dùng Fluent Emoji.
- [x] Layout lưới: Thanh Sidebar trái (hoặc Navbar) + Main content, chia Layout Grid chuẩn mực.
- [x] Daily Quests: Tạo khối Card nổi bật để Học sinh làm ngay.

## Files to Create/Modify
- `src/components/HomePage/StudentDashboardUI.tsx`
- Tham chiếu lại logic từ `HomePage.tsx` và `StudentDashboard.tsx`. Tái sử dụng components (vd `QuizListPage`).

## Test Criteria
- [x] Thấy được danh sách Bài Tập cần làm.
- [x] Đọc được điểm số, lịch sử.
- [x] Thấy biểu tượng 3D tải mượt mà.

---
Next Phase: Phase 03
