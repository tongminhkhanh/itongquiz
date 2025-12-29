# 📝 OCR Exam to Word (Free & Open Source)

Ứng dụng desktop xây dựng bằng Python giúp chuyển đổi đề thi từ định dạng PDF (bao gồm cả file scan/ảnh) sang file Word (.docx) có thể chỉnh sửa được.

Ứng dụng sử dụng 100% công cụ miễn phí, chạy offline trên máy cá nhân, đảm bảo bảo mật dữ liệu.

## 🚀 Tính năng chính

*   **Hai chế độ xử lý linh hoạt:**
    *   ⚡ **PDF Văn bản (Native):** Trích xuất siêu tốc, chính xác 100% với file PDF gốc (digital).
    *   📷 **PDF Scan/Ảnh (OCR):** Sử dụng AI để đọc chữ từ file scan, ảnh chụp bằng điện thoại.
*   **Hỗ trợ Tiếng Việt:** Tích hợp gói ngôn ngữ tiếng Việt cho khả năng nhận diện tốt.
*   **Trình chỉnh sửa trực quan:** Giao diện so sánh song song (Ảnh gốc - Văn bản trích xuất) để sửa lỗi trước khi lưu.
*   **Xuất Word thông minh:** Tự động định dạng (in đậm các câu hỏi) khi xuất ra file `.docx`.

## 🛠️ Yêu cầu hệ thống

Trước khi chạy mã nguồn, bạn cần cài đặt các phần mềm bổ trợ sau:

### 1. Python
Cài đặt Python (phiên bản 3.8 trở lên).

### 2. Tesseract OCR (Bộ máy nhận diện chữ)
*   **Tải về:** [Tesseract-OCR-w64-setup.exe](https://github.com/UB-Mannheim/tesseract/wiki)
*   **Cài đặt:**
    *   Chạy file cài đặt.
    *   Trong bước chọn component, mở rộng phần `Additional script data` và `Additional language data`.
    *   Tìm và tích chọn **Vietnamese**.
    *   Ghi nhớ đường dẫn cài đặt (Mặc định: `C:\Program Files\Tesseract-OCR`).

### 3. Poppler (Bộ xử lý PDF)
*   **Tải về:** [Poppler Release](https://github.com/oschwartz10612/poppler-windows/releases/) (Chọn file `.zip` mới nhất).
*   **Cài đặt:**
    *   Giải nén file zip.
    *   Copy thư mục con `bin` vào một nơi cố định (VD: `C:\Program Files\poppler\bin`).
    *   Thêm đường dẫn `C:\Program Files\poppler\bin` vào biến môi trường **System PATH** của Windows.

## 📦 Cài đặt thư viện Python

Mở Terminal (CMD/PowerShell) và chạy lệnh sau để cài các thư viện cần thiết:

