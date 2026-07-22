# Parent Portal V1 Rollout and Rollback Runbook

## Scope

This runbook deploys the read-only Parent Portal at `https://phuhuynh.thitong.site` for a controlled one-class pilot. It covers database preparation, backend-first deployment, frontend feature-flag rollout, domain verification, monitoring, incident handling, and rollback.

The initial pilot supports one active parent link per student. Parent accounts may view only the linked student's dashboard, notifications, summarized results, homework, certificates, and profile. Parents cannot edit data or reply to teachers in V1.

## Required approvals

The following actions require explicit production approval and must not be run as part of an unattended deployment:

1. Remote D1 backup and migration.
2. Adding `phuhuynh.thitong.site` to the Vercel project.
3. Creating or changing the DNS record for `phuhuynh.thitong.site`.
4. Enabling `VITE_FEATURE_PARENT_PORTAL_V1=true` in production.
5. Issuing parent access to the pilot class.

## Prerequisites

- The branch includes migrations `0037_add_parent_portal_complete.sql` and the rollback migration.
- Frontend and Worker typechecks pass.
- Full Vitest suite passes.
- Production dependency audits report critical=0 and high=0.
- Worker dry-run succeeds.
- Cypress Parent Portal spec passes against mocked APIs.
- `JWT_SECRET` exists in the production Worker and is at least 32 random characters.
- No PIN, activation token, access code, cookie, or JWT appears in logs.
- Vercel rewrites `/api/:path*` before the SPA fallback.
- The feature flag remains off until backend and migration verification are complete.

## Safe observability events

Allowed structured events:

- `[ParentPortal] link_created`
- `[ParentPortal] link_reissued`
- `[ParentPortal] link_revoked`
- `[ParentPortal] activated`
- `[ParentPortal] login_success`
- `[ParentPortal] login_failed`
- `[ParentPortal] notification_created`

Allowed metadata includes IDs, event kind, source type, source ID, actor username, request ID, and failure reason. Never log activation tokens, PINs, PIN hashes, access codes, cookies, authorization headers, passwords, or JWT secrets.

## Pre-deployment quality gate

Run from the repository root:

```bash
npm run security:check
npm audit --json
cd workers && npm audit --json && cd ..
npx vitest run --maxWorkers=1
npx tsc --noEmit -p tsconfig.json
npx tsc --noEmit -p workers/tsconfig.json
npm run build
npx wrangler deploy --dry-run --config workers/wrangler.toml
npm run cypress:run -- --spec cypress/e2e/parent-portal.cy.ts
```

Expected results:

- Production audit: critical=0, high=0.
- Frontend/Worker typecheck: pass.
- Vitest: pass.
- Worker dry-run: pass.
- Cypress Parent Portal spec: pass.

If `npm run build` fails only because sitemap generation cannot reach the network, run the following as additional frontend build evidence and record the sitemap failure separately:

```bash
npx vite build
```

Do not report the full build as passing when sitemap generation failed.

## D1 backup

Before a remote migration, create a timestamped export and store it outside the deployment workspace:

```bash
npx wrangler d1 export itongquiz-db \
  --remote \
  --config workers/wrangler.toml \
  --output backups/itongquiz-db-before-parent-portal-YYYYMMDD-HHMM.sql
```

Verify the export exists and is non-empty before proceeding.

## Local migration verification

Initialize or reuse a local D1 database with the current production-compatible schema, then run:

```bash
npx wrangler d1 execute itongquiz-db \
  --local \
  --config workers/wrangler.toml \
  --file=workers/migrations/0037_add_parent_portal_complete.sql
```

Verify:

- `parent_links`, `parent_activation_tokens`, `parent_notifications`, and `parent_class_announcements` exist.
- `results.student_id` exists.
- Unique indexes prevent duplicate active notification sources.
- Existing quiz, result-report, homework, and certificate tests remain green.

## Remote migration approval gate

The following command is documented for an approved operator only. Do not run it automatically:

```bash
npx wrangler d1 execute itongquiz-db --remote --config workers/wrangler.toml --file=workers/migrations/0037_add_parent_portal_complete.sql
```

After the approved migration, verify table/index presence with read-only D1 queries before deploying the Worker.

## Deployment order

### 1. Deploy backend-compatible Worker

Deploy Worker code while the frontend feature flag is still off:

```bash
npx wrangler deploy --config workers/wrangler.toml
```

Smoke-test:

- `/api/parent/session` returns 401 without a parent cookie.
- Parent auth responses include `Cache-Control: no-store`.
- CORS allows exactly `https://phuhuynh.thitong.site` and existing official origins.
- Teacher parent-link routes still require teacher/admin JWT authorization.
- Cross-student result IDs return 404.

### 2. Deploy frontend with flag off

Set:

```env
VITE_FEATURE_PARENT_PORTAL_V1=false
```

Deploy the frontend. Confirm the parent hostname displays the preparation/unavailable page and the main site is unaffected.

### 3. Configure Vercel domain

In the existing Vercel project:

1. Add `phuhuynh.thitong.site` as a project domain.
2. Copy the exact DNS target Vercel reports.
3. Create the DNS record exactly as instructed by Vercel.
4. Follow Vercel's verification guidance for proxying; do not guess the Cloudflare proxy state.
5. Do not add a separate Worker custom route for the parent hostname. Browser `/api/*` requests continue through the Vercel rewrite to `https://phieu.thitong.site/api/*`.

Verify:

- TLS certificate is valid.
- HSTS is present.
- Parent HTML/routes return `X-Robots-Tag: noindex, nofollow` where configured.
- Parent login/activation routes return `Referrer-Policy: no-referrer` and `Cache-Control: private, no-store`.
- Static assets remain immutable-cacheable.
- The `parent_auth_token` cookie is Secure, HttpOnly, SameSite=Lax, host-only, and not sent to unrelated subdomains.

### 4. Enable the feature for the pilot

Set:

```env
VITE_FEATURE_PARENT_PORTAL_V1=true
```

Redeploy the frontend. Enable access for one class only, maximum 40 students, for seven calendar days.

## Pilot smoke test

Use a dedicated pilot student and parent test account:

1. Teacher opens the class and creates a Parent Portal QR.
2. Confirm the QR encodes only the activation URL and contains no student ID, name, phone number, PIN, or access code.
3. Parent opens the activation URL and sets a six-digit PIN.
4. Parent reaches the linked student's dashboard.
5. Parent sees only that student's data.
6. Teacher publishes a result report, homework, class announcement, and certificate.
7. Parent sees each notification category and can mark one or all as read.
8. Parent opens a summarized result detail and never sees question text, selected answers, or correct answers.
9. Teacher revokes the link; the current parent session immediately receives 401.
10. Teacher reissues access; the old activation URL and old session no longer work.
11. Parent logs out; protected routes redirect to login.

## Pilot success criteria

Measure for seven calendar days:

- At least 60% of issued links are activated.
- At least 40% of activated parents open the dashboard during the week.
- At least 50% of parent notifications are viewed.
- Zero cross-student access incidents.
- A teacher can issue access for a 40-student class within five minutes.
- Parent dashboard Worker p95 is below 500 ms.
- Parent login error rate is below 5% after excluding deliberate test attempts.
- No secret-bearing log events are detected.

## Monitoring and incident response

Monitor:

- Activation success/failure counts.
- Login success/failure rates.
- Dashboard latency and 5xx rate.
- Notification creation/read rates.
- Link reissue/revoke events.
- CORS/origin-guard failures.
- Any 404/403 pattern suggesting cross-student probing.

For a suspected privacy or authorization incident:

1. Set the frontend feature flag off and redeploy.
2. Revoke affected links to invalidate sessions.
3. Preserve Worker logs, request IDs, audit rows, and relevant D1 records.
4. Do not print or copy activation tokens, PINs, cookies, or access codes into the incident ticket.
5. Escalate to the project owner and security contact before re-enabling.

## Rollback

### Fast frontend rollback

1. Set `VITE_FEATURE_PARENT_PORTAL_V1=false`.
2. Redeploy the frontend.
3. Confirm the parent host shows the unavailable page.

### Security rollback

1. Revoke all pilot links or the affected links.
2. Confirm old parent cookies receive 401.
3. Roll back frontend and Worker deployments to the previous known-good versions.
4. Keep the new tables and `results.student_id` for audit unless data removal is explicitly approved.

### Database rollback

Run the destructive rollback migration only after confirming no parent link, session, notification, announcement, or audit data must be retained:

```bash
npx wrangler d1 execute itongquiz-db --remote --config workers/wrangler.toml --file=workers/migrations/0037_drop_parent_portal_complete.sql
```

This command requires explicit production and data-retention approval. Do not remove `results.student_id` during an emergency rollback.

## Post-pilot decision

At the end of seven days, record:

- Success criteria results.
- Activation and usage funnel.
- Teacher workflow time.
- Parent feedback.
- Performance/error metrics.
- Security/privacy incidents or near misses.
- Decision to expand, revise, pause, or roll back.
