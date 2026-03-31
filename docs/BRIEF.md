# 💡 BRIEF: Nâng Cấp "Bộ Não" AI iTongQuiz (Lớp 3 & 4)

**Ngày cập nhật:** 2026-03-27
**Trạng thái:** Brainstorming - Đang chờ duyệt ý tưởng nâng cấp "Bộ não" chuyên sâu

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT (Pain Points)
- **AI ảo giác (Hallucination):** AI thường tự chế ra các từ vựng hoặc khái niệm chưa học (ví dụ: lớp 3 chưa học số thập phân nhưng AI vẫn cho vào đề).
- **Thiếu tính xác thực (Grounding):** Đề bài không bám sát 100% nội dung bài học trong bộ sách **Cánh Diều** và **Kết nối tri thức**.
- **Độ khó không đồng đều:** AI khó kiểm soát được mức độ (Nhận biết, Thông hiểu, Vận dụng) theo ma trận đề thi chuẩn của Bộ GD&ĐT.
- **Tốn thời gian chỉnh sửa:** Giáo viên vẫn phải soát lỗi chính tả và logic toán học sau khi AI tạo đề.

## 2. GIẢI PHÁP ĐỀ XUẤT: "BỘ NÃO 4.0 - TRỢ LÝ GIÁO VIÊN TOÀN NĂNG"
Nâng cấp từ một Prompt đơn giản thành một **Hệ thống Đa tầng (Multi-layered System)** để đảm bảo tính chuẩn xác tuyệt đối.

## 3. ĐỐI TƯỢNG SỬ DỤNG
- **Giáo viên tiểu học (Chính):** Cần tạo phiếu bài tập, đề kiểm tra định kỳ nhanh và chuẩn.
- **Phụ huynh (Phụ):** Muốn con ôn tập đúng trọng tâm bài học trên lớp.

## 4. CHI TIẾT NÂNG CẤP "BỘ NÃO"

### 🚀 GIAI ĐOẠN 1: MVP (Bắt buộc - Tập trung vào Độ Chính Xác)

#### 🛡️ Mô-đun 1: Textbook Vault (RAG - Truy xuất kiến thức chuẩn)
- **Ý tưởng:** Xây dựng kho dữ liệu số hóa từ SGK Cánh Diều & Kết nối tri thức (Toán, Tiếng Việt lớp 3, 4).
- **Cơ chế:** AI phải "tra cứu" bài học tương ứng trước khi ra đề để lấy từ vựng, ngữ cảnh chuẩn.
- **Mục tiêu:** 100% không dùng kiến thức ngoài chương trình.

#### ⚖️ Mô-đun 2: Curriculum Guardrails (Ràng buộc chương trình)
- **Ý tưởng:** Một "Bản đồ chương trình" (Curriculum Map) quy định phạm vi kiến thức theo từng tuần/học kỳ.
- **Mục tiêu:** AI tự động giới hạn số liệu và khái niệm ngữ pháp đúng theo tiến độ lớp 3, 4.

#### ✅ Mô-đun 3: Validation Chain (Quy trình xác minh đa lớp)
- **Bước 1 (Generate):** Tạo câu hỏi theo yêu cầu.
- **Bước 2 (Verify):** Một tác nhân AI khác (Validator) kiểm tra lại đáp án toán học và tính phù hợp của ngôn ngữ. Chỉ xuất kết quả sau khi Pass.

---

### 🎁 GIAI ĐOẠN 2: Nâng Cấp Trải Nghiệm (Visual & Storytelling)

#### 🎨 Mô-đun 4: Contextual Visual Prompting
- **Ý tưởng:** Tự động tạo mô tả hình ảnh (English prompt) cho từng câu hỏi để tích hợp tạo ảnh minh họa.
- **Mục tiêu:** Đề bài sinh động, có hình vẽ minh họa đúng nội dung.

#### 📖 Mô-đun 5: Storytelling Engine
- **Ý tưởng:** Biến danh sách bài tập thành một chuyến phiêu lưu (vd: Giải toán để giúp Muông thú tìm đường về rừng).

---

## 5. CÁC DẠNG BÀI TRỌNG TÂM

| Môn | Dạng bài nâng cấp |
|-----|-------------------|
| **Toán** | Giải toán có lời văn (trung bình cộng, tổng-hiệu), Tính toán nhiều bước, Hình học trực quan. |
| **Tiếng Việt** | Đọc hiểu văn bản theo 3 mức độ, Luyện từ và câu (Danh, Động, Tính từ), Viết đoạn văn theo gợi ý. |

## 6. ƯỚC TÍNH KỸ THUẬT
- **Công nghệ:** Vector Database (Supabase/D1) + Gemini 2.0 Flash + Multi-Agent Workflow.
- **Độ phức tạp:** Trung bình - Cao (Cần chuẩn hóa dữ liệu SGK).

## 7. BƯỚC TIẾP THEO
1. **[Xác nhận]** Anh xem các Modul trên có đúng hướng anh muốn nâng cấp không?
2. **[Chuẩn bị]** Thu thập file PDF SGK (Cánh Diều, Kết nối tri thức) lớp 3, 4.
3. **[Build]** Triển khai Curriculum Map JSON cho lớp 3 và 4.
