# 🏥 Audit Report: Virtual Classroom Implementation Plan
**Date:** 2026-02-11
**Auditor:** Antigravity Code Auditor (Khang)

## 📊 Summary
- 🔴 **Critical Issues:** 1 (Security)
- 🟡 **Warnings:** 3 (Data Integrity, Privacy, Performance)
- 🟢 **Suggestions:** 2 (UX, Scalability)

---

## 🔴 Critical Issues (Phải sửa ngay)

### 1. Plaintext Password Storage
- **Vị trí:** `implementation_plan.md` > Section 1.B & 3 (Phase 1)
- **Mô tả:** Plan đề xuất lưu mật khẩu dạng plaintext trong Google Sheet: `Password lưu plaintext (vì đối tượng là HS tiểu học...)`.
- **Tại sao nguy hiểm:**
  - Bất kỳ ai có quyền View Sheet đều thấy mật khẩu của **tất cả** học sinh.
  - Giáo viên có thể vô tình chia sẻ màn hình/file làm lộ thông tin.
  - Vi phạm nguyên tắc bảo mật cơ bản nhất.
- **✅ Giải pháp:**
  - Dùng **MD5** hoặc **SHA256** đơn giản để hash trước khi lưu.
  - Khi Reset password -> Generate random string -> Hash -> Lưu hash vào DB -> Gửi string gốc cho GV/HS.
  - **Lợi ích:** Vẫn dễ reset, nhưng an toàn hơn nhiều.

---

## 🟡 Warnings (Nên cân nhắc)

### 1. Username Collision (Trùng tên đăng nhập)
- **Vị trí:** `implementation_plan.md` > Section 1.B
- **Mô tả:** `username` dựa trên tên + lớp (VD: `student.demo.5a`).
- **Rủi ro:**
  - Năm sau lên lớp 6A, username `student.demo.5a` thành vô nghĩa hoặc trùng với em lớp 5 mới lên.
  - Lớp 5A có 2 em "Hoc Sinh Mau" -> `student.demo.5a` bị trùng.
- **✅ Giải pháp:**
  - Thêm suffix số tự động: `an.nguyen.123`.
  - Hoặc dùng Mã học sinh (Student ID) làm username nếu trường có sẵn.

### 2. Concurrency Issues (Xung đột dữ liệu)
- **Vị trí:** Google Apps Script Backend
- **Mô tả:** Google Sheets không phải database chuyên dụng. Nếu 30 học sinh nộp bài cùng lúc, có thể dẫn đến **Race Condition** (ghi đè dữ liệu).
- **✅ Giải pháp:**
  - Sử dụng `LockService` trong Google Apps Script cho các hàm ghi (submit bài, tạo assignment).

### 3. PII Leak (Lộ thông tin phụ huynh)
- **Vị trí:** Column `parent_phone`
- **Mô tả:** Lưu SĐT phụ huynh chung với bảng Students.
- **Rủi ro:** Check quyền kỹ lưỡng. API `get_students` cho học sinh có trả về `parent_phone` không? Nếu có -> Lộ data.
- **✅ Giải pháp:**
  - Chỉ trả về `parent_phone` cho **Teacher Role**.
  - Tách bảng hoặc field này ra khỏi response mặc định của student api.

---

## 🟢 Suggestions (Tối ưu)

### 1. Assignment Status Automation
- Thêm logic tự động chuyển status `OPEN` -> `CLOSED` khi qua deadline tại server-side (hoặc check khi request) để tránh học sinh nộp muộn mà hệ thống vẫn nhận.

### 2. Client-side Caching
- Plan đã nhắc đến caching. Recommend dùng **React Query** (TanStack Query) hoặc **SWR** để quản lý cache + revalidation tốt hơn là tự viết logic localStorage thủ công.
