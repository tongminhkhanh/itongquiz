# Phase 04: Frontend Drafts UI
Status: ⬜ Pending | 🟡 In Progress | ✅ Complete
Dependencies: Phase 03

## Objective
Tạo giao diện Xem nháp và chỉnh sửa nhanh cấu trúc (WYSIWYG Edit) cho Giáo viên trước khi duyệt xuất bản.

## Requirements
### Functional
- Component Modal chứa bản xem trước (Tái sử dụng `QuestionRenderer.tsx`).
- Có nút "Duyệt" và "Sinh lại" (Gọi lại API).
- Double-click để sửa text (Editable Mode).

## Implementation Steps
1. [ ] Tạo mới `QuestionAIPreview.tsx`.
2. [ ] Fetch câu hỏi từ API sinh tự động (trạng thái JSON In-memory, chưa lưu DB).
3. [ ] Hiển thị Button "Save" để call API thực hiện lệnh INSERT vào CSDL và gán vào bài kiểm tra.

## Files to Create/Modify
- `src/components/TeacherDashboard/QuestionAIPreview.tsx`

## Test Criteria
- Bấm Sinh bằng AI -> Hiển thị Modal Preview -> Sửa chữ -> Save -> Update vào DB thành công.

---
Next Phase: [Phase 05: Testing & Integration](phase-05-testing.md)
