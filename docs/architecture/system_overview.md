# 🏗️ System Overview - ítongQuiz

## 1. Kiến trúc Tổng quan
Hệ thống được xây dựng theo mô hình **Next.js/Vite Frontend** và **Cloudflare Workers Backend**, sử dụng **Zustand** cho state management và **TailwindCSS 4** cho styling.

## 2. Component Architecture (Modern Modular Approach)
Dự án đang chuyển đổi từ cấu trúc monolithic sang kiến trúc **Feature-based** để tăng khả năng bảo trì và tái sử dụng.

### A. Quiz Player Module (`src/features/quiz-player/`)
Đây là module cốt lõi dành cho giao diện học sinh làm bài:
- **`useQuizPlayer.ts`**: Hook tập trung quản lý logic nghiệp vụ (Timer, Anti-cheat, xáo trộn).
- **`utils/quizScoring.ts`**: Single Source of Truth cho việc tính điểm 14+ loại câu hỏi.
- **UI Shell**: `StudentView.tsx` chỉ đóng vai trò điều phối.

### B. HomePage Module (`src/components/HomePage/`)
Kiến trúc Controller/Router cho Trang chủ Dashboard:
- `DashboardNavbar` (Navigation)
- `DashboardHero` (Main landing title)
- `SubjectGrid` (Subject selection)
- `DashboardDecoration` (VFX & Stickers)

## 3. Quy trình Chấm điểm (Scoring Pipeline)
Quy trình chấm điểm được thực hiện song song để đảm bảo tính minh bạch và bảo mật:
1. **Client-side Scoring**: `quizScoring.ts` tính điểm ngay lập tức sau khi nộp để hiển thị kết quả UI.
2. **Server-side Validation**: API `/api/validate` kiểm chứng lại đáp án để lưu vào Database và chống hack.
3. **Synchronization**: Kết quả cuối cùng được merge, ưu tiên AI logic và client overrides cho các dạng câu hỏi phức tạp (Ordering, Underline).

## 4. Academic Logic
- **`shuffleWithinLevel`**: Đề thi được xáo trộn câu hỏi nhưng luôn giữ nguyên trình tự: Mức độ 1 (Dễ) -> Mức độ 2 (Trung bình) -> Mức độ 3 (Khó).
- **Branding**: Nhận diện thương hiệu ítongQuiz với mã màu chuẩn #1e3a8a và #FACC15.
