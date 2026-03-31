# Audit Report - 2026-03-31

## Summary
- 🔴 Critical Issues: 0
- 🟡 Warnings: 1
- 🟢 Suggestions: 1

---

## 🟡 Warnings (Nên sửa)

### 1. Nguy cơ XSS từ `dangerouslySetInnerHTML`
Hệ thống sử dụng thuộc tính này khá nhiều để hiển thị câu hỏi và LaTeX (VD: `QuestionRenderer.tsx`, `IoeStudentView.tsx`).
- **Nguy hiểm**: Nếu dữ liệu từ AI hoặc từ Notion chứa mã độc (JavaScript), hacker có thể đánh cắp thông tin đăng nhập hoặc chiếm quyền điều khiển tài khoản của người dùng.
- **Cách sửa**: Đảm bảo mọi nội dung trước khi đưa vào hàm này đều đi qua một bộ lọc (Sanitizer) như `DOMPurify`.
- **Triệu chứng**: Thấy trong file `src/utils/formatters.ts` có hàm hỗ trợ sanitize nhưng cần kiểm tra xem đã áp dụng triệt để chưa.

---

## 🟢 Suggestions (Tùy chọn)

### 1. Tập trung hóa cấu hình API
Hiện tại các URL API nằm rải rác trong các file service. Nên tập trung hết vào `src/config/constants.ts` để dễ quản lý khi chuyển giữa Staging và Production.

---

## 🩺 Phác đồ điều trị (Next Steps)
Hệ thống hiện tại khá sạch sẽ, không thấy dấu hiệu rò rỉ API Key trong code. Vấn đề duy nhất là cần "tiêm phòng" XSS cho các phần hiển thị nội dung câu hỏi.
