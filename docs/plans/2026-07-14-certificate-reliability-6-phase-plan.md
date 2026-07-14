# Kế hoạch ổn định hệ thống cấp giấy chứng nhận — 6 giai đoạn

**Ngày lập:** 14/07/2026  
**Mục tiêu:** Đưa luồng Admin tạo mẫu → Giáo viên cấp → Queue render → Học sinh nhận/xem/tải về trạng thái an toàn để triển khai production.  
**Nguyên tắc:** Mỗi giai đoạn chỉ được đóng khi đạt đủ test gate; migration production chỉ thực hiện ở Giai đoạn 6.

## Phạm vi và quyết định kiến trúc

- Một API contract dùng chung cho frontend và Worker.
- Một schema canonical; loại bỏ cặp trường trùng nghĩa `custom_note/message`, `render_status/status`, `png_url/image_url`.
- Metadata học sinh và kết quả được suy ra ở server; frontend chỉ gửi định danh.
- Batch xử lý bất đồng bộ qua Cloudflare Queue, có retry và idempotency.
- Mặc định ảnh chứng nhận không được coi là public vĩnh viễn; quyền truy cập và chia sẻ được tách riêng.

## Trạng thái canonical

- Batch: `pending | processing | sent | partial | failed`.
- Certificate: `pending | processing | sent | failed | revoked`.

## API contract canonical

### Tạo batch

`POST /api/certificate-batches`

```json
{
  "template_id": "template-id",
  "title": "Hoàn thành bài kiểm tra tháng 7",
  "message": "Chúc mừng em!",
  "class_id": "class-id",
  "quiz_id": "quiz-id",
  "student_ids": ["student-1", "student-2"]
}
```

Response thành công:

```json
{
  "data": {
    "batch_id": "batch-id",
    "status": "pending"
  }
}
```

Response lỗi:

```json
{
  "error": {
    "code": "CERTIFICATE_VALIDATION_ERROR",
    "message": "Mô tả lỗi"
  }
}
```

## Giai đoạn 1 — Contract và schema canonical

**Mục tiêu:** Tạo một nguồn sự thật duy nhất cho kiểu dữ liệu, response và migration.

### Công việc

- [x] Tạo contract TypeScript dùng chung cho Worker và frontend.
- [x] Chốt tên trường, trạng thái và response envelope.
- [x] Thêm schema canonical vào `workers/schema.sql` cho môi trường mới.
- [x] Tạo migration `0020` chuyển schema production hiện tại sang canonical, bảo toàn dữ liệu.
- [x] Chuẩn hóa route/hook hiện tại theo contract mới ở mức tương thích nền tảng.
- [x] Ghi rõ schema fingerprint/preflight bắt buộc trước khi chạy migration.

### Test gate

- Worker TypeScript pass.
- Frontend không phát sinh lỗi type mới do certificate contract.
- Migration chạy được trên bản sao schema production và giữ nguyên số batch/certificate.
- Không còn code certificate mới phụ thuộc `custom_note` hoặc `render_status`.

### Rollback

- Chưa chạy migration production trong giai đoạn này.
- Migration giữ bảng backup trong lúc copy và chỉ drop sau khi copy thành công trong cùng transaction.

## Giai đoạn 2 — Backend integrity và phân quyền

**Mục tiêu:** Chỉ giáo viên hợp lệ mới có thể cấp đúng mẫu cho đúng học sinh.

### Công việc

- [x] Validate request bằng contract runtime.
- [x] Kiểm tra giáo viên sở hữu lớp; học sinh thuộc lớp; quiz thuộc phạm vi giáo viên.
- [x] Cho giáo viên đọc template active của trường; chỉ admin được tạo/sửa template.
- [x] Server tự lấy `student_name`, điểm và `quiz_title` từ D1.
- [x] Tạo batch và certificate bằng D1 batch/transaction tương đương, không để dữ liệu nửa chừng.
- [x] Chặn duplicate bằng unique `(batch_id, student_id)` và idempotency key.
- [x] Sửa quyền preview/detail: admin, giáo viên sở hữu batch hoặc học sinh sở hữu certificate.
- [x] Chỉ trả certificate `sent`, chưa thu hồi cho học sinh.

### Test gate

- Cross-class/cross-teacher/cross-student trả `403`.
- Request sai template hoặc student trả `400/404`, không tạo row rác.
- Request hợp lệ tạo đúng số row và enqueue đúng một message.

### Rollback

- Feature flag tắt endpoint tạo batch mới.
- Route đọc vẫn hoạt động với dữ liệu đã tạo.

## Giai đoạn 3 — Queue, retry, idempotency và R2

**Mục tiêu:** Job không bị mất, retry không tạo trùng và lỗi được quan sát rõ.

### Công việc

- [x] Chuẩn hóa state transition batch/certificate.
- [x] Phân biệt lỗi transient và permanent; chỉ `ack` khi hoàn thành hoặc lỗi vĩnh viễn đã ghi nhận.
- [x] Cấu hình retry/backoff và dead-letter queue.
- [x] Giới hạn concurrency render 3–5 certificate mỗi Worker invocation.
- [x] Cập nhật từng certificate thành `sent/failed` kèm `error_message`.
- [x] Batch kết thúc `sent/partial/failed` theo thống kê thực tế.
- [x] Notification chỉ tạo sau khi certificate tương ứng đã `sent`.
- [x] R2 key theo `certificate_id`, ghi đè idempotent.
- [x] Bổ sung `attempt_count`, `last_error`, thời gian xử lý và log có correlation ID.
- [x] Thiết kế endpoint tải có kiểm tra quyền hoặc share token có thể thu hồi.

### Test gate

- Retry cùng message không sinh row/R2 object trùng.
- Thiếu template/R2 chuyển trạng thái lỗi, không kẹt `processing`.
- Partial failure chỉ thông báo cho học sinh thành công.

### Rollback

- Tạm dừng queue producer.
- Consumer cũ chỉ được bật lại nếu schema tương thích; nếu không, drain message sang DLQ.

## Giai đoạn 4 — Hợp nhất UI và notification

**Mục tiêu:** Giáo viên và học sinh thấy đúng trạng thái, lỗi và hành động tiếp theo.

### Công việc

- [x] Loại bỏ/hợp nhất các trang certificate cũ bị trùng chức năng.
- [x] UI giáo viên dùng contract canonical và hiển thị mẫu đúng phạm vi.
- [x] Hiển thị `pending/processing/sent/partial/failed` và polling có backoff.
- [x] Trang chi tiết batch hiển thị từng học sinh và retry phần lỗi.
- [x] Thông báo thành công ở bước tạo đổi thành “Đã tiếp nhận, đang xử lý”.
- [x] UI học sinh đọc response canonical, xem/tải/chia sẻ theo quyền.
- [x] Tích hợp NotificationBell, mark-as-read và deep-link vào certificate.
- [x] Ghép kết quả theo `student_id`, không theo họ tên.
- [x] Bổ sung empty/error/loading/accessibility states.

### Test gate

- UI teacher và student component tests pass.
- Không còn trang/hook certificate không được sử dụng gây lỗi TypeScript.
- Polling dừng khi đạt trạng thái cuối hoặc component unmount.

### Rollback

- Feature flag quay lại navigation cũ nhưng không đổi schema/backend.

## Giai đoạn 5 — Kiểm thử đầy đủ

**Mục tiêu:** Có bằng chứng tự động cho luồng chính, quyền và khả năng phục hồi.

### Công việc

- [x] Contract tests request/response.
- [x] D1 integration tests cho migration và truy vấn.
- [x] Authorization matrix tests.
- [x] Queue tests: success, retry, duplicate, partial, permanent failure.
- [x] Renderer tests cho Unicode tiếng Việt, điểm `0`, dữ liệu dài.
- [x] Frontend hook/component tests.
- [x] E2E mức route/service: giáo viên cấp → queue xử lý → học sinh nhận/tải; smoke Cloudflare thật ở giai đoạn 6.
- [x] E2E thu hồi và chặn truy cập chéo.
- [x] Build, TypeScript, lint và full Vitest gate.

### Test gate

- 100% test certificate bắt buộc pass.
- Không còn TypeScript/build error toàn repository.
- Không có batch kẹt sau fault-injection tests.

### Rollback

- Không áp dụng production; chỉ giữ các thay đổi test/code đã review.

## Giai đoạn 6 — Triển khai, quan sát và rollback production

**Mục tiêu:** Chuyển production an toàn, có số liệu và đường lui rõ ràng.

### Công việc

- [ ] Backup D1 và xuất schema fingerprint + row counts.
- [ ] Chạy migration trên bản sao/staging, so sánh checksum/count.
- [ ] Deploy theo thứ tự: migration → Worker/consumer → frontend.
- [ ] Smoke test bằng một admin, một giáo viên, một lớp và hai học sinh.
- [ ] Theo dõi queue failure, retry, batch stuck, latency render và R2 error.
- [ ] Thiết lập cảnh báo batch `processing` quá ngưỡng.
- [ ] Xác nhận download/authorization/revocation từ mạng ngoài.
- [ ] Chốt runbook vận hành và rollback.

### Go/no-go gate

- Migration rehearsal thành công và số row không đổi ngoài dữ liệu dự kiến.
- E2E staging pass.
- Tỷ lệ render thành công smoke test 100%.
- Có backup, rollback script và người xác nhận go-live.

### Rollback

- Tắt producer bằng feature flag.
- Roll back Worker/frontend về phiên bản trước.
- Khôi phục D1 từ backup nếu migration làm sai dữ liệu; không chạy downgrade phá hủy trực tiếp.

## Thứ tự phụ thuộc và ước lượng

| Giai đoạn | Phụ thuộc | Ước lượng |
|---|---|---:|
| 1. Contract + schema | Không | 0,5–1 ngày |
| 2. Backend + quyền | Giai đoạn 1 | 1–2 ngày |
| 3. Queue + R2 | Giai đoạn 1–2 | 1–2 ngày |
| 4. UI + notification | Giai đoạn 1–3 | 1–2 ngày |
| 5. Test đầy đủ | Giai đoạn 1–4 | 1–2 ngày |
| 6. Production | Giai đoạn 5 | 0,5–1 ngày |

**Tổng:** 5–8 ngày làm việc, chưa tính thời gian chờ duyệt/deploy.

## Theo dõi tiến độ

- [x] Giai đoạn 1 hoàn tất
- [x] Giai đoạn 2 hoàn tất
- [x] Giai đoạn 3 hoàn tất
- [x] Giai đoạn 4 hoàn tất
- [x] Giai đoạn 5 hoàn tất
- [ ] Giai đoạn 6 hoàn tất
