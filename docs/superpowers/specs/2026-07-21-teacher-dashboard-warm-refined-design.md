# Teacher Dashboard Warm Refined Design

## Mục tiêu

Áp dụng hai thiết kế Stitch đã được duyệt cho Dashboard giáo viên:

- Desktop: `cd18878b486b422f84471cc3c7cfdefe`
- Mobile: `af36ff329a4c4683861999695440ec58`

Giao diện phải đồng bộ với design system **Warm Human Education** và không thay đổi logic nghiệp vụ.

## Phạm vi

- Khung dashboard, top bar và sidebar/drawer.
- Hero chào giáo viên và các chỉ số trong ngày.
- Thao tác nhanh.
- Bốn chỉ số tổng quan.
- Phân tích tình hình học tập.
- Bài nộp gần đây.
- Đề kiểm tra gần đây.
- Loading, empty và error states.
- Responsive cho mobile, tablet và desktop.

## Chức năng bắt buộc giữ nguyên

- Tất cả tab và phân quyền hiện có.
- Tạo đề, quản lý đề, giao bài, bài tự luận, thi trực tiếp, kết quả, lớp học, cửa hàng khi bật, chứng nhận, cài đặt cá nhân và các mục admin.
- Search dashboard, thông báo, tài khoản và đăng xuất.
- Sidebar accordion và mobile drawer.
- Các handler điều hướng, retry, loading, empty và error state.
- Bộ lọc dữ liệu theo lớp và mọi phép tính thống kê hiện có.

## Nguyên tắc giao diện

- Font Be Vietnam Pro.
- Nền `#FFFDF7`, card trắng, viền `#E5E7EB`.
- Primary `#0EA5E9`, active/emphasis `#0284C7`, mint `#10B981`, coral `#E76F51`.
- Không gradient, không shadow trang trí, không emoji, không icon 3D.
- Card 12–14px radius; control 8–10px radius.
- Sentence case, hierarchy rõ ràng, touch target tối thiểu 44px.
- Mobile dùng header + drawer; không dùng bottom navigation cố định.

## Kiến trúc triển khai

Giữ nguyên container, stores và data flow. Chỉ chỉnh presentational components và props tối thiểu cần thiết cho header mobile. Không thay API, route Worker, Zustand stores hoặc business calculations.

## Tiêu chí nghiệm thu

- Tất cả chức năng và tab cũ còn hoạt động.
- Desktop và mobile khớp hướng thiết kế Stitch.
- Không còn gradient/shadow trang trí trong phạm vi dashboard tổng quan.
- Header mobile mở được drawer và không cần bottom navigation.
- Keyboard focus và ARIA hiện có không bị mất.
- `TeacherOverview.test.tsx`, `TeacherDashboardShell.test.tsx`, full Vitest và production build đạt.
