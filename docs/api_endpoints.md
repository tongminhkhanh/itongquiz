# API Endpoints Documentation

**Ngày cập nhật**: 2026-03-12
**Base URL**: `WORKERS_API_URL` (Cloudflare Workers)

---

## 📝 Quizzes (Đề thi)

### GET /api/quizzes
Lấy danh sách tất cả các đề thi.

**Response (200 OK):**
```json
[
  {
    "id": "quiz-123",
    "title": "Toán lớp 3 - Ôn tập",
    "category": "toan",
    "tags": "[\"kiểm tra\", \"giữa kỳ\"]",
    "class_level": "3",
    "time_limit": 40
  }
]
```

### POST /api/quizzes
Tạo đề thi mới kèm danh sách câu hỏi.

---

## ❓ Questions (Câu hỏi)

### GET /api/questions?quizId={id}
Lấy danh sách câu hỏi của một đề thi cụ thể.

**Đặc biệt lưu ý về Mapping (D1 -> FE):**
| D1 Column | FE Question Object | Note |
|-----------|--------------------|------|
| `text_field` | `text` | Dùng cho DROPDOWN, DRAG_DROP, ERROR_CORRECTION |
| `correct_answer` | `correctAnswer` | |
| `question` | `mainQuestion` | (Trong một số context) |

---

## 📊 Results & Validation

### POST /api/validate
Xác thực đáp án phía Server (Anti-cheat). Trả về điểm số và chi tiết đúng/sai.

### 🔄 Scoring Synchronization (Client & Server)
Hệ thống sử dụng cơ chế **Scoring Sync** giữa Client và Server:
1. **Frontend Logic (`quizScoring.ts`)**: Thực hiện chấm điểm ngay lập tức cho UI.
2. **Server Logic**: Kiểm tra bảo mật và lưu kết quả.
3. **Phân giải xung đột**: Trong các trường hợp câu hỏi phức tạp (Ordering, Underline, Error Correction), logic phía Client được ưu tiên override nếu Server validation gặp quirks về format dữ liệu, đảm bảo quyền lợi tối đa cho học sinh dựa trên snapshot câu hỏi thực tế.

---

## 🏫 Classroom & Assignments

### GET /api/assignments?classId={id}
Lấy danh sách bài tập của lớp.

### GET /api/assignments?studentId={id}
Lấy danh sách bài tập được giao cho học sinh cụ thể.

---

## 🛠️ Practice Library (Thư viện luyện tập)

### GET /api/practice/topics
Lấy danh sách tất cả các chủ đề (hashtags) duy nhất từ kho câu hỏi.

**Response (200 OK):**
```json
[
  { "tag": "Toán", "count": 15 },
  { "tag": "Hình học", "count": 5 }
]
```

### GET /api/practice?topic={name}
Sinh đề thi luyện tập ngẫu nhiên (10 câu) dựa trên chủ đề.

**Response (200 OK):**
Trả về một `Quiz` object hoàn chỉnh nhưng có thêm cờ:
- `isPractice: true`
- `timeLimit: 0` (Không giới hạn thời gian)
- `id`: Mang format `practice-{topic}-{timestamp}`
