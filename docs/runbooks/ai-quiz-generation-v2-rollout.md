# Runbook: AI Quiz Generation V2

## Mục tiêu

Triển khai có kiểm soát luồng tạo đề AI V2 gồm:

- ma trận số câu theo dạng và độ khó;
- phân biệt rõ đề thi và đề ôn tập;
- OCR theo trang, cho phép giáo viên chọn trang;
- tiến trình thật và hủy yêu cầu;
- schema Zod, kiểm tra blueprint, phát hiện câu gần trùng;
- tối đa một lần sửa có mục tiêu;
- hạn mức và idempotency được cưỡng chế tại Worker.

Feature flag frontend:

```env
VITE_FEATURE_AI_QUIZ_V2=false
```

Mặc định phải là `false`. Thay đổi flag cần build và deploy lại frontend.

## Điều kiện trước khi bật

1. Migration D1 `0037_create_ai_generation_actions.sql` đã áp dụng thành công.
2. Worker production đã có phiên bản kiểm tra quyền, workflow, quota và `actionId`.
3. `JWT_SECRET` và `CLIPROXY_TOKEN` tồn tại dưới dạng Cloudflare Worker secrets.
4. Test tập trung AI, toàn bộ Vitest, TypeScript, security scan và production build đều đạt.
5. Smoke test tài khoản giáo viên và admin đã đạt trên preview/staging.
6. Có người trực giám sát ít nhất 30 phút sau mỗi bước mở rộng rollout.

## Kiểm tra trước deploy

```bash
npx vitest run \
  tests/quizBlueprint.test.ts \
  tests/quizPromptBuilder.test.ts \
  tests/quizGenerationSchema.test.ts \
  tests/quizAudit.test.ts \
  tests/quizRepair.test.ts \
  tests/quizGenerationPipeline.test.ts \
  tests/quizGenerationWorkflow.test.tsx \
  tests/OcrPreviewSection.test.tsx \
  tests/GenerationProgressPanel.test.tsx \
  tests/utf8SourceGuard.test.ts

npm run test:run
npx tsc --noEmit
npm run security:scan
npm run build
```

Chạy Cypress với frontend được build/dev bằng flag V2:

```bash
set VITE_FEATURE_AI_QUIZ_V2=true
npm run dev -- --port 3001
npx cypress run --spec cypress/e2e/ai-quiz-generation-v2.cy.ts
```

PowerShell:

```powershell
$env:VITE_FEATURE_AI_QUIZ_V2='true'
npm run dev -- --port 3001
npx cypress run --spec cypress/e2e/ai-quiz-generation-v2.cy.ts
```

## Trình tự rollout

### Bước 0 — deploy code, giữ flag tắt

- Deploy Worker trước.
- Deploy frontend với `VITE_FEATURE_AI_QUIZ_V2=false`.
- Xác minh luồng cũ vẫn tạo được đề từ chủ đề và tài liệu.
- Xác minh gọi trực tiếp `/api/ai/chat` không có metadata bị từ chối.

Tiêu chí qua bước:

- không tăng lỗi 4xx/5xx bất thường;
- quota đọc đúng;
- luồng cũ không hồi quy.

### Bước 1 — preview/staging

Bật:

```env
VITE_FEATURE_AI_QUIZ_V2=true
```

Kiểm tra bằng ít nhất ba bộ dữ liệu:

1. Toán lớp 4, 10 câu, 4 dạng;
2. Tiếng Việt lớp 3, tài liệu 3 trang, bỏ chọn trang 2;
3. Tiếng Anh lớp 5, đề thi không gợi ý.

Với mỗi đề, xác nhận:

- tổng số câu đúng;
- phân bổ dạng câu đúng;
- phân bổ độ khó đúng;
- không có câu gần trùng;
- đáp án thuộc lựa chọn;
- lời giải tồn tại;
- nút hủy giữ nguyên biểu mẫu;
- reviewer lỗi vẫn giữ bản hợp lệ bằng mã;
- sinh lại một câu thành công tính một lượt mới.

### Bước 2 — nhóm nội bộ nhỏ

- Bật V2 cho môi trường/đợt deploy dành cho nhóm giáo viên thử nghiệm.
- Quy mô đề xuất: 5–10 giáo viên trong 1 ngày học.
- Không thay đổi hạn mức trong giai đoạn thử nghiệm.
- Thu thập lỗi bằng `actionId`; không ghi prompt, nội dung câu hỏi hoặc OCR vào log.

Tiêu chí mở rộng:

- không có truy cập trái quyền;
- không có trừ lượt trùng;
- tỷ lệ schema hợp lệ sau repair đạt mục tiêu;
- không có lỗi chặn lưu đề;
- phản hồi OCR/chọn trang hiểu được với giáo viên.

### Bước 3 — mở rộng 25% rồi 100%

Do flag hiện ở cấp build, triển khai theo từng môi trường hoặc nhóm phân phối frontend:

1. 25% giáo viên, theo dõi tối thiểu 30 phút và một phiên sử dụng thực tế;
2. 100% sau khi các chỉ số ổn định.

Không mở rộng nếu có lỗi P0/P1 hoặc tỷ lệ tạo đề thất bại tăng đáng kể so với baseline.

## Chỉ số cần theo dõi

Theo `actionId`, `workflow`, `stage`, provider và mã lỗi; tuyệt đối không log nội dung học sinh/giáo viên.

- số action `QUIZ_CREATE` bắt đầu, hoàn tất, hủy và thất bại;
- thời gian OCR, GENERATE, REPAIR, REVIEW;
- tỷ lệ cần REPAIR;
- tỷ lệ reviewer lỗi;
- tỷ lệ schema/audit không đạt sau một lần repair;
- số lỗi `QUOTA_EXCEEDED`, `ACTION_STAGE_INVALID`, `ACTION_STAGE_LIMIT_EXCEEDED`;
- số action bị hoàn lượt và chốt lượt;
- tỷ lệ 429/503/timeout;
- số lần giáo viên bỏ chọn trang OCR;
- số lần sinh lại một câu.

## Smoke test production

Dùng tài khoản giáo viên thử nghiệm:

1. Mở tab **Tạo đề mới**.
2. Xác nhận có **Dạng câu hỏi & ma trận** khi flag bật.
3. Chọn 10 câu, tổng dạng câu phải bằng 10.
4. Tải PDF ba trang.
5. Xác nhận trạng thái **Đang đọc tài liệu**.
6. Bỏ chọn một trang và tạo đề.
7. Xác nhận tiến trình GENERATE/REPAIR/REVIEW phản ánh đúng request thực tế.
8. Xác nhận đề có đúng 10 câu và nút **Lưu đề** hoạt động.
9. Hủy một request khác và kiểm tra dữ liệu biểu mẫu còn nguyên.
10. Sinh lại riêng một câu; xác nhận số lượt giảm đúng một khi thành công.

Dùng tài khoản học sinh:

1. Gọi UI tạo đề không được hiển thị.
2. Gọi trực tiếp `/api/ai/chat` phải bị từ chối.

## Rollback

### Rollback nhanh frontend

Đặt:

```env
VITE_FEATURE_AI_QUIZ_V2=false
```

Build và deploy lại frontend. Luồng cũ vẫn callable; không cần rollback dữ liệu D1.

### Khi nào rollback ngay

- học sinh hoặc người không đúng vai trò gọi AI thành công;
- một action bị trừ nhiều lượt;
- action thất bại vẫn bị chốt lượt;
- lỗi schema làm mất/sai đáp án;
- không thể lưu đề sau khi tạo;
- lỗi 5xx tăng mạnh hoặc Worker không ổn định;
- OCR gửi lại file ở stage GENERATE;
- phát hiện log chứa prompt, OCR hoặc nội dung câu hỏi.

### Rollback Worker

Chỉ rollback Worker nếu lỗi nằm ở backend và frontend flag tắt chưa đủ. Không xóa hai bảng quota/action. Giữ migration vì dữ liệu có thể cần phục vụ điều tra và phiên bản mới vẫn tương thích.

Thứ tự:

1. tắt frontend V2;
2. deploy lại Worker phiên bản ổn định gần nhất;
3. smoke test quyền/quota;
4. xác nhận action đang treo không tiếp tục bị chốt sai;
5. lập báo cáo sự cố trước khi bật lại.

## Xử lý sự cố thường gặp

### OCR xong nhưng không có trang

- kiểm tra response OCR có JSON đúng schema;
- kiểm tra `pages[].pageNumber` không trùng và `text` không rỗng;
- thử file rõ hơn;
- không tự chuyển sang tạo đề bằng nội dung rỗng.

### Ma trận không khớp

- dùng **AI tự cân đối**;
- tổng số câu theo dạng phải bằng tổng độ khó;
- không cho gửi request khi validation còn lỗi.

### Reviewer lỗi

- giữ bản đã qua schema và audit;
- không gọi reviewer lặp vô hạn;
- ghi mã lỗi và stage, không ghi nội dung đề.

### Repair vẫn không đạt

- dừng sau một lần repair;
- hiển thị lỗi rõ ràng để giáo viên thử lại;
- không cắt bớt hoặc tự bịa câu hỏi.

## Kết thúc rollout

Rollout được xem là hoàn tất khi:

- 100% nhóm mục tiêu dùng V2 ổn định;
- không có P0/P1 trong thời gian giám sát;
- quyền, quota và idempotency đạt yêu cầu;
- ba môn smoke test đạt;
- tài liệu hỗ trợ giáo viên và quy trình rollback đã được xác nhận.
