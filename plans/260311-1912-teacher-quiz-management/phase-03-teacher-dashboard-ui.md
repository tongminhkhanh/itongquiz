# Phase 03: Teacher Dashboard UI
Status: ⬜ Pending

## Objective
Thay đổi giao diện của màn hình Quản lý Kho đề dành cho cho Giáo viên `TeacherDashboard`. Thêm một thanh bộ lọc (Filter Tabs) tương ứng với 6 môn học và thẻ Tổng hợp (Tất cả).

## Requirements
### Functional
- [ ] Render thanh Tab Ngang (Tất cả, Toán, Tiếng Việt, Tự nhiên & Xã hội, Tiếng Anh, Tin học, Luyện IOE).
- [ ] Ánh xạ các icon và màu sắc khớp với `SUBJECT_CONFIG` ở màn hình Học sinh.
- [ ] Component nhận state Filter và Render ra danh sách Đề tương ứng (`category === selectedTab`).
- [ ] Hiển thị Component "Pill Badge" (Nhãn Tag) cho từng bài Quiz nếu bài đó có Nhãn.

## Files to Modify
- `src/components/TeacherDashboard/index.tsx` - Trình bao bọc chính
- `src/components/TeacherDashboard/LibraryTab.tsx` - Nơi chứa Grid/List giao diện kho đề.

## Next Phase
- Phase 04: Modal Tạo đề.
