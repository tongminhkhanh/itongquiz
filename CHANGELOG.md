# Changelog — iTongQuiz (thitong.site)

Tất cả thay đổi đáng chú ý của sản phẩm được ghi lại tại đây.
Định dạng theo [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased] — Tháng 7/2026

### ✨ Tính năng mới

- **Hệ thống thông báo hợp nhất**: Login, dashboard giáo viên và học sinh có chung mô hình cảnh báo quan trọng, dòng chữ chạy, banner trong luồng và hộp thư có trạng thái đã đọc. Admin có trình soạn/xem trước responsive và cờ rollout `unified_notifications_v1`.
- **Thông báo theo sự kiện học tập**: Tự động báo khi giao/nộp/chấm bài, phiếu kết quả sẵn sàng và hoàn tất cấp chứng nhận; writer có chống trùng theo nguồn.
- **Phiếu kết quả gửi phụ huynh**: Giáo viên có thể tạo phiếu nhận xét kết quả bài làm và chia sẻ link trực tiếp cho phụ huynh xem. Link có thể thu hồi bất kỳ lúc nào.
- **Giao diện phiếu mới cho phụ huynh**: Trang xem phiếu của phụ huynh được thiết kế lại với header gradient, 5 ô kết quả có icon emoji, các mục Nhận xét / Cần cố gắng / Lời động viên có màu nền riêng biệt và phần chữ ký giáo viên chủ nhiệm.
- **Cache thông tin phiếu**: Khi giáo viên mở lại modal phiếu của học sinh, hệ thống tự động khôi phục nội dung đã nhập và link đã tạo trước đó — không cần nhập lại.
- **Thông tin học sinh có thể chỉnh sửa**: Các trường thông tin học sinh trong phiếu kết quả nay có thể chỉnh sửa trực tiếp trên giao diện.

### 🔧 Cải tiến

- Dòng thông báo hỗ trợ tạm dừng, reduced motion và fallback an toàn khi API lỗi; hộp thư mobile giới hạn `85dvh`, đóng bằng Escape và trả focus về chuông.

---

## [v3.x] — Tháng 5–6/2026

### ✨ Tính năng mới

- **Thi trực tiếp (Live Exam)**: Giáo viên tổ chức thi đồng thời cho cả lớp theo thời gian thực. Học sinh vào phòng chờ, giáo viên bắt đầu và kết thúc bài thi chủ động.
- **Bảng xếp hạng và phần thưởng**: Sau thi trực tiếp, học sinh nhận xu dựa theo thứ hạng — Hạng 1: 500 xu, Hạng 2: 300 xu, Hạng 3: 200 xu, Hạng 4: 100 xu, còn lại: 50 xu.
- **Chat phòng chờ**: Học sinh và giáo viên có thể nhắn tin trong phòng chờ trước khi thi bắt đầu.
- **Tự động kết thúc bài thi hết giờ**: Hệ thống tự động nộp bài cho học sinh khi hết thời gian, không cần giáo viên can thiệp thủ công.
- **Xác thực JWT**: Toàn bộ hệ thống chuyển sang xác thực bằng JWT — bảo mật hơn và hỗ trợ đăng nhập đa thiết bị.
- **Nhiệm vụ tuần (Weekly Quests)**: Học sinh nhận nhiệm vụ mới mỗi tuần để duy trì thói quen học tập.
- **Hệ thống Gamification 3 tầng**: Chuỗi thành tích, huy hiệu và phần thưởng xu được tích hợp xuyên suốt trải nghiệm học tập.
- **Xuất đề cương in được (Worksheet)**: Giáo viên xuất bộ câu hỏi ra file PDF/DOCX có nền kẻ ô và đáp án đính kèm.
- **AI tạo câu hỏi theo hồ sơ sư phạm**: Thêm các chế độ tạo câu hỏi AI theo phong cách sư phạm khác nhau (dễ tiếp cận, nâng cao tư duy, v.v.).
- **Đề xuất điểm yếu cá nhân hóa**: Sau khi làm bài, học sinh nhận gợi ý ôn tập tập trung vào các chủ đề còn yếu.
- **Phân tích kết quả bài thi trực tiếp**: Giáo viên xem biểu đồ phân phối điểm, tiến độ nộp bài và thống kê chi tiết sau mỗi ca thi.

### 🔧 Cải tiến

- **Giao diện trang chủ và đăng nhập** được thiết kế lại với chủ đề Soft Nature Breeze, tối ưu cho di động.
- **Modal xem chi tiết kết quả** được làm mới với hình ảnh minh họa và hiển thị đáp án rõ ràng hơn.
- **Cửa hàng quà tặng và bảng thành tích** đồng bộ metadata trên toàn ứng dụng.
- **Footer, trang Giới thiệu và Liên hệ** được thiết kế lại.
- Bỏ lời nhắc lưu tài khoản đăng nhập gây phiền nhiễu.
- Tối ưu tốc độ trình phát quiz cho học sinh.

### 🐛 Sửa lỗi

- Sửa lỗi bài thi trực tiếp không kết thúc đúng lúc.
- Sửa lỗi học sinh không vào được phòng thi (crash khi join).
- Sửa lỗi tính điểm câu hỏi nhiều đáp án và True/False.
- Sửa lỗi AI tạo câu hỏi trả về JSON không hợp lệ.
- Sửa lỗi trang quản trị không phân quyền đúng khi admin giao bài.
- Sửa lỗi hiển thị text tiếng Việt bị lỗi mã hóa trên trang quản lý.
- Sửa lỗi redirect sai canonical domain trong Google Search Console.

### 🔒 Bảo mật

- Vá toàn bộ lỗ hổng npm mức HIGH và MODERATE.
- Tăng cường bảo mật API và dọn dẹp artifact được sinh ra tự động.

---

## [v2.x] — Tháng 3–4/2026

### ✨ Tính năng mới

- **Thống kê thông minh cho giáo viên**: Phân tích độ khó từng câu hỏi, phân phối điểm và insight tự động sau mỗi bài.
- **Chặn bài tập đã đóng**: Học sinh không thể nộp bài sau khi giáo viên đóng bài tập.
- **Bật/tắt trợ lý AI**: Admin có thể hiển thị hoặc ẩn tính năng trợ lý AI với toàn bộ người dùng.
- **Liên kết Chuyển đổi số** tích hợp vào thanh điều hướng.

### 🔧 Cải tiến

- Nhận diện thương hiệu thống nhất giữa iTongQuiz và thitong.site.
- Thêm hiệu ứng hover levitate cho danh sách tính năng trang đăng nhập.
- Cập nhật sitemap tự động với các URL quiz công khai mới nhất.
- Tối ưu SQL và chuẩn bị cho môi trường production.

### 🐛 Sửa lỗi

- Sửa lỗi SPA rewrite chặn nhầm file tĩnh (ảnh, font).
- Sửa lỗi tính lại số câu đúng/sai khi bỏ qua câu nhiều đáp án.
- Sửa lỗi câu hỏi True/False không được đánh dấu là đã trả lời.
- Sửa lỗi ảnh OG social preview hiển thị sai.
