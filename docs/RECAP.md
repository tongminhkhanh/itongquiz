# 📊 PROJECT RECAP: itongquiz1
**Ngày báo cáo:** 17/02/2026
**Trạng thái:** ✅ Ổn định (Stable)

---

## 1. 🛠️ CÁC LỖI ĐÃ SỬA (RECENT FIXES)

### A. Lỗi Chấm Điểm & Hiển Thị (Critical)
| Loại lỗi | Mô tả | Giải pháp | Trạng thái |
|----------|-------|-----------|------------|
| **ORDERING** | Server luôn chấm Sai do lệch format (Object vs Array) | Chặn Server, dùng Client-side validation cho dạng này | ✅ Đã sửa |
| **ERROR_CORRECTION** | Server luôn chấm Sai (Tìm từ sai) | Thêm vào danh sách override, dùng Client-side validation | ✅ Đã sửa |
| **UNDERLINE** | Hiển thị sai kết quả | Thêm vào danh sách override | ✅ Đã sửa |
| **SCORE SYNC** | Tổng quan (27/30) lệch với Chi tiết (28/30) | Đồng bộ logic đếm: Cả 2 đều dùng `getAnswerStatus` mới | ✅ Đã sửa |

### B. Lỗi UI/UX
| Component | Mô tả | Giải pháp | Trạng thái |
|-----------|-------|-----------|------------|
| **Detail Tab** | Hiển thị "Sai" dù làm đúng | Override server result tại `DetailedAnswersTab` | ✅ Đã sửa |
| **Overview Tab** | Hiển thị "Sai" dù làm đúng | Override server result tại `ResultScreen` | ✅ Đã sửa |
| **Teacher View** | Giáo viên thấy kết quả sai | Cập nhật logic `calculateIsCorrect` trong Modal | ✅ Đã sửa |

### C. Lỗi Dữ Liệu (Google Sheets)
- **Riddle:** Đã map đúng các trường `riddleLines`, `answerLabel` xuống Sheet.
- **Dropdown:** Đã fix lỗi không lưu ảnh.
- **Image Question:** Đã fix lỗi không hiện input nhập đáp án.

---

## 2. 🏗️ CẤU TRÚC HIỆN TẠI (ARCHITECTURE STATUS)

### Hệ thống Validation
Hiện tại đang chạy chế độ **Hybrid Validation**:
1.  **Server-First (Ưu tiên):** Các dạng câu hỏi chuẩn (MCQ, Fill-in-blank) tin tưởng kết quả từ Google Apps Script.
2.  **Client-Override (Ngoại lệ):**
    -   `ORDERING`
    -   `UNDERLINE`
    -   `ERROR_CORRECTION`
    -   *Lý do:* Server GAS xử lý các dạng này chưa chuẩn hoặc format dữ liệu phức tạp.

### Hệ thống Hiển thị
-   **ResultScreen:** Đã được refactor để luôn tính toán lại điểm số dựa trên logic Hybrid trên.
-   **DetailedAnswersTab:** Đồng bộ logic với ResultScreen.

---

## 3. 🚀 BƯỚC TIẾP THEO (NEXT STEPS)

### Tính năng mới: Tạo tài khoản học sinh
**Mục tiêu:** Định danh học sinh, lưu lịch sử làm bài.

**Các vấn đề cần Brainstorm:**
1.  Cơ chế đăng ký (Tự đăng ký vs Giáo viên cấp)?
2.  Lưu trữ (Sheet vs Firebase)?
3.  Bảo mật (Password hashing)?

---

## 4. 📝 GHI CHÚ KỸ THUẬT (DEV NOTES)
-   File `gas_script.js` trên server chưa được cập nhật logic mới. Hiện tại Client đang "gánh" logic validation cho các câu hỏi phức tạp.
-   Nên cân nhắc update `gas_script.js` trong tương lai để đồng bộ logic.
