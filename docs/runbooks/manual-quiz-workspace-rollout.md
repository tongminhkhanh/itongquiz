# Runbook rollout Phòng soạn đề thủ công

## Mục tiêu

Triển khai Phòng soạn đề thủ công mới có kiểm soát, theo dõi chất lượng autosave/publish và có thể quay về trình soạn cũ mà không xóa bản nháp hoặc dữ liệu đề đã xuất bản.

## Feature flag

Biến môi trường frontend:

```text
VITE_FEATURE_MANUAL_QUIZ_WORKSPACE_V1=true|false
```

- `true`: nút **Tạo đề thủ công** mở route toàn màn hình `/teacher/quizzes/manual/new`.
- `false`: nút này dùng trình soạn thủ công cũ trong `QuizPreview`; truy cập trực tiếp route workspace sẽ quay về trang chính.
- Không xóa migration `quiz_drafts`, `points`, `explanation` hoặc `image_alt` khi rollback. Đây là dữ liệu tương thích ngược và cần giữ để bật lại tính năng.

## Điều kiện trước rollout

1. Chạy migration D1 tới `0035_add_question_image_alt.sql` trên môi trường đích.
2. Chạy toàn bộ test, TypeScript, production build, security scan và E2E workspace.
3. Xác nhận các API sau trả về đúng với session giáo viên:
   - `PUT /api/quiz-drafts/:draftId`
   - `DELETE /api/quiz-drafts/:draftId`
   - `POST /api/quizzes`
4. Xác nhận dashboard analytics nhận các event `manual_quiz_*` nhưng không có tiêu đề, nội dung câu hỏi, đáp án, username hoặc ID đề.
5. Chụp và xem bốn viewport: 390×844, 768×1024, 1024×768, 1440×900.

## Các giai đoạn bật tính năng

### Giai đoạn 0 — nội bộ

- Flag bật ở preview/staging.
- 5–10 giáo viên nội bộ dùng ít nhất một ngày.
- Kiểm tra tạo mới, khôi phục reload, offline/reconnect, xung đột hai tab và publish.

### Giai đoạn 1 — 5%

- Bật flag cho nhóm canary hoặc một deployment riêng chiếm khoảng 5% traffic giáo viên.
- Theo dõi tối thiểu một ngày học.
- Dừng mở rộng nếu có bất kỳ mất draft tái hiện được.

### Giai đoạn 2 — 25%

- Mở rộng sau khi tỷ lệ lỗi nằm trong ngưỡng.
- So sánh publish success và thời gian hoàn tất đề với luồng cũ.

### Giai đoạn 3 — 50%

- Kiểm tra tải cao vào khung giờ giáo viên soạn bài.
- Rà soát conflict và remote-save latency theo trình duyệt/thiết bị.

### Giai đoạn 4 — 100%

- Bật flag cho toàn bộ production.
- Giữ khả năng rollback bằng flag ít nhất hai phiên bản phát hành.

## Chỉ số và ngưỡng dừng

Các event privacy-safe:

- `manual_quiz_workspace_opened`
- `manual_quiz_draft_save_succeeded`
- `manual_quiz_draft_save_failed`
- `manual_quiz_conflict_detected`
- `manual_quiz_validation_failed`
- `manual_quiz_publish_succeeded`
- `manual_quiz_publish_failed`

Ngưỡng dừng rollout đề xuất:

- Local save failure > 0,5% phiên có chỉnh sửa.
- Remote save failure > 2% lần đồng bộ trong 15 phút liên tiếp.
- Publish failure > 1% lần bấm publish, không tính validation bị chặn.
- Conflict > 3% phiên, hoặc conflict tăng gấp đôi so với giai đoạn trước.
- P95 remote save latency > 3 giây trong 15 phút.
- Bất kỳ báo cáo mất nội dung sau reload/offline.

Telemetry chỉ được gửi các trường tổng hợp: mode, save target, outcome, duration, question count, issue count, online, error code đã chuẩn hóa và conflict kind.

## Kiểm tra D1 và draft

Trước và sau mỗi giai đoạn:

```sql
SELECT COUNT(*) AS total_drafts,
       COUNT(DISTINCT owner_username) AS teachers,
       MIN(updated_at) AS oldest_update,
       MAX(updated_at) AS newest_update
FROM quiz_drafts;
```

Tìm draft cập nhật nhiều nhưng không tăng revision:

```sql
SELECT id, owner_username, revision, updated_at
FROM quiz_drafts
ORDER BY updated_at DESC
LIMIT 50;
```

Kiểm tra draft hết hạn chỉ theo policy đã phê duyệt; không xóa hàng loạt trong lúc rollout hoặc rollback.

## Quy trình rollback

1. Đặt `VITE_FEATURE_MANUAL_QUIZ_WORKSPACE_V1=false`.
2. Build và deploy lại frontend.
3. Smoke test:
   - Nút thủ công mở `QuizPreview` cũ.
   - Route `/teacher/quizzes/manual/new` quay về `/`.
   - Danh sách đề đã publish vẫn hiển thị.
4. **Không** rollback/xóa các migration D1 liên quan.
5. **Không** xóa `quiz_drafts` hoặc localStorage draft của người dùng.
6. Lưu mốc thời gian rollback và so sánh telemetry trước/sau.
7. Khi sửa xong, bật lại từ giai đoạn 5%, không bật thẳng 100%.

Rollback frontend không làm mất dữ liệu:

- Đề đã publish nằm trong bảng canonical quizzes/questions và trình cũ vẫn đọc được.
- Remote draft vẫn nằm trong `quiz_drafts`.
- Local draft vẫn nằm dưới key `itongquiz:manual-draft:v1:*`.
- Khi bật lại flag, workspace tiếp tục hiển thị hộp khôi phục draft.

## Smoke test sau deploy

1. Đăng nhập giáo viên và mở Tạo đề → Tạo đề thủ công.
2. Nhập tiêu đề, thêm một MCQ, chọn đáp án, đặt tổng 10 điểm.
3. Xác nhận trạng thái **Đã tự động lưu**.
4. Reload và chọn **Tiếp tục soạn**.
5. Chuyển offline, sửa tiêu đề, xác nhận **Ngoại tuyến – đã lưu trên thiết bị**.
6. Chuyển online và xác nhận đồng bộ thành công.
7. Mở **Kiểm tra và xuất bản**, sửa mọi lỗi và publish.
8. Xác nhận draft local/remote được dọn sau canonical save thành công.
9. Lặp lại ở mobile 390 px và tablet 768 px, kiểm tra không có scroll ngang.

## Xử lý sự cố

- **Local save failure:** kiểm tra quota, blob/data URL chưa upload và private browsing; không yêu cầu giáo viên reload trước khi sao chép nội dung cần thiết.
- **Remote save failure:** local draft vẫn là lớp an toàn; kiểm tra session, mạng và Worker logs.
- **Conflict:** giáo viên chọn giữ bản thiết bị hoặc bản hệ thống; không tự merge đáp án/correct answer.
- **Publish failure:** giữ nguyên local/remote draft; chỉ cleanup sau canonical save thành công.
- **Telemetry bất thường:** tắt flag nếu có nguy cơ mất dữ liệu, sau đó phân tích theo error code tổng hợp, không thu nội dung đề.
