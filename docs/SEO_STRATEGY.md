# Chiến lược SEO chi tiết cho ItOng Quiz (2024-2025)

Tài liệu này xác định các hướng đi chiến lược về từ khóa và tối ưu kỹ thuật để đưa thương hiệu **ItOng Quiz** lên vị trí dẫn đầu trong lĩnh vực giáo dục tiểu học tại địa phương và khu vực rộng hơn.

---

## 🔑 1. Chiến lược Từ khóa (Keyword Strategy)

Chúng ta không chỉ tập trung vào một vài từ khóa đơn lẻ, mà xây dựng một **Hệ sinh thái Từ khóa (Keyword Ecosystem)** để tiếp cận đa chiều.

### A. Nhóm Từ khóa "Sát sườn" (Curriculum-Led)
**Mục tiêu:** Tiếp cận học sinh/phụ huynh đang tìm tài liệu ôn bài mỗi tối.
*   **Toán Lớp 4 (Bộ sách Kết nối tri thức & Cánh Diều):**
    *   `Giải bài tập toán 4 bài [Tên bài]`
    *   `Trắc nghiệm Toán 4 Ôn tập số có 6 chữ số`
    *   `Đề kiểm tra giữa kì 1 Toán 4 năm 2024`
*   **Tiếng Việt Lớp 4:**
    *   `Luyện tập Tiếng Việt lớp 4 bài [Tên bài]` (Tiếng Việt rất mạnh về tìm kiếm nội dung bài đọc).
    *   `Trắc nghiệm Tiếng Việt lớp 4 Kết nối bài [Tên bài]`.

### B. Nhóm "Local SEO" (Thương hiệu địa phương)
**Mục tiêu:** Trở thành kết quả tìm kiếm số 1 tại Ít Ong/Mường La.
*   `Trường Tiểu học Ít Ong`
*   `Luyện thi học sinh giỏi Ít Ong Quiz`
*   `Tổ chuyên môn Trường Tiểu học Ít Ong`
*   `Kho tài liệu trắc nghiệm Ít Ong`

### C. Nhóm "AI & Công nghệ" (Teacher Empowerment)
**Mục tiêu:** Thu hút giáo viên dùng thử công cụ.
*   `Tạo đề thi trắc nghiệm từ file PDF online miễn phí`
*   `Chuyển đổi file Notion thành quiz trực tuyến`
*   `Phần mềm AI hỗ trợ giáo viên tiểu học soạn bài`
*   `Công cụ tạo bài tập trắc nghiệm tự động bằng AI`

---

## 🛠️ 2. Đề xuất Tối ưu Kỹ thuật (Technical SEO)

Web được phát triển bằng **Vite + React (SPA)** - đây là nền tảng nhanh nhưng cần cấu hình thêm để Google hiểu toàn bộ nội dung.

### A. Meta Tags Động (Dynamic Metadata)
1.  **Công cụ:** `react-helmet-async`.
2.  **Logic:** Khi chuyển URL, tiêu đề (`<title>`) và mô tả (`<meta description>`) phải thay đổi theo bài thi.
3.  **Cấu trúc ví dụ:** `[Tên Bài Thi] | Lớp [4] | ItOng Quiz`.

### B. Cấu trúc dữ liệu JSON-LD (Schema Markup)
1.  **Quiz Schema:** Giúp Google hiển thị bài thi kèm theo "Rich Snippets" (Số câu hỏi, Đánh giá 5 sao).
2.  **Breadcrumb Schema:** Giúp hiển thị thanh điều hướng trên Google: `Trang chủ > Lớp 4 > Môn Toán > ...`.
3.  **FAQ Schema:** Cho trang trợ giúp để chiếm nhiều không gian hơn trên trang kết quả tìm kiếm.

### C. Cơ chế Rendering & Sitemap
1.  **Sitemap:** Tự động hóa với `vite-plugin-sitemap`. File này sẽ gửi danh sách TẤT CẢ các URL bài thi lên Google hàng ngày.
2.  **Robots.txt:** Cấu hình để Google không "đốt" tài nguyên bò (crawl) vào các trang quản trị (Admin Dashboard) mà chỉ tập trung vào trang bài thi công khai.

### D. Hiệu năng & Trải nghiệm (Performance)
1.  **Core Web Vitals:** Tối ưu hóa **LCP** (tốc độ hiển thị khối nội dung lớn nhất) bằng cách nén ảnh sang định dạng `.webp`.
2.  **Cumulative Layout Shift (CLS):** Điểm quan trọng để web không bị "giật" lúc mới load, giúp người dùng cảm thấy web cao cấp và mượt mà.

---

## 📅 3. Lộ trình Triển khai Dự kiến

1.  **Giai đoạn 1:** Triển khai SEO Technical (Sửa code để có Metadata động).
2.  **Giai đoạn 2:** Dùng AI (Gemini) để viết hàng loạt "Mô tả SEO" cho các bộ đề thi hiện có.
3.  **Giai đoạn 3:** Xây dựng Sitemap và nộp lên Google Search Console.
4.  **Giai đoạn 4:** Xây dựng các trang Top-Level (Landing page cho khối lớp).

---
**Ghi chú:** Tài liệu này bản thảo chiến lược, chưa được nhúng trực tiếp vào mã nguồn sản phẩm.
