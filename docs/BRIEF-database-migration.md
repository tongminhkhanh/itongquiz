# 💡 BRIEF: Chuyển Database iTongQuiz

**Ngày tạo:** 2026-03-04
**Brainstorm:** Chuyển từ Google Sheets → Database free-tier chuyên nghiệp

---

## 1. VẤN ĐỀ HIỆN TẠI

### Kiến trúc hiện tại
- **Database:** Google Sheets (qua Google Apps Script - GAS)
- **Backend:** GAS script ~1574 dòng, xử lý toàn bộ CRUD
- **Frontend:** Vite + React + TypeScript + Zustand
- **Giao tiếp:** Frontend → GAS HTTP endpoint → Google Sheets

### Các sheet đang dùng (10+):

| Sheet | Mục đích | Dữ liệu mẫu |
|-------|----------|-------------|
| Teachers | Giáo viên & admin | username, password, role, class |
| Quizzes | Đề thi | id, title, classLevel, timeLimit, accessCode |
| Questions | Câu hỏi | 14 cột (MCQ, True/False, Matching, Drag&Drop...) |
| Results | Kết quả | studentName, score, answers (JSON) |
| Classes | Lớp học ảo | id, name, teacherUsername |
| Students | Học sinh | id, username, password, classId |
| Assignments | Bài tập | id, quizId, classId, deadline |
| UserPets | Pet game | studentId, petName, level |
| ShopItems | Shop game | itemId, price, category |
| Announcements | Thông báo | content, isActive |

### ⚠️ Giới hạn đang gặp

| Vấn đề | Chi tiết |
|--------|----------|
| **Hiệu năng** | Mỗi request đọc TOÀN BỘ sheet → chậm khi data lớn |
| **GAS timeout** | Giới hạn 6 phút/execution |
| **QPS thấp** | 1-5 queries/giây → lag khi nhiều học sinh dùng cùng lúc |
| **Không có quan hệ** | Không foreign key, không index → query phức tạp phải xử lý bằng code |
| **Concurrency** | Dùng `LockService` → bottleneck nghiêm trọng |
| **Bảo mật** | Mật khẩu lưu plain text/SHA-256 trên Sheet |
| **Không backup tự động** | Phải backup thủ công |
| **10M cell limit** | Giới hạn tổng số ô dữ liệu |

---

## 2. CÁC PHƯƠNG ÁN ĐỀ XUẤT

### 🅰️ Phương án A: Supabase (⭐ KHUYẾN NGHỊ)

> **PostgreSQL managed + Auth + Storage + Realtime** - Tất cả trong một nền tảng

| Tiêu chí | Chi tiết |
|----------|----------|
| **Database** | PostgreSQL - 500MB storage |
| **Auth** | 50,000 MAU, hỗ trợ email/password, OAuth |
| **Storage** | 1GB file, max 50MB/file |
| **Realtime** | WebSocket subscriptions miễn phí |
| **API** | Auto-generated REST + GraphQL, unlimited requests |
| **Edge Functions** | 500,000 invocations/tháng |
| **Row Level Security** | Bảo mật cấp row - phù hợp phân quyền teacher/student |
| **Inactivity pause** | ⚠️ Pause sau 7 ngày không hoạt động |
| **Projects** | Tối đa 2 active projects |

| Ưu điểm | Nhược điểm |
|---------|------------|
| All-in-one: DB + Auth + Storage | Pause sau 7 ngày inactive |
| PostgreSQL chuẩn, query mạnh | Chỉ 2 projects free |
| Auto-gen API, tiết kiệm code | 500MB có thể hết nếu data lớn |
| RLS bảo mật cấp row | Không backup tự động ở free |
| JS/TS SDK tốt, community lớn | — |
| Dashboard quản lý trực quan | — |

**Phù hợp cho iTongQuiz vì:**
- Có sẵn Auth → thay thế luôn hệ thống login teacher/student
- RLS → phân quyền teacher chỉ thấy class của mình
- Realtime → live leaderboard, live quiz session
- File Storage → upload ảnh câu hỏi (thay Cloudinary)

---

### 🅱️ Phương án B: Neon (PostgreSQL Serverless)

> **PostgreSQL thuần với kiến trúc serverless, scale-to-zero**

| Tiêu chí | Chi tiết |
|----------|----------|
| **Database** | PostgreSQL - 0.5GB/project |
| **Compute** | 100 CU-hours/project/tháng |
| **Projects** | Tối đa 100 projects |
| **Branching** | Git-like database branching |
| **Scale to zero** | Tự tắt khi không dùng |
| **Auth/Storage** | ❌ Không có, cần tự build |

| Ưu điểm | Nhược điểm |
|---------|------------|
| PostgreSQL chuẩn, nhiều projects | Chỉ có database, không có Auth/Storage |
| Database branching (dev/staging) | Phải tự build API layer |
| Scale-to-zero tiết kiệm | Cần kết hợp nhiều service |
| Cold start nhanh | Compute-hours giới hạn |

---

### 🅲 Phương án C: Turso (SQLite Edge)

> **SQLite phân tán, tối ưu cho edge computing**

| Tiêu chí | Chi tiết |
|----------|----------|
| **Database** | SQLite - 5GB storage |
| **Reads** | 500M rows/tháng |
| **Writes** | 10M rows/tháng |
| **Databases** | Tối đa 500 databases |
| **Cold start** | Không có cold start |

| Ưu điểm | Nhược điểm |
|---------|------------|
| 5GB storage - nhiều nhất! | SQLite, không phải PostgreSQL |
| Không cold start | Không có Auth/Storage built-in |
| Tốc độ đọc cực nhanh | Community nhỏ hơn |
| Edge deploy → low latency | Ít tài liệu/tutorial |

---

### 🅳 Phương án D: Firebase (NoSQL)

> **Backend-as-a-Service đầy đủ của Google**

| Tiêu chí | Chi tiết |
|----------|----------|
| **Firestore** | 1GB storage, 50K reads/ngày |
| **Auth** | 50K MAU miễn phí |
| **Storage** | 1GB, 10GB download/tháng |
| **Functions** | 2M invocations/tháng |
| **Hosting** | 10GB bandwidth/tháng |

| Ưu điểm | Nhược điểm |
|---------|------------|
| All-in-one như Supabase | NoSQL → phải redesign data model |
| Google ecosystem, ổn định | 50K reads/ngày có thể hết nhanh |
| Không pause khi inactive | Vendor lock-in cao |
| Real-time built-in | Query phức tạp khó hơn SQL |
| SDK mạnh cho web/mobile | Read quota chia theo document |

---

### 🅴 Phương án E: Cloudflare D1 (SQLite Serverless)

> **SQLite trên Cloudflare edge network, tích hợp Workers + Pages**

| Tiêu chí | Chi tiết |
|----------|----------|
| **Database** | SQLite - **5GB total** (500MB/database, tối đa 10 databases) |
| **Reads** | 5 triệu rows/ngày |
| **Writes** | 100,000 rows/ngày |
| **Workers requests** | 100,000 requests/ngày (free plan) |
| **CPU time/request** | 10ms (free plan) |
| **Time Travel** | Point-in-time recovery 7 ngày |
| **Auth/Storage** | ❌ Không built-in, cần tự build hoặc dùng thư viện |
| **Inactivity pause** | ✅ **KHÔNG pause** - luôn sẵn sàng |
| **Egress** | ✅ **MIỄN PHÍ** - không tính phí data transfer |

| Ưu điểm | Nhược điểm |
|---------|------------|
| **5GB storage** - gấp 10x Supabase | Cần Workers làm API layer (tự code) |
| **KHÔNG pause** khi inactive | Auth phải tự build / dùng thư viện bên 3 |
| Không tính phí egress | CPU time 10ms/request (free) khá tight |
| Time Travel backup 7 ngày miễn phí | Không có transactions (chỉ batch queries) |
| **Synergy** với Cloudflare tunnel đang dùng | 100K requests/ngày có thể hết nếu nhiều user |
| Full-text search + JSON built-in | Community nhỏ hơn Supabase |
| Có `@auth/d1-adapter` cho Auth.js | Cần học thêm Cloudflare Workers |

**Phù hợp cho iTongQuiz vì:**
- Dự án **đã dùng Cloudflare tunnel** → tận dụng được ecosystem
- SQLite đơn giản, phù hợp app giáo dục quy mô nhỏ-vừa
- Không bao giờ pause → học sinh truy cập bất kỳ lúc nào
- 5GB dư sức cho quiz app

---

## 3. SO SÁNH TỔNG QUAN

| Tiêu chí | Google Sheets | Supabase | Cloudflare D1 | Neon | Turso | Firebase |
|----------|--------------|----------|---------------|------|-------|----------|
| **Loại DB** | Spreadsheet | PostgreSQL | SQLite | PostgreSQL | SQLite | NoSQL |
| **Storage** | ~10M cells | 500MB | **5GB** | 500MB | 5GB | 1GB |
| **Auth** | Tự code | ✅ Built-in | ❌ Tự build | ❌ | ❌ | ✅ Built-in |
| **File Storage** | ❌ | ✅ 1GB | ❌ (dùng R2) | ❌ | ❌ | ✅ 1GB |
| **Realtime** | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **API layer** | GAS script | ✅ Auto-gen | Workers (tự code) | ❌ Tự build | ❌ | ✅ SDK |
| **Pause risk** | Thấp | ⚠️ 7 ngày | ✅ Không pause | Scale-to-zero | Không | Không |
| **Backup** | Thủ công | ❌ Free | ✅ Time Travel 7d | ❌ | ❌ | ❌ |
| **Egress** | Miễn phí | 2-5GB | ✅ Miễn phí | Giới hạn | Giới hạn | 10GB |
| **Effort migrate** | — | Trung bình | Trung bình-Cao | Cao | Cao | Cao |
| **Phù hợp** | ⚠️ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐ | ⭐⭐ |

---

## 4. 🔥 SO SÁNH CHI TIẾT: SUPABASE vs CLOUDFLARE D1

| Tiêu chí | Supabase | Cloudflare D1 |
|----------|----------|---------------|
| **Storage** | 500MB | **5GB** (gấp 10x) |
| **Pause** | ⚠️ Pause sau 7 ngày | ✅ Không bao giờ pause |
| **Auth** | ✅ Built-in (50K MAU) | ❌ Cần thư viện (Auth.js, better-auth) |
| **File upload** | ✅ 1GB Storage | ❌ Cần Cloudflare R2 (10GB free) |
| **API** | ✅ Tự động generate REST | ❌ Phải viết Workers handler |
| **Dashboard** | ✅ Web UI quản lý data | ⚠️ Cơ bản hơn |
| **Realtime** | ✅ WebSocket | ❌ Không có |
| **RLS** | ✅ Row Level Security | ❌ Phải check trong Workers |
| **Backup** | ❌ Free không có | ✅ Time Travel 7 ngày |
| **Egress** | 2-5GB/tháng | ✅ Unlimited |
| **Ecosystem** | Standalone | **Tận dụng Cloudflare tunnel đang dùng** |
| **DB engine** | PostgreSQL (mạnh hơn) | SQLite (nhẹ hơn, đơn giản hơn) |
| **Migration effort** | Trung bình (SDK sẵn) | Trung bình-Cao (cần viết Workers) |

### Đánh giá cho iTongQuiz:

**Chọn Supabase nếu:**
- Muốn setup nhanh, ít code → Auth + API tự động
- Cần Realtime (live quiz, live leaderboard)
- Chấp nhận rủi ro pause (giải quyết bằng cron ping)
- Không muốn học thêm Cloudflare Workers

**Chọn Cloudflare D1 nếu:**
- Muốn **không bao giờ bị pause** → ổn định cho production
- Tận dụng **Cloudflare tunnel đã setup**
- Storage lớn hơn (5GB vs 500MB)
- Chấp nhận tự code API layer bằng Workers
- Chấp nhận tự setup Auth (dùng Auth.js + D1 adapter)

---

## 5. ✅ KHUYẾN NGHỊ CẬP NHẬT

### Nếu ưu tiên **tốc độ phát triển** → **Supabase** ⭐
- All-in-one, ít code nhất, ~7-9 ngày
- Rủi ro: pause 7 ngày inactive

### Nếu ưu tiên **ổn định + ecosystem** → **Cloudflare D1** ⭐
- Tận dụng Cloudflare tunnel hiện có
- Không pause, storage 10x lớn hơn
- Cần thêm effort viết Workers (~9-12 ngày)

### Lộ trình Supabase:

| Phase | Nội dung | Ước tính |
|-------|----------|----------|
| **Phase 1** | Thiết kế schema PostgreSQL | 1 ngày |
| **Phase 2** | Setup Supabase + Auth | 1 ngày |
| **Phase 3** | Tạo `supabaseService.ts` thay `googleSheetService.ts` | 2-3 ngày |
| **Phase 4** | Migrate data | 1 ngày |
| **Phase 5** | Test + fix | 2 ngày |
| **Tổng** | | **~7-9 ngày** |

### Lộ trình Cloudflare D1:

| Phase | Nội dung | Ước tính |
|-------|----------|----------|
| **Phase 1** | Thiết kế schema SQLite | 1 ngày |
| **Phase 2** | Setup D1 + Workers API (CRUD endpoints) | 2-3 ngày |
| **Phase 3** | Setup Auth (Auth.js + D1 adapter) | 1-2 ngày |
| **Phase 4** | Tạo `d1Service.ts` thay `googleSheetService.ts` | 2-3 ngày |
| **Phase 5** | Migrate data + deploy Workers | 1 ngày |
| **Phase 6** | Test + fix | 2 ngày |
| **Tổng** | | **~9-12 ngày** |

---

## 6. BƯỚC TIẾP THEO

1️⃣ **Chọn Supabase** → `/plan` thiết kế schema + migration
2️⃣ **Chọn Cloudflare D1** → `/plan` thiết kế schema + Workers API
3️⃣ **Cần thêm thông tin** → Em research sâu hơn
4️⃣ **Lưu lại** → Suy nghĩ thêm, gõ `/plan` khi sẵn sàng
