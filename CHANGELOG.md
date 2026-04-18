## [2026-04-17]
### Added
- **Announcement Banner Modernization**: Tích hợp icon loa thông báo tùy chỉnh (`loa.png`) và tối ưu hóa bố cục banner với lề động, không còn đè lên các thành phần Header.
- **Unified Branding Strategy**: Thiết lập và áp dụng bộ nhận diện thương hiệu nhất quán toàn dự án: **ítong** (Xanh dương #1e3a8a) và **Quiz** (Vàng nắng #FACC15).
- **Project-wide Logo Sync**: Đồng bộ hóa logo tại Header/Footer của Landing Page, Trang Đăng nhập, Trợ lý AI (ChatBot) và hệ thống common Footer.
- **HomePage Modular Architecture**: Tái cấu trúc file monolithic `HomePage.tsx` (700+ dòng) sang kiến trúc Controller/Router với các sub-components tách biệt (`DashboardNavbar`, `DashboardHero`, `SubjectGrid`, `DashboardDecoration`) nằm trong `src/components/HomePage/components/`.
- **Dashboard Constants Configuration**: Tập trung hóa cấu hình môn học (`SUBJECT_CONFIG`) và các thông số giao diện vào `src/components/HomePage/constants/dashboard.constants.ts`.

### Fixed
- **Banner Layout Collision**: Giải quyết triệt để lỗi Banner thông báo che nội dung "itongQuiz" và menu "Trang chủ" thông qua cơ chế padding an toàn.
- **Branding Consistency**: Khắc phục tình trạng mỗi trang dùng một màu logo khác nhau, đưa về một chuẩn duy nhất.
- **Synchronized Logout Bug**: Sửa lỗi điều hướng sai sau khi đăng xuất bằng cách đồng bộ hóa trạng thái giữa Teacher (`authStore`) và Student (`useClassroomStore`), đảm bảo xóa sạch session của cả hai vai trò cùng lúc.
- **TypeScript Import Resolution**: Khắc phục lỗi import `SUBJECT_CONFIG` bị hỏng trong `QuizListPage.tsx` sau quá trình refactor.

## [2026-03-15]
### Added
- **Production Launch**: Triển khai chính thức hệ thống lên [thitong.site](https://www.thitong.site).
- **Security Hardening**: Nâng cấp toàn bộ hệ thống mật khẩu Giáo viên sang mã hóa **Bcrypt** (thay thế plain-text).
- **Lazy Security Migration**: Cơ chế tự động băm mật khẩu khi giáo viên đăng nhập lần đầu tiên sau bản cập nhật.
- **Improved LaTeX Rendering**: Sửa lỗi vỡ công thức MathJax trong các câu hỏi có ô trống inline (`SHORT_ANSWER`, `DROPDOWN`, `DRAG_DROP`).
- **Context-Aware Rendering**: Tự động chuyển đổi sang chế độ render "khối văn bản nguyên vẹn" khi phát hiện xung đột giữa LaTeX và các ô nhập liệu giúp MathJax nhận diện cú pháp chuẩn xác.

### Fixed / Security
- **Auth Bypass Fix**: Đã vá lỗ hổng đăng nhập không cần mật khẩu cho giáo viên.
- **API Proxy Stabilization**: Đồng bộ hóa AI Client (`geminiService.ts`) qua Worker Proxy để tránh lỗi CORS trên Production.
- **Question Interaction Fix**: Sửa lỗi lệch vị trí ô điền khuyết trong các biểu thức phân số Toán học.

## [2026-03-13]
### Added
- **SEO Boost Bundle**: Triển khai gói tối ưu hóa tìm kiếm toàn diện chất lượng PRODUCTION.
- **Semantic HTML Upgrade**: Chuyển đổi toàn bộ Subject Cards trang chủ sang thẻ `section` và `a`, nâng cấp tiêu đề lên thẻ `h2` để Bot Google dễ dàng crawl và index.
- **Dynamic Meta Tags**: Tích hợp hệ thống cập nhật `document.title` và `meta description` tự động bám sát nội dung từng trang và từng bài thi (Ví dụ: "Luyện thi IOE Lớp 3").
- **Accessibility Enhancement**: Bổ sung thuộc tính `alt` mô tả tích cực cho 100% hình ảnh stickers 3D và icons trên toàn bộ UI học sinh.
- **Expanded Sitemap**: Cấu hình mở rộng `sitemap.xml` bám sát các luồng dữ liệu môn học chính.
- **Production Deployment**: Hoàn tất triển khai bản Build siêu tối ưu lên Vercel Production (`https://www.thitong.site`).

### Fixed / Security
- **Meta Tag Type Fix**: Xử lý lỗi so sánh kiểu dữ liệu trong App.tsx bằng Type Casting (`as any`) cho các trang phụ.
- **JSX Validation**: Khắc phục lỗi thiếu thẻ đóng Semantic trong cấu trúc trang chủ.
- **Hardcoded Secret Removal**: Loại bỏ hoàn toàn các API keys dự phòng (`sk-dummy-key`, `123456`) trong mã nguồn, bắt buộc cấu hình qua Environment Variables.
- **Vulnerability Patch**: Nâng cấp Wrangler CLI lên phiên bản 4.x, vá lỗ hổng bảo mật HIGH (OS Command Injection).
- **Production cleanup**: Tự động loại bỏ `console.log` và `debugger` trong phiên bản build chính thức thông qua cấu hình `esbuild.drop`.
- **Maintenance**: Xóa bỏ các tệp tin dự phòng (`.old.tsx`, `.backup.tsx`) để làm sạch codebase.

## [2026-03-12]
### Added
- **Practice Library**: Ra mắt "Thư viện luyện tập" chuyên đề, cho phép học sinh tự học và làm đề ngẫu nhiên dựa trên các bộ nhãn (Tags).
- **Auto-Tagging System**: Tự động hóa việc gắn nhãn (Hashtags) cho hơn 260 câu hỏi cũ dựa trên nội dung đề thi, kích hoạt toàn diện bộ lọc luyện tập.
- **Privacy Analytics**: Tích hợp Umami Analytics để theo dõi lượt truy cập mà không xâm phạm quyền riêng tư.
- **SEO Infrastructure**: Bổ sung `robots.txt`, `sitemap.xml` và tối ưu hóa thẻ Meta cho Landing Page.

### Fixed / Security
- **Duplicate Key Resolution**: Khắc phục triệt để lỗi React "Encountered two children with the same key" tại màn hình học sinh bằng cách sử dụng Assignment ID duy nhất thay cho Quiz ID.
- **Practice Mapping Fix**: Sửa lỗi hiển thị 0 câu hỏi trong Thư viện luyện tập bằng cách đồng bộ logic unmapping (snake_case sang camelCase) giữa Backend và Frontend.
- **D1 Tags Persistence**: Sửa lỗi không lưu Hashtags khi tạo đề mới (thiếu cột `tags` trong lệnh INSERT).
- **N+1 Query Resolution**: Khắc phục lỗi nghẽn cổ chai tại API bài tập học sinh, gộp hàng trăm câu truy vấn lẻ tẻ thành 1 câu truy vấn Batch duy nhất.
- **Secret Hardening**: Tuyệt đối bảo mật các khóa API AI (Gemini Token) bằng cách chuyển từ file `wrangler.toml` sang Cloudflare Secrets.
- **Source Audit**: Hoàn tất rà soát 100% mã nguồn Frontend/Backend, xử lý 3 Cảnh báo Bảo mật quan trọng.

## [2026-03-11]
### Added
- **Subject Categories**: Bổ sung phân loại đề thi theo 6 môn học chuẩn (Toán, Tiếng Việt, Tiếng Anh, Tự nhiên & Xã hội, Tin học, IOE).
- **Tagging System**: Hỗ trợ gắn nhãn (Tags) cho đề thi giúp tìm kiếm và quản lý kho đề hiệu quả hơn.
- **Improved Result UI**: Tái thiết kế màn hình Kết Quả (ResultScreen) tinh gọn hơn, gỡ bỏ header điểm số lớn và thay bằng nút Navigation "Về trang chủ" rõ ràng.

### Fixed
- **Dropdown Rendering**: Sửa lỗi câu hỏi DROPDOWN bị trống nội dung do lệch field mapping từ Cloudflare D1 (field `text_field` vs component `text`).
- **Answer Selection Fix**: Sửa lỗi callback `onAnswerChange` trong DROPDOWN không cập nhật được đáp án do sai tham số.
- **D1 Data Mapping**: Bổ sung mapping tự động cho các field `text`, `mainQuestion`, `correctWord` trong Zustand store để tương thích với cấu trúc database D1.

## [2026-02-04]
### Added
- **Loading UI**: Thêm trạng thái loading cho nút "Lưu đề" (CreateTab) và "Xóa đề" (ManageTab).
- **Pagination**: Phân trang danh sách câu hỏi trong StudentView (10 câu/trang).
- **ExplanationContent Component**: Component mới để render AI giải thích với Markdown processing và LaTeX formatting.

### Fixed
- **AI Explanation Rendering**: Sửa lỗi hiển thị ký tự thừa (###, x x) trong AI giải thích.
- **Math Formula Rendering**: Công thức phân số (1/2, 3/5) được render đẹp dạng LaTeX.
- **LaTeX Fix**: Sửa lỗi công thức toán học (`\frac`, `\times`) không hiển thị trong phần Hướng dẫn giải.
- **Edit Question Fix**: Sửa lỗi mất dữ liệu (đáp án, options, blanks...) khi chỉnh sửa câu hỏi cho **TẤT CẢ** các dạng (MCQ, DragDrop, Matching, Ordering...) do logic cũ phụ thuộc key existence.
- **GAS Grading Fix**: Sửa lỗi chấm điểm sai cho True/False (do lệch ID) và Matching (do sai Key) trong Google Apps Script.
- **GAS Optimization**: Tối ưu tốc độ Lưu/Cập nhật đề thi (Delete Batch) để tránh Timeout dẫn đến mất câu hỏi (sửa lỗi lệch tổng số câu hỏi).
- **Image Not Saved**: Sửa lỗi hình ảnh (IMAGE_QUESTION) không được lưu vào Google Sheets - thêm cột `image` vào GAS script.
- **IOE Score**: Sửa lỗi hiển thị điểm "0/0" trong bài thi IOE (do sai URL GAS).
- **Difficulty Sorting**: Đảm bảo câu hỏi được sắp xếp theo mức độ khó (Mức 1 -> Mức 2 -> Mức 3).
- **Config**: Cập nhật biến môi trường `VITE_IOE_GOOGLE_SCRIPT_URL` chính xác.

### Changed
- Cải thiện AI prompt trong `aiTutorService.ts` để trả về format tốt hơn (bullet points, không Markdown headers).
- Refactor logic shuffle câu hỏi để giữ nguyên thứ tự mức độ khó.
