# 💡 BRIEF: iTongQuiz - Quản Lý Kho Đề Cho Giáo Viên (Categorization & Tagging)

**Ngày tạo:** 11/03/2026
**Brainstorm cùng:** Anh Tuấn
**Mục tiêu:** Xây dựng hệ thống phân loại bài tập/đề thi cho màn hình Giáo Viên sao cho đồng bộ với Học sinh, khoa học và dễ quản lý.

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
- Màn hình Học sinh hiện tại đã chia thành **6 thẻ môn học cố định** (Toán, Tiếng Việt, Tự nhiên Xã hội, Tiếng Anh, Tin học, Luyện IOE).
- Thầy cô giáo khi tạo đề cần một cơ chế để phân loại đề thi vào đúng các thẻ này, để học sinh dễ dàng tìm kiếm làm bài.
- Nếu chỉ ép chọn 1 trong 6 môn thì đôi khi hơi cứng nhắc, giáo viên khó quản lý chuyên sâu (VD: Cùng là môn Toán nhưng muốn phân biệt Toán Hình và Toán Đại, đề Thi Học Kỳ và đề Cuối Tuần).

## 2. GIẢI PHÁP ĐỀ XUẤT (Sự kết hợp giữa PA1 và PA2)
Áp dụng cơ chế **"Phân loại Phẳng + Nhãn tự do" (Flat Categorization + Custom Tagging)**:
1.  **Cột trụ chính (Hard Filter):** Bắt buộc đề thi phải thuộc 1 trong 6 môn học (Dùng Danh sách thả xuống - Dropdown). Điều này đảm bảo 100% đề thi sẽ dính chính xác vào 1 trong 6 thẻ UI của học sinh.
2.  **Linh hoạt phụ (Soft Tags):** Giáo viên có thể tự do gắn thêm vô số Nhãn (Tags) tùy thích để tự mình quản lý (Bằng cách gõ hashtag). Học sinh vẫn chỉ thấy ở thẻ Môn học, nhưng Giáo viên có thể tìm lại đề cũ bằng cách gõ tag.

## 3. ĐỐI TƯỢNG SỬ DỤNG
- **Primary:** Giáo viên Tiểu học (những người tạo bài tập, cần thao tác tạo nhanh, chọn lẹ).
- **Secondary:** Quản trị viên / Tổ trưởng chuyên môn (cần phân loại và kiểm tra đề).

## 4. NGHIÊN CỨU THỊ TRƯỜNG & ĐIỂM KHÁC BIỆT
### So với các hệ thống phổ thông:
| Cách làm | Điểm mạnh | Điểm yếu |
|-----|-----------|----------|
| **Chỉ dùng Cây Thư Mục** | Tự do xếp theo ý thích | Rất khó đồng bộ thiết kế lên App/Web cho Học sinh, dễ sinh rác. |
| **Chỉ dùng Hashtag (Tag)**| Cực kỳ linh hoạt | Giáo viên gõ sai chính tả thì tag bị loạn, học sinh khó lọc. |

### Điểm khác biệt của mình:
- **Đóng khung cái cần Đóng:** 6 môn học cố định, không thể lỗi, hiển thị lên trang UI của học sinh đẹp mượt mà.
- **Mở cái cần Mở:** Gắn hashtag phụ tự do (`#DeKiemTra15p`, `#ToanHinh`). Chiều chuộng thói quen tự quản lý file của thầy cô mà không làm ảnh hưởng đến học sinh.

## 5. TÍNH NĂNG CHI TIẾT

### 🚀 MVP (Bắt buộc có cho tính năng này):
- [ ] UI Quản lý Đề (Teacher Dashboard) có hàng Tab ngang: `[ Tất cả ] [ 🧮 Toán ] [ 📘 Tiếng Việt ] ... [ 🏆 IOE ]` để lọc nhanh đề thi theo môn.
- [ ] Modal / Màn hình Tạo Đề Mới bắt buộc có trường **Select (Dropdown)** để chọn "Môn học".
- [ ] Dưới phần chọn Môn có input để nhập **Nhãn (Tags)** (Ví dụ: ô input khi gõ phím Enter/Phẩy sẽ tạo ra một block nhãn).
- [ ] Giao diện danh sách đề của Giáo viên có hiển thị các Tags (ví dụ dạng pill nhỏ) bên dưới Tên Đề Thi.

### 🎁 Phase 2 (Làm sau):
- [ ] Gợi ý Auto-complete Tag cho giáo viên (VD: Gõ "Kiem" -> gợi ý "#KiemTraGiuaKy").
- [ ] Bộ lọc nâng cao: Lọc tất cả bài Toán có hashtag là "#Kho".

## 6. ƯỚC TÍNH SƠ BỘ
- **Độ phức tạp:** Trung bình (Cần cập nhật cấu trúc bảng D1 để thêm trường `category` lưu Môn học và bảng cấu trúc array `tags` lưu mã nhãn).
- **Rủi ro:** Khi migrate (chuyển đổi) các bài Quiz cũ, cần có cơ chế (script) tự động gạt chúng vào thẻ `all` hoặc gán môn mặc định (VD: Môn Khác).

## 7. BƯỚC TIẾP THEO
→ Chạy `/plan` để lên thiết kế chi tiết (Database Schema và Layout Components).
