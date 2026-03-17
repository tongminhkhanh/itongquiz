# Plan: Thư viện Luyện Tập theo Chuyên đề (Practice Library)
Created: 2026-03-11T23:57:31+07:00
Status: 🟡 In Progress

## Overview
Chế độ Luyện tập Tự do nơi học sinh có thể chọn các Chuyên đề (được generate tự động từ #hashtag của bài tập) và làm một bài test mini gồm 10-15 câu được xáo trộn ngẫu nhiên từ kho dữ liệu. Giúp học sinh chủ động ôn tập và cày điểm mà không cần đợi giáo viên giao bài.

## Tech Stack
- Frontend: React + Tailwind + framer-motion (Subject & Topic Cards, TakeQuizUI)
- Backend: Cloudflare Workers (API endpoints)
- Database: Cloudflare D1 (SQL queries with RANDOM() and LIKE)

## 5. Các Mốc Triển Khai (Phases)

- [x] **Phase 01: Setup Database (Bảng `questions`)**
    - Mở rộng schema, viết migration script thêm cột `tags`.
    - *(Xem `phase-01-database.md`)*
    
- [x] **Phase 02: Backend API**
    - Viết API `/api/practice/topics` (Lấy danh sách thẻ).
    - Viết API `/api/practice` (Bốc random 10-15 câu theo hashtag trả về payload `Quiz` ảo).
    - *(Xem `phase-02-backend.md`)*

- [x] **Phase 03: Frontend UI**
    - Trang Thư viện môn học (Toán, Tiếng Việt,... dùng lại Icon/Màu từ Home).
    - Trang Thư viện Chuyến đề (Ngân hàng Tags).
    - *(Xem `phase-03-frontend.md`)*

- [x] **Phase 04: Integration**
    - Truyền flag `isPractice` vào TakeQuizUI.
    - Setup chế độ "TimeLimit = 0", không Auto-Submit.
    - Link module vào Student Dashboard.
    - *(Xem `phase-04-integration.md`)*

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
