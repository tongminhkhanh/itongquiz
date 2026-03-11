# Plan: Thiết kế lại Trang Chủ & Đăng Nhập
Created: 2026-03-11
Status: 🟡 In Progress

## Overview
Dự án ÍtOngQuiz cần một bước chuyển mình về mặt giao diện (UI) để trở thành một nền tảng SaaS EdTech tối giản, thanh lịch, thân thiện và tạo cảm giác "Ngôi trường trên mây" (Cloud School).

Kế hoạch này sẽ tập trung bóc tách `HomePage.tsx` khổng lồ hiện tại thành các Component chuyên biệt:
1. **Landing Page (Đăng nhập 2 cột)**
   - Cột trái: Giới thiệu (Gradient cao cấp, Vector 3D, Typography lớn).
   - Cột phải: Form Đăng nhập Đăng ký (Giáo viên / Học sinh, bo góc, hiệu ứng nổi).

2. **Student Dashboard (Bảng điều khiển Học sinh)**
   - Navbar ngang: Logo, Info học sinh, Số Sao/Xu.
   - Nội dung chính: Lời chào (Xin chào Ong Vàng!), Nhiệm vụ hôm nay (Quests), và Thư viện thi (Toán, Tiếng Việt, IOE).

## Tech Stack
- Frontend: React (Vite) + Tailwind CSS + Lucide Icons + Radix UI (nếu cần).
- State: Zustand (đã có sẵn `authStore`, `quizStore`).
- Data: Lấy từ LocalStorage / API mock.

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Landing & Login Page | ✅ Complete | 100% |
| 02 | Premium Student Dashboard | ✅ Complete | 100% |
| 03 | System Integration (Routing) | ✅ Complete | 100% |

## Quick Commands
- Chạy Phase 1: `/code phase-01`
- Gửi báo cáo xem trước UI: `/visualize`
- Cập nhật tiến độ: `/next`
