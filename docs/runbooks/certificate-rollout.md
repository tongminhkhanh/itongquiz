# Runbook triển khai chức năng chứng nhận

## Trạng thái preflight 2026-07-14

- D1 production đúng schema legacy `004 + 010`: 3 template, 8 batch, 8 certificate, 0 notification.
- D1 Time Travel bookmark trước thay đổi: `0000004f-00000000-000050a8-b6aa0bb2cc465f416f64c8fdbac464af`.
- Full export bị Cloudflare từ chối vì database có virtual table FTS5; bookmark Time Travel là điểm rollback chính thức.
- Queue `certificate-generation` tồn tại nhưng chưa có producer/consumer; `certificate-generation-dlq` chưa tồn tại.
- Migration `0020` đã diễn tập hai lần trên fixture legacy; row count được bảo toàn và `pragma_foreign_key_check` trả 0 lỗi.

## Thứ tự triển khai

1. Chạy lại `npm run test:run`, TypeScript frontend/Worker và production build.
2. Tạo `certificate-generation-dlq`; không tạo lại queue chính nếu đã tồn tại.
3. Chạy `workers/migrations/0020_canonicalize_certificates.sql` trên D1 remote đúng một lần.
4. Kiểm tra ngay row count phải vẫn là 3 template, 8 batch, 8 certificate; `pragma_foreign_key_check = 0`; xác nhận đủ cột canonical.
5. Deploy Worker từ `workers/wrangler.toml`, xác nhận queue chính có producer/consumer và DLQ được gắn.
6. Deploy frontend theo quy trình hiện có của dự án sau khi Worker health check đạt.
7. Smoke test bằng admin, giáo viên sở hữu lớp và hai học sinh: tạo/đọc template → cấp batch → queue xử lý → notification → xem/tải ảnh có JWT → chặn truy cập chéo.
8. Theo dõi 30 phút: batch `processing` quá 10 phút, retry/DLQ, lỗi R2, latency render và response 4xx/5xx.

## Rollback

- Nếu migration hoặc kiểm tra dữ liệu thất bại trước deploy Worker: dừng triển khai và restore D1 bằng bookmark preflight.
- Nếu Worker lỗi nhưng dữ liệu đúng: rollback Worker/frontend về deployment trước; schema canonical được giữ để điều tra.
- Nếu dữ liệu bị sai sau deploy: dừng producer/consumer trước, lưu bookmark sự cố, rồi restore về bookmark preflight.
- Sau rollback, xác nhận lại bốn row count, route health và queue không còn message đang xử lý.

## Tiêu chí go/no-go

- Go: mọi test/build sạch; DLQ tồn tại; migration rehearsal sạch; bookmark rollback có sẵn; schema fingerprint production khớp legacy dự kiến.
- No-go: row count thay đổi ngoài dự kiến, khóa ngoại lỗi, DLQ/binding thiếu, health check lỗi hoặc không thể xác thực bằng tài khoản test đúng vai trò.
