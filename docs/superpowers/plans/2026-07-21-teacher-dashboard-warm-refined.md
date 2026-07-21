# Teacher Dashboard Warm Refined Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Áp dụng thiết kế Stitch Warm Refined cho Dashboard giáo viên trên desktop và mobile mà không thay đổi chức năng hoặc dữ liệu.

**Architecture:** Giữ nguyên container, stores và handlers. Chỉ thay đổi shell/presentational components, bổ sung trigger drawer mobile vào header và loại bottom navigation trên mobile. Tests khóa layout tokens mới và các contract điều hướng cũ.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Lucide React, Vitest, Testing Library.

## Global Constraints

- Không thay API, Worker route, Zustand store hoặc phép tính thống kê.
- Giữ nguyên toàn bộ tab, phân quyền, search, retry, logout và mobile drawer.
- Font Be Vietnam Pro; nền #FFFDF7; card trắng; border #E5E7EB.
- Không gradient, shadow trang trí, emoji hoặc 3D icon.
- Desktop và mobile bám screen Stitch đã duyệt.

---

### Task 1: Khóa contract shell responsive

**Files:**
- Modify: `tests/TeacherDashboardShell.test.tsx`
- Modify: `src/components/TeacherDashboard/teacher-dashboard-shell/TeacherDashboardLayout.tsx`
- Modify: `src/components/TeacherDashboard/teacher-dashboard-shell/TeacherDashboardHeader.tsx`
- Modify: `src/components/TeacherDashboard/teacher-dashboard-shell/types.ts`

- [ ] Viết test thất bại cho header mobile có nút mở menu và layout không render bottom navigation.
- [ ] Chạy `npm run test:run -- tests/TeacherDashboardShell.test.tsx` và xác nhận fail đúng lý do.
- [ ] Truyền `setIsMobileMenuOpen` vào header, thêm menu trigger và bỏ bottom navigation.
- [ ] Đổi shell sang nền warm, spacing responsive và width sidebar mới.
- [ ] Chạy lại test shell.

### Task 2: Thiết kế lại sidebar và top account menu

**Files:**
- Modify: `src/components/TeacherDashboard/Sidebar.tsx`
- Modify: `src/components/TeacherDashboard/teacher-dashboard-shell/TeacherAccountMenu.tsx`
- Test: `tests/TeacherDashboardShell.test.tsx`

- [ ] Bổ sung assertions cho nhãn/active state và drawer accessibility nếu cần.
- [ ] Chuyển sidebar sang surface phẳng, radius 10px, active sky-blue và bỏ shadow/backdrop gradient.
- [ ] Chuyển account avatar/menu sang solid color, border mảnh và shadow chỉ dành cho dropdown nổi.
- [ ] Chạy test shell.

### Task 3: Thiết kế lại overview hero, quick actions và metric grid

**Files:**
- Modify: `tests/TeacherOverview.test.tsx`
- Modify: `src/components/TeacherDashboard/overview/DashboardHero.tsx`
- Modify: `src/components/TeacherDashboard/overview/QuickActionGrid.tsx`
- Modify: `src/components/TeacherDashboard/overview/MetricGrid.tsx`
- Modify: `src/components/TeacherDashboard/OverviewTab.tsx`

- [ ] Thay test style cũ bằng assertions Warm Refined: nền/card phẳng, radius 14px, không gradient/hover lift.
- [ ] Chạy test overview và xác nhận fail.
- [ ] Sửa hero thành card compact, action rõ và stats bên phải/3 cột mobile.
- [ ] Sửa quick actions thành grid 2 cột mobile, 3 cột desktop, card phẳng.
- [ ] Sửa metric cards phẳng và giảm decoration.
- [ ] Chạy lại test overview.

### Task 4: Thiết kế lại analysis, submissions và recent quizzes

**Files:**
- Modify: `src/components/TeacherDashboard/overview/PerformancePanel.tsx`
- Modify: `src/components/TeacherDashboard/overview/RecentSubmissionsPanel.tsx`
- Modify: `src/components/TeacherDashboard/overview/RecentQuizzesPanel.tsx`
- Modify: `tests/TeacherOverview.test.tsx`

- [ ] Thêm test cho heading và các action/list contract vẫn tồn tại.
- [ ] Chạy test để khóa trạng thái trước khi sửa.
- [ ] Chuyển các panel sang card 14px, border mảnh, không shadow.
- [ ] Giữ chart semantics, score badges, loading/empty/error và table/list responsive.
- [ ] Chạy lại test overview.

### Task 5: Xác minh toàn bộ

**Files:**
- Review all changed files.

- [ ] Chạy targeted tests.
- [ ] Chạy full `npm run test:run`.
- [ ] Chạy `npm run build:frontend`.
- [ ] Quét secret trên changed files.
- [ ] Review diff và kiểm tra không có thay đổi logic.
- [ ] Hoàn nguyên `public/sitemap.xml` nếu chỉ sinh bởi build.
- [ ] Báo cáo trạng thái nhánh; không tự merge/deploy nếu chưa được yêu cầu.
