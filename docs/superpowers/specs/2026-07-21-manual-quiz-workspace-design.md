# Phòng soạn đề thủ công — Đặc tả thiết kế

**Ngày:** 2026-07-21  
**Trạng thái:** Đã chốt hướng sản phẩm để lập kế hoạch triển khai  
**Phạm vi:** Luồng tạo và chỉnh sửa đề thủ công dành cho giáo viên iTongQuiz

## 1. Mục tiêu

Thay luồng tạo đề thủ công đang nằm trong khung xem trước 50/50 bằng một trang làm việc toàn màn hình, giúp giáo viên có thể soạn 20–40 câu trong thời gian dài mà không phải thao tác qua nhiều modal nhỏ.

Kết quả cần đạt:

- Bấm **Tạo đề thủ công** mở route riêng.
- Desktop dùng bố cục ba cột: danh sách câu, trình soạn, xem trước học sinh.
- Tablet dùng hai cột; xem trước mở theo drawer.
- Tự động lưu cục bộ và đồng bộ bản nháp lên máy chủ.
- Chèn công thức toán bằng thao tác trực quan; LaTeX là chi tiết triển khai, không phải kiến thức bắt buộc của giáo viên.
- Kiểm tra toàn đề trước khi xuất bản với lỗi, cảnh báo và hành động sửa cụ thể.
- Duy trì tương thích với các loại câu hỏi, kho câu hỏi và API lưu đề hiện có.

## 2. Bằng chứng từ giao diện hiện tại

Luồng hiện tại có các giới hạn trực tiếp ảnh hưởng đến giáo viên:

- `src/components/TeacherDashboard/CreateTab.tsx` chia màn hình `lg:grid-cols-2`, phù hợp với tạo đề AI nhưng không đủ rộng để nhập thủ công.
- `src/components/TeacherDashboard/quiz-preview/QuestionList.tsx` giới hạn danh sách ở `max-h-[500px]`, tạo cuộn lồng.
- `EditorOverlay.tsx` tạo một overlay, trong khi `QuestionEditorModal.tsx` lại tự tạo backdrop và modal thứ hai.
- Thêm câu dạng khác phải mở modal chọn loại rồi mới mở editor.
- Toolbar toán trong `editors/shared.tsx` chỉ hiện bằng `group-focus-within`, nút nhỏ và vẫn phơi bày cú pháp LaTeX.
- `useQuizPersistence.ts` mới kiểm tra khối lớp trước khi lưu, chưa kiểm tra tính hoàn chỉnh của toàn đề.
- Dữ liệu câu hỏi chưa có trường điểm thống nhất trong `QuestionMetadata` và bảng `questions`.

## 3. Thiết kế Stitch

**Project:** `8501560917177296672`  
**Design system:** Warm Human Education — `assets/3475f4f9d3ee4df2b5c34f875ccea3dd`

Các màn hình đã tạo:

1. **Desktop — Phòng soạn đề thủ công**  
   Screen: `abf3ed58606f4b16aceb0485e948dd0f`
2. **Desktop — Kiểm tra trước khi xuất bản**  
   Screen: `07bc575572c14221a8e2622e448461bc`
3. **Tablet — Phòng soạn đề thủ công**  
   Screen: `2d09ce7561ed4a23a411735e0af67479`

Trạng thái bàn phím công thức đã được đặc tả trong tài liệu này; lượt tạo màn hình riêng bị timeout phía Stitch nên không tạo yêu cầu trùng.

## 4. Kiến trúc trải nghiệm

### 4.1 Route

- Tạo mới: `/teacher/quizzes/manual/new`
- Sửa đề: `/teacher/quizzes/manual/:quizId/edit`

Route chỉ dành cho tài khoản giáo viên hoặc admin đã đăng nhập. Khi mở route tạo mới, thông tin cơ bản từ tab Tạo đề được truyền qua navigation state nếu có. Khi mở route chỉnh sửa, workspace tải đề theo `quizId` và kiểm tra quyền sở hữu như API hiện tại.

### 4.2 Bố cục desktop

#### Header sticky

- Quay lại.
- Tên đề sửa trực tiếp.
- Trạng thái autosave: đang lưu, đã lưu, mất kết nối, có xung đột.
- Thiết lập đề.
- Xem trước.
- Lưu bản nháp.
- Kiểm tra và xuất bản.

#### Cột trái: điều hướng câu hỏi

- Rộng 280px.
- Tìm theo số câu hoặc nội dung.
- Card compact có số câu, loại, nội dung rút gọn, điểm và trạng thái.
- Kéo thả đổi thứ tự.
- Nhân bản, xóa có hoàn tác, đánh dấu cần xem lại.
- Thêm nhanh bốn dạng phổ biến bằng một lần bấm.
- Mở bộ chọn dạng khác hoặc kho câu hỏi.

#### Cột giữa: trình soạn

- Khu vực lớn nhất, tối thiểu 650px.
- Editor inline, không modal.
- Loại câu hỏi, độ khó, điểm.
- Nội dung câu hỏi.
- Công thức toán.
- Dữ liệu riêng theo từng loại câu.
- Lời giải cho giáo viên/học sinh.
- Ảnh minh họa bằng tải file, kéo thả hoặc dán clipboard.
- Lưu câu và chuyển câu tiếp theo.

#### Cột phải: xem trước học sinh

- Rộng 360–400px.
- Render bằng chính các component câu hỏi đang dùng cho học sinh hoặc một adapter chung, tránh tạo renderer thứ hai.
- Chuyển desktop/mobile.
- Kiểm tra nhanh nội dung, đáp án, công thức, điểm.
- Có thể thu gọn để vào chế độ tập trung.

#### Thanh trạng thái dưới

- Tổng số câu.
- Tổng điểm/điểm mục tiêu.
- Số lỗi bắt buộc.
- Số cảnh báo.
- Hành động xem lỗi.

### 4.3 Tablet

- Cột danh sách 220–240px + vùng soạn.
- Không giữ preview cố định; mở drawer từ phải.
- Toolbar toán cuộn ngang, touch target tối thiểu 44px.
- Bottom action bar sticky.

### 4.4 Mobile

Mobile không phải thiết bị chính để tạo một đề dài, nhưng phải hỗ trợ chỉnh sửa khẩn cấp:

- Một cột.
- Segmented navigation: Danh sách câu / Soạn / Xem trước.
- Bottom action bar.
- Không mở ba cột hoặc modal rộng.

## 5. Trình công thức toán trực quan

### 5.1 Nguyên tắc

- Giáo viên không cần biết LaTeX.
- Mã LaTeX mặc định bị ẩn.
- Mỗi thao tác chèn phải giữ đúng vị trí con trỏ và vùng bôi đen.
- Preview cập nhật tức thời.
- Lỗi công thức hiển thị cạnh trường nhập bằng ngôn ngữ dễ hiểu.

### 5.2 Nhóm công cụ

- **Cơ bản:** cộng, trừ, nhân, chia, bằng, khác, nhỏ hơn, lớn hơn, nhỏ hơn hoặc bằng, lớn hơn hoặc bằng.
- **Phân số và số học:** phân số, hỗn số, căn, mũ, chỉ số dưới, phần trăm, giá trị tuyệt đối.
- **Hình học:** góc, độ, đoạn thẳng, tia, tam giác, song song, vuông góc, cm², cm³.
- **Ký hiệu:** π, xấp xỉ, vô cực, thuộc, không thuộc, hợp, giao, mũi tên.
- **Mẫu tiểu học:** phép tính có ô trống, phân số cộng/trừ, chu vi, diện tích, góc, đơn vị đo.

### 5.3 Hộp nhập trực quan

Ví dụ khi chọn phân số:

- Ô Tử số.
- Ô Mẫu số.
- Preview lớn.
- Nút Chèn vào câu hỏi.
- Toggle Hiện mã LaTeX nâng cao, mặc định tắt.
- Danh sách công thức vừa dùng.

Các hộp tương tự được dùng cho hỗn số, lũy thừa, căn bậc n và các mẫu hình học.

## 6. Autosave và phục hồi

Sử dụng hai tầng:

1. **Local autosave:** ghi bản nháp có version sau 500–800ms không nhập để chống mất dữ liệu khi reload/mất mạng.
2. **Remote autosave:** đồng bộ sau khoảng 2 giây không nhập, có revision để phát hiện xung đột nhiều tab hoặc nhiều thiết bị.

Trạng thái:

- `idle`
- `saving-local`
- `saving-remote`
- `saved`
- `offline`
- `conflict`
- `error`

Bản nháp không chứa `File`, object URL hoặc base64 lớn. Ảnh phải được upload trước khi đưa URL vào draft.

Khi mở lại:

- Nếu chỉ có local draft mới hơn: đề nghị Tiếp tục hoặc Bỏ bản nháp.
- Nếu remote draft mới hơn: tải remote.
- Nếu hai bản cùng thay đổi: hiển thị thời gian, thiết bị và cho chọn bản; không tự ghi đè.

## 7. Kiểm tra trước xuất bản

### Lỗi bắt buộc

- Chưa có tên đề.
- Chưa có khối lớp.
- Không có câu hỏi.
- Nội dung câu hỏi rỗng.
- Thiếu dữ liệu bắt buộc theo loại câu.
- Trắc nghiệm chưa chọn đáp án đúng.
- Đáp án đúng không còn tồn tại sau khi xóa hoặc đổi thứ tự.
- Phương án trùng nhau sau khi chuẩn hóa khoảng trắng/chữ hoa thường.
- Công thức toán không hợp lệ.
- Điểm câu không phải số dương.
- Ảnh đang upload hoặc upload lỗi.

### Cảnh báo có thể bỏ qua

- Tổng điểm khác điểm mục tiêu.
- Thời gian có thể quá ngắn hoặc quá dài.
- Tất cả câu cùng một độ khó.
- Câu chưa có lời giải.
- Đề có quá nhiều câu cùng một dạng.

Mỗi vấn đề phải có:

- Mã ổn định.
- `severity`.
- `questionId` nếu liên quan đến câu.
- Thông báo tiếng Việt.
- Hành động sửa cụ thể.

## 8. Điểm và chấm bài

- Thêm `points?: number` vào metadata câu hỏi.
- Đề có `targetPoints`, mặc định 10.
- Có hành động chia đều điểm và chia phần điểm còn thiếu.
- Khi học sinh nộp, điểm hiện tại vẫn chuẩn hóa về thang 10 để không phá báo cáo cũ.
- Nếu tất cả câu không có `points`, hệ thống dùng cách tính đều như hiện tại.
- Nếu có ít nhất một câu có `points`, tất cả câu phải có điểm trước khi xuất bản.

## 9. Thao tác tăng tốc

- Kéo thả câu hỏi bằng `@dnd-kit` đã có sẵn.
- Nhân bản câu.
- Xóa với nút Hoàn tác.
- Di chuyển lên/xuống bằng bàn phím.
- Lưu vào kho.
- Chèn từ kho bằng drawer.
- Chọn nhiều câu để đổi độ khó, điểm, xóa hoặc lưu vào kho.
- Import Excel/CSV theo mẫu chính thức.
- Import `.docx` bằng parser tách đoạn và bảng, sau đó đưa vào màn hình rà soát; không tự xuất bản.
- AI chỉ hỗ trợ tạo đáp án nhiễu, giải thích hoặc gợi ý độ khó; giáo viên vẫn xác nhận.

## 10. Cấu trúc component

```text
src/features/manual-quiz-workspace/
├── ManualQuizWorkspacePage.tsx
├── types/
│   └── manualQuizWorkspace.types.ts
├── store/
│   └── useManualQuizWorkspaceStore.ts
├── hooks/
│   ├── useManualQuizBootstrap.ts
│   ├── useManualQuizAutosave.ts
│   └── useWorkspaceKeyboardShortcuts.ts
├── draft/
│   ├── manualQuizDraftRepository.ts
│   └── manualQuizDraftSerializer.ts
├── validation/
│   ├── manualQuizValidation.ts
│   └── validationActions.ts
├── math-composer/
│   ├── MathComposerPanel.tsx
│   ├── StructuredFormulaDialog.tsx
│   ├── mathTemplates.ts
│   └── mathInsertion.ts
├── components/
│   ├── WorkspaceHeader.tsx
│   ├── QuestionNavigator.tsx
│   ├── QuestionNavigatorItem.tsx
│   ├── QuestionEditorPane.tsx
│   ├── StudentPreviewPane.tsx
│   ├── WorkspaceStatusBar.tsx
│   ├── QuestionTypePicker.tsx
│   ├── QuestionScoreControl.tsx
│   ├── PublishValidationDrawer.tsx
│   ├── MediaDropzone.tsx
│   └── DraftRecoveryDialog.tsx
└── import/
    ├── spreadsheetQuestionImporter.ts
    ├── docxQuestionImporter.ts
    └── QuestionImportReview.tsx
```

`QuestionEditorModal` được tách thành form dùng lại và wrapper modal. Workspace dùng form inline; luồng cũ tiếp tục dùng wrapper cho đến khi được chuyển hoàn toàn.

## 11. Quy tắc responsive và accessibility

- Touch target tối thiểu 44×44px.
- Có focus ring rõ ràng.
- Ba pane có heading và landmark.
- Drawer/modal quản lý focus và Escape.
- Không chỉ dùng màu để báo lỗi.
- Kéo thả luôn có nút lên/xuống thay thế.
- Keyboard shortcut không ghi đè shortcut trình duyệt.
- Hỗ trợ zoom 200% mà không mất hành động chính.

## 12. Tiêu chí thành công

- Giáo viên tạo đề 20 câu mà không mở modal lồng.
- Thêm dạng phổ biến bằng một lần bấm.
- Reload trang không mất bản nháp.
- Mất mạng vẫn tiếp tục soạn và đồng bộ lại khi có mạng.
- Chèn phân số mà không gõ LaTeX.
- Preview phản ánh nội dung trong vòng một render frame.
- Không thể xuất bản khi còn lỗi bắt buộc.
- Có thể sửa lỗi bằng hành động từ drawer kiểm tra.
- Desktop, tablet và mobile chỉnh sửa khẩn cấp đều sử dụng được.
