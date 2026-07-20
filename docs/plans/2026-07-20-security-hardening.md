# Implementation Plan: Security Hardening Backend và Frontend

## Mục tiêu

Khắc phục các phát hiện bảo mật có thể xử lý trực tiếp trong repository iTongQuiz mà không làm gián đoạn đăng nhập production, không làm hỏng Vercel Preview và không thay đổi nghiệp vụ học tập. Trọng tâm là loại bỏ JWT khỏi `localStorage`, chuyển dần sang cookie `HttpOnly`, ẩn lỗi nội bộ, siết CORS/Origin, escape dữ liệu SVG, làm sạch dump vận hành và tăng độ bền của rate limit.

## Phạm vi thực hiện được

- Sửa mã frontend React/Vite và backend Cloudflare Workers.
- Thêm/sửa unit, integration và Worker security tests.
- Sửa `wrangler.toml`, `vercel.json`, `.gitignore`, security scan script và tài liệu triển khai.
- Chạy audit, test, typecheck, build/dry-run và smoke test khi có credential kiểm thử.

## Ngoài phạm vi tự động

- Bật Cloudflare WAF/Rate Limiting Rules trong dashboard nếu tài khoản không cấp quyền.
- Rotate `JWT_SECRET` hoặc token production mà không có phê duyệt rõ ràng.
- Deploy production, tăng `token_version` toàn hệ thống hoặc đăng xuất toàn bộ người dùng nếu chưa được phê duyệt.

## Quyết định kiến trúc

1. **Migration xác thực theo hai giai đoạn.**
   - Giai đoạn `compat`: backend có thể trả token để rollback client cũ, nhưng frontend mới bỏ qua hoàn toàn và chỉ dùng cookie `HttpOnly`.
   - Giai đoạn `cookie-only`: backend không trả JWT trong JSON; browser không có bearer transport, kể cả cho forced password change.
2. **Production dùng cookie `SameSite=Lax`.** `thitong.site` và `phieu.thitong.site` là cùng site. Vercel Preview sẽ gọi API qua rewrite cùng origin để tránh phụ thuộc third-party cookie.
3. **Không thêm dependency mới.** Dùng Web APIs, Vitest và helper hiện có.
4. **Lỗi 4xx nghiệp vụ được giữ rõ ràng; lỗi 5xx luôn generic.** Chi tiết chỉ ghi log kèm `requestId`.
5. **Rate limit có failure policy theo độ nhạy.** Login, AI và admin fail closed; route thông thường có thể giữ fail open để tránh outage toàn hệ thống.
6. **Mỗi task là một lát nhỏ, có test và commit riêng.** Không gộp auth migration thành một diff lớn.

## Threat model rút gọn

| Biên tin cậy | Tài sản | Abuse case chính | Kiểm soát trong plan |
|---|---|---|---|
| Browser → API | JWT giáo viên/học sinh | XSS đọc token từ `localStorage` | HttpOnly cookie, bỏ persistent bearer |
| API → Browser | Schema, SQL, upstream details | Cố ý tạo lỗi để thu thập thông tin | Generic 5xx + requestId |
| Origin ngoài → API cookie-auth | Hành động thay đổi dữ liệu | CSRF/CORS origin giả | Allowlist theo môi trường + Origin guard |
| D1 outage → rate limiter | Login/admin/AI | Brute force khi limiter lỗi | Failure mode `closed` cho route nhạy cảm |
| D1 content → SVG renderer | Worker render pipeline | XML/SVG injection hoặc render crash | Escape XML mọi dữ liệu động |
| Dev output → Git | Dữ liệu lớp/học sinh/bài tập | Dump remote bị commit | Xóa tracked dumps + scan rule |

---

## Phase 1 — No-regret hardening

### Task 1: Tạo helper phản hồi lỗi nội bộ an toàn

**Mô tả:** Tạo một đường xử lý chuẩn cho lỗi 5xx: log lỗi đầy đủ cùng context/requestId nhưng chỉ trả message generic cho client.

**Acceptance criteria:**
- [ ] Response 500 không chứa message gốc, SQL, stack hoặc tên bảng.
- [ ] Response có `requestId` để đối chiếu log.
- [ ] Lỗi 4xx nghiệp vụ không bị đổi nội dung.

**Verification:**
- [ ] RED/GREEN test trong `tests/systemSecurity.worker.test.ts`.
- [ ] `npx vitest run tests/systemSecurity.worker.test.ts --maxWorkers=1`.

**Dependencies:** Không.

**Files likely touched:**
- `workers/src/utils/response.ts`
- `workers/src/utils/internalError.ts` (mới)
- `workers/src/index.ts`
- `tests/systemSecurity.worker.test.ts`

**Estimated scope:** M.

### Task 2: Thay lỗi 5xx ở quiz, AI Tutor và student batch

**Acceptance criteria:**
- [ ] Các route không trả `error.message` hoặc `dbErr.cause.message` cho client.
- [ ] Log vẫn giữ context route và requestId.
- [ ] Contract lỗi 400/403/409 giữ nguyên.

**Verification:**
- [ ] `npx vitest run tests/quizzesSecurity.worker.test.ts tests/classroomRoutes.worker.test.ts --maxWorkers=1`.

**Dependencies:** Task 1.

**Files likely touched:**
- `workers/src/routes/quizzes.ts`
- `workers/src/routes/aiTutor.ts`
- `workers/src/routes/classroom/studentBatchRoute.ts`
- `tests/quizzesSecurity.worker.test.ts`
- `tests/classroomRoutes.worker.test.ts`

**Estimated scope:** M.

### Task 3: Thay lỗi 5xx trong live exam theo helper chung

**Acceptance criteria:**
- [ ] `LiveExamServiceError` có status nghiệp vụ vẫn được trả nguyên.
- [ ] Error không xác định ở session/status/results/participants chỉ trả fallback generic.
- [ ] Không route live exam nào phản chiếu raw `Error.message` ở status 500.

**Verification:**
- [ ] `npx vitest run tests/liveExam.worker.test.ts --maxWorkers=1`.

**Dependencies:** Task 1.

**Files likely touched:**
- `workers/src/routes/liveExam/responses.ts`
- `workers/src/routes/liveExam/sessionRoute.ts`
- `workers/src/routes/liveExam/statusRoute.ts`
- `workers/src/routes/liveExam/resultsRoute.ts`
- `tests/liveExam.worker.test.ts`

**Estimated scope:** M.

### Task 4: Escape XML trong OG image renderer

**Acceptance criteria:**
- [ ] `student_name`, tiêu đề bài, xếp loại và mọi text động được escape XML.
- [ ] Payload chứa `<`, `>`, `&`, dấu nháy không làm hỏng SVG.
- [ ] PNG render vẫn thành công với tiếng Việt.

**Verification:**
- [ ] Test payload injection và render smoke.
- [ ] `npx vitest run tests/ogImageSecurity.worker.test.ts --maxWorkers=1`.

**Dependencies:** Không.

**Files likely touched:**
- `workers/src/utils/ogImage.ts`
- `tests/ogImageSecurity.worker.test.ts` (mới)

**Estimated scope:** S.

### Task 5: Làm sạch dump vận hành khỏi Git

**Acceptance criteria:**
- [ ] Loại khỏi Git các file dump/query/script tạm đã xác định.
- [ ] `.gitignore` chặn mẫu dump tương tự trong tương lai.
- [ ] Security scan cảnh báo tracked remote query/dump artifacts.
- [ ] Không xóa migration/report chính thức.

**Verification:**
- [ ] `git ls-files workers/dump.json workers/test_query.txt workers/fix_teacher.ps1` không trả kết quả.
- [ ] `npm run security:scan` đạt.

**Dependencies:** Không.

**Files likely touched:**
- `.gitignore`
- `scripts/security-scan.mjs`
- `workers/dump.json` (xóa)
- `workers/test_query.txt` (xóa)
- `workers/fix_teacher.ps1` (xóa)

**Estimated scope:** S.

### Checkpoint A

- [ ] Tasks 1–5 có commit riêng hoặc tối đa hai task/commit nếu diff liên quan chặt.
- [ ] Targeted tests đạt.
- [ ] `npm run security:check` đạt.
- [ ] Không có thay đổi contract auth ở checkpoint này.

---

## Phase 2 — Auth transport migration

### Task 6: Hardening JWT claims và cookie builder ở chế độ tương thích

**Mô tả:** Thêm `issuer`, `audience`, algorithm allowlist và schema payload; cookie builder hỗ trợ policy production/preview nhưng vẫn chưa tắt response token.

**Acceptance criteria:**
- [ ] JWT mới có `iss`, `aud` và `purpose` hợp lệ.
- [ ] Verify chỉ cho phép HS256 và reject payload thiếu username/role hợp lệ.
- [ ] Chế độ compat vẫn chấp nhận token legacy trong thời gian rollout có giới hạn.
- [ ] Cookie production là `HttpOnly; Secure; SameSite=Lax`.

**Verification:**
- [ ] `npx vitest run tests/systemJwt.worker.test.ts tests/passwordSecurity.worker.test.ts --maxWorkers=1`.

**Dependencies:** Không.

**Files likely touched:**
- `workers/src/utils/jwt.ts`
- `workers/src/middleware/jwtAuth.ts`
- `workers/src/types.ts`
- `workers/wrangler.toml`
- `tests/systemJwt.worker.test.ts`

**Estimated scope:** M.

### Task 7: Thêm auth transport mode cho login backend

**Acceptance criteria:**
- [ ] `AUTH_TOKEN_TRANSPORT_MODE=compat` vẫn trả token để rollback ngắn hạn.
- [ ] `AUTH_TOKEN_TRANSPORT_MODE=cookie` không trả token trong JSON.
- [ ] Teacher login, password change và student login luôn set cookie + `Cache-Control: no-store`.
- [ ] Response schema có test cho cả hai mode.

**Verification:**
- [ ] `npx vitest run tests/systemJwt.worker.test.ts tests/classroomRoutes.worker.test.ts --maxWorkers=1`.

**Dependencies:** Task 6.

**Files likely touched:**
- `workers/src/routes/teachers.ts`
- `workers/src/classroom/studentLoginService.ts`
- `workers/src/types.ts`
- `workers/wrangler.toml`
- `tests/systemJwt.worker.test.ts`

**Estimated scope:** M.

### Task 8: Tạo đường API cùng origin cho Vercel Preview

**Mô tả:** Rewrite `/api/*` của Vercel Preview tới Worker và cho API client dùng base tương đối trên preview, giúp cookie là first-party đối với preview domain.

**Acceptance criteria:**
- [ ] Request `/api/health` trên preview được proxy đúng tới Worker.
- [ ] `Set-Cookie` từ login được browser lưu cho preview origin trong smoke test.
- [ ] Production `thitong.site` vẫn dùng backend production đúng.
- [ ] SPA rewrite không nuốt `/api/*`.

**Verification:**
- [ ] Unit test URL resolution.
- [ ] `npx vite build`.
- [ ] Smoke test preview khi có URL deploy.

**Dependencies:** Task 7.

**Files likely touched:**
- `vercel.json`
- `src/services/api/config.ts`
- `src/config/constants.ts`
- `tests/workersApiUrl.test.ts`

**Estimated scope:** M.

### Task 9: Chuyển API client trung tâm sang cookie-first, không đọc localStorage

**Acceptance criteria:**
- [ ] `getStoredJWTToken` và bearer-from-storage bị loại bỏ khỏi request thường.
- [ ] Mọi request session dùng `credentials: 'include'`.
- [ ] Trường one-time token legacy bị loại khỏi body và không được chuyển thành bearer.
- [ ] Test khẳng định không có `Authorization` lấy từ `localStorage`.

**Verification:**
- [ ] `npx vitest run src/services/api/__tests__/auth.test.ts src/services/api/__tests__/apiClient.test.ts --maxWorkers=1`.

**Dependencies:** Tasks 6 và 8.

**Files likely touched:**
- `src/services/api/auth.ts`
- `src/services/api/apiClient.ts`
- `src/services/api/types.ts`
- `src/services/api/__tests__/auth.test.ts`
- `src/services/api/__tests__/apiClient.test.ts`

**Estimated scope:** M.

### Task 10: Migrate teacher login, password change và auth store

**Acceptance criteria:**
- [ ] Login/password change không ghi JWT vào `localStorage`.
- [ ] Restore session dựa trên `/api/account/me`, không dựa trên token browser-readable.
- [ ] Chỉ metadata không nhạy cảm được phép lưu local nếu cần UI hydration.
- [ ] Forced password change hoạt động chỉ bằng cookie HttpOnly.

**Verification:**
- [ ] Component/store tests cho login, reload session, logout và forced password change.
- [ ] Search `itongquiz_teacher_jwt_token` không còn trong production source của nhóm này.

**Dependencies:** Tasks 7 và 9.

**Files likely touched:**
- `src/components/HomePage/LoginLandingPage.tsx`
- `src/components/common/LoginModal.tsx`
- `src/components/common/PasswordChangeDialog.tsx`
- `src/stores/authStore.ts`
- Một test liên quan login/auth store

**Estimated scope:** M.

### Task 11: Migrate student login và classroom store

**Acceptance criteria:**
- [ ] Student login không lưu JWT hoặc session object có token vào `localStorage`.
- [ ] Restore session gọi endpoint authenticated để lấy student identity, hoặc xác minh qua route profile nhỏ mới.
- [ ] Logout xóa cookie server-side và reset stores.
- [ ] Gamification/assignment flow vẫn hoạt động sau reload.

**Verification:**
- [ ] Student login/store integration tests.
- [ ] `npx vitest run tests/classroomRoutes.worker.test.ts tests/AppShell.test.tsx --maxWorkers=1`.

**Dependencies:** Tasks 7 và 9.

**Files likely touched:**
- `workers/src/routes/classroom/studentProfileRoute.ts` (mới nếu cần)
- `workers/src/routes/classroom/index.ts`
- `src/stores/useClassroomStore.ts`
- `src/services/classroomService.ts` hoặc type tương ứng
- Test classroom/store liên quan

**Estimated scope:** M.

### Task 12: Migrate certificate teacher clients sang cookie

**Acceptance criteria:**
- [ ] Batch/template requests không tự đọc teacher JWT.
- [ ] Request luôn `credentials: 'include'`.
- [ ] Không gửi header `Authorization: Bearer ` rỗng.

**Verification:**
- [ ] Certificate batch/template tests cập nhật và đạt.

**Dependencies:** Task 9.

**Files likely touched:**
- `src/features/certificates/certificate-batch-modal/certificateBatchApi.ts`
- `src/features/certificates/useAdminTemplates.ts`
- `src/features/certificates/useBatches.ts`
- `tests/CertificateBatchCreateModal.test.tsx`

**Estimated scope:** M.

### Task 13: Migrate certificate student image và notification clients

**Acceptance criteria:**
- [ ] Certificate image fetch, my-certificates và notifications dùng cookie.
- [ ] Blob/image fetch qua API vẫn hoạt động.
- [ ] Không còn student JWT read trong certificate/notification source.

**Verification:**
- [ ] Targeted certificate/notification tests đạt.

**Dependencies:** Tasks 9 và 11.

**Files likely touched:**
- `src/features/certificates/useCertificates.ts`
- `src/hooks/useRealtimeNotifications.ts`
- `tests/certificates.worker.test.ts`
- Test frontend certificate hook liên quan

**Estimated scope:** M.

### Task 14: Migrate AI, live exam và analytics clients sang cookie

**Acceptance criteria:**
- [ ] AI Worker client không đọc teacher token từ localStorage.
- [ ] Live exam teacher/student requests không thêm bearer lưu trữ.
- [ ] Analytics vẫn gửi cookie và giữ quyền backend.
- [ ] Search production source không còn token storage key trong các service này.

**Verification:**
- [ ] `npx vitest run src/services/ai/__tests__/workerAiClient.test.ts tests/liveExam.worker.test.ts --maxWorkers=1`.

**Dependencies:** Task 9.

**Files likely touched:**
- `src/services/ai/workerAiClient.ts`
- `src/services/liveExamService.ts`
- `src/services/liveExamAnalyticsService.ts`
- `src/features/analytics/services/analyticsService.ts`
- `src/services/ai/__tests__/workerAiClient.test.ts`

**Estimated scope:** M.

### Task 15: Enforce cookie-only và thu hồi token browser cũ

**Acceptance criteria:**
- [ ] Backend production config chuyển `AUTH_TOKEN_TRANSPORT_MODE=cookie` sau khi Tasks 8–14 đã smoke test.
- [ ] Login responses không chứa token.
- [ ] Frontend startup xóa các key JWT legacy một lần nhưng không dựa vào chúng.
- [ ] Có runbook tăng `token_version`/logout-all và rollback về compat.

**Verification:**
- [ ] Security tests assert login JSON không có token.
- [ ] Browser login/reload/logout đạt trên production-like và Vercel Preview.
- [ ] Search repo không còn production write/read JWT localStorage.

**Dependencies:** Tasks 10–14.

**Files likely touched:**
- `workers/wrangler.toml`
- `src/app` hoặc bootstrap cleanup module
- `tests/systemJwt.worker.test.ts`
- `docs/runbooks/auth-cookie-migration.md` (mới)

**Estimated scope:** M.

### Checkpoint B

- [ ] Teacher login → reload → account/me → logout đạt.
- [ ] Student login → reload → dashboard/gamification → logout đạt.
- [ ] Certificate, AI và live exam smoke tests đạt.
- [ ] Không JWT nào được lưu trong `localStorage` hoặc `sessionStorage`.
- [ ] Human approval trước khi đổi production mode và thu hồi session cũ.

---

## Phase 3 — CORS, CSRF và rate limiting

### Task 16: CORS theo môi trường và Origin guard cho unsafe methods

**Acceptance criteria:**
- [ ] Production chỉ allow HTTPS origin chính thức và preview pattern được cấu hình rõ.
- [ ] localhost/IP HTTP chỉ hoạt động ở development.
- [ ] POST/PUT/PATCH/DELETE cookie-authenticated reject Origin không nằm allowlist.
- [ ] OPTIONS từ origin không hợp lệ không nhận `Access-Control-Allow-Origin`.

**Verification:**
- [ ] Test allow/deny cho production, preview, localhost và origin giả.
- [ ] `npx vitest run tests/systemSecurity.worker.test.ts tests/workerRouter.worker.test.ts --maxWorkers=1`.

**Dependencies:** Task 6; nên merge sau Task 15 để test cookie-only đầy đủ.

**Files likely touched:**
- `workers/src/middleware/cors.ts`
- `workers/src/middleware/originGuard.ts` (mới)
- `workers/src/index.ts`
- `workers/src/types.ts`
- `tests/systemSecurity.worker.test.ts`

**Estimated scope:** M.

### Task 17: Failure policy cho rate limit route nhạy cảm

**Acceptance criteria:**
- [ ] `rateLimit` hỗ trợ `failureMode: open | closed`.
- [ ] Login, AI và admin-sensitive endpoints trả 503/429 an toàn khi limiter storage lỗi.
- [ ] Public/read-only route không bị outage hàng loạt nếu limiter lỗi.
- [ ] Không tin `X-Forwarded-For` khi có `CF-Connecting-IP`; fallback được document.

**Verification:**
- [ ] RED/GREEN tests cho cả open và closed.
- [ ] `npx vitest run tests/rateLimit.worker.test.ts tests/workerRouter.worker.test.ts --maxWorkers=1`.

**Dependencies:** Không; có thể làm song song Phase 2 sau khi contract options được chốt.

**Files likely touched:**
- `workers/src/middleware/rateLimit.ts`
- `workers/src/utils/loginRateLimit.ts`
- `workers/src/index.ts`
- `workers/src/routes/teachers.ts`
- `tests/rateLimit.worker.test.ts`

**Estimated scope:** M.

### Checkpoint C

- [ ] Cross-origin mutation bị chặn.
- [ ] Login/AI limiter fail closed đã được test.
- [ ] CORS preflight production không phản chiếu origin lạ.
- [ ] Không regression public health/practice/phieu routes.

---

## Phase 4 — Verification, review và release gate

### Task 18: Full verification và production readiness report

**Verification commands:**

```bash
npm run security:check
npm audit --json
cd workers && npm audit --json
npx vitest run --maxWorkers=1
npx tsc --noEmit -p tsconfig.json
npx tsc --noEmit -p workers/tsconfig.json
npx vite build
npx wrangler deploy --dry-run --config workers/wrangler.toml
npx wrangler deploy --dry-run --config workers/wrangler.certificate-consumer.toml
```

**Runtime checks:**
- [ ] Security headers trên frontend và API.
- [ ] CORS allow/deny với origin hợp lệ và giả.
- [ ] Teacher/student login, reload, logout.
- [ ] Forced password change.
- [ ] Certificate image/notification.
- [ ] AI request và live exam request.
- [ ] Không raw 500 message xuất hiện trong response.
- [ ] Vercel Preview cookie flow.

**Release gates:**
- [ ] `npm audit`: critical=0, high=0.
- [ ] Full tests đạt.
- [ ] Frontend và cả hai Worker bundle đạt.
- [ ] Security scan không phát hiện secret/dump/token-storage regression.
- [ ] Git diff được `review_diff` và GitNexus impact review.
- [ ] Có rollback: đổi transport về `compat`, deploy Worker trước frontend rollback nếu cần.
- [ ] Human approval trước deploy production và token revocation.

**Dependencies:** Tasks 1–17.

**Estimated scope:** M.

---

## Thứ tự triển khai đề xuất

1. Tasks 1–5: fix độc lập, rủi ro thấp.
2. Tasks 6–9: tạo nền auth cookie và preview transport.
3. Tasks 10–14: migrate từng frontend slice; mỗi slice test và commit riêng.
4. Task 15: enforce cookie-only sau smoke test.
5. Tasks 16–17: siết origin/rate limit.
6. Task 18: full gate, review và chỉ deploy khi được phê duyệt.

## Cơ hội chạy song song

- Tasks 4 và 5 có thể làm song song với Tasks 1–3.
- Task 17 có thể làm song song với frontend auth migration.
- Tasks 12, 13 và 14 có thể làm song song sau Task 9, nhưng phải dùng cùng cookie transport contract.
- Tasks 7 → 8 → 9 → 10/11 → 15 phải tuần tự.

## Rủi ro và giảm thiểu

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Cookie-only làm hỏng Vercel Preview | Cao | Same-origin rewrite trước khi bỏ bearer; smoke test preview bắt buộc |
| Logout/reload không restore đúng role | Cao | Dùng `/api/account/me` và student profile endpoint; integration tests |
| Token legacy còn hiệu lực sau migration | Cao | `token_version`/logout-all có approval gate và rollback mode |
| Origin guard chặn client hợp lệ | Cao | Chế độ compat, allowlist test theo environment, deploy Worker trước frontend |
| Rate limiter fail closed gây outage | Trung bình | Chỉ áp dụng route nhạy cảm; trả 503 có retry guidance |
| Generic error làm mất khả năng debug | Trung bình | requestId trong response và structured log context |
| Xóa dump ảnh hưởng tài liệu cần thiết | Thấp | Chỉ xóa ba artifact đã xác định; không chạm migrations/reports chính thức |

## Definition of Done

- [ ] Không JWT auth token trong browser-readable persistent storage.
- [ ] Không raw internal errors ở response 5xx.
- [ ] SVG renderer escape toàn bộ dữ liệu động.
- [ ] Production CORS không allow HTTP/IP dev origins.
- [ ] Unsafe cookie-auth mutations có Origin validation.
- [ ] Sensitive rate limits có tested fail-closed behavior.
- [ ] Dump vận hành không còn tracked và bị scanner chặn.
- [ ] Audit/test/typecheck/build/dry-run đều đạt.
- [ ] Browser smoke production-like và preview đạt.
- [ ] Rollback và deployment order được ghi lại.
