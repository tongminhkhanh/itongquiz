# Plan: Quản Lý Kho Đề Giáo Viên (Categorization & Tagging)
Created: 2026-03-11
Status: 🟡 In Progress

## Overview
Xây dựng tính năng quản lý Bài tập/Đề thi cho giáo viên với phương pháp Phân loại Phẳng (Flat Categorization). 
App bắt buộc giáo viên chọn 1 trong 6 môn chính (Toán, Tiếng Việt, Tự nhiên & Xã hội, Tiếng Anh, Tin học, IOE) khi tạo đề để đồng bộ hiển thị lên thẻ tương ứng bên giao diện màn hình Học Sinh. Đi kèm với đó là tuỳ chọn cho phép tự do nhập thêm Nhãn (Tags) bằng Hashtag để linh hoạt về quản trị nâng cao.

## Tech Stack
- Frontend: React (Vite) + Tailwind CSS + Framer Motion
- Backend: Cloudflare Workers
- Database: D1 (SQLite)

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Database Migration | ✅ Complete | 100% |
| 02 | Backend API | ✅ Complete | 100% |
| 03 | Teacher Dashboard UI | ✅ Complete | 100% |
| 04 | Create/Edit Quiz Modal | ✅ Complete | 100% |
| 05 | Testing & Search feature | 🟡 Next | 0% |

## Quick Commands
- Start Phase 1: `/code phase-01-database-migration.md`
- Check progress: `/next`
- Save context: `/save-brain`
