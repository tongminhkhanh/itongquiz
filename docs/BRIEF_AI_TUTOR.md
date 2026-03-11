# 💡 BRIEF: Bác Sĩ Cú Mèo - AI Emergency Tutor

**Ngày tạo:** 2026-03-11
**Brainstorm cùng:** Anh Khanh (Admin iTongQuiz)

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT

Khi học sinh làm bài kiểm tra bị điểm thấp (dưới 5), các em thường:
- Không biết mình sai ở đâu, sai vì lý do gì
- Không có ai giải thích lại ngay lúc đó
- Mất động lực, cảm giác tiêu cực khi thấy điểm đỏ

Giáo viên thì không thể ngồi kèm riêng từng em để giải thích lại từng câu sai.

## 2. GIẢI PHÁP ĐỀ XUẤT

**"Bác sĩ Cú Mèo"** — Một Gia sư AI xuất hiện ĐÚNG LÚC học sinh cần nhất (sau khi nộp bài bị điểm kém).

- 🩺 **Chẩn đoán:** AI phân tích các câu sai, xác định lỗ hổng kiến thức
- 💊 **Kê đơn:** AI giải thích ngắn gọn cách giải đúng (phù hợp trình độ tiểu học)
- 🏋️ **Trị liệu:** AI tự động tạo 3 câu hỏi mới cùng dạng để luyện tập ngay

## 3. ĐỐI TƯỢNG SỬ DỤNG

- **Primary:** Học sinh tiểu học (Lớp 1-5) bị điểm thấp
- **Secondary:** Phụ huynh (thấy con được chăm sóc cá nhân hóa → tin tưởng)

## 4. TRIGGER CONDITION (Khi nào Bác sĩ xuất hiện)

| Điều kiện | Giá trị |
|-----------|---------|
| Điểm bài kiểm tra | < 50% (dưới 5 điểm) |
| Loại bài | Bài do Giáo viên giao (Assignment) |
| Số câu sai tối thiểu | ≥ 3 câu |

## 5. USER FLOW CHI TIẾT

### Bước 1: Nộp bài → Hiện nút cầu cứu
Màn kết quả hiện: *"Đừng buồn! Bác sĩ Cú Mèo có thể giúp em!"*
→ Nút: 🆘 **"Gọi Bác sĩ Cú Mèo"**

### Bước 2: Chẩn đoán (3-5 giây loading)
AI đọc tối đa 3 câu sai nặng nhất → Tóm tắt lỗ hổng

### Bước 3: Giảng giải 1 câu
AI chọn 1 câu sai tiêu biểu → Giảng lại bằng ngôn ngữ trẻ em

### Bước 4: Tạo 3 câu luyện tập
AI sinh 3 câu MCQ mới cùng dạng, khác số liệu/ngữ cảnh

### Bước 5: Phần thưởng
- Đúng hết → 🎉 +50 Vàng, hiệu ứng pháo hoa
- Còn sai → Lưu vào Thư viện luyện tập để làm lại sau

## 6. TÍNH NĂNG

### 🚀 MVP (Phase 1 - Triển khai ngay):
- [ ] Backend API: `POST /api/ai-tutor/diagnose` (nhận resultId → trả về chẩn đoán + 3 câu mới)
- [ ] Frontend: Nút "Gọi Bác sĩ Cú Mèo" trên ResultScreen khi điểm < 50%
- [ ] Frontend: Modal/Pop-up hiển thị chẩn đoán + giải thích + 3 câu quiz mini
- [ ] Tích hợp Gemini API (Workers AI hoặc Google AI)

### 🎁 Phase 2 (Làm sau):
- [ ] Lưu lịch sử "Khám bệnh" vào database
- [ ] Thư viện luyện tập hiện đề AI đã sinh cho riêng từng em
- [ ] Dashboard Giáo viên xem thống kê "Lỗ hổng phổ biến nhất lớp"
- [ ] Giới hạn số lần gọi Bác sĩ/ngày (chống lạm dụng)

## 7. ƯỚC TÍNH

| Hạng mục | Đánh giá |
|----------|----------|
| Độ phức tạp | 🟡 Trung bình (1-2 tuần) |
| Chi phí API | Thấp (Gemini Free tier ~1500 req/ngày) |
| Rủi ro AI sai | Trung bình → Cần prompt engineering kỹ |
| Wow factor | ⭐⭐⭐⭐⭐ Cực cao |

## 8. BƯỚC TIẾP THEO
→ Chạy `/plan` để lên thiết kế kỹ thuật chi tiết (DB migration, API design, UI mockup)
