# Runbook triển khai hệ thống thông báo hợp nhất

## Mục tiêu và phạm vi

Runbook này áp dụng cho `unified_notifications_v1`: thông báo chữ chạy, cảnh báo quan trọng, banner theo luồng và hộp thư của giáo viên/học sinh. Migration chỉ mở rộng dữ liệu; cờ có thể tắt để quay về giao diện cũ mà không rollback schema.

## Thứ tự triển khai bắt buộc

1. Sao lưu D1 và ghi nhận phiên bản Worker/Pages hiện tại.
2. Apply `workers/migrations/0042_unified_notifications.sql`.
3. Xác nhận các cột mới của `announcements`, `notifications`, index inbox và index chống trùng đã tồn tại.
4. Deploy Worker trước. Giữ `unified_notifications_v1=false`.
5. Smoke test endpoint cũ và mới:
   - `GET /api/announcements`
   - `GET /api/notifications?filter=all&limit=20`
   - `POST /api/notifications/:id/read`
   - `POST /api/notifications/read-all`
   - endpoint chứng nhận/phiếu kết quả cũ vẫn trả dữ liệu.
6. Deploy frontend.
7. Đăng nhập admin, mở **Thông báo → Cài đặt phát hành**, bật **Thông báo hợp nhất v1** và lưu.

Không bật cờ trước khi Worker mới và migration đã sẵn sàng.

## Smoke test sau khi bật

### Login

- Dòng chữ chạy và banner nằm trong luồng trang, không che form.
- Nút tạm dừng/tiếp tục hoạt động.
- Khi API collection lỗi, form đăng nhập vẫn dùng được.

### Giáo viên

- Chuông mở hộp thư, lọc tất cả/chưa đọc, đánh dấu đã đọc và đóng bằng Escape.
- Admin có nút **Quản lý thông báo** riêng; giáo viên thường không thấy nút này.
- Giao bài hoặc học sinh nộp homework sinh đúng một thông báo, không nhân đôi khi retry.

### Học sinh

- Chuông mở bottom sheet không vượt `85dvh` ở 390 × 844.
- Thông báo giao bài mở đúng assignment.
- Phiếu kết quả và chứng nhận mở đúng khu vực tương ứng.
- Nộp/chấm lại cùng source không tạo bản sao.

## Theo dõi

Theo dõi trong ít nhất 30 phút sau mỗi lần bật:

- tỷ lệ lỗi 5xx của `/api/announcements`, `/api/notifications`;
- độ trễ p95 của danh sách inbox;
- log `[NotificationWriter]` và `[Notifications]`;
- số bản ghi trùng bị `INSERT OR IGNORE`;
- lỗi JavaScript, layout overflow và thao tác Escape/focus;
- phản hồi của giáo viên/học sinh về thông báo sai đối tượng.

## Tắt nhanh

Trong **Thông báo → Cài đặt phát hành**, tắt **Thông báo hợp nhất v1** rồi lưu. Frontend trở lại `CurrentAnnouncementBanner` và `NotificationBell` cũ. Không rollback migration 0042 và không xóa dữ liệu `notifications`.

Nếu trang admin không dùng được, cập nhật `system_settings.setting_key='unified_notifications_v1'` về `'false'`, sau đó xác nhận `GET /api/system-settings` trả `unified_notifications_v1=false`.

## Điều kiện xóa legacy ở release sau

Chỉ xóa route/component cũ khi:

- hệ thống mới ổn định tối thiểu một release đầy đủ;
- không còn lỗi phân quyền hoặc deep link mức nghiêm trọng;
- dashboard cho thấy tỷ lệ đọc và độ trễ đạt mục tiêu;
- rollback bằng flag không còn được yêu cầu;
- có migration/cleanup riêng và kế hoạch khôi phục đã được duyệt.
