# 🏥 Báo Cáo Audit Toàn bộ Code Render - 14 Dạng Câu Hỏi
> Ngày: 2026-03-11 | Bác sĩ: Khang (Code Auditor)

## Tóm tắt
- 🔴 Critical: **2** lỗi
- 🟡 Warning: **3** lỗi
- 🟢 OK: Đã kiểm tra 6 file render

---

## Phạm vi kiểm tra (6 file)

| # | File | Vai trò | Dòng |
|---|------|--------|------|
| 1 | `QuestionRenderer.tsx` | Học sinh làm bài | 1036 |
| 2 | `StudentView.tsx` | Chấm điểm + sidebar | 993 |
| 3 | `DetailedAnswersTab.tsx` | Xem chi tiết kết quả | 856 |
| 4 | `StatisticsTab.tsx` | Thống kê đúng/sai | 310 |
| 5 | `AnswerCard.tsx` | Card hiển thị đáp án | 278 |
| 6 | `pdfExportService.ts` | Xuất PDF kết quả | 273 |

---

## 🔴 Critical #1: DRAG_DROP chấm sai ở StatisticsTab

- **File:** `StatisticsTab.tsx` → `checkCorrectness()` (dòng 80-91)
- **Triệu chứng:** Biểu đồ thống kê Đúng/Sai hiển thị sai cho câu Drag&Drop khi text rỗng
- **Nguyên nhân:** Thiếu fallback auto-generate text khi `text` rỗng (giống bug đã sửa ở StudentView)
- **Hệ quả:** Thống kê biểu đồ tròn/cột cho câu Drag&Drop text rỗng luôn hiện SAI dù học sinh làm ĐÚNG
- **Cách sửa:** Thêm fallback `if (!ddText.includes('[') && blanks.length > 0)` giống StudentView

---

## 🔴 Critical #2: DRAG_DROP chấm sai ở DetailedAnswersTab

- **File:** `DetailedAnswersTab.tsx` → `getAnswerStatus()` (dòng 114-127)
- **Triệu chứng:** Màn hình xem chi tiết kết quả hiển thị ✗ Sai cho câu Drag&Drop text rỗng dù đáp án đúng
- **Nguyên nhân:** Cùng bug — thiếu fallback auto-generate text
- **Hệ quả:** Học sinh thấy mình bị "Sai" nhưng thực ra đã đúng → hoang mang
- **Cách sửa:** Thêm fallback giống trên

---

## 🟡 Warning #1: StatisticsTab thiếu ERROR_CORRECTION

- **File:** `StatisticsTab.tsx` → `checkCorrectness()` (dòng 55-122)
- **Vấn đề:** Hàm xử lý 13/14 dạng, riêng ERROR_CORRECTION rơi vào `default: return false` → luôn hiện SAI trong thống kê
- **Cách sửa:** Thêm case ERROR_CORRECTION

---

## 🟡 Warning #2: pdfExportService thiếu 9 dạng mới

- **File:** `pdfExportService.ts` → `checkAnswer()` (dòng 249-273)
- **Vấn đề:** Chỉ hỗ trợ 5 dạng cũ (MCQ, SHORT_ANSWER, TRUE_FALSE, MATCHING, MULTIPLE_SELECT). Thiếu: DRAG_DROP, ORDERING, IMAGE_QUESTION, DROPDOWN, UNDERLINE, CATEGORIZATION, WORD_SCRAMBLE, RIDDLE, ERROR_CORRECTION
- **Hệ quả:** Xuất PDF kết quả → 9 dạng mới luôn bị đánh dấu SAI
- **Cách sửa:** Bổ sung case cho 9 dạng còn lại (hoặc tái sử dụng logic từ StatisticsTab)

---

## 🟡 Warning #3: IMAGE_QUESTION thiếu trong StatisticsTab

- **File:** `StatisticsTab.tsx` → `checkCorrectness()` (dòng 55-122)
- **Vấn đề:** Không có case cho IMAGE_QUESTION (giống MCQ nhưng thiếu) → rơi vào `default: false`
- **Cách sửa:** Thêm `case QuestionType.IMAGE_QUESTION: return answer === question.correctAnswer;`

---

## 🟢 Đã kiểm tra OK

| File | Kết quả |
|------|---------|
| `QuestionRenderer.tsx` | ✅ Đã sửa fallback DRAG_DROP + ORDERING useMemo |
| `StudentView.tsx` | ✅ Đã sửa 4 lỗi phiên trước |
| `AnswerCard.tsx` | ✅ formatStudentAnswer handle đủ 14 dạng |
| `DetailedAnswersTab.tsx` renderDetailedAnswer | ✅ UI render đủ 14 dạng |

---

## Phác Đồ Điều Trị

| # | Hạng mục | File | Độ khó |
|---|---------|------|--------|
| 1 | DRAG_DROP fallback trong StatisticsTab | `StatisticsTab.tsx:80` | ⭐ Dễ |
| 2 | DRAG_DROP fallback trong DetailedAnswersTab | `DetailedAnswersTab.tsx:114` | ⭐ Dễ |
| 3 | ERROR_CORRECTION + IMAGE_QUESTION trong StatisticsTab | `StatisticsTab.tsx:120` | ⭐ Dễ |
| 4 | Bổ sung 9 dạng vào pdfExportService | `pdfExportService.ts:249` | ⭐⭐ TB |
