# 💡 BRIEF: ítong Homework Center

**Ngày tạo:** 2026-04-20
**Trạng thái:** Brainstorming Completed ➔ Pending Implementation
**Kiến trúc sư:** Antigravity (Minh)

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
Giáo viên mất quá nhiều thời gian (3-4 tiếng/tối) để chấm các bài tập viết tay trên giấy. Các hệ thống hiện tại chủ yếu hỗ trợ trắc nghiệm hoặc chỉ dừng lại ở việc upload ảnh mà không có sự hỗ trợ thông minh từ AI để nhận xét sâu sắc.

## 2. GIẢI PHÁP ĐỀ XUẤT
Xây dựng một "Trung tâm bài tập" tích hợp trực tiếp vào hệ thống ítongQuiz, cho phép:
- Giáo viên giao bài linh hoạt (PDF, Word, Ảnh).
- Học sinh nộp bài bằng cách chụp ảnh điện thoại.
- AI (Gemini Vision) tự động đọc chữ viết tay, chấm điểm theo logic và đưa ra nhận xét cá nhân hóa.

## 3. ĐỐI TƯỢNG SỬ DỤNG
- **Tiểu học & THCS:** Học sinh cần viết tay để rèn luyện tư duy và nét chữ.
- **Giáo viên:** Cần công cụ trợ lý để giảm tải 80% khối lượng chấm bài.

## 4. NGHIÊN CỨU THỊ TRƯỜNG
| Đối thủ | Điểm mạnh | Điểm yếu |
|:--- |:--- |:--- |
| Azota | Upload ảnh nhanh, đồng bộ Zalo | AI chấm điểm tự luận còn yếu. |
| Gradescope | AI Answer Grouping mạnh | Khó dùng tại VN, không tối ưu chữ viết tay Tiếng Việt. |

**🚀 Điểm khác biệt của ítongQuiz:**
- Sử dụng **Semantic Grading**: Hiểu logic bài làm thay vì chỉ check từ khóa.
- **Feedback thông minh**: AI viết nhận xét như một giáo viên thực thụ, chỉ rõ lỗi sai trên ảnh.

## 5. TÍNH NĂNG CHI TIẾT

### 🚀 Phase 1: MVP (Bắt buộc có)
- [ ] **Smart Publisher**: Giáo viên upload đề bài đa định dạng.
- [ ] **Mobile Submission**: Học sinh chụp ảnh, tự động nén (Client-side) và upload lên Cloudinary.
- [ ] **AI Vision Grader**: Nhận diện chữ viết tay Tiếng Việt và đề xuất điểm số.
- [ ] **Confidence Check**: Gắn cờ các bài làm AI không chắc chắn để giáo viên ưu tiên chấm tay.

### 🎁 Phase 2 (Nâng cao)
- [ ] **Anti-Plagiarism**: AI phát hiện bài làm có góc chụp hoặc nét chữ giống hệt nhau.
- [ ] **Answer Clustering**: Nhóm các lỗi sai phổ biến để chấm hàng loạt.
- [ ] **Voice Feedback**: Giáo viên có thể ghi âm nhận xét cho học sinh.

## 6. THÔNG SỐ KỸ THUẬT (@senior-standard)
- **Frontend Framework:** React 19 + Vite.
- **Storage Strategy:** Cloudinary (Unsigned Uploads).
- **AI Engine:** Google Gemini 1.5 Pro (via Cloudflare Proxy).
- **Optimization:** `browser-image-compression` (Target: <500KB per image).

## 7. BƯỚC TIẾP THEO
→ Thực thi `implementation_plan.md` bắt đầu từ việc setup folder và cài đặt dependencies.
