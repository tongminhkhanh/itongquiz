# 💡 BRIEF: Nâng cấp Review "Rõ Mồn Một" (Teacher Dashboard 2.0)

**Ngày tạo:** 2026-03-18
**Tình trạng:** Khách hàng yêu cầu thiết kế TRƯỚC khi code.

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
Giáo viên phản ánh giao diện xem chi tiết hiện tại chưa đủ "ép phê", chưa hiện đầy đủ nội dung nguyên bản và cách bé đã làm bài để giáo viên so sánh nhanh.

## 2. GIẢI PHÁP ĐỀ XUẤT (Yêu cầu từ Anh Khang)
Màn hình Review phải hiện đủ "3 Lớp" thông tin:

### 📸 Lớp 1: Đề bài Gốc (True Original)
- **Chữ:** Đầy đủ nội dung, không bị cắt xén.
- **Hình ảnh:** Load từ `image` property của câu hỏi.
- **Âm thanh:** Nếu có trường `audio`, phải hiện trình phát nhạc mini để giáo viên nghe lại đề.

### ✍️ Lớp 2: Bài làm của Học sinh (User Action)
- **MCQ/Đ-S:** Highlight chính xác ô bé đã chọn.
- **Nối cặp:** Vẽ các đường nối hoặc hiện cặp bé đã nối (không phải chỉ liệt kê text).
- **Điền từ:** Hiện đúng từ bé đã gõ vào ô trống.
- **Gạch chân:** Hiện đúng các từ bé đã highlight.

### ⚖️ Lớp 3: Đối soát Đúng/Sai (Verification)
- Đánh dấu icon ✅ (Đúng) hoặc ❌ (Sai) to, rõ ràng.
- **Đáp án đúng:** Luôn hiển thị ngay bên dưới bài làm để giáo viên đối chiếu trực tiếp.

## 3. TÍNH NĂNG KỸ THUẬT (Cần bổ sung)
- **Snapshot Media:** Sửa `QuestionSnapshot` để lưu cả `image` và `audio`.
- **Review Templates:** Cập nhật CSS/Layout để hiển thị so sánh "Học sinh chọn" vs "Đáp án Hệ thống".

---

## 4. BƯỚC TIẾP THEO
→ Chạy `/design` để lập bản vẽ kỹ thuật chi tiết cho từng loại câu hỏi.
