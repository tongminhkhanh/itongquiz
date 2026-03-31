# 💡 BRIEF: HỆ THỐNG AI SINH ĐỀ TOÁN (AI QUESTION ENGINE)

**Ngày tạo:** 24/03/2026
**Dự án:** iTongQuiz
**Brainstorm cùng:** Long (Antigravity Partner)

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
- AI hiện tại khi sinh câu hỏi (đặc biệt là Toán/Phân số) thường gặp lỗi "lưỡng tính": Trộn lẫn Text và cú pháp LaTeX `\frac{}{}`, lồng HTML/Markup `<select>`, `[N]` sai chỗ khiến Frontend (React/MathJax) không thể render được.
- Gây ra lỗi hiển thị (Vd: `\frac{` lộ ra ngoài) và rò rỉ đáp án (lộ nguyên câu `[20]`).

## 2. GIẢI PHÁP ĐỀ XUẤT (THE "BRAIN")
Xây dựng một kiến trúc "Bộ não sinh đề" (AI Question Engine) gồm 3 lớp bảo vệ (3 Layers of Defense):
1.  **Lớp Prompt (Data-driven Schema + Self-Correction):** Ép AI trả về JSON chuẩn, có bước `thought_process` tự kiểm duyệt cú pháp ngoặc nhọn `{}` và ngoặc đô-la `$`.
2.  **Lớp Backend Validator (Trình biên dịch MathJax giả lập):** Dùng Script kiểm tra tàng hình ở Node.js/Next.js chạy thử chuỗi LaTeX AI đẻ ra. Nếu lỗi -> Bắn tín hiệu bắt AI làm lại (Auto-Retry).
3.  **Lớp Frontend & Teacher Review (Human-in-the-loop):** Giao diện riêng cho giáo viên xem nháp và sửa lỗi sai bằng click-chuột trước khi đẩy cho học sinh.

## 3. ĐỐI TƯỢNG SỬ DỤNG
-   **Primary:** Hệ thống tự động (API) - Gọi LLM để sinh đề.
-   **Secondary:** Giáo viên - Người duyệt đề và chỉnh sửa các lỗi nhỏ (nếu sót).

## 4. TÍNH NĂNG CHI TIẾT

### 🚀 MVP (Bắt buộc có ngay để chạy ổn định):
- [ ] **1. System Prompt Template (Prompts/Math_Question_Generator.txt):**
    - Cấu trúc Zero-shot / Few-shot với 3 ví dụ Tốt, 1 ví dụ Xấu.
    - Ép AI sinh `[N]` bên trong công thức (Vd: `$\frac{[1]}{4}$`) cho các câu điền khuyết số.
- [ ] **2. JSON Schema Enforcer (Công cụ Zod):**
    - Ép kiểu dữ liệu trả về của AI để Frontend có thể móc nối chính xác các `blanks` với `text`.
- [ ] **3. Backend Regex/Syntax Check đơn giản:**
    - Kiểm tra số lượng dấu `$` phải chẵn.
    - Chữ và công thức phải CÁCH NHAU bằng khoảng trắng.

### 🎁 Phase 2 (Nâng cao độ chính xác lên 99%):
- [ ] **4. Multi-Agent RAG (Auto QA):**
    - Một Agent phụ chuyên đọc lại đề của Agent chính để bắt lỗi cú pháp.
- [ ] **5. Giả lập KaTeX/MathJax Validator:**
    - `katex.renderToString(math)` tại Server để búng lỗi Compile Error trước khi lưu Database.
- [ ] **6. Dynamic Scaffolding:**
    - AI tự phân tầng độ khó dựa trên cấu hình (Ví dụ: Lớp 3 thì mẫu số quy đồng không quá 20).

### 💭 Backlog (Ý tưởng tương lai):
- [ ] **7. Tab "Drafts & WYSIWYG Editor":**
    - Chỗ dành cho giáo viên Preview đề dưới hình thức học sinh và click đúp vào text để Edit nóng lỗi do AI đẻ ra.

## 5. ƯỚC TÍNH SƠ BỘ
-   **Độ phức tạp:** Trung bình (Medium). Đòi hỏi kĩ năng Prompt Engineering và viết Zod Schema cứng tay.
-   **Rủi ro:**
    - Càng ép AI viết JSON phức tạp thì thời gian phản hồi (Latency) API càng chậm.
    - Xử lý Retry nếu AI liên tục làm sai có thể gây tốn token API ($$). Cần limit tối đa 3 lần retry.

## 6. KIẾN TRÚC SYSTEM PROMPT ĐỀ XUẤT (Tham khảo)
```json
// AI BẮT BUỘC TRẢ VỀ:
{
  "thought_process": "Đề yêu cầu P/S tĩnh. Tôi tạo $\\frac{1}{2}$. Yêu cầu điền khuyết tử số -> Tôi bọc $\\frac{[1]}{2}$. Validate: Ngoặc { đóng đủ.",
  "question": {
    "text": "Điền vào chỗ trống: $\\frac{[1]}{2} = 0.5$",
    "blanks": [ { "id": "1", "answer": "1", "options": ["1","2","3"] } ]
  }
}
```

## 7. BƯỚC TIẾP THEO
→ Hoàn thành thảo luận Brainstorm.
→ Chạy lệnh `/plan` để AI thiết kế bản vẽ kỹ thuật chi tiết (API Endpoint, Zod Schema TypeScript, Component cho quá trình sinh đề).
