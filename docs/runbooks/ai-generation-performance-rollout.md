# AI Quiz Generation Performance Rollout

## Mục tiêu

Giảm thời gian giáo viên chờ đề xuất hiện mà không hạ thấp các kiểm tra deterministic về schema, số câu, dạng câu, độ khó, đáp án, câu trùng, semantic và định dạng toán.

Hai feature flag được triển khai độc lập:

```env
VITE_FEATURE_AI_FAST_PATH=false
VITE_FEATURE_AI_DEFER_IMAGES=false
```

- `AI_FAST_PATH`: đề hợp lệ dùng một upstream call; đề cần sửa dùng tối đa `GENERATE + REPAIR`. Reviewer chỉ chạy khi giáo viên chọn strict.
- `AI_DEFER_IMAGES`: hiển thị đề với placeholder trước, sau đó hydrate tối đa hai ảnh đồng thời.

Mặc định cả hai flag là `false`, vì vậy deploy code không tự thay đổi hành vi production.

## Trước khi deploy

Chạy tại repository root:

```bash
npm run test:run
npx tsc -p workers/tsconfig.json --noEmit
npm run build
npm run security:check
npx wrangler deploy --dry-run --config workers/wrangler.toml
```

Root `npx tsc --noEmit` hiện có hai lỗi baseline ngoài phạm vi tại:

```text
src/components/TeacherDashboard/AnnouncementSettings.tsx:210
src/components/TeacherDashboard/AnnouncementSettings.tsx:212
```

Không chấp nhận lỗi TypeScript mới ngoài hai lỗi này.

## Giai đoạn 1 — Telemetry, chưa đổi hành vi

1. Giữ cả hai flags `false`.
2. Apply migration additive:

```bash
npx wrangler d1 migrations apply itongquiz-db --remote --config workers/wrangler.toml
```

Phải thấy `0043_create_ai_stage_metrics.sql` và `0044_add_ai_image_stage.sql` được áp dụng.

3. Deploy Worker và frontend.
4. Thu baseline tối thiểu 20 action `QUIZ_CREATE` hoặc 24 giờ, tùy điều kiện nào đến sau.

Telemetry chỉ lưu:

- action ID;
- username kỹ thuật để phân quyền/đối soát;
- workflow, stage, model, status;
- request bytes, TTFB, error code và timestamp.

Không lưu prompt, nội dung câu hỏi, đáp án hoặc dữ liệu học sinh.

### Query stage baseline

```bash
npx wrangler d1 execute itongquiz-db --remote --config workers/wrangler.toml --command "SELECT stage, status, COUNT(*) AS calls, ROUND(AVG(ttfb_ms),1) AS avg_ttfb_ms, MAX(ttfb_ms) AS max_ttfb_ms FROM ai_generation_stage_metrics WHERE created_at >= datetime('now','-24 hours') GROUP BY stage, status ORDER BY stage, status;"
```

### Query call budget

```bash
npx wrangler d1 execute itongquiz-db --remote --config workers/wrangler.toml --command "SELECT upstream_calls, COUNT(*) AS actions FROM ai_generation_actions WHERE workflow='QUIZ_CREATE' AND created_at >= datetime('now','-24 hours') GROUP BY upstream_calls ORDER BY upstream_calls;"
```

### Query action latency proxy

`completed_at` phản ánh lúc stage tạo đề chính được ghi thành công; stage `IMAGE` có thể cập nhật `updated_at` sau đó nên không dùng `updated_at` cho thời gian đề text sẵn sàng.

```bash
npx wrangler d1 execute itongquiz-db --remote --config workers/wrangler.toml --command "WITH durations AS (SELECT (julianday(completed_at)-julianday(created_at))*86400.0 AS seconds FROM ai_generation_actions WHERE workflow='QUIZ_CREATE' AND status='SUCCEEDED' AND completed_at IS NOT NULL AND created_at >= datetime('now','-24 hours')), ranked AS (SELECT seconds, ROW_NUMBER() OVER (ORDER BY seconds) AS rn, COUNT(*) OVER () AS total FROM durations) SELECT MAX(total) AS actions, ROUND(AVG(seconds),1) AS avg_seconds, ROUND((SELECT seconds FROM ranked r2 WHERE r2.rn >= CAST((ranked.total+1)/2 AS INTEGER) ORDER BY r2.rn LIMIT 1),1) AS median_seconds, ROUND((SELECT seconds FROM ranked r3 WHERE r3.rn >= CAST((ranked.total*95+99)/100 AS INTEGER) ORDER BY r3.rn LIMIT 1),1) AS p95_seconds, ROUND(MAX(seconds),1) AS max_seconds FROM ranked;"
```

Đây là proxy phía server. Khi smoke test, đồng thời đo thời gian từ lúc bấm “Tạo đề” đến lúc preview xuất hiện trong trình duyệt.

## Giai đoạn 2 — Bật fast path

Đặt trên Vercel production:

```env
VITE_FEATURE_AI_FAST_PATH=true
VITE_FEATURE_AI_DEFER_IMAGES=false
```

Deploy frontend, sau đó theo dõi 24 giờ.

### Smoke test

Tạo bằng tài khoản giáo viên test:

1. Đề chủ đề đơn giản, 10 câu, `fast + concise`.
2. Đề trên staging có fixture sai để kích hoạt một `REPAIR`.
3. Đề strict để xác nhận reviewer vẫn hoạt động.

Xác nhận:

- case 1 có một upstream call;
- case 2 tối đa hai upstream call;
- fast action hợp lệ có `review_calls = 0`;
- strict action có thể có `review_calls = 1`;
- cancel hoạt động ở OCR, generate và repair/review;
- lời giải mặc định 1–2 câu.

### Rollback fast path

Tắt:

```env
VITE_FEATURE_AI_FAST_PATH=false
```

Deploy lại frontend. Hệ thống quay về reviewer blocking; không rollback migration.

Rollback ngay khi một trong các điều kiện xảy ra:

- tỷ lệ FAILED tăng hơn 2 điểm phần trăm so với baseline;
- P95 proxy hoặc thời gian browser vượt 60 giây;
- xuất hiện đề vượt qua deterministic audit nhưng sai cấu trúc/đáp án;
- action fast hợp lệ phát sinh reviewer ngoài policy.

## Giai đoạn 3 — Bật deferred images

Chỉ thực hiện sau khi fast path ổn định 24 giờ.

```env
VITE_FEATURE_AI_FAST_PATH=true
VITE_FEATURE_AI_DEFER_IMAGES=true
```

Deploy frontend và theo dõi thêm 24 giờ.

### Smoke test ảnh

Tạo đề có ba câu `IMAGE_QUESTION` và xác nhận:

- preview text xuất hiện trước ảnh;
- placeholder “Đang tạo ảnh” xuất hiện ngay;
- tối đa hai request ảnh chạy đồng thời;
- ảnh cập nhật đúng câu;
- nút lưu bị khóa trong lúc hydrate nhưng giáo viên vẫn xem/sửa được đề;
- cancel dừng các request ảnh còn lại;
- daily usage không tăng do stage `IMAGE`;
- một action không vượt 10 `image_calls`.

Query đối soát quota ảnh:

```bash
npx wrangler d1 execute itongquiz-db --remote --config workers/wrangler.toml --command "SELECT action_id, username, status, generate_calls, image_calls, upstream_calls FROM ai_generation_actions WHERE workflow='QUIZ_CREATE' AND image_calls > 0 AND created_at >= datetime('now','-24 hours') ORDER BY created_at DESC;"
```

### Rollback deferred images

Tắt riêng:

```env
VITE_FEATURE_AI_DEFER_IMAGES=false
```

Deploy lại frontend. Ảnh quay về chế độ blocking nhưng vẫn dùng cùng action và không trừ thêm daily quota.

## Acceptance gate

Chỉ coi rollout hoàn tất khi cửa sổ 24 giờ gần nhất đạt đủ:

- ít nhất 20 action `QUIZ_CREATE` thành công;
- median thời gian đề xuất hiện không quá 20 giây;
- P95 không quá 60 giây;
- ít nhất 90% action có `upstream_calls <= 2`, không tính action có ảnh khi phân tích call budget text;
- fast action hợp lệ không có `review_calls > 0`;
- tỷ lệ FAILED không tăng quá 2 điểm phần trăm so với baseline;
- không có daily usage tăng thêm vì `IMAGE`;
- không có prompt, câu hỏi hoặc dữ liệu học sinh trong telemetry.

## Không rollback schema

Migration `0043` và `0041` đều additive. Khi rollback frontend/Worker, giữ nguyên bảng telemetry và cột `image_calls`; không chạy migration ngược.

Nếu telemetry persistence có vấn đề, tắt lời gọi `recordAiStageMetric` trong Worker và giữ schema. Nếu timeout tạo false timeout, tăng riêng stage bị ảnh hưởng; không quay lại timeout chung 300 giây.
