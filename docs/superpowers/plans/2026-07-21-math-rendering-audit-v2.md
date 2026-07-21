# Math Rendering Audit V2 — Implementation Plan

## Mục tiêu

Đảm bảo mọi nội dung có thể chứa công thức toán được hiển thị qua pipeline chuẩn của iTongQuiz, không còn chuỗi LaTeX thô hoặc công thức bị cắt giữa delimiter. Giữ nguyên dữ liệu, chấm điểm, điều hướng và API.

## Phạm vi

1. **Web học sinh**
   - Xem lại bài: câu hỏi, câu trả lời, đáp án đúng.
   - Bác sĩ Cú: chẩn đoán, lời giải, câu luyện tập, lựa chọn.
   - Mô tả bài tự luận.

2. **Web giáo viên / thi trực tiếp**
   - Câu khó và phân tích thời gian: không cắt chuỗi trước MathJax.
   - Phân tích câu hỏi: đáp án đúng và mẫu sai.
   - Ngân hàng câu hỏi và badge đáp án dropdown.
   - Nhận xét AI, chatbot và chat phòng chờ.

3. **Xuất dữ liệu**
   - PDF kết quả: chuyển LaTeX thành ký hiệu/toán tuyến tính đọc được trước khi đưa vào jsPDF.
   - DOCX phiếu bài tập: chuyển công thức hỗn hợp sang Office Math (OMML), gồm phân số, căn, chỉ số trên/dưới và toán tử phổ biến; fallback không để lộ delimiter LaTeX thô.

## Thứ tự TDD

1. Viết test thất bại cho renderer web ở từng nhóm.
2. Viết test parser công thức DOCX và PDF normalization.
3. Sửa tối thiểu bằng component chuẩn `MathSpan`, `NewlineMathText`, `ExplanationContent`.
4. Loại mọi `substring`/truncate trước khi render công thức; dùng CSS line clamp.
5. Bổ sung Office Math builder và thay các `TextRun` chứa LaTeX.
6. Chạy focused tests, toàn bộ Vitest, `tsc --noEmit`, build và Cypress math screenshots.
7. Security scan, diff review, commit trên nhánh `fix/math-rendering-audit-v2`.

## Tiêu chí hoàn thành

- Không còn công thức câu hỏi/đáp án/AI ở các đường đã audit được render trực tiếp như chuỗi thô.
- Không cắt công thức trước khi MathJax xử lý.
- DOCX không còn `$$`, `\frac`, `\sqrt` dưới dạng văn bản cho cú pháp được hỗ trợ.
- PDF kết quả không còn delimiter/command LaTeX thô cho công thức phổ biến.
- Không phát sinh XSS qua HTML/markdown.
- Tất cả tests, typecheck và build đạt.
