# 📊 BÁO CÁO DỰ ÁN: IT Ong Quiz App

## 🎯 App này làm gì?
Ứng dụng web giúp giáo viên tiểu học tạo đề thi trắc nghiệm nhanh chóng bằng AI (Gemini), hỗ trợ tạo đề từ file PDF, và tích hợp ngân hàng câu hỏi IOE/Trạng Nguyên. Học sinh có thể làm bài trực tuyến và xem kết quả ngay lập tức.

## 📁 Cấu trúc chính
`src/`
├── `components/`    # Giao diện (TeacherDashboard, StudentView)
├── `services/`      # Xử lý logic AI (Gemini), IOE API
├── `stores/`        # Quản lý dữ liệu (Zustand)
└── `hooks/`         # Logic tái sử dụng (useQuizManager)

## 🛠️ Công nghệ sử dụng
| Thành phần | Công nghệ |
|------------|-----------|
| Tech Stack | React 19 + Vite + TypeScript |
| Giao diện | TailwindCSS v4 |
| State | Zustand |
| AI Service | Google Gemini + Perplexity |
| Testing | Vitest + Cypress |

## 🚀 Cách chạy
```bash
npm install
npm run dev
# Mở http://localhost:3001
```

## 📍 Trạng thái hiện tại
- **Loading UI**: Đã thêm spinner cho chức năng Lưu/Xóa đề (tránh spam click).
- **Pagination**: Đã phân trang 10 câu/trang cho học sinh (StudentView).
- **Sorting**: Đã tự động sắp xếp câu hỏi theo độ khó (Mức 1 -> Mức 2 -> Mức 3).
- **IOE**: Đã sửa lỗi hiển thị điểm số (fix URL GAS).
- **Documentation**: Đã lưu trữ context vào `.brain/`.

## ⚠️ Lưu ý khi tiếp nhận
1. **Environment**: Cần file `.env.local` chứa API Key của Google Gemini, Perplexity và URL của Google Apps Script.
2. **Database**: Project sử dụng Google Apps Script (GAS) làm database nhẹ (Excel-as-a-DB).
3. **AI Prompt**: Logic tạo đề nằm chủ yếu trong `src/services/geminiService.ts`, cần cẩn trọng khi sửa đổi prompt.
