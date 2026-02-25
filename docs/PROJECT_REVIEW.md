# 📊 BÁO CÁO DỰ ÁN: itongquiz1

## 🎯 App này làm gì?
Đây là ứng dụng **Thi Trắc Nghiệm Online** dành cho học sinh tiểu học (it-ong-primary-school-quiz-app).
-   Học sinh làm bài thi (hỗ trợ nhiều dạng câu hỏi: trắc nghiệm, điền từ, nối, kéo thả...).
-   Chấm điểm tự động và hiển thị kết quả chi tiết.
-   Giáo viên có thể xem kết quả chi tiết của học sinh.

## 📁 Cấu trúc chính
```
src/
├── components/         # Giao diện (UI)
│   ├── student/        # Màn hình học sinh (làm bài, kết quả)
│   ├── teacher/        # Màn hình giáo viên (quản lý, thống kê)
│   └── ui/             # Các component nhỏ (nút, input...)
├── data/               # Dữ liệu mẫu (nếu có)
├── hooks/              # Logic tái sử dụng (useQuiz, useMathJax...)
├── services/           # Kết nối API (Google Form/Sheet)
├── types/              # Định nghĩa dữ liệu (TypeScript)
└── utils/              # Hàm tiện ích (format điểm, xử lý chuỗi)
```

## 🛠️ Công nghệ sử dụng
| Thành phần | Công nghệ |
|------------|-----------|
| **Core** | React 18, TypeScript, Vite |
| **Giao diện** | TailwindCSS, Lucide Icons |
| **State** | Zustand (quản lý trạng thái nhẹ) |
| **Xử lý file** | PapaParse (CSV), jsPDF (xuất PDF) |
| **AI** | Google GenAI (tích hợp Gemini) |
| **Testing** | Vitest, Cypress |

## 🚀 Cách chạy
```bash
npm install     # Cài thư viện
npm run dev     # Chạy thử (http://localhost:5173)
```

## 📍 Trạng thái hiện tại
✅ **Ổn định (Stable)**
-   Đã hoàn thiện luồng làm bài thi và chấm điểm.
-   Đã xử lý các lỗi validation phức tạp (Ordering, Error Correction).
-   Đã đồng bộ điểm số hiển thị.

## ⚠️ Lưu ý khi phát triển tiếp
1.  **Server Validation:** Logic trên server (Google Apps Script) đang cũ hơn client. Hiện tại client đang phải "ghánh" phần validation cho các câu hỏi phức tạp.
2.  **Next Feature:** Tính năng "Tạo tài khoản học sinh" đang được lên kế hoạch.

## 📝 Roadmap
-   [ ] **Account System:** Đăng ký/Đăng nhập cho học sinh.
-   [ ] **Database Migration:** Cân nhắc chuyển từ Sheet sang DB chuyên dụng nếu lượng user tăng.
-   [ ] **Mobile App:** Đóng gói thành app mobile (nếu cần).
