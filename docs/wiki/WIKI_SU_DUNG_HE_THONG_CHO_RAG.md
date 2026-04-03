# Wiki Sử Dụng Hệ Thống iTongQuiz (Bản Cho RAG)

Cập nhật: 2026-04-03  
Phạm vi: Frontend (React), Backend API (Cloudflare Workers + D1), Chatbot hỗ trợ (RAG)

## 1. Mục tiêu tài liệu

Tài liệu này dùng làm nguồn tri thức chuẩn để:
- Hướng dẫn giáo viên, học sinh, quản trị viên sử dụng iTongQuiz.
- Hỗ trợ chatbot trả lời các câu hỏi vận hành hệ thống.
- Làm dữ liệu đầu vào cho pipeline RAG (`workers/scripts/rag-sync.cjs`).

## 2. Tổng quan hệ thống

iTongQuiz là hệ thống kiểm tra và giao bài cho tiểu học, gồm 3 lớp chính:

1. Frontend: React + Zustand, giao diện cho học sinh và giáo viên.
2. API: Cloudflare Workers (`workers/src/index.ts`) với token bảo vệ qua header `X-API-Token`.
3. Database: Cloudflare D1 (SQLite) với các nhóm bảng: người dùng/lớp, quiz/kết quả, gamification, gift shop, rag.

Các module chức năng chính:
- Đăng nhập giáo viên/học sinh.
- Tạo đề, sửa đề, nhân bản đề, đặt mã truy cập.
- Quản lý lớp, học sinh, giao bài tập.
- Học sinh làm bài và lưu kết quả.
- Luyện tập theo chủ đề (`Practice Library`).
- Gamification (pet, điểm danh, bảng xếp hạng).
- Gift Shop (đổi quà bằng coin).
- Chatbot trợ lý dựa trên RAG (`/api/help/ask`).

## 3. Vai trò và quyền

### 3.1 Học sinh
- Đăng nhập qua tab học sinh.
- Xem bài tập được giao.
- Làm bài kiểm tra/luyện tập.
- Xem thông tin cá nhân, đổi mật khẩu.
- Dùng gamification và đổi quà (nếu bật tính năng).

### 3.2 Giáo viên
- Đăng nhập dashboard giáo viên.
- Tạo/sửa/xóa đề, xem kết quả.
- Quản lý lớp/học sinh.
- Giao bài và theo dõi trạng thái làm bài.

### 3.3 Quản trị viên (Admin)
- Toàn bộ quyền của giáo viên.
- Quản lý tài khoản giáo viên.
- Cấu hình thông báo toàn hệ thống.
- Chuyển giáo viên phụ trách lớp.
- Quản trị catalog gift shop.

## 4. Luồng sử dụng cho học sinh

### 4.1 Đăng nhập học sinh
1. Mở trang chủ.
2. Chọn tab `Học sinh`.
3. Nhập `username` + `password`.
4. Đăng nhập thành công sẽ vào dashboard học sinh.

API liên quan:
- `POST /api/student-login`

### 4.2 Làm bài được giao
1. Vào danh sách bài tập trên dashboard.
2. Chọn bài.
3. Hệ thống kiểm tra số lượt còn lại (`maxAttempts`).
4. Bắt đầu làm bài.
5. Nộp bài, hệ thống lưu kết quả.

API liên quan:
- `GET /api/assignments?studentId={id}`
- `POST /api/assignments/{id}/start`
- `POST /api/results`
- `POST /api/validate`

### 4.3 Làm bài cần mã truy cập
1. Chọn bài có bật `requireCode`.
2. Nhập mã do giáo viên cung cấp.
3. Đúng mã mới bắt đầu bài.

### 4.4 Điểm danh nhận thưởng
1. Mở dashboard học sinh.
2. Điểm danh hằng ngày.
3. Nhận EXP + coin theo mốc ngày trong tuần.

API liên quan:
- `GET /api/game-state/attendance-status?username={username}`
- `POST /api/game-state/attendance-claim`

### 4.5 Đổi quà (Gift Shop)
1. Vào tiệm quà (khi bật feature flag).
2. Chọn quà trong catalog.
3. Xác nhận đổi bằng coin.
4. Nhận voucher, chờ giáo viên/admin xác nhận trao quà.

API liên quan:
- `GET /api/gift-shop/catalog`
- `POST /api/gift-shop/purchase`
- `GET /api/gift-shop/orders?studentId={studentId}`

## 5. Luồng sử dụng cho giáo viên

### 5.1 Đăng nhập giáo viên
1. Mở trang chủ.
2. Chọn tab `Giáo viên`.
3. Nhập tài khoản.
4. Vào `teacher dashboard` nếu hợp lệ.

API liên quan:
- `POST /api/login`

### 5.2 Tạo đề mới
1. Vào tab `Tạo đề mới`.
2. Nhập tiêu đề, lớp, môn, thời gian.
3. Soạn câu hỏi (hệ thống hỗ trợ nhiều loại).
4. Lưu đề.

API liên quan:
- `POST /api/quizzes`
- `GET /api/questions?quizId={id}`

### 5.3 Quản lý đề
- Sửa đề: `PUT /api/quizzes/{id}`
- Xóa đề: `DELETE /api/quizzes/{id}`
- Nhân bản đề: `POST /api/quizzes/{id}/duplicate`
- Quản lý mã truy cập đề: cập nhật `accessCode`, `requireCode` qua luồng sửa đề.

### 5.4 Quản lý lớp và học sinh
1. Tạo lớp.
2. Thêm học sinh thủ công hoặc import batch.
3. Đặt lại mật khẩu học sinh (admin).
4. Cập nhật avatar hoặc thông tin liên quan.

API liên quan:
- `GET/POST/DELETE /api/classes`
- `PATCH /api/classes/{id}/teacher`
- `GET/POST/DELETE /api/students`
- `POST /api/students/batch`
- `POST /api/students/{id}/reset-password`
- `POST /api/students/{id}/change-password`
- `PUT /api/students/{id}/avatar`

### 5.5 Giao bài
1. Chọn đề cần giao.
2. Chọn lớp hoặc học sinh cụ thể.
3. Đặt hạn nộp, số lần làm tối đa.
4. Theo dõi số lượng đã nộp.

API liên quan:
- `GET /api/assignments?teacherUsername={username}`
- `POST /api/assignments`
- `PUT /api/assignments/{id}/deadline`
- `PUT /api/assignments/{id}/status`
- `DELETE /api/assignments/{id}`

### 5.6 Xem kết quả
1. Mở tab `Kết quả`.
2. Lọc theo đề/lớp.
3. Xem bảng điểm, chi tiết đáp án.

API liên quan:
- `GET /api/results?page=1&limit=100&quizId={id}`
- `GET /api/results/{id}/answers`
- `DELETE /api/results/{id}`

## 6. Các loại câu hỏi đang hỗ trợ

Các loại chính:
- `MCQ`
- `TRUE_FALSE`
- `SHORT_ANSWER`
- `MATCHING`
- `MULTIPLE_SELECT`
- `DRAG_DROP`
- `ORDERING`
- `IMAGE_QUESTION`
- `DROPDOWN`
- `UNDERLINE`
- `CATEGORIZATION`
- `WORD_SCRAMBLE`
- `RIDDLE`
- `ERROR_CORRECTION`

Nguồn tham chiếu kiểu dữ liệu:
- `src/types/domain.types.ts`

## 7. Chatbot trợ lý (RAG)

### 7.1 Endpoint
- `POST /api/help/ask`

Payload gợi ý:
```json
{
  "question": "Làm sao giao bài cho lớp 3A?",
  "sessionId": "uuid-or-any-session-id",
  "includeSources": true
}
```

Response data:
- `answer`: nội dung trả lời.
- `confidence`: độ tin cậy (0..1).
- `sources` (nếu bật `includeSources`).
- `fallbackReason`: `NO_MATCH` hoặc `LOW_CONFIDENCE`.

### 7.2 Cách RAG hoạt động (backend hiện tại)
- Truy vấn FTS từ `rag_chunks_fts` (ưu tiên).
- Fallback sang `LIKE` nếu FTS không ra.
- Ghép context từ các chunk top-k (`MAX_RETRIEVAL = 6`).
- Gọi mô hình qua `CLIPROXY_API` (`gemini-2.0-flash`).
- Nếu thiếu ngữ cảnh/độ tin cậy thấp, trả về câu fallback an toàn.

### 7.3 Logging
Truy vấn được log vào `rag_query_logs` (ẩn danh theo hash session).

## 8. Cách thêm tri thức mới vào RAG

### 8.1 Nơi đặt tài liệu
Script sync hiện đọc:
- `README.md`
- Tất cả file `.md` trong thư mục `docs/**`

Khuyến nghị:
- Mỗi chủ đề là 1 file `.md` trong `docs/wiki/`.
- Tiêu đề rõ ràng, theo dạng hỏi đáp hoặc quy trình.
- Tránh đoạn quá dài, nên chia mục nhỏ bằng heading `##`/`###`.

### 8.2 Quy tắc viết để chunk tốt
- Một đoạn tập trung 1 ý.
- Dùng từ khóa nghiệp vụ rõ ràng: “giao bài”, “điểm danh”, “maxAttempts”, “voucher”.
- Khi có thao tác, ghi theo từng bước đánh số.
- Nếu có API, ghi thẳng method + path.

### 8.3 Đồng bộ dữ liệu vào D1
Chạy trong thư mục `workers`:

```bash
npm run rag:sync
```

Đồng bộ thẳng remote D1:

```bash
npm run rag:sync:remote
```

Script sẽ:
1. Đọc toàn bộ Markdown.
2. Tách section theo heading.
3. Chunk nội dung (khoảng 1200 ký tự/chunk, overlap 180 ký tự).
4. Upsert vào `rag_documents`, `rag_chunks`, `rag_chunks_fts`.

## 9. Biến môi trường quan trọng

Frontend (`.env.local`):
- `VITE_WORKERS_API_URL`
- `VITE_API_SECRET_TOKEN`
- `VITE_FEATURE_GIFT_SHOP_V2`
- `VITE_GIFT_SHOP_MODE`

Workers (Wrangler/Secrets):
- `API_SECRET_TOKEN`
- `CLIPROXY_API`
- `CLIPROXY_TOKEN`

Lưu ý bảo mật:
- Token API phải đồng bộ giữa frontend và workers.
- Không commit secret thật vào repo.

## 10. FAQ vận hành nhanh

### 10.1 Học sinh báo “hết lượt làm bài”
- Kiểm tra assignment `max_attempts`.
- Kiểm tra số kết quả đã nộp của học sinh cho quiz đó.
- Nếu cần, tăng `max_attempts` hoặc giao lại assignment mới.

### 10.2 Học sinh không thấy bài tập
- Kiểm tra đúng `class_id`.
- Kiểm tra assignment đang `OPEN` và còn hạn.
- Kiểm tra assignment có gán `student_id` cụ thể hay cho cả lớp.

### 10.3 Chatbot trả lời thiếu thông tin
- Bật `includeSources` để xem nguồn nào được truy xuất.
- Bổ sung tài liệu Markdown vào `docs/wiki/`.
- Chạy lại `npm run rag:sync:remote`.

### 10.4 Không gọi được API
- Kiểm tra `VITE_WORKERS_API_URL`.
- Kiểm tra `VITE_API_SECRET_TOKEN` và `API_SECRET_TOKEN`.
- Kiểm tra CORS và health check `GET /api/health`.

## 11. Bộ câu hỏi mẫu để kiểm tra RAG

- “Cách tạo lớp mới cho giáo viên là gì?”
- “Làm sao reset mật khẩu học sinh?”
- “Giao bài cho cả lớp khác gì giao cho từng học sinh?”
- “Vì sao học sinh bị báo hết lượt làm bài?”
- “Quy trình đổi quà và hoàn xu trong Gift Shop hoạt động thế nào?”
- “Làm sao đồng bộ wiki mới vào RAG?”

## 12. Tài liệu liên quan trong repo

- `docs/api_endpoints.md`
- `docs/database_schema.md`
- `workers/src/routes/helpRag.ts`
- `workers/scripts/rag-sync.cjs`
- `src/services/apiAdapter.ts`
- `src/components/TeacherDashboard/*`
- `src/components/HomePage/*`
