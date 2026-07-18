# 🐧 Dự án itongquiz - AI Primary School Quiz App

## 📋 Tổng quan
**itongquiz** là một ứng dụng web giáo dục hiện đại, được thiết kế đặc biệt cho học sinh và giáo viên Tiểu học (Lớp 1-5) tại Việt Nam. Ứng dụng tích hợp trí tuệ nhân tạo (Generative AI) để tự động hóa việc tạo đề, ôn tập và gia sư ảo, giúp cá nhân hóa lộ trình học tập và giảm tải công việc cho giáo viên.

## ✨ Tính năng cốt lõi

### 1. Hệ thống sinh đề AI (AI Quiz Generator)
*   **Đa dạng môn học:** Toán học, Tiếng Việt, Tự nhiên & Xã hội, Tiếng Anh, Tin học.
*   **Hỗ trợ luyện thi:** Chuyên mục riêng cho **Trạng nguyên Tiếng Việt**, VioEdu và các bộ đề ôn tập theo lớp.
*   **Đa dạng loại câu hỏi:**
    *   Trắc nghiệm (MCQ), Đúng/Sai, Nối cột (Matching).
    *   Kéo thả điền khuyết (Drag & Drop), Phân loại (Categorization).
    *   Sắp xếp chữ cái (Word Scramble), Giải đố (Riddle).
*   **Hỗ trợ LaTeX:** Hiển thị công thức Toán học và phân số chuẩn xác.

### 2. Trợ lý học tập & Tính năng chuyên sâu (Deep Features)
*   **AI Tutor:** Gia sư ảo hỗ trợ giải đáp thắc mắc và hướng dẫn học sinh làm bài theo ngữ cảnh.
*   **AI Reviewer:** Tự động kiểm tra tính chính xác về kiến thức sư phạm và định dạng kỹ thuật của đề thi.
*   **Smart Distractor Service:** Tự động tạo các phương án nhiễu thông minh, logic để tránh việc học sinh đoán mò.
*   **Classroom Management:** Hệ thống quản lý lớp học, theo dõi tiến độ và xếp hạng học sinh.
*   **Gift Shop (Hệ thống quà tặng):** Học sinh tích lũy điểm thưởng từ việc làm bài để đổi lấy các phần quà ảo hoặc vật phẩm trong ứng dụng.
*   **Xử lý tài liệu:** Trích xuất nội dung từ file PDF để tạo câu hỏi sát với chương trình học.
*   **Tạo ảnh bằng AI:** Tự động tạo hình ảnh minh họa sinh động cho các câu hỏi.

### 3. Trải nghiệm người dùng & Gamification
*   **Chế độ học sinh:** Giao diện trực quan, rực rỡ, kèm hiệu ứng confetti và âm thanh khi hoàn thành.
*   **Hệ thống tiến độ:** Theo dõi điểm số, thời gian làm bài và lịch sử luyện tập.
*   **Bảng điều khiển giáo viên:** Quản lý kho đề, theo dõi kết quả của cả lớp.

## 🛠 Công nghệ sử dụng (Tech Stack)

### Frontend
*   **Framework:** React 19 + Vite.
*   **Ngôn ngữ:** TypeScript.
*   **Styling:** Tailwind CSS (v4) + Headless UI.
*   **Animation:** Framer Motion (hiệu ứng mượt mà).
*   **State Management:** Zustand (quản lý trạng thái gọn nhẹ).

### Backend & AI
*   **AI Engine:** Google Gemini AI (Model: Flash/Pro).
*   **Serverless:** API chạy trên Cloudflare Workers.
*   **Database:** Cloudflare D1 (SQLite).
*   **Storage:** Cloudflare R2 / KV.

## 📂 Cấu trúc dự án tiêu biểu
```text
src/
├── components/         # Các thành phần UI (StudentView, TeacherDash, etc.)
├── services/           # Logic xử lý AI (geminiService, aiTutorService)
├── config/             # Hệ thống hằng số và System Prompt
├── schemas/            # Định nghĩa cấu trúc dữ liệu (Zod validation)
├── hooks/              # Custom hooks quản lý logic
├── utils/              # Các hàm bổ trợ (DateFixer, JSON Repair)
└── styles/             # Cấu hình CSS và Theme
```

## 🚀 Định hướng phát triển
1.  **Tích hợp RAG:** Sử dụng Retrieval-Augmented Generation để AI tạo câu hỏi dựa trên kho dữ liệu SGK chính thống.
2.  **Mở rộng Mindmap:** Tự động hóa việc tạo sơ đồ tư duy cho mỗi bài học.
3.  **Hỗ trợ đa định dạng:** Đọc và xử lý trực tiếp file Word (.docx) và PowerPoint (.pptx).
4.  **Cá nhân hóa sâu:** Sử dụng AI để gợi ý bài tập dựa trên các lỗ hổng kiến thức của từng học sinh.

---
*Dự án được phát triển bởi **OWNER/itongquiz**.*
