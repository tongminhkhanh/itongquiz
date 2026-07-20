# Runbook: HttpOnly Cookie Authentication Rollout

## Mục tiêu

Triển khai frontend và API dùng cookie `auth_token` `HttpOnly; Secure; SameSite=Lax`, không lưu hoặc đọc JWT trong browser storage, đồng thời giữ khả năng rollback ngắn hạn mà không tự động đăng xuất toàn bộ người dùng.

## Trạng thái cấu hình trong repository

```toml
AUTH_TOKEN_TRANSPORT_MODE = "cookie"
AUTH_MIGRATION_MODE = "compat"
```

- `AUTH_TOKEN_TRANSPORT_MODE=cookie`: login, đổi mật khẩu và student login không trả JWT trong JSON.
- `AUTH_MIGRATION_MODE=compat`: middleware vẫn chấp nhận token legacy chưa có `iss`/`aud` trong cửa sổ chuyển đổi.
- Hai cờ độc lập. Chuyển transport sang cookie không tự thu hồi phiên cũ.

## Thứ tự deploy an toàn

1. Xác minh frontend production build và Worker dry-run.
2. Deploy Worker có cookie transport và endpoint `/api/student-profile`.
3. Smoke login trực tiếp trên domain production API.
4. Deploy frontend đã dùng `credentials: include` và không đọc JWT storage.
5. Smoke teacher/student login, reload và logout trên production domain.
6. Smoke Vercel Preview qua rewrite `/api/*` cùng origin.
7. Theo dõi tỷ lệ 401/403, login failures và lỗi `/api/account/me`/`/api/student-profile`.
8. Chỉ sau thời gian ổn định và có phê duyệt mới cân nhắc `AUTH_MIGRATION_MODE=enforce` hoặc thu hồi token cũ.

## Smoke checklist

### Giáo viên

- Login trả 200, response JSON không có `data.token`.
- Response có `Set-Cookie: auth_token=...; HttpOnly; Secure; SameSite=Lax`.
- Reload trang gọi `/api/account/me` thành công.
- Forced password change hoạt động chỉ bằng cookie.
- Logout xóa cookie và request protected tiếp theo trả 401.

### Học sinh

- Login trả identity/gamification data nhưng không có token.
- Reload gọi `/api/student-profile` và phục hồi dashboard.
- Certificate, notification, Live Exam và game-loop vẫn hoạt động.
- Logout xóa cookie và metadata local.

### Vercel Preview

- `/api/health` không bị SPA rewrite nuốt.
- Login qua preview origin nhận `Set-Cookie` cho preview host.
- Reload và protected request vẫn thành công qua `/api/*` rewrite.

## Quan sát sau deploy

Theo dõi ít nhất:

- 401/403 theo route và `requestId`.
- Login success/failure rate.
- `/api/account/me` và `/api/student-profile` error rate.
- Certificate image/notification failures.
- AI/Live Exam request failures.
- CORS hoặc cookie warnings trong browser console.

Không ghi JWT hoặc cookie value vào log.

## Rollback transport

Nếu frontend mới gặp lỗi cookie nhưng Worker vẫn ổn:

1. Đổi `AUTH_TOKEN_TRANSPORT_MODE` về `compat`.
2. Deploy Worker trước.
3. Rollback frontend nếu cần.
4. Không rotate `JWT_SECRET` và không tăng `token_version` trong rollback transport.

`compat` chỉ phục hồi trường token trong JSON cho client cũ; frontend hiện tại vẫn bỏ qua token đó.

## Enforce claims và thu hồi phiên cũ

Chỉ thực hiện khi có phê duyệt rõ ràng:

1. Xác nhận không còn client cũ phụ thuộc token claim-less.
2. Chuyển `AUTH_MIGRATION_MODE=enforce` để từ chối JWT legacy không có `iss`/`aud`.
3. Nếu cần đăng xuất có chọn lọc, tăng `token_version` cho tài khoản tương ứng.
4. Nếu cần đăng xuất toàn hệ thống, dùng quy trình migration D1 được review riêng hoặc rotate `JWT_SECRET` theo change window.
5. Thông báo người dùng trước khi thu hồi phiên diện rộng.

## Rollback sau enforce

- Nếu chỉ mới bật claim enforcement: đổi lại `AUTH_MIGRATION_MODE=compat` và deploy Worker.
- Nếu đã tăng `token_version` hoặc rotate secret, rollback cấu hình không khôi phục được token cũ; người dùng phải đăng nhập lại.
- Không giảm `token_version` để cố khôi phục phiên đã thu hồi.

## Cổng phê duyệt

Cần phê duyệt riêng trước các thao tác sau:

- Deploy production.
- Chuyển `AUTH_MIGRATION_MODE=enforce`.
- Tăng `token_version` hàng loạt.
- Rotate `JWT_SECRET`.
- Đăng xuất toàn bộ người dùng.
