# Phase 03: Backend Validator API
Status: ⬜ Pending | 🟡 In Progress | ✅ Complete
Dependencies: Phase 02

## Objective
Xây dựng lớp phòng ngự thứ 2 bằng code (thường dùng Regex) để bắt lỗi cú pháp cơ bản trước khi lưu vào DB hoặc trả về Frontend. Đảm bảo UI không bị crash khi render.

## Requirements
### Functional
- Viết Regex để kiểm tra số lượng ngoặc \$ chẵn/lẻ.
- Viết Regex để đảm bảo mọi ngoặc `{` đều có `}` trong khối MathJax.
- Quét các ký tự `[N]` để khớp với dữ liệu mảng.
- Bắn Regex Validator vào Endpoint hoặc luồng sinh đề.

## Implementation Steps
1. [x] Viết hàm `validateLatexSyntax(text: string)` kiểm tra số chẵn/lẻ của `$`.
2. [x] Viết hàm `validateBlankMapping(text: string, blanks: string[])` đảm bảo tất cả `[N]` trong text đều khớp với mảng ID của blanks.
3. [x] Cắm hàm Validator này vào luồng sinh đề (gemini.provider.ts).

## Files to Create/Modify
- `src/lib/ai/validators/latexValidator.ts`
- `src/app/api/...`

## Test Criteria
- Gửi một mock JSON lỗi (thiếu dấu `$`), Validator chặn thành công.
- Gửi một mock JSON đúng chuẩn, Validator cho phép pass.

---
Next Phase: [Phase 04: Frontend Drafts UI](phase-04-frontend.md)
