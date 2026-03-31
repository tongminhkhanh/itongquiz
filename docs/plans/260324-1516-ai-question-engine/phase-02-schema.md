# Phase 02: Zod Schema Design
Status: ⬜ Pending | 🟡 In Progress | ✅ Complete
Dependencies: Phase 01

## Objective
Xây dựng lớp bảo vệ JSON bằng Zod Schema (Structured Object Generation), ép AI trả đúng chuẩn đầu ra.

## Requirements
### Functional
- Zod schema định nghĩa cấu trúc mảng `blanks` với các key bắt buộc `id`, `answer`.
- Zod schema định nghĩa mảng `options` nếu là Dropdown / Kéo thả.
- Tạo một field `thought_process` bọc ngoài cùng.

## Implementation Steps
1. [x] Khởi tạo file `src/lib/ai/validators/QuestionSchema.ts`.
2. [x] Định nghĩa `ZodObject` cho `Blank` và `QuestionGen`.
3. [x] Thiết lập Schema validation (sẽ được nhúng vào Endpoint sinh đề thay vì Vercel AI SDK do hệ thống đang dùng REST Native).

## Files to Create/Modify
- `src/lib/ai/validators/QuestionSchema.ts`

## Test Criteria
- Khởi chạy một Test Request, hứng kết quả từ AI, xác nhận Zod parse `success`.

---
Next Phase: [Phase 03: Backend Validator API](phase-03-backend.md)
