# Plan: Student Accounts & Gamification (Avatar/Pet)

**Created:** 17/02/2026
**Status:** 🟡 Chưa bắt đầu
**Backup:** Branch `backup/before-gamification` đã push lên GitHub

---

## Overview
Xây dựng hệ thống **Tài khoản học sinh** kết hợp **Nuôi thú cưng** (Gamification).
Học sinh đăng nhập → Làm bài → Nhận EXP/Vàng → Pet lên cấp/mua đồ.

## Tech Stack
- **Frontend:** React + TypeScript + TailwindCSS (có sẵn)
- **Backend:** Google Apps Script (có sẵn)
- **Database:** Google Sheets (thêm 3 Sheet mới)
- **State:** Zustand (có sẵn)
- **Animation:** Framer Motion (có sẵn)

## Phases

| Phase | Tên | Trạng thái | Tasks | Ước tính |
|-------|-----|------------|-------|----------|
| 01 | Backend & Database | ⬜ Chưa | 6 tasks | 1 session |
| 02 | Frontend Auth | ⬜ Chưa | 5 tasks | 1 session |
| 03 | Gamification UI | ⬜ Chưa | 6 tasks | 2 sessions |
| 04 | Integration & Polish | ⬜ Chưa | 5 tasks | 1 session |

**Tổng:** 22 tasks | Ước tính: 5 sessions

## Quick Commands
- Bắt đầu Phase 1: `/code phase-01`
- Xem tiến độ: `/next`
- Rollback nếu hỏng: `git checkout backup/before-gamification`
