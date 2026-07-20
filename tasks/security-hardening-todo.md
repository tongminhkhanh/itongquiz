# Security Hardening — Task Checklist

Detailed plan: `docs/plans/2026-07-20-security-hardening.md`

## Phase 1 — No-regret hardening

- [x] Task 1 — Helper phản hồi lỗi 5xx generic + requestId
  - [x] RED test
  - [x] GREEN test
  - [x] Router không phản chiếu raw error
  - [x] Targeted test đạt

- [x] Task 2 — Sanitize lỗi quiz, AI Tutor và student batch
  - [x] Không `error.message` trong response 500
  - [x] 4xx nghiệp vụ giữ nguyên
  - [x] Quiz/classroom security tests đạt

- [x] Task 3 — Sanitize lỗi live exam
  - [x] Service errors giữ status/message nghiệp vụ
  - [x] Unknown errors trả fallback generic
  - [x] Live exam tests đạt

- [x] Task 4 — Escape XML OG renderer
  - [x] Escape name/title/rank
  - [x] Injection payload test
  - [x] PNG render smoke đạt — 58,994 bytes, PNG signature hợp lệ

- [x] Task 5 — Xóa dump vận hành khỏi Git
  - [x] Xóa `workers/dump.json`
  - [x] Xóa `workers/test_query.txt`
  - [x] Xóa `workers/fix_teacher.ps1`
  - [x] Cập nhật `.gitignore`
  - [x] Cập nhật security scan rule

### Checkpoint A

- [x] Targeted tests đạt — 6 files, 45 tests
- [x] `npm run security:check` đạt — 1,487 files, 0 production CVE
- [x] Không thay đổi auth contract

## Phase 2 — Auth transport migration

- [x] Task 6 — JWT claims + cookie builder compat
  - [x] `iss` và `aud`
  - [x] HS256 allowlist
  - [x] Payload runtime validation
  - [x] Legacy verify mode có giới hạn
  - [x] `SameSite=Lax`

- [x] Task 7 — Backend auth transport mode
  - [x] `compat` trả token để rollback
  - [x] `cookie` không trả token JSON
  - [x] Teacher/student login set cookie + no-store
  - [x] Contract tests đạt

- [x] Task 8 — Vercel Preview same-origin API rewrite
  - [x] `/api/*` rewrite đúng
  - [x] API base tương đối trên preview
  - [x] SPA rewrite không nuốt API
  - [ ] Preview cookie browser smoke sau deploy

- [x] Task 9 — API client cookie-first
  - [x] Không đọc auth token từ localStorage
  - [x] `credentials: include`
  - [x] Token legacy bị loại khỏi body và không chuyển thành bearer
  - [x] API auth tests đạt

- [x] Task 10 — Teacher login/store migration
  - [x] Không ghi teacher JWT localStorage
  - [x] Restore qua `/api/account/me`
  - [x] Forced password change bằng cookie
  - [x] Login/reload/logout contract tests đạt

- [x] Task 11 — Student login/store migration
  - [x] Không ghi student JWT localStorage
  - [x] Không persist session object có token
  - [x] Student profile restore đạt
  - [x] Dashboard/gamification restore tests đạt

- [x] Task 12 — Certificate teacher clients cookie-only
  - [x] Batch API
  - [x] Admin templates
  - [x] Batch hooks
  - [x] Tests đạt

- [x] Task 13 — Certificate student + notifications cookie-only
  - [x] My certificates
  - [x] Image blob fetch
  - [x] Notifications GET/PATCH
  - [x] Tests đạt

- [x] Task 14 — AI/live exam/analytics cookie-only
  - [x] AI Worker client
  - [x] Live exam service
  - [x] Live exam analytics
  - [x] Teacher analytics
  - [x] Tests đạt

- [x] Task 15 — Enforce cookie-only + legacy cleanup ở mức source/config
  - [x] Backend login JSON không token
  - [x] Frontend cleanup JWT keys một lần
  - [x] Runbook revoke/rollback
  - [x] Production build và Worker dry-run đạt
  - [ ] Approval trước token revocation hoặc claim enforcement

### Checkpoint B

- [x] Teacher login → restore → logout đạt bằng automated contract tests
- [x] Student login → restore → logout đạt bằng automated contract tests
- [x] Certificate/AI/live exam cookie-client tests đạt
- [x] Security scan chặn JWT trong persistent browser storage
- [ ] Browser smoke trên Vercel Preview và production-like sau deploy
- [ ] Approval trước thu hồi phiên hoặc `AUTH_MIGRATION_MODE=enforce`

## Phase 3 — CORS, CSRF và rate limit

- [x] Task 16 — Environment CORS + Origin guard
  - [x] Production HTTPS allowlist
  - [x] Dev-only localhost/IP
  - [x] Unsafe methods reject origin lạ
  - [x] Preflight allow/deny tests đạt

- [x] Task 17 — Rate-limit failure policy
  - [x] Core `open|closed` option
  - [x] Login fail closed
  - [x] AI fail closed
  - [x] Admin-sensitive fail closed
  - [x] Public/read route behavior giữ ổn định

### Checkpoint C

- [x] Cross-origin mutation bị chặn
- [x] Sensitive limiter failure tests đạt
- [x] Public routes không regression

## Phase 4 — Verification và release gate

- [ ] Task 18 — Full verification
  - [x] `npm run security:check`
  - [x] Frontend `npm audit`
  - [x] Backend `npm audit`
  - [x] Full Vitest
  - [x] Root TypeScript check
  - [x] Worker TypeScript check
  - [x] Vite production build
  - [x] API Worker dry-run bundle
  - [x] Certificate consumer dry-run bundle
  - [x] Git diff review
  - [x] GitNexus impact review
  - [x] Production runtime smoke qua `www.thitong.site`
  - [x] Vercel Preview runtime smoke qua protection bypass CLI
  - [x] CORS preflight/mutation smoke với official, preview và untrusted origins
  - [x] Teacher/student login route smoke bằng tài khoản giả
  - [ ] Production-like browser smoke tương tác
  - [ ] Vercel Preview browser smoke tương tác
  - [ ] Thực thi rollback drill
  - [x] Approval trước deploy production

### Release evidence — 2026-07-20

- Commit production: `9c81107`
- API Worker manual deploy version: `d0c41781-0e7c-4aa3-aca0-a089ffc2b9fe`
- API Worker rollback baseline trước Phase 3: `b8e5ce6a-3786-4b3d-b124-95077ff16d9e`
- Vercel production deployment dùng cho initial smoke: `dpl_2P3TJycrTS8VkP141oA8k9sZcXut`
- Vercel preview deployment dùng cho Phase 3 smoke: `dpl_DcqRjfq7mpNERGFb5getDqEnkE2t`
- Production frontend `/` và same-origin `/api/health`: đạt
- Preview frontend `/` và same-origin `/api/health` qua `vercel curl`: đạt
- Origin lạ: preflight và mutation đều bị chặn `403`
- Teacher/student invalid-login routes: reachable, không `503`

## Final Definition of Done

- [x] Không auth JWT trong persistent browser storage
- [x] Không raw 500 errors
- [x] OG SVG escaped
- [x] CORS/Origin policy production-safe
- [x] Sensitive rate limit fail closed
- [x] Dump artifacts không tracked
- [x] Audit/test/typecheck/build/dry-run đạt
- [x] Runtime smoke đạt
- [x] Deploy và revoke chỉ sau approval
