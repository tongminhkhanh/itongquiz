# 🎨 DESIGN: Chuyển Database iTongQuiz sang Cloudflare D1

**Ngày tạo:** 2026-03-04
**Dựa trên:** [BRIEF-database-migration.md](file:///c:/itongquiz1/itongquiz1/docs/BRIEF-database-migration.md)

---

## ⚠️ ANH CẦN CHUẨN BỊ TRƯỚC

> [!IMPORTANT]
> **Trước khi em bắt tay vào code, anh cần hoàn thành các bước sau:**

### 1️⃣ Tạo tài khoản Cloudflare (nếu chưa có)
- Vào [dash.cloudflare.com](https://dash.cloudflare.com) → Sign Up
- Dùng **Workers Free Plan** (miễn phí)

### 2️⃣ Cài Wrangler CLI (công cụ quản lý Cloudflare)
```bash
npm install -g wrangler
```

### 3️⃣ Đăng nhập Wrangler
```bash
wrangler login
```
→ Mở trình duyệt, bấm **Allow** để xác thực

### 4️⃣ Tạo D1 Database
```bash
wrangler d1 create itongquiz-db
```
→ Ghi lại **database_id** trả về (ví dụ: `xxxx-yyyy-zzzz`)

### 5️⃣ Export dữ liệu hiện tại từ Google Sheets
- Mở Google Sheets chứa data
- Tải xuống mỗi sheet thành file CSV:
  - `Teachers.csv`
  - `Quizzes.csv`
  - `Questions.csv`
  - `Results.csv`
  - `Classes.csv`
  - `Students.csv`
  - `Assignments.csv`
  - `UserPets.csv`
  - `ShopItems.csv`
  - `Announcements.csv`
- Lưu vào thư mục `data/migration/` trong project

### 6️⃣ Cung cấp cho em:
- **Database ID** từ bước 4
- **Cloudflare Account ID** (tìm trong Dashboard → Overview → phía phải)
- Xác nhận đã export CSV xong

---

## 1. CÁCH LƯU THÔNG TIN (Database Schema)

### Hiện tại → Sau chuyển đổi

```
Google Sheets (10 tabs)  →  SQLite D1 (10 tables)
GAS Script (1574 LOC)    →  Cloudflare Workers API
```

### 📦 SƠ ĐỒ CƠ SỞ DỮ LIỆU

```
┌──────────────────────────────────────────────────┐
│  👩‍🏫 TEACHERS (Giáo viên)                         │
│  ├── username (PK)                                │
│  ├── password_hash (TEXT, bcrypt)                  │
│  ├── full_name                                    │
│  ├── role (admin | teacher)                       │
│  └── class (lớp phụ trách)                        │
└────────────────────────┬─────────────────────────┘
                         │ 1 teacher → nhiều classes
                         ▼
┌──────────────────────────────────────────────────┐
│  🏫 CLASSES (Lớp học)                              │
│  ├── id (PK)                                      │
│  ├── name                                         │
│  ├── teacher_username (FK → Teachers)              │
│  └── created_at                                   │
└────────┬─────────────────────┬───────────────────┘
         │                     │
         ▼                     ▼
┌─────────────────┐   ┌────────────────────────────┐
│  👤 STUDENTS     │   │  📋 ASSIGNMENTS             │
│  ├── id (PK)     │   │  ├── id (PK)               │
│  ├── full_name   │   │  ├── quiz_id (FK)           │
│  ├── username    │   │  ├── class_id (FK)          │
│  ├── pwd_hash    │   │  ├── student_id (nullable)  │
│  ├── class_id FK │   │  ├── deadline               │
│  ├── parent_phone│   │  ├── max_attempts           │
│  ├── avatar      │   │  ├── status (OPEN|CLOSED)   │
│  ├── coins       │   │  └── created_at             │
│  └── created_at  │   └────────────────────────────┘
└────────┬─────────┘
         │ 1 student → 1 pet
         ▼
┌──────────────────────────────────────────────────┐
│  🐾 USER_PETS (Thú cưng)                          │
│  ├── username (PK, FK → Students)                  │
│  ├── pet_id, pet_name                             │
│  ├── level, exp, exp_to_next                      │
│  ├── mood (happy|neutral|sad|excited)             │
│  ├── items (JSON array)                           │
│  ├── image_url                                    │
│  └── last_active                                  │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  📝 QUIZZES (Đề thi)                               │
│  ├── id (PK)                                      │
│  ├── title, class_level, category                 │
│  ├── time_limit (phút)                            │
│  ├── access_code, require_code                    │
│  ├── show_on_home                                 │
│  ├── created_by (FK → Teachers)                    │
│  └── created_at                                   │
└────────────────────────┬─────────────────────────┘
                         │ 1 quiz → nhiều questions
                         ▼
┌──────────────────────────────────────────────────┐
│  ❓ QUESTIONS (Câu hỏi)                            │
│  ├── id (PK)                                      │
│  ├── quiz_id (FK → Quizzes)                        │
│  ├── type (MCQ, TRUE_FALSE, MATCHING, ...)        │
│  ├── question (text)                              │
│  ├── options, correct_answer                      │
│  ├── items, text_field, blanks                    │
│  ├── distractors, sentence, words                 │
│  ├── correct_word_indexes                         │
│  └── image                                        │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  📊 RESULTS (Kết quả)                              │
│  ├── id (PK, auto)                                │
│  ├── student_name, class_name                     │
│  ├── quiz_id, quiz_title                          │
│  ├── score, correct_count, total_questions        │
│  ├── answers (JSON)                               │
│  └── submitted_at                                 │
└──────────────────────────────────────────────────┘

┌───────────────────┐  ┌────────────────────────────┐
│  🛒 SHOP_ITEMS     │  │  📢 ANNOUNCEMENTS           │
│  ├── item_id (PK)  │  │  ├── id (PK)               │
│  ├── name, price   │  │  ├── content               │
│  ├── type, category│  │  ├── is_active              │
│  └── asset_url     │  │  └── updated_at             │
└───────────────────┘  └────────────────────────────┘
```

### SQL Schema (chạy 1 lần khi setup)

```sql
-- Teachers
CREATE TABLE IF NOT EXISTS teachers (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'teacher',
  class TEXT
);

-- Classes
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  teacher_username TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (teacher_username) REFERENCES teachers(username)
);

-- Students
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  class_id TEXT NOT NULL,
  parent_phone TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  coins INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id)
);

-- Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  class_level TEXT NOT NULL,
  category TEXT DEFAULT '',
  time_limit INTEGER DEFAULT 60,
  created_at TEXT NOT NULL,
  access_code TEXT DEFAULT '',
  require_code INTEGER DEFAULT 0,
  created_by TEXT DEFAULT '',
  show_on_home INTEGER DEFAULT 1
);

-- Questions
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL,
  type TEXT NOT NULL,
  question TEXT,
  options TEXT,
  correct_answer TEXT,
  items TEXT,
  text_field TEXT,
  blanks TEXT,
  distractors TEXT,
  sentence TEXT,
  words TEXT,
  correct_word_indexes TEXT,
  image TEXT DEFAULT '',
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- Results
CREATE TABLE IF NOT EXISTS results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_name TEXT NOT NULL,
  class_name TEXT DEFAULT '',
  quiz_id TEXT DEFAULT '',
  quiz_title TEXT DEFAULT '',
  score REAL DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  submitted_at TEXT NOT NULL,
  answers TEXT DEFAULT '{}'
);

-- Assignments
CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  student_id TEXT DEFAULT '',
  deadline TEXT NOT NULL,
  max_attempts INTEGER DEFAULT 1,
  status TEXT DEFAULT 'OPEN',
  created_at TEXT NOT NULL,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
  FOREIGN KEY (class_id) REFERENCES classes(id)
);

-- User Pets
CREATE TABLE IF NOT EXISTS user_pets (
  username TEXT PRIMARY KEY,
  pet_id TEXT DEFAULT 'cat_01',
  pet_name TEXT DEFAULT 'Mèo Con',
  level INTEGER DEFAULT 1,
  exp INTEGER DEFAULT 0,
  exp_to_next INTEGER DEFAULT 100,
  mood TEXT DEFAULT 'happy',
  items TEXT DEFAULT '[]',
  image_url TEXT DEFAULT '',
  last_active TEXT
);

-- Shop Items
CREATE TABLE IF NOT EXISTS shop_items (
  item_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER DEFAULT 0,
  type TEXT DEFAULT 'ACCESSORY',
  category TEXT DEFAULT '',
  asset_url TEXT DEFAULT ''
);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY DEFAULT '1',
  content TEXT DEFAULT '',
  is_active INTEGER DEFAULT 0,
  updated_at TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_username ON students(username);
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_quiz_id ON assignments(quiz_id);
CREATE INDEX IF NOT EXISTS idx_results_quiz_id ON results(quiz_id);
CREATE INDEX IF NOT EXISTS idx_results_student ON results(student_name);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_username);
```

---

## 2. KIẾN TRÚC HỆ THỐNG MỚI

### Trước (Google Sheets):
```
Browser (React) ──POST──▶ GAS Script ──▶ Google Sheets
                                             ↑
                              Toàn bộ logic trong 1 file GAS
```

### Sau (Cloudflare D1):
```
Browser (React) ──fetch──▶ Cloudflare Workers ──▶ D1 (SQLite)
      │                         │
      │                    wrangler.toml
      │                    (cấu hình Workers)
      │
  Vite frontend
  (deploy trên Vercel / CF Pages)
```

### Cấu trúc Workers API:

```
workers/
├── wrangler.toml          # Cấu hình D1 binding
├── src/
│   ├── index.ts           # Entry point + Router
│   ├── middleware/
│   │   ├── auth.ts        # Token verification
│   │   └── cors.ts        # CORS headers
│   ├── routes/
│   │   ├── teachers.ts    # GET /api/teachers, POST /api/login
│   │   ├── quizzes.ts     # CRUD /api/quizzes
│   │   ├── questions.ts   # GET /api/questions?quizId=xxx
│   │   ├── results.ts     # GET/POST /api/results
│   │   ├── classroom.ts   # Classes, Students, Assignments
│   │   ├── gamification.ts# Pet, Shop, Leaderboard
│   │   └── announcements.ts
│   └── utils/
│       ├── hash.ts        # Password hashing (SHA-256)
│       └── response.ts    # JSON response helpers
└── schema.sql             # D1 schema (bảng trên)
```

---

## 3. MAPPING API: GAS → Workers

| # | GAS Action | Workers Endpoint | Method |
|---|-----------|------------------|--------|
| 1 | `get_teachers` | `GET /api/teachers` | GET |
| 2 | `get_quizzes` | `GET /api/quizzes` | GET |
| 3 | `get_questions` | `GET /api/questions?quizId=xxx` | GET |
| 4 | `get_results` | `GET /api/results` | GET |
| 5 | `submit_result` | `POST /api/results` | POST |
| 6 | `create_quiz` | `POST /api/quizzes` | POST |
| 7 | `update_quiz` | `PUT /api/quizzes/:id` | PUT |
| 8 | `delete_quiz` | `DELETE /api/quizzes/:id` | DELETE |
| 9 | `validate_answers` | `POST /api/validate` | POST |
| 10 | `get_announcement` | `GET /api/announcements` | GET |
| 11 | `save_announcement` | `PUT /api/announcements` | PUT |
| 12 | `get_classes` | `GET /api/classes?teacher=xxx` | GET |
| 13 | `create_class` | `POST /api/classes` | POST |
| 14 | `delete_class` | `DELETE /api/classes/:id` | DELETE |
| 15 | `get_students` | `GET /api/students?classId=xxx` | GET |
| 16 | `add_student` | `POST /api/students` | POST |
| 17 | `delete_student` | `DELETE /api/students/:id` | DELETE |
| 18 | `reset_student_password` | `POST /api/students/:id/reset-pwd` | POST |
| 19 | `student_login` | `POST /api/student-login` | POST |
| 20 | `update_student_avatar` | `PUT /api/students/:id/avatar` | PUT |
| 21 | `get_assignments` | `GET /api/assignments?classId=xxx` | GET |
| 22 | `get_teacher_assignments` | `GET /api/assignments?teacher=xxx` | GET |
| 23 | `get_all_assignments` | `GET /api/assignments` | GET |
| 24 | `get_student_assignments` | `GET /api/assignments?studentId=xxx` | GET |
| 25 | `create_assignment` | `POST /api/assignments` | POST |
| 26 | `delete_assignment` | `DELETE /api/assignments/:id` | DELETE |
| 27 | `update_assignment_deadline` | `PUT /api/assignments/:id/deadline` | PUT |
| 28 | `update_assignment_status` | `PUT /api/assignments/:id/status` | PUT |
| 29 | `start_assignment_attempt` | `POST /api/assignments/:id/attempt` | POST |
| 30 | `get_pet_data` | `GET /api/pets?username=xxx` | GET |
| 31 | `update_game_state` | `POST /api/game-state` | POST |
| 32 | `buy_shop_item` | `POST /api/shop/buy` | POST |
| 33 | `get_leaderboard` | `GET /api/leaderboard` | GET |

---

## 4. THAY ĐỔI FRONTEND

### Files cần sửa/tạo:

| File | Thay đổi |
|------|----------|
| `src/services/d1Service.ts` | **[MỚI]** Thay thế `googleSheetService.ts` |
| `src/services/d1ClassroomService.ts` | **[MỚI]** Thay thế `classroomService.ts` |
| `src/services/d1GamificationService.ts` | **[MỚI]** Thay thế `gamificationService.ts` |
| `src/config/constants.ts` | Thêm `WORKERS_API_URL` thay `GOOGLE_SCRIPT_URL` |
| `.env.local` | Thêm `VITE_WORKERS_API_URL` |
| `src/stores/*` | Trỏ import sang service mới |

### Chiến lược migration: **Adapter Pattern**

```typescript
// src/services/apiAdapter.ts
// Giữ nguyên interface, chỉ đổi backend
const USE_D1 = import.meta.env.VITE_USE_D1 === 'true';

export const fetchQuizzes = USE_D1
  ? () => d1Service.getQuizzes()
  : () => googleSheetService.fetchQuizzesFromSheets(...);
```

→ Có thể **switch qua lại** giữa GAS và D1 bằng 1 biến env!

---

## 5. AUTH (Xác thực)

### Hiện tại:
- **Teacher:** Plain-text password so sánh trong GAS
- **Student:** SHA-256 hash stored in sheet

### Sau chuyển đổi:
- Giữ nguyên flow đơn giản (phù hợp app giáo dục)
- Password hash bằng SHA-256 (giống hiện tại) → dễ migrate data
- Token xác thực bằng `API_SECRET_TOKEN` (giống hiện tại)
- **Không dùng Auth.js** (quá phức tạp cho nhu cầu hiện tại)

> [!NOTE]
> Có thể nâng cấp lên JWT/session-based auth sau nếu cần

---

## 6. LỘ TRÌNH THỰC HIỆN CHI TIẾT

### Phase 1: Setup Cloudflare Workers + D1 (1-2 ngày)
- [ ] Tạo project Workers (`wrangler init itongquiz-api`)
- [ ] Tạo D1 database + apply schema SQL
- [ ] Setup CORS middleware
- [ ] Setup auth middleware (token check)
- [ ] Test basic GET endpoint

### Phase 2: Viết Workers API Routes (3-4 ngày)
- [ ] Teachers routes (login, get)
- [ ] Quizzes routes (CRUD)
- [ ] Questions routes (GET by quizId, batch save)
- [ ] Results routes (GET, submit, validate_answers)
- [ ] Classroom routes (classes, students, assignments)
- [ ] Gamification routes (pets, shop, leaderboard)
- [ ] Announcements routes

### Phase 3: Frontend Service Layer (2 ngày)
- [ ] Tạo `d1Service.ts` với cùng interface như `googleSheetService.ts`
- [ ] Tạo `d1ClassroomService.ts`
- [ ] Tạo `d1GamificationService.ts`
- [ ] Tạo `apiAdapter.ts` để switch GAS ↔ D1
- [ ] Update `.env.local` với `VITE_WORKERS_API_URL`

### Phase 4: Migrate Data (1 ngày)
- [ ] Viết script CSV → SQLite insert
- [ ] Import Teachers, Quizzes, Questions
- [ ] Import Results, Classes, Students
- [ ] Import Assignments, UserPets, ShopItems, Announcements
- [ ] Verify row counts match

### Phase 5: Test + Fix (2-3 ngày)
- [ ] Test teacher login + quiz CRUD
- [ ] Test student login + take quiz + submit
- [ ] Test classroom management
- [ ] Test gamification (coins, exp, shop)
- [ ] Test anti-cheat (answer validation)
- [ ] Test edge cases (empty data, concurrent access)
- [ ] Fix bugs

### Phase 6: Deploy + Switch (1 ngày)
- [ ] Deploy Workers to production
- [ ] Update frontend env vars
- [ ] Redeploy frontend (Vercel)
- [ ] Smoke test production
- [ ] Giữ Google Sheets làm backup 1-2 tuần

**Tổng: ~10-12 ngày**

---

## 7. SO SÁNH TRƯỚC/SAU

| Tiêu chí | Trước (GAS) | Sau (D1 Workers) |
|----------|-------------|-------------------|
| **Response time** | 1-3 giây/request | ~50-200ms/request |
| **Concurrent users** | ~5-10 (LockService) | Hàng trăm |
| **Storage** | ~10M cells | 5GB |
| **Query** | Full sheet scan | SQL với indexes |
| **Downtime** | GAS quota hết | Không pause |
| **API style** | 1 endpoint + action param | RESTful endpoints |
| **Backup** | Thủ công | Time Travel 7 ngày |
| **Code location** | GAS editor online | Git repo local |

---

## 8. RỦI RO & GIẢI PHÁP

| Rủi ro | Giải pháp |
|--------|-----------|
| CPU 10ms/request (free) | Tối ưu SQL queries, dùng indexes |
| 100K requests/ngày | App giáo dục ~100-500 users → đủ |
| Mất data khi migrate | Backup CSV trước, verify sau |
| Frontend break | Adapter pattern → rollback bằng env var |
| Workers error | Logging + Cloudflare dashboard monitor |

---

## 9. BƯỚC TIẾP THEO

1️⃣ **Anh chuẩn bị** theo mục "Anh cần chuẩn bị" ở trên
2️⃣ **Em bắt đầu code** Phase 1 (Workers setup) → `/code`
3️⃣ **Cần chỉnh sửa design** → Nói em biết
4️⃣ **Muốn xem UI mockup** → `/visualize`
