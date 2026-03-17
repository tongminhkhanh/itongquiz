# 💡 BRIEF: Thư viện Luyện Tập (Practice Library)

**Ngày tạo:** 2026-03-12
**Tính năng:** Chế độ Luyện tập Tự do theo Chuyên đề (Topic-based Practice)

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
Học sinh hiện tại thụ động chờ Giáo viên giao bài tập (Assignment) mới có bài để làm. Các em cần một không gian để tự do ôn luyện kiến thức, cày điểm thưởng và ôn lại những phần mình còn yếu.

## 2. GIẢI PHÁP ĐỀ XUẤT
Tạo ra **Thư viện luyện tập** - một khu vực riêng trên Dashboard học sinh. Các môn học (Toán, Tiếng Việt...) được chia thành nhiều **Chuyên đề** nhỏ (VD: Phép nhân, Phép cộng).
Hệ thống sẽ **tự động** bốc ngẫu nhiên các câu hỏi từ ngân hàng (chọn lọc theo thẻ/hashtag) để tạo thành một bài tập mới toanh mỗi khi học sinh muốn luyện tập.

## 3. ĐỐI TƯỢNG SỬ DỤNG
- **Primary:** Học sinh tiểu học (Tự học, cày điểm/coins).
- **Secondary:** Giáo viên (Tạo ngân hàng câu hỏi, gắn đúng hashtag).

## 4. NGHIÊN CỨU & LỰA CHỌN KỸ THUẬT
### Mô hình: Trộn Câu Hỏi Tự Động (Auto-Discovery Topics)
- Học sinh không giải nguyên 1 đề thi cũ, mà giải 1 "đề mini" trộn ngẫu nhiên.
- Chuyên đề tự động "mọc lên" thông qua việc quét hashtag của các câu hỏi trong database. (Giáo viên không cần tạo sảnh/chuyên đề thủ công).

## 5. TÍNH NĂNG CHÍNH

### 🚀 MVP (Bắt buộc có):
- [ ] Giao diện Thư viện luyện tập: Các card Môn học (Toán, Tiếng Việt...).
- [ ] Danh sách Chuyên đề bên trong Môn học: Hiển thị các Topic tự sinh từ Hashtag nội bộ (VD: `#Toan_Lop3_PhepNhan`).
- [ ] Màn hình Play (Tái sử dụng `TakeQuizUI`): Cho phép bé dạo chơi và làm một bài test mini xào nấu ngẫu nhiên từ kho 10-15 câu theo chủ đề bé chọn.
- [ ] API lấy câu hỏi tự do: Quét database D1 lấy `LIMIT 15` câu hỏi có chung `tags` hoặc filter LIKE.

### 🎁 Phase 2 (Làm sau):
- [ ] Cải tiến UI lúc Giáo viên tạo/sửa câu hỏi: Có danh sách Dropdown để chọn Hashtag có sẵn, tránh gõ lệch chữ (VD: `#Phepcộng` vs `#Phép_cộng`).
- [ ] Ranking / Thanh tiến trình: Xem học sinh đã cày được bao nhiêu câu trong mỗi Chuyên đề.
- [ ] Tích hợp Bác sĩ Cú: Phạt/Thưởng khi làm bài Luyện tập.

## 6. ƯỚC TÍNH SƠ BỘ
- **Độ phức tạp:** TRUNG BÌNH (frontend cần xử lý điều hướng, backend cần câu query SQL trộn ngẫu nhiên và match Tag).
- **Rủi ro:** Số lượng câu hỏi của một topic quá ít (dưới 5 câu) sẽ khiến bài tập bị lặp lại liên tục. Cần nhắc Giáo viên lên đề nhiều.

## 7. BƯỚC TIẾP THEO
→ Bấm `/plan` để lên thiết kế chi tiết (Database Schema, File cần code).
