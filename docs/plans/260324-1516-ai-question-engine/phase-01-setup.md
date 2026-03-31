# Phase 01: Setup Environment
Status: ⬜ Pending | 🟡 In Progress | ✅ Complete
Dependencies: None

## Objective
Khởi tạo cấu trúc môi trường (Environment) và các packages cần thiết (nếu có) để bắt đầu xây dựng AI Question Engine.

## Requirements
### Functional
- Cài đặt Zod (nếu chưa có).
- Cài đặt AI SDK (Vercel AI SDK/OpenAI) nếu sử dụng AI Pipeline trực tiếp từ code.
- Thiết lập System Prompt mẫu trong DB hoặc File config tĩnh.

### Non-Functional
- Giữ vững cấu trúc thư mục hiện tại của Next.js app.

## Implementation Steps
1. [x] Check version của `zod`, `ai` trong `package.json`.
2. [x] Tạo file lưu trữ prompt: `src/lib/ai/prompts/math_generator_prompt.ts`.
3. [x] Khởi tạo thư mục `src/lib/ai/validators/` cho các schemas.

## Files to Create/Modify
- `package.json`
- `src/lib/ai/prompts/math_generator_prompt.ts`

## Test Criteria
- Compile không lỗi.
- Đọc xuất được biến toàn cục của Prompt.

---
Next Phase: [Phase 02: Zod Schema Design](phase-02-schema.md)
