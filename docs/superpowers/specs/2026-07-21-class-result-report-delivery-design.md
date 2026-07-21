# Thiết kế gửi phiếu kết quả theo lớp và bài kiểm tra

Ngày: 2026-07-21  
Nhánh thiết kế: `feat/class-result-report-delivery`

## 1. Bối cảnh

Trang **Dashboard giáo viên → Kết quả học tập** hiện có thể tạo phiếu cho toàn bộ tập kết quả đang lọc, nhưng chưa buộc giáo viên chọn rõ một lớp và một bài kiểm tra. Điều này dễ dẫn đến gửi nhầm nhiều bài hoặc nhiều lớp trong cùng một đợt.

Mục tiêu của tính năng mới là cho phép giáo viên thực hiện đúng quy trình:

1. Chọn **một lớp**.
2. Chọn **một bài kiểm tra**.
3. Hệ thống lấy một kết quả đại diện cho mỗi học sinh đã làm bài.
4. Giáo viên kiểm tra và chỉnh phiếu.
5. Hệ thống gửi phiếu vào tài khoản học sinh và tạo link riêng cho phụ huynh.
6. Giáo viên theo dõi trạng thái gửi và trạng thái đã xem.

Ví dụ chuẩn: chọn **Lớp 4A9** và **Bài 1 – Ôn tập phép nhân**, sau đó tạo và gửi phiếu cho toàn bộ học sinh 4A9 đã làm bài đó.

## 2. Mục tiêu

- Chỉ tạo phiếu khi giáo viên đã chọn đúng một lớp và một bài kiểm tra.
- Mỗi học sinh chỉ nhận một phiếu trong một đợt gửi.
- Học sinh chưa làm bài không bị tạo phiếu điểm 0; các em được liệt kê riêng và mặc định bỏ qua.
- Mặc định chọn **lần làm mới nhất**; giáo viên có thể đổi sang điểm cao nhất hoặc lần đầu.
- Gửi phiếu vào đúng tài khoản học sinh bằng hệ thống thông báo hiện có.
- Tạo một link phụ huynh riêng cho từng học sinh, mặc định hết hạn sau 30 ngày và có thể thu hồi.
- Cho giáo viên sao chép tin nhắn Zalo hoặc xuất Excel chứa link cá nhân.
- Theo dõi được số phiếu đã tạo, đã gửi, học sinh đã xem, phụ huynh đã mở, gửi lỗi và chưa làm bài.
- Giữ nguyên chức năng mở/in/tải phiếu riêng của từng dòng kết quả hiện tại.

## 3. Ngoài phạm vi

- Không tạo tài khoản phụ huynh trong phiên bản này.
- Không gửi SMS hoặc Zalo tự động qua API bên thứ ba.
- Không tạo link chung chứa kết quả của cả lớp.
- Không gửi phiếu cho nhiều bài kiểm tra trong một đợt.
- Không thay đổi công thức chấm điểm hoặc dữ liệu bài làm.
- Không xây hệ thống hộp thư mới; sử dụng bảng `notifications` và chuông thông báo hiện có.

## 4. Quy tắc chọn phạm vi

Nút **Phiếu KQ** đổi nhãn thành **Tạo và gửi phiếu**.

Nút chỉ được bật khi:

- Đã chọn một lớp cụ thể, không phải “Tất cả lớp”.
- Đã chọn một bài kiểm tra cụ thể, không phải “Tất cả bài kiểm tra”.
- Có ít nhất một kết quả hợp lệ trong phạm vi.

Khi chưa đủ điều kiện, tooltip hoặc mô tả hiển thị: **Hãy chọn một lớp và một bài kiểm tra trước khi tạo phiếu.**

Ngày và ô tìm kiếm học sinh vẫn có thể lọc bảng kết quả, nhưng phạm vi batch được xác định bởi lớp, bài kiểm tra và chính sách lần làm. Từ khóa tìm kiếm không được âm thầm loại học sinh khỏi đợt gửi; việc chọn hoặc bỏ chọn học sinh diễn ra rõ ràng tại bước 2.

## 5. Quy tắc chọn lần làm

Mỗi học sinh chỉ có một kết quả đại diện trong batch.

### Lần làm mới nhất — mặc định

Chọn kết quả có `submittedAt` mới nhất.

### Điểm cao nhất

Chọn kết quả có điểm `/10` cao nhất. Nếu nhiều lần bằng điểm, chọn lần mới nhất.

### Lần đầu

Chọn kết quả có `submittedAt` sớm nhất.

Việc gom nhóm phải dùng tài khoản học sinh đã đối chiếu với roster lớp. Vì `StudentResult` hiện chưa lưu `studentId`, backend đối chiếu theo tên chuẩn hóa và lớp. Nếu không tìm thấy hoặc có nhiều học sinh trùng tên trong cùng lớp, mục đó có trạng thái **Thiếu định danh**, không gửi vào tài khoản học sinh và mặc định không được chọn cho batch cho đến khi giáo viên xử lý dữ liệu lớp.

## 6. Luồng UX ba bước

### Bước 1 — Chọn phạm vi

Hiển thị rõ:

- Lớp đã chọn.
- Bài kiểm tra đã chọn.
- Chính sách lần làm.
- Tổng số học sinh trong roster.
- Số học sinh đã làm.
- Số học sinh chưa làm.
- Số phiếu sẽ tạo.

Học sinh chưa làm được đặt trong khối cảnh báo nhẹ, có thể mở rộng để xem tên và luôn mặc định bỏ qua.

Trước khi sang bước 2, hệ thống gọi backend để lấy cohort server-authoritative; không chỉ tin vào mảng kết quả đang có trên frontend.

### Bước 2 — Kiểm tra phiếu

Desktop dùng hai cột:

- Bên trái: danh sách học sinh có checkbox, điểm, số lần làm, kết quả được chọn và trạng thái dữ liệu.
- Bên phải: preview phiếu của học sinh đang chọn và các trường nhận xét có thể chỉnh sửa.

Mobile dùng danh sách card; chạm một học sinh mở bottom sheet preview phiếu.

Các thao tác:

- Chọn tất cả hoặc bỏ chọn từng học sinh.
- Tìm kiếm trong cohort.
- Lọc theo sẵn sàng, thiếu dữ liệu, đã có phiếu.
- Chọn phong cách nhận xét chung: nhẹ nhàng, nghiêm túc hoặc vui vẻ.
- Chỉnh từng phiếu.
- Tạo lại nhận xét cho một học sinh bằng cơ chế hiện có; không thêm phụ thuộc AI mới trong phạm vi này.

Từ khóa tìm kiếm chỉ thay đổi danh sách hiển thị, không tự thay đổi tập checkbox đã chọn.

### Bước 3 — Chọn cách gửi

Mặc định bật:

- **Gửi vào tài khoản học sinh**.
- **Tạo link riêng cho phụ huynh**.

Tùy chọn thêm:

- **Chuẩn bị danh sách gửi Zalo/Excel**.

Khối xác nhận cuối phải ghi rõ lớp, bài kiểm tra, chính sách lần làm, số phiếu, số học sinh bỏ qua và hai kênh gửi được bật.

Nút chính có dạng: **Gửi 31 phiếu kết quả**.

Không dùng xác nhận chung chung như “Bạn có chắc không?”. Nội dung xác nhận phải nêu chính xác lớp và bài.

### Trạng thái sau gửi

Hiển thị:

- Đã tạo phiếu.
- Đã gửi vào tài khoản học sinh.
- Học sinh đã xem.
- Link phụ huynh đã tạo.
- Phụ huynh đã mở.
- Gửi lỗi.
- Học sinh chưa làm.

Hỗ trợ:

- Sao chép tin nhắn Zalo theo từng học sinh hoặc toàn batch.
- Xuất Excel/CSV.
- Gửi lại thông báo cho mục lỗi hoặc chưa xem.
- Thu hồi link phụ huynh.

## 7. Thiết kế Stitch

Dự án Stitch: `8501560917177296672`  
Design system: **Warm Human Education** — `assets/3475f4f9d3ee4df2b5c34f875ccea3dd`

- Desktop wizard: `9503704890a84adaaf397c30c1056064`
- Mobile bước 1: `214d60684e4143728fc034e9f66166e7`
- Mobile bước 2: `7011f688f18e40419fa7ed12cb5dbb2a`
- Mobile bước 3: `75e303343f664e7fbde7dff927f42667`
- Mobile trạng thái sau gửi: `ee8d442c298644edb58f41a069ee4312`

Nguyên tắc giao diện:

- Font Be Vietnam Pro.
- Nền giấy ấm, card trắng, viền mảnh.
- Không gradient và không shadow nặng.
- Vùng chạm tối thiểu 44px.
- Thanh hành động sticky trên mobile.
- Màu coral chỉ dùng cho lỗi hoặc cảnh báo; mint dùng cho trạng thái thành công.

## 8. Kiến trúc frontend

### Thành phần mới

- `ResultReportDeliveryWizard`: quản lý ba bước và trạng thái sau gửi.
- `ResultReportScopeStep`: lớp, bài, chính sách lần làm và cohort summary.
- `ResultReportReviewStep`: chọn học sinh và chỉnh preview phiếu.
- `ResultReportDeliveryStep`: chọn kênh gửi và xác nhận.
- `ResultReportDeliverySummary`: bảng trạng thái sau gửi.
- `StudentResultReportsSection`: danh sách phiếu trong tài khoản học sinh.

### Thành phần được mở rộng

- `ResultsActions`: đổi nhãn nút và điều kiện bật.
- `ResultsTab`: truyền `classId`, `quizId` và mở wizard.
- `NotificationBell`: điều hướng theo loại thông báo thay vì chỉ hỗ trợ chứng nhận.
- `StudentDashboardHeader` và dashboard section routing: mở khu vực phiếu kết quả từ thông báo.

### Trạng thái wizard

Wizard giữ:

- `scope`: classId, quizId, attemptPolicy.
- `cohort`: roster và kết quả đại diện.
- `selectedResultIds`.
- `drafts` theo resultId.
- `deliveryOptions`.
- `requestId` idempotent cho lần gửi.
- `batchId` sau khi gửi.

Đóng wizard trước khi gửi không tạo batch. Phiếu chỉ được lưu khi giáo viên bấm gửi hoặc chủ động lưu chỉnh sửa một phiếu.

## 9. API và luồng dữ liệu

### 9.1 Lấy cohort

`POST /api/result-reports/cohort`

Input:

```json
{
  "classId": "4A9",
  "quizId": "quiz-1",
  "attemptPolicy": "latest"
}
```

Output gồm:

- Thông tin lớp và bài.
- Tổng roster.
- Danh sách học sinh đã làm với một result đại diện.
- Danh sách chưa làm.
- Danh sách thiếu định danh hoặc dữ liệu không hợp lệ.

Backend phải xác thực giáo viên có quyền với lớp và bài kiểm tra.

### 9.2 Gửi batch

`POST /api/result-reports/batches`

Input chính:

- `requestId`.
- `classId`, `quizId`, `attemptPolicy`.
- Danh sách resultId được chọn.
- Nội dung phiếu cuối cùng của từng result.
- `notifyStudents`.
- `createParentLinks`.
- `expiresInDays`, mặc định 30.

Backend thực hiện:

1. Xác thực lại scope và quyền giáo viên.
2. Xác thực mỗi result thuộc đúng lớp và bài.
3. Upsert phiếu theo result.
4. Tạo hoặc tái sử dụng link phụ huynh đang hoạt động.
5. Tạo thông báo `result_report_published` cho tài khoản học sinh đã resolve.
6. Ghi delivery item và trạng thái.
7. Trả batch summary và link.

`requestId` phải unique để retry do mạng không tạo batch hoặc thông báo trùng.

### 9.3 Đọc trạng thái batch

`GET /api/result-reports/batches/:batchId`

Trả summary và từng delivery item. Trạng thái học sinh được tính từ `notifications.is_read`; trạng thái phụ huynh được tính từ `phieu_public_links.view_count`, `is_active` và `expires_at`.

### 9.4 Phiếu của học sinh

- `GET /api/result-reports/mine`
- `GET /api/result-reports/mine/:phieuId`

Chỉ trả phiếu gắn với tài khoản học sinh hiện tại. Không dùng public token cho trang nội bộ.

### 9.5 Retry và thu hồi

- Retry thông báo chỉ áp dụng cho item lỗi hoặc khi giáo viên chủ động gửi lại.
- Thu hồi link dùng cơ chế `deactivate_public_phieu_link` hiện có.
- Retry batch không tạo lại link hoặc notification đã thành công.

## 10. Dữ liệu và migration

Tiếp tục dùng:

- `phieu_nhanxet`.
- `phieu_batch`.
- `phieu_batch_items`.
- `phieu_public_links`.
- `notifications`.

Thêm bảng tracking riêng:

`result_report_delivery_items`

Các trường tối thiểu:

- `id`.
- `batch_id`.
- `result_id`.
- `phieu_id`.
- `student_id` nullable.
- `student_name`.
- `parent_phone` nullable.
- `notification_id` nullable.
- `public_link_id` nullable.
- `student_status`: not_requested, pending, sent, viewed, failed, unresolved.
- `parent_status`: not_requested, link_created, opened, revoked, failed.
- `attempt_count`.
- `last_error` nullable.
- `created_at`, `updated_at`.

Thêm các cột nullable vào `phieu_batch`:

- `request_id` unique nullable.
- `attempt_policy` nullable.
- `notify_students`.
- `create_parent_links`.
- `delivery_status`: draft, sending, completed, partial_failed.

Dữ liệu batch homework cũ không bị thay đổi hành vi.

## 11. Thông báo học sinh

Loại thông báo: `result_report_published`.

Ví dụ:

- Title: **Bạn có phiếu kết quả mới**.
- Body: **Cô Khánh đã gửi kết quả bài “Ôn tập phép nhân”. Điểm của em: 8/10.**
- Data: `phieu_id`, `result_id`, `quiz_id`, `batch_id`.

Khi học sinh bấm:

1. Đánh dấu notification đã đọc.
2. Mở khu vực **Phiếu kết quả** trong dashboard học sinh.
3. Hiển thị đúng phiếu bằng endpoint đã xác thực.

Thông báo chứng nhận tiếp tục hoạt động như cũ.

## 12. Link phụ huynh và bảo mật

- Mỗi phiếu có một token riêng; không có token chung cho lớp.
- Mặc định hết hạn sau 30 ngày.
- Giáo viên có thể thu hồi từng link hoặc toàn batch.
- Trang public không hiển thị dữ liệu của học sinh khác.
- CSV chứa link là dữ liệu nhạy cảm; chỉ giáo viên có quyền mới tạo được.
- Không đưa số điện thoại phụ huynh vào response dành cho học sinh.
- Backend không tin studentName/classId do frontend gửi để quyết định quyền sở hữu; luôn đọc result và roster từ D1.

## 13. Tin nhắn Zalo và Excel

Hệ thống không tự gửi Zalo. Nó tạo nội dung cá nhân hóa:

> Kính gửi phụ huynh em Nguyễn Văn An, giáo viên đã gửi phiếu kết quả bài “Ôn tập phép nhân”. Xem phiếu tại: [link riêng]. Link có hiệu lực trong 30 ngày.

File CSV/Excel gồm:

- Họ tên học sinh.
- Lớp.
- Điểm.
- Lần làm được chọn.
- Số điện thoại phụ huynh nếu có.
- Link riêng.
- Tin nhắn gợi ý.
- Trạng thái gửi học sinh.
- Trạng thái phụ huynh mở link.

## 14. Xử lý lỗi

- Cohort không tải được: giữ nguyên wizard, hiển thị thử lại.
- Một học sinh thiếu định danh: đánh dấu riêng, không chặn toàn batch.
- Một phiếu lưu lỗi: batch trả `partial_failed`; các mục thành công không bị rollback hoặc tạo lại khi retry.
- Không tạo được notification nhưng tạo được link: item có student_status failed và parent_status link_created.
- Không tạo được link nhưng notification thành công: item có student_status sent và parent_status failed.
- Request timeout: frontend gọi lại bằng cùng requestId và nhận lại batch cũ.
- Nút gửi bị khóa trong lúc request đang chạy.

## 15. Testing

### Unit

- Chọn latest/highest/first đúng và tie-break đúng.
- Deduplicate mỗi học sinh một result.
- Học sinh chưa làm bị bỏ qua.
- Tìm kiếm không làm mất selection.
- Message Zalo và CSV escaping tiếng Việt.

### Worker

- Giáo viên không thể gửi cho lớp không thuộc quyền.
- Result khác lớp hoặc khác quiz bị từ chối.
- `requestId` retry không tạo trùng.
- Notification chỉ gửi đúng student account.
- Link public riêng, hết hạn và thu hồi đúng.
- Partial failure và retry không lặp mục thành công.
- Học sinh không đọc được phiếu của học sinh khác.

### Component/E2E

- Nút chỉ bật sau khi chọn lớp và bài.
- Wizard đi đủ ba bước trên desktop và mobile.
- Xác nhận hiển thị đúng lớp, bài và số lượng.
- Học sinh chưa làm không được chọn mặc định.
- Notification mở đúng phiếu.
- Teacher summary cập nhật khi mark-read và khi public link được mở.
- Accessibility: focus trap, Escape, nhãn checkbox/toggle và vùng chạm mobile.

## 16. Phát hành

Thứ tự production:

1. Áp dụng migration D1.
2. Deploy API Worker.
3. Smoke test cohort, send batch, notification và public link bằng dữ liệu thử.
4. Deploy frontend.
5. Kiểm tra desktop/mobile và tài khoản học sinh.
6. Theo dõi batch partial failure và lỗi notification trong 30 phút đầu.

## 17. Tiêu chí nghiệm thu

- Giáo viên chọn lớp 4A9 và Bài 1, thấy đúng roster và số học sinh đã làm/chưa làm.
- Mỗi học sinh chỉ xuất hiện một lần theo chính sách lần làm đã chọn.
- Có thể bỏ chọn, chỉnh nhận xét và xem trước từng phiếu.
- Một thao tác gửi tạo thông báo học sinh và link phụ huynh riêng theo tùy chọn.
- Học sinh bấm thông báo xem đúng phiếu của mình.
- Phụ huynh mở link không cần đăng nhập nhưng không thể xem phiếu khác.
- Giáo viên thấy trạng thái đã gửi/đã xem/đã mở/gửi lỗi.
- Retry không tạo thông báo hoặc link trùng.
- Chức năng phiếu riêng từng dòng, in, PDF và ảnh vẫn hoạt động.
