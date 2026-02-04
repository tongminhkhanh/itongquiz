# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [2026-02-04]
### Added
- **Loading UI**: Thêm trạng thái loading cho nút "Lưu đề" (CreateTab) và "Xóa đề" (ManageTab).
- **Pagination**: Phân trang danh sách câu hỏi trong StudentView (10 câu/trang).
- **ExplanationContent Component**: Component mới để render AI giải thích với Markdown processing và LaTeX formatting.

### Fixed
- **AI Explanation Rendering**: Sửa lỗi hiển thị ký tự thừa (###, x x) trong AI giải thích.
- **Math Formula Rendering**: Công thức phân số (1/2, 3/5) được render đẹp dạng LaTeX.
- **IOE Score**: Sửa lỗi hiển thị điểm "0/0" trong bài thi IOE (do sai URL GAS).
- **Difficulty Sorting**: Đảm bảo câu hỏi được sắp xếp theo mức độ khó (Mức 1 -> Mức 2 -> Mức 3).
- **Config**: Cập nhật biến môi trường `VITE_IOE_GOOGLE_SCRIPT_URL` chính xác.

### Changed
- Cải thiện AI prompt trong `aiTutorService.ts` để trả về format tốt hơn (bullet points, không Markdown headers).
- Refactor logic shuffle câu hỏi để giữ nguyên thứ tự mức độ khó.
