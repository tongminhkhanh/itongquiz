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
- **LaTeX Fix**: Sửa lỗi công thức toán học (`\frac`, `\times`) không hiển thị trong phần Hướng dẫn giải.
- **Edit Question Fix**: Sửa lỗi mất dữ liệu (đáp án, options, blanks...) khi chỉnh sửa câu hỏi cho **TẤT CẢ** các dạng (MCQ, DragDrop, Matching, Ordering...) do logic cũ phụ thuộc key existence.
- **GAS Grading Fix**: Sửa lỗi chấm điểm sai cho True/False (do lệch ID) và Matching (do sai Key) trong Google Apps Script.
- **GAS Optimization**: Tối ưu tốc độ Lưu/Cập nhật đề thi (Delete Batch) để tránh Timeout dẫn đến mất câu hỏi (sửa lỗi lệch tổng số câu hỏi).
- **Image Not Saved**: Sửa lỗi hình ảnh (IMAGE_QUESTION) không được lưu vào Google Sheets - thêm cột `image` vào GAS script.
- **IOE Score**: Sửa lỗi hiển thị điểm "0/0" trong bài thi IOE (do sai URL GAS).
- **Difficulty Sorting**: Đảm bảo câu hỏi được sắp xếp theo mức độ khó (Mức 1 -> Mức 2 -> Mức 3).
- **Config**: Cập nhật biến môi trường `VITE_IOE_GOOGLE_SCRIPT_URL` chính xác.

### Changed
- Cải thiện AI prompt trong `aiTutorService.ts` để trả về format tốt hơn (bullet points, không Markdown headers).
- Refactor logic shuffle câu hỏi để giữ nguyên thứ tự mức độ khó.
