# 💡 BRIEF: Notion-AI Smart Quiz Automation
**Ngày tạo:** 2026-03-31
**Trạng thái:** [Planned]

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
Giáo viên có lượng lớn dữ liệu bài học thô (SGK, ghi chú) trên Notion. Việc sao chép thủ công vào hệ thống ra đề tốn thời gian và dễ sai sót. Cần một cơ chế để hệ thống tự động "đọc" kiến thức từ Notion.

## 2. GIẢI PHÁP ĐỀ XUẤT (Zero-click Integration)
Xây dựng luồng tự động tìm kiếm nội dung trên Notion dựa trên chủ đề (Topic) mà giáo viên nhập vào.

### Quy trình:
1. **Input**: Giáo viên nhập "Chủ đề" (VD: Phân số Toán 4).
2. **Search**: App gọi Notion API để tìm kiếm Page/Database phù hợp.
3. **Fetch**: Tự động tải nội dung Blocks từ Notion Page đó.
4. **AI Generation**: Gemini nhận nội dung Notion làm ngữ cảnh gốc (Context) để sinh câu hỏi bám sát lý thuyết.

## 3. TÍNH NĂNG CHÂNH (MVP)
- [ ] **Config**: Giao diện thiết lập `NOTION_TOKEN` và `DATABASE_ID`.
- [ ] **Smart Search**: Tìm kiếm Page Notion theo từ khóa chủ đề (Debounced search).
- [ ] **Content Parser**: Chuyển đổi Notion Blocks (text, list, tables) sang định dạng Markdown cho AI.
- [ ] **AI Grounding**: Prompt engineering để AI ưu tiên dữ liệu từ bài học Notion.

## 4. ƯỚC TÍNH SƠ BỘ
- **Độ phức tạp**: Trung bình (Cần xử lý Notion API và Parsing).
- **Rủi ro**: Notion API Rate limit (ít khả năng xảy ra với quy mô cá nhân).

## 5. BƯỚC TIẾP THEO
→ Triển khai `notionService.ts` để thực hiện các cuộc gọi API.
→ Cập nhật `geminiService.ts` để nhận ngữ cảnh Notion.
