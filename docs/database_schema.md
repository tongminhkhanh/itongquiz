# Database Schema (Cloudflare D1)

**Database Engine**: SQLite (Cloudflare D1)

## 1. Bảng `quizzes` (Metadata đề thi)

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | |
| `title` | TEXT | Tiêu đề đề thi |
| `class_level`| TEXT | Lớp (1-5) |
| `category` | TEXT | Môn học (toan, tieng-viet, ...) |
| `tags` | TEXT | Lưu mảng JSON strings (VD: `["tag1", "tag2"]`) |
| `time_limit` | INTEGER | Phút |
| `access_code`| TEXT | Mã tham gia (nếu có) |
| `require_code`| TEXT | 'TRUE' / 'FALSE' |
| `show_on_home`| TEXT | 'TRUE' / 'FALSE' |

## 2. Bảng `questions` (Chi tiết câu hỏi)

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | |
| `quiz_id` | TEXT (FK) | Liên kết id của bảng quizzes |
| `type` | TEXT | MCQ, DROPDOWN, DRAG_DROP, MATCHING, ... |
| `question` | TEXT | Nội dung câu hỏi chính |
| `options` | TEXT | Phân tách bởi dấu `|` |
| `correct_answer`| TEXT | |
| `text_field` | TEXT | **QUAN TRỌNG**: Chứa văn bản có lỗ trống cho Dropdown/DragDrop |
| `blanks` | TEXT | JSON array các đáp án của lỗ trống |
| `distractors` | TEXT | JSON array các từ nhiễu |
| `image` | TEXT | URL hình ảnh đính kèm |
| `tags` | TEXT | Các nhãn chủ đề (VD: `#Toán, #Giaothông`). Phân cách bởi dấu phẩy. |

## 3. Bảng `results` (Kết quả học sinh)
Lưu kết quả bài làm, điểm số, và `answers` dưới dạng JSON.

## 4. Bảng `assignments` (Giao bài tập)
Liên kết `quiz_id` với `class_id`, có `deadline` và `max_attempts`.
