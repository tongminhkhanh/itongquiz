# 🏥 Báo Cáo Khám Chuyên Khoa Hiệu Năng — iTongQuiz
**Ngày khám:** 12/03/2026
**Phạm vi:** Performance Focus (Database + Frontend + API + Bundle)

---

## 📊 Tổng kết

| Hạng mục | Kết quả |
|:---------|:--------|
| 🔴 Nghiêm trọng | **0** |
| 🟡 Nên cải thiện | **5** |
| 🟢 Gợi ý tối ưu thêm | **3** |

**Nhận xét chung:** Dự án đã có nền tảng hiệu năng **khá tốt**. Không có lỗi nghiêm trọng nào gây crash hay treo ứng dụng. Các vấn đề dưới đây chỉ ảnh hưởng khi dữ liệu lớn dần (hàng nghìn kết quả, hàng trăm đề thi).

---

## ✅ ĐIỂM MẠNH — Đã tối ưu tốt

| Hạng mục | Chi tiết |
|:---------|:---------|
| Lazy Loading (App) | ✅ 4 main views đều dùng `React.lazy` + `Suspense` |
| Lazy Loading (Tabs) | ✅ TeacherDashboard lazy-load 11 tab riêng biệt |
| Memoization | ✅ 50+ instances `useMemo`/`useCallback` — rất ít re-render lãng phí |
| DB Indexes | ✅ 8 indexes trên các cột hay query (quiz_id, class_id, username...) |
| Code Splitting | ✅ Vite manualChunks tách vendor-react, vendor-motion, vendor-data |
| Parameterized Queries | ✅ Tất cả SQL đều dùng `.bind()` — an toàn và nhanh |

---

## 🟡 NÊN CẢI THIỆN

### 1. API `/api/results` không có Pagination
**Vị trí:** `workers/src/routes/results.ts:15`

**Hiện tại:** `SELECT * FROM results ORDER BY submitted_at DESC` — Trả về **TẤT CẢ** kết quả không giới hạn.

**Hậu quả:** Khi có hàng nghìn bài nộp, response sẽ rất nặng (mỗi result chứa cả JSON `answers`).

**Phác đồ:** Thêm `LIMIT` + `OFFSET` và nhận query param `?page=1&limit=50`.

---

### 2. Thiếu Index trên `results.submitted_at`
**Vị trí:** `workers/schema.sql`

**Hiện tại:** Query `ORDER BY submitted_at DESC` nhưng không có index trên cột `submitted_at`.

**Hậu quả:** Khi bảng `results` lớn, việc sắp xếp sẽ chậm dần (full table scan).

**Phác đồ:**
```sql
CREATE INDEX IF NOT EXISTS idx_results_submitted_at ON results(submitted_at DESC);
```

---

### 3. Dùng `SELECT *` thay vì chọn cột cần thiết
**Vị trí:** 43 lượt dùng `SELECT *` trong `workers/src/`

**Đánh giá:** Phần lớn trên bảng nhỏ (teachers, announcements, shop_items) nên không ảnh hưởng nhiều.

**Quan ngại chính:** Bảng `questions` có cột `image` chứa Base64 rất dài → `SELECT *` kéo toàn bộ ảnh khi chỉ cần metadata.

**Phác đồ:** Với các API listing, thay `SELECT *` bằng `SELECT id, type, question, tags` (bỏ cột `image` nặng).

---

### 4. Bundle JS lớn chưa được lazy-load
| File | Kích thước | Gzip |
|:-----|:-----------|:-----|
| `QuizPreview` | **479 KB** | 137 KB |
| `BarChart` | **344 KB** | 104 KB |
| `index` | **230 KB** | 73 KB |

**Phác đồ:** `QuizPreview` và `BarChart` chỉ dùng trong TeacherDashboard → Đảm bảo chúng nằm trong lazy-loaded chunks (hiện tại **đã đúng** vì TeacherDashboard là `React.lazy`). Trên mobile, học sinh sẽ không tải chúng 👍.

---

### 5. `answers` JSON trong bảng `results` — Payload nặng
**Hiện tại:** Mỗi result lưu `answers TEXT DEFAULT '{}'` — có thể chứa hàng chục KB JSON cho 1 bài nộp.

**Hậu quả:** Khi `GET /api/results` trả về 500 kết quả × 20KB mỗi cái = ~10MB response.

**Phác đồ:** Tách `answers` ra query riêng khi xem chi tiết (lazy load answers).

---

## 🟢 GỢI Ý THÊM

### 6. Thêm Cache-Control headers cho static assets
Các file JS/CSS đã có hash trong tên (do Vite), nhưng nên thêm header `Cache-Control: max-age=31536000` để trình duyệt cache mạnh hơn.

### 7. Preload font nếu dùng Google Fonts
Thêm `<link rel="preload">` cho font chính để giảm FOUT (Flash of Unstyled Text).

### 8. Nén hình ảnh Base64 trong câu hỏi
Hình ảnh câu hỏi (`IMAGE_QUESTION`) lưu dạng Base64 trong DB → Rất nặng. Cân nhắc dùng URL (Cloudinary/R2) thay vì inline Base64.

---

## 📈 So sánh với Tiêu chuẩn

| Tiêu chí | Tiêu chuẩn | iTongQuiz | Đánh giá |
|:---------|:-----------|:----------|:---------|
| Largest JS Bundle | < 250KB | 479KB (QuizPreview) | 🟡 Hơi nặng nhưng lazy-loaded |
| DB Indexes | Đủ cho WHERE & ORDER BY | 8/9 cần | 🟡 Thiếu `submitted_at` |
| Lazy Loading | Tất cả route + tab | ✅ 4 routes + 11 tabs | ✅ Xuất sắc |
| Memoization | Dùng cho computed values | ✅ 50+ instances | ✅ Xuất sắc |
| Pagination | Bắt buộc cho list API | ❌ Thiếu ở `/api/results` | 🟡 Cần thêm |
| Console cleanup | 0 console.log production | ✅ esbuild drop added | ✅ Đã xử lý |
