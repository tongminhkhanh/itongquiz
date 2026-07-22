# iTongQuiz Parent Portal Complete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng cổng phụ huynh hoàn chỉnh tại `phuhuynh.thitong.site`, trong đó mỗi tài khoản chỉ gắn với một học sinh; phụ huynh kích hoạt bằng QR dùng một lần, đăng nhập lại bằng mã truy cập + PIN 6 số, xem tổng quan tuần và lịch sử năm học, nhận thông báo trong website về kết quả, bài tập, thông báo lớp và chứng nhận.

**Architecture:** Giữ chung React/Vite frontend, Cloudflare Worker và D1 của iTongQuiz nhưng tách Parent Portal bằng hostname, router, cookie và JWT audience riêng. Mọi API phụ huynh lấy `student_id` từ session server-side; trình duyệt không được tự chỉ định học sinh. Thông báo phụ huynh dùng bảng riêng để không làm yếu contract `notifications.user_role` hiện chỉ dành cho `student | teacher | admin`.

**Tech Stack:** React 19, React Router 7, TypeScript 5.8, Vite 6, Zustand 5, Tailwind CSS 4, Cloudflare Workers, D1/SQLite, `jose`, Web Crypto PBKDF2/SHA-256, `qrcode`, Vitest 4, Testing Library, Cypress 15.

## Product Decisions Already Approved

- Triển khai theo giai đoạn: MVP một chiều trước; chưa có chat hai chiều.
- Phụ huynh đăng nhập tại `https://phuhuynh.thitong.site`.
- Mỗi QR và mỗi quyền phụ huynh chỉ gắn với đúng một học sinh.
- QR chỉ dùng để kích hoạt lần đầu; phụ huynh đặt PIN 6 số và thiết bị được ghi nhớ 30 ngày.
- Trang mặc định là **Tổng quan tuần**.
- MVP chỉ có chuông thông báo trong website; chưa tích hợp Zalo, SMS hoặc Web Push.
- Loại nội dung: kết quả/nhận xét, bài tập và hạn nộp, thông báo chung của lớp, giấy khen/chứng nhận.
- Kết quả hiển thị điểm, số câu đúng/sai, tỷ lệ chính xác, điểm mạnh/yếu và nhận xét; không hiển thị từng câu hỏi hoặc đáp án.
- Phụ huynh xem được toàn bộ năm học, lọc theo tuần, tháng, học kỳ, môn học và loại nội dung.

## Global Constraints

- MVP hỗ trợ tối đa một `parent_link` chưa bị thu hồi cho mỗi `student_id`.
- Parent Portal chỉ đọc dữ liệu học tập; thao tác ghi duy nhất của phụ huynh là kích hoạt, đăng nhập/đăng xuất và đánh dấu thông báo đã đọc.
- QR không chứa tên, lớp, số điện thoại, username hoặc `student_id`; chỉ chứa activation token ngẫu nhiên 32 byte dạng base64url.
- Activation token chỉ lưu SHA-256 hash, dùng một lần và hết hạn sau 7 ngày.
- PIN gồm đúng 6 chữ số; lưu PBKDF2-SHA256 tối thiểu 100.000 vòng, salt riêng cho từng link.
- Cookie `parent_auth_token` là host-only: `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`; không có thuộc tính `Domain`.
- JWT phụ huynh có issuer `itongquiz-api`, audience `itongquiz-parent-portal`, purpose `parent_session`, expiry 30 ngày.
- Không lưu token, PIN hoặc access code vào `localStorage`, `sessionStorage`, analytics, console hoặc audit payload.
- Mọi query Parent Portal phải scope bằng `student_id` lấy từ session; query/body có `studentId` phải bị bỏ qua hoặc từ chối.
- Không trả `answers`, `correct_answer`, dữ liệu bạn học, thứ hạng lớp, số điện thoại phụ huynh hoặc dữ liệu giáo viên nhạy cảm.
- Tuần tính theo `Asia/Ho_Chi_Minh`, bắt đầu thứ Hai 00:00 và kết thúc trước thứ Hai kế tiếp.
- Thông báo tự động phải idempotent bằng unique key `(student_id, source_type, source_id)`.
- Nội dung thông báo lớp phải giới hạn 2.000 ký tự; tiêu đề tối đa 160 ký tự; không render HTML từ giáo viên.
- Tất cả mutation dùng cookie phải đi qua origin guard; activate/login rate limit fail-closed 10 request/5 phút/IP.
- Feature flag `VITE_FEATURE_PARENT_PORTAL_V1` mặc định `false` trên production trước pilot.
- Không chạy migration remote, đổi DNS, thêm domain production hoặc deploy production nếu chưa có phê duyệt thủ công.
- Mỗi task phải theo chu kỳ: test đỏ → code tối thiểu → test xanh → commit riêng.
- Tài liệu này thay thế phạm vi của `docs/superpowers/plans/2026-07-21-parent-portal-dashboard.md`; không xóa tài liệu cũ để giữ lịch sử quyết định.

---

## API Surface

### Teacher/Admin APIs

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/parent-links` | Cấp link/QR cho một học sinh |
| `GET` | `/api/parent-links?studentId=` | Xem trạng thái link của học sinh |
| `POST` | `/api/parent-links/:linkId/reissue` | Thu hồi token kích hoạt cũ và tạo QR mới |
| `DELETE` | `/api/parent-links/:linkId` | Thu hồi link và toàn bộ session hiện tại |
| `POST` | `/api/parent-announcements` | Gửi thông báo lớp tới phụ huynh |
| `GET` | `/api/parent-announcements?classId=` | Danh sách thông báo lớp và thống kê đã xem |
| `POST` | `/api/parent-announcements/:id/revoke` | Thu hồi thông báo lớp |
| `GET` | `/api/parent-delivery?classId=&kind=` | Trạng thái phụ huynh đã kích hoạt/đã xem |

### Public/Auth APIs

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/parent/activation?token=` | Xem tên học sinh/lớp trước khi đặt PIN |
| `POST` | `/api/parent/activate` | Consume token, đặt PIN và tạo cookie |
| `POST` | `/api/parent/login` | Đăng nhập bằng access code + PIN |
| `GET` | `/api/parent/session` | Restore profile tối thiểu |
| `POST` | `/api/parent/logout` | Xóa cookie |

### Authenticated Parent APIs

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/parent/dashboard?weekStart=` | Tổng quan tuần |
| `GET` | `/api/parent/notifications?cursor=&kind=&unread=` | Chuông và lịch sử thông báo |
| `PATCH` | `/api/parent/notifications/:id/read` | Đánh dấu một thông báo đã đọc |
| `POST` | `/api/parent/notifications/read-all` | Đánh dấu tất cả đã đọc |
| `GET` | `/api/parent/results?from=&to=&subject=&page=` | Lịch sử kết quả năm học |
| `GET` | `/api/parent/results/:id` | Chi tiết an toàn của một kết quả/phiếu |
| `GET` | `/api/parent/assignments?status=&from=&to=&page=` | Bài tập và hạn nộp |
| `GET` | `/api/parent/certificates?page=` | Giấy khen/chứng nhận |

---

## File Structure

### Shared contracts

- `shared/parent-portal.contract.ts`: type API dùng chung frontend/Worker, enum notification kind và pagination.

### Database and Worker domain

- `workers/migrations/0037_add_parent_portal_complete.sql`: thêm `results.student_id`, parent auth, notifications và announcements.
- `workers/rollbacks/0037_drop_parent_portal_complete.sql`: rollback bảng/index mới; không drop `results.student_id`.
- `workers/src/parentPortal/types.ts`: record nội bộ và session payload.
- `workers/src/parentPortal/crypto.ts`: token, access code và PIN hashing.
- `workers/src/parentPortal/session.ts`: cookie/JWT phụ huynh.
- `workers/src/parentPortal/repository.ts`: SQL link, activation và profile.
- `workers/src/parentPortal/authorization.ts`: xác minh teacher sở hữu học sinh/lớp.
- `workers/src/parentPortal/notificationService.ts`: insert idempotent, read, revoke và fan-out.
- `workers/src/parentPortal/dashboardService.ts`: tổng hợp tuần và gợi ý deterministic.
- `workers/src/parentPortal/historyService.ts`: kết quả, bài tập, chứng nhận có phân trang.
- `workers/src/parentPortal/deadlineReminderService.ts`: tạo reminder hằng ngày không trùng.
- `workers/src/routes/parentPortal/teacherLinkRoutes.ts`: cấp/cấp lại/thu hồi QR.
- `workers/src/routes/parentPortal/teacherAnnouncementRoutes.ts`: tạo/thu hồi/thống kê thông báo lớp.
- `workers/src/routes/parentPortal/authRoutes.ts`: activation/login/session/logout.
- `workers/src/routes/parentPortal/dashboardRoutes.ts`: dashboard.
- `workers/src/routes/parentPortal/notificationRoutes.ts`: list/read/read-all.
- `workers/src/routes/parentPortal/historyRoutes.ts`: results/assignments/certificates.
- `workers/src/routes/parentPortal/index.ts`: router duy nhất của phân hệ.

### Frontend Parent Portal

- `src/app/hostContext.ts`: nhận diện hostname và local query `?portal=parent`.
- `src/features/parent-portal/types.ts`: view models frontend.
- `src/features/parent-portal/parentPortalService.ts`: facade API.
- `src/features/parent-portal/useParentPortalStore.ts`: session, dashboard, notifications và filter state.
- `src/features/parent-portal/ParentPortalApp.tsx`: route guard và shell.
- `src/features/parent-portal/layout/ParentPortalLayout.tsx`: header, chuông, desktop sidebar và mobile bottom navigation.
- `src/features/parent-portal/pages/ParentActivatePage.tsx`.
- `src/features/parent-portal/pages/ParentLoginPage.tsx`.
- `src/features/parent-portal/pages/ParentDashboardPage.tsx`.
- `src/features/parent-portal/pages/ParentNotificationsPage.tsx`.
- `src/features/parent-portal/pages/ParentResultsPage.tsx`.
- `src/features/parent-portal/pages/ParentResultDetailPage.tsx`.
- `src/features/parent-portal/pages/ParentAssignmentsPage.tsx`.
- `src/features/parent-portal/pages/ParentCertificatesPage.tsx`.
- `src/features/parent-portal/pages/ParentProfilePage.tsx`.
- `src/features/parent-portal/components/ParentNotificationBell.tsx`.
- `src/features/parent-portal/components/ParentMetricGrid.tsx`.
- `src/features/parent-portal/components/ParentWeeklyProgress.tsx`.
- `src/features/parent-portal/components/ParentSubjectSummary.tsx`.
- `src/features/parent-portal/components/ParentRecentActivity.tsx`.
- `src/features/parent-portal/components/ParentFilterBar.tsx`.

### Teacher UI

- `src/features/class-management/components/ParentAccessModal.tsx`: QR/access code/PIN lifecycle.
- `src/features/class-management/components/ParentAnnouncementModal.tsx`: gửi thông báo lớp.
- `src/features/class-management/components/ParentDeliveryPanel.tsx`: activation/read metrics.
- Modify `src/features/class-management/components/StudentTable/StudentTable.tsx`.
- Modify `src/features/class-management/views/ClassDetailView.tsx`.

### Configuration and QA

- `src/services/api/routes/parents.ts`.
- Modify `src/services/api/routes/index.ts`, `src/services/api/config.ts`, `src/config/featureFlags.ts`.
- Modify `workers/src/index.ts`, `workers/src/types.ts`, `workers/src/middleware/cors.ts`, `workers/src/middleware/auth.ts`.
- Modify `vercel.json`, `workers/wrangler.toml`, `.env.example`.
- `cypress/e2e/parent-portal.cy.ts`.
- `docs/runbooks/parent-portal-rollout.md`.

---

### Task 1: Shared contract and canonical D1 schema

**Files:**
- Create: `shared/parent-portal.contract.ts`
- Create: `workers/migrations/0037_add_parent_portal_complete.sql`
- Create: `workers/rollbacks/0037_drop_parent_portal_complete.sql`
- Modify: `workers/schema.sql`
- Modify: `workers/src/routes/results.ts`
- Modify: `workers/src/types.ts`
- Test: `tests/parentPortalMigration.worker.test.ts`
- Test: `tests/resultsRoutes.worker.test.ts`

**Interfaces:**
- Produces `ParentNotificationKind`, `ParentDashboardPayload`, history item types and API envelopes.
- Produces tables `parent_links`, `parent_activation_tokens`, `parent_notifications`, `parent_class_announcements`.
- Produces nullable `results.student_id` and index `idx_results_student_id_submitted`.

- [ ] **Step 1: Write failing migration and contract tests**

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PARENT_NOTIFICATION_KINDS } from '../shared/parent-portal.contract';

describe('parent portal schema', () => {
  it('defines every canonical table and index', () => {
    const sql = readFileSync('workers/migrations/0037_add_parent_portal_complete.sql', 'utf8');
    expect(sql).toContain('ALTER TABLE results ADD COLUMN student_id TEXT');
    expect(sql).toContain('CREATE TABLE parent_links');
    expect(sql).toContain('CREATE TABLE parent_activation_tokens');
    expect(sql).toContain('CREATE TABLE parent_notifications');
    expect(sql).toContain('CREATE TABLE parent_class_announcements');
    expect(sql).toContain('idx_parent_links_one_active_student');
    expect(sql).toContain('idx_parent_notifications_unique_source');
    expect(sql).toContain('idx_results_student_id_submitted');
  });

  it('keeps notification kinds stable', () => {
    expect(PARENT_NOTIFICATION_KINDS).toEqual([
      'quiz_result', 'result_report', 'homework_assigned', 'homework_due',
      'homework_graded', 'class_announcement', 'certificate_issued',
    ]);
  });
});
```

Run: `npx vitest run tests/parentPortalMigration.worker.test.ts --maxWorkers=1`

Expected: FAIL because the contract and migration do not exist.

- [ ] **Step 2: Create the shared contract**

```ts
export const PARENT_NOTIFICATION_KINDS = [
  'quiz_result', 'result_report', 'homework_assigned', 'homework_due',
  'homework_graded', 'class_announcement', 'certificate_issued',
] as const;
export type ParentNotificationKind = typeof PARENT_NOTIFICATION_KINDS[number];

export interface ParentStudentProfile {
  id: string;
  fullName: string;
  className: string;
  avatar: string;
}

export interface ParentNotificationItem {
  id: string;
  kind: ParentNotificationKind;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  isImportant: boolean;
  isRead: boolean;
  publishedAt: string;
  expiresAt: string | null;
}

export interface ParentDashboardPayload {
  student: ParentStudentProfile;
  period: { weekStart: string; weekEnd: string; previousWeekStart: string };
  metrics: {
    completedQuizzes: number;
    averageScore: number;
    learningSeconds: number;
    correctRate: number;
    pendingAssignments: number;
    unreadNotifications: number;
  };
  comparison: { averageScoreDelta: number; completedQuizzesDelta: number };
  subjects: Array<{
    subject: string; averageScore: number; correctRate: number;
    questionCount: number; confidence: 'low' | 'medium' | 'high';
  }>;
  recentActivity: Array<{
    id: string; type: 'quiz' | 'homework'; title: string; subject: string;
    score: number | null; occurredAt: string;
  }>;
  recommendations: string[];
  importantNotifications: ParentNotificationItem[];
}
```

- [ ] **Step 3: Create migration `0037`**

The migration must use this schema exactly:

```sql
ALTER TABLE results ADD COLUMN student_id TEXT;

UPDATE results
SET student_id = (
  SELECT s.id
  FROM students s
  JOIN classes c ON c.id = s.class_id
  WHERE LOWER(TRIM(s.full_name)) = LOWER(TRIM(results.student_name))
    AND LOWER(TRIM(c.name)) = LOWER(TRIM(results.class_name))
    AND COALESCE(s.archived_at, '') = ''
  LIMIT 1
)
WHERE COALESCE(student_id, '') = ''
  AND 1 = (
    SELECT COUNT(*)
    FROM students s
    JOIN classes c ON c.id = s.class_id
    WHERE LOWER(TRIM(s.full_name)) = LOWER(TRIM(results.student_name))
      AND LOWER(TRIM(c.name)) = LOWER(TRIM(results.class_name))
      AND COALESCE(s.archived_at, '') = ''
  );

CREATE INDEX IF NOT EXISTS idx_results_student_id_submitted
  ON results(student_id, submitted_at DESC);

CREATE TABLE parent_links (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  access_code TEXT NOT NULL UNIQUE,
  pin_hash TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK(status IN ('PENDING', 'ACTIVE', 'REVOKED')),
  token_version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  activated_at TEXT,
  revoked_at TEXT,
  last_accessed_at TEXT,
  FOREIGN KEY(student_id) REFERENCES students(id)
);

CREATE UNIQUE INDEX idx_parent_links_one_active_student
  ON parent_links(student_id)
  WHERE status IN ('PENDING', 'ACTIVE');
CREATE INDEX idx_parent_links_creator_created
  ON parent_links(created_by, created_at DESC);

CREATE TABLE parent_activation_tokens (
  id TEXT PRIMARY KEY,
  link_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(link_id) REFERENCES parent_links(id)
);
CREATE INDEX idx_parent_activation_link
  ON parent_activation_tokens(link_id, expires_at DESC);

CREATE TABLE parent_class_announcements (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_important INTEGER NOT NULL DEFAULT 0 CHECK(is_important IN (0,1)),
  status TEXT NOT NULL DEFAULT 'PUBLISHED'
    CHECK(status IN ('PUBLISHED', 'REVOKED')),
  created_by TEXT NOT NULL,
  published_at TEXT NOT NULL,
  expires_at TEXT,
  revoked_at TEXT,
  FOREIGN KEY(class_id) REFERENCES classes(id)
);
CREATE INDEX idx_parent_announcements_class_published
  ON parent_class_announcements(class_id, published_at DESC);

CREATE TABLE parent_notifications (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN (
    'quiz_result','result_report','homework_assigned','homework_due',
    'homework_graded','class_announcement','certificate_issued'
  )),
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL DEFAULT '{}',
  is_important INTEGER NOT NULL DEFAULT 0 CHECK(is_important IN (0,1)),
  published_at TEXT NOT NULL,
  expires_at TEXT,
  read_at TEXT,
  revoked_at TEXT,
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL,
  FOREIGN KEY(student_id) REFERENCES students(id)
);
CREATE UNIQUE INDEX idx_parent_notifications_unique_source
  ON parent_notifications(student_id, source_type, source_id);
CREATE INDEX idx_parent_notifications_student_feed
  ON parent_notifications(student_id, revoked_at, published_at DESC);
CREATE INDEX idx_parent_notifications_student_unread
  ON parent_notifications(student_id, read_at, published_at DESC);
```

- [ ] **Step 4: Make new result writes include canonical `student_id`**

In `POST /api/results`, resolve a teacher/admin submission only when exactly one active student matches normalized name + class. Change the insert to:

```ts
const canonicalStudentId = studentContext?.id
  || await resolveUniqueStudentId(db, studentName, className);

const insertResult = await db.prepare(`
  INSERT INTO results (
    student_id, student_name, class_name, quiz_id, quiz_title,
    score, correct_count, total_questions, time_taken, submitted_at, answers
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).bind(
  canonicalStudentId, studentName, className, quizId, body.quizTitle || '',
  score, correctCount, totalQuestions, body.timeTaken || 0,
  new Date().toISOString(), JSON.stringify(body.answers || {}),
).run();
```

`resolveUniqueStudentId` must return `null` for zero or multiple matches; it must never guess.

- [ ] **Step 5: Update `workers/schema.sql` and rollback**

Rollback order:

```sql
DROP INDEX IF EXISTS idx_parent_notifications_student_unread;
DROP INDEX IF EXISTS idx_parent_notifications_student_feed;
DROP INDEX IF EXISTS idx_parent_notifications_unique_source;
DROP TABLE IF EXISTS parent_notifications;
DROP INDEX IF EXISTS idx_parent_announcements_class_published;
DROP TABLE IF EXISTS parent_class_announcements;
DROP INDEX IF EXISTS idx_parent_activation_link;
DROP TABLE IF EXISTS parent_activation_tokens;
DROP INDEX IF EXISTS idx_parent_links_creator_created;
DROP INDEX IF EXISTS idx_parent_links_one_active_student;
DROP TABLE IF EXISTS parent_links;
DROP INDEX IF EXISTS idx_results_student_id_submitted;
```

Do not remove `results.student_id` in rollback because D1/SQLite column rollback can rebuild and risk the production table.

- [ ] **Step 6: Verify locally**

Run:

```bash
npx vitest run tests/parentPortalMigration.worker.test.ts tests/resultsRoutes.worker.test.ts --maxWorkers=1
npx wrangler d1 execute itongquiz-db --local --config workers/wrangler.toml --file=workers/migrations/0037_add_parent_portal_complete.sql
```

Expected: tests PASS; local migration exits 0.

- [ ] **Step 7: Commit**

```bash
git add shared/parent-portal.contract.ts workers/migrations/0037_add_parent_portal_complete.sql workers/rollbacks/0037_drop_parent_portal_complete.sql workers/schema.sql workers/src/routes/results.ts workers/src/types.ts tests/parentPortalMigration.worker.test.ts tests/resultsRoutes.worker.test.ts
git commit -m "feat(parent-portal): add canonical schema and contracts"
```

---

### Task 2: Parent crypto, isolated session and middleware

**Files:**
- Create: `workers/src/parentPortal/types.ts`
- Create: `workers/src/parentPortal/crypto.ts`
- Create: `workers/src/parentPortal/session.ts`
- Create: `workers/src/parentPortal/repository.ts`
- Test: `tests/parentPortalSecurity.worker.test.ts`

**Interfaces:**
- Produces `generateActivationToken`, `hashActivationToken`, `generateAccessCode`, `hashParentPin`, `verifyParentPin`.
- Produces `signParentSession`, `verifyParentSession`, `createParentCookie`, `clearParentCookie`.
- Produces `ParentSessionPayload { linkId, studentId, tokenVersion, purpose }`.

- [ ] **Step 1: Write failing security tests**

```ts
expect(generateActivationToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
expect(generateAccessCode()).toMatch(/^[A-HJ-NP-Z2-9]{10}$/);
const hash = await hashParentPin('123456');
expect(hash).toMatch(/^pbkdf2_sha256\$100000\$/);
await expect(verifyParentPin('123456', hash)).resolves.toBe(true);
await expect(verifyParentPin('654321', hash)).resolves.toBe(false);
expect(createParentCookie('jwt')).toContain('parent_auth_token=jwt');
expect(createParentCookie('jwt')).toContain('HttpOnly');
expect(createParentCookie('jwt')).not.toContain('Domain=');
```

JWT test must reject a teacher/student token and accept only audience `itongquiz-parent-portal` with purpose `parent_session`.

Run: `npx vitest run tests/parentPortalSecurity.worker.test.ts --maxWorkers=1`

Expected: FAIL because modules do not exist.

- [ ] **Step 2: Implement token and PIN helpers**

```ts
const ACCESS_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateActivationToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return toBase64Url(bytes);
}

export async function hashActivationToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return toHex(new Uint8Array(digest));
}

export function generateAccessCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, byte => ACCESS_CODE_ALPHABET[byte % ACCESS_CODE_ALPHABET.length]).join('');
}

export function validateParentPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}
```

PBKDF2 record format must be `pbkdf2_sha256$100000$<saltHex>$<hashHex>` and verification must use constant-time byte comparison.

- [ ] **Step 3: Implement isolated JWT and cookie**

```ts
export interface ParentSessionPayload {
  linkId: string;
  studentId: string;
  tokenVersion: number;
  purpose: 'parent_session';
}

export async function signParentSession(payload: ParentSessionPayload, secret: string): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('itongquiz-api')
    .setAudience('itongquiz-parent-portal')
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(new TextEncoder().encode(secret));
}
```

`verifyParentSession` must re-load `parent_links` and reject when status is not `ACTIVE`, `student_id` differs or token version changed.

- [ ] **Step 4: Implement repository boundaries**

Repository methods must be explicit:

```ts
export interface ParentLinkRepository {
  findActiveByStudentId(studentId: string): Promise<ParentLinkRecord | null>;
  findByAccessCode(accessCode: string): Promise<ParentLinkRecord | null>;
  findActivationByHash(tokenHash: string): Promise<ParentActivationRecord | null>;
  createLink(input: CreateParentLinkRecord): Promise<ParentLinkRecord>;
  activateLink(linkId: string, pinHash: string, consumedTokenId: string, now: string): Promise<void>;
  revokeLink(linkId: string, now: string): Promise<void>;
  touchLastAccessed(linkId: string, now: string): Promise<void>;
  loadProfile(studentId: string): Promise<ParentStudentProfile | null>;
}
```

Keep SQL inside this file; routes must not duplicate link SQL.

- [ ] **Step 5: Verify and commit**

```bash
npx vitest run tests/parentPortalSecurity.worker.test.ts --maxWorkers=1
git add workers/src/parentPortal/types.ts workers/src/parentPortal/crypto.ts workers/src/parentPortal/session.ts workers/src/parentPortal/repository.ts tests/parentPortalSecurity.worker.test.ts
git commit -m "feat(parent-portal): add isolated parent authentication"
```

---

### Task 3: Teacher QR lifecycle APIs

**Files:**
- Create: `workers/src/parentPortal/authorization.ts`
- Create: `workers/src/routes/parentPortal/teacherLinkRoutes.ts`
- Create: `workers/src/routes/parentPortal/index.ts`
- Modify: `workers/src/index.ts`
- Modify: `workers/src/middleware/auth.ts`
- Test: `tests/parentPortalTeacherLinks.worker.test.ts`
- Test: `tests/workerRouter.worker.test.ts`

**Interfaces:**
- `POST /api/parent-links` consumes `{ studentId: string }`.
- Create/reissue returns `{ link, activationUrl }`; raw token appears only in that response.
- List response never includes token hash, PIN hash, raw token or cookie value.

- [ ] **Step 1: Write failing authorization tests**

Cover:

```ts
expect(unauthenticated.status).toBe(401);
expect(otherTeacher.status).toBe(403);
expect(ownerTeacher.status).toBe(201);
expect(admin.status).toBe(201);
expect(archivedStudent.status).toBe(404);
expect(JSON.stringify(listPayload)).not.toMatch(/pin_hash|token_hash|activationToken/i);
```

Also test that creating a second active link returns the existing safe metadata rather than silently creating duplicates.

- [ ] **Step 2: Implement `requireTeacherForParentStudent`**

```ts
export async function requireTeacherForParentStudent(
  db: D1Database,
  user: JWTPayload,
  studentId: string,
): Promise<{ studentId: string; classId: string; className: string; fullName: string } | Response> {
  const row = await db.prepare(`
    SELECT s.id AS student_id, s.full_name, s.class_id, c.name AS class_name, c.teacher_username
    FROM students s JOIN classes c ON c.id = s.class_id
    WHERE s.id = ? AND COALESCE(s.archived_at, '') = '' AND COALESCE(c.archived_at, '') = ''
  `).bind(studentId).first<any>();
  if (!row) return errorResponse('Student not found', 404);
  if (user.role !== 'admin' && row.teacher_username !== user.username) return errorResponse('Forbidden', 403);
  return { studentId: row.student_id, classId: row.class_id, className: row.class_name, fullName: row.full_name };
}
```

- [ ] **Step 3: Implement create/reissue/revoke**

Rules:

- Link id: `pl-${crypto.randomUUID()}`.
- Token id: `pat-${crypto.randomUUID()}`.
- Activation expires `now + 7 days`.
- Reissue marks every unconsumed token for the link as consumed, increments `token_version`, clears PIN, sets status back to `PENDING`, creates a new token.
- Revoke sets `status='REVOKED'`, `revoked_at=now`, increments `token_version`.
- Activation URL: `https://phuhuynh.thitong.site/activate?token=${encodeURIComponent(rawToken)}`.
- Audit actions: `PARENT_LINK_CREATED`, `PARENT_LINK_REISSUED`, `PARENT_LINK_REVOKED`; audit JSON must include link/student ids only.

- [ ] **Step 4: Route before the shared auth fallback**

`workers/src/index.ts` must dispatch:

```ts
const isParentRoute = path.startsWith('/api/parent/')
  || path.startsWith('/api/parent-links')
  || path.startsWith('/api/parent-announcements')
  || path.startsWith('/api/parent-delivery');

if (isParentRoute) {
  const parentResponse = await handleParentPortalRoutes(request, env, path, method);
  return addCors(parentResponse, request, env);
}
```

Parent Portal router owns its teacher, public and parent authentication. Add these paths to the allow-through list in `verifyToken`; do not authenticate them with the legacy shared token.

- [ ] **Step 5: Run tests and commit**

```bash
npx vitest run tests/parentPortalTeacherLinks.worker.test.ts tests/workerRouter.worker.test.ts --maxWorkers=1
git add workers/src/parentPortal/authorization.ts workers/src/routes/parentPortal/teacherLinkRoutes.ts workers/src/routes/parentPortal/index.ts workers/src/index.ts workers/src/middleware/auth.ts tests/parentPortalTeacherLinks.worker.test.ts tests/workerRouter.worker.test.ts
git commit -m "feat(parent-portal): add teacher QR lifecycle"
```

---

### Task 4: Activation, login, restore and logout

**Files:**
- Create: `workers/src/routes/parentPortal/authRoutes.ts`
- Modify: `workers/src/routes/parentPortal/index.ts`
- Modify: `workers/src/index.ts`
- Test: `tests/parentPortalAuth.worker.test.ts`
- Test: `tests/rateLimit.worker.test.ts`

**Interfaces:**
- `GET /api/parent/activation?token=` returns profile preview only.
- `POST /api/parent/activate` consumes `{ token, pin }`.
- `POST /api/parent/login` consumes `{ accessCode, pin }`.
- Successful activation/login sets `parent_auth_token` and returns `{ student }`.

- [ ] **Step 1: Write failing auth tests**

Test token missing, malformed PIN, expired token, consumed token, revoked link, wrong PIN, tokenVersion mismatch and logout cookie clearing.

The wrong code and wrong PIN responses must be indistinguishable:

```ts
expect(wrongCode.status).toBe(401);
expect(wrongPin.status).toBe(401);
await expect(wrongCode.json()).resolves.toMatchObject({
  error: { code: 'PARENT_LOGIN_INVALID', message: 'Thông tin đăng nhập không đúng.' },
});
await expect(wrongPin.json()).resolves.toMatchObject({
  error: { code: 'PARENT_LOGIN_INVALID', message: 'Thông tin đăng nhập không đúng.' },
});
```

- [ ] **Step 2: Implement safe activation preview**

Preview may return only:

```ts
{
  student: { fullName: 'Nguyễn Văn An', className: '4A9', avatar: '' },
  expiresAt: '2026-07-29T00:00:00.000Z'
}
```

It must not return access code, link id, student id or token hash.

- [ ] **Step 3: Implement activation transaction**

Before `DB.batch`, verify token hash, expiry and `PENDING` status. Batch operations:

```ts
await env.DB.batch([
  env.DB.prepare(`UPDATE parent_links SET pin_hash=?, status='ACTIVE', activated_at=? WHERE id=? AND status='PENDING'`)
    .bind(pinHash, now, link.id),
  env.DB.prepare(`UPDATE parent_activation_tokens SET consumed_at=? WHERE id=? AND consumed_at IS NULL`)
    .bind(now, activation.id),
]);
```

Re-read the link after batch; fail if it is not active. Then sign JWT and set cookie.

- [ ] **Step 4: Implement login/session/logout**

- Normalize access code with `trim().toUpperCase()`.
- Add a fixed small delay of 75–125 ms for invalid login paths to reduce trivial timing distinction.
- `GET /session` validates database status and token version on every restore.
- Update `last_accessed_at` only when older than one hour.
- Logout returns 204 and an expired cookie.

- [ ] **Step 5: Add fail-closed rate limiting**

```ts
const isParentLoginAttempt = method === 'POST'
  && (path === '/api/parent/activate' || path === '/api/parent/login');
if (isParentLoginAttempt) {
  const blocked = await rateLimit(request, env, {
    windowMs: 5 * 60 * 1000,
    maxRequests: 10,
    failureMode: 'closed',
  });
  if (blocked) return addCors(blocked, request, env);
}
```

- [ ] **Step 6: Verify and commit**

```bash
npx vitest run tests/parentPortalAuth.worker.test.ts tests/rateLimit.worker.test.ts tests/workerRouter.worker.test.ts --maxWorkers=1
git add workers/src/routes/parentPortal/authRoutes.ts workers/src/routes/parentPortal/index.ts workers/src/index.ts tests/parentPortalAuth.worker.test.ts tests/rateLimit.worker.test.ts
git commit -m "feat(parent-portal): add QR activation and PIN login"
```

---

### Task 5: Parent notification engine and automatic event producers

**Files:**
- Create: `workers/src/parentPortal/notificationService.ts`
- Create: `workers/src/parentPortal/deadlineReminderService.ts`
- Modify: `workers/src/routes/results.ts`
- Modify: `workers/src/routes/resultReports/deliveryItemService.ts`
- Modify: `workers/src/routes/homework.ts`
- Modify: `workers/src/services/certificateBatchProcessor.ts`
- Modify: `workers/src/index.ts`
- Modify: `workers/wrangler.toml`
- Test: `tests/parentNotificationService.worker.test.ts`
- Test: `tests/parentNotificationProducers.worker.test.ts`

**Interfaces:**
- Produces `createParentNotification(db, input): Promise<{ id: string; created: boolean }>`.
- Produces `fanOutParentNotificationToClass(db, input)`.
- Produces `createDueHomeworkReminders(db, now)`.

- [ ] **Step 1: Write failing idempotency and privacy tests**

```ts
const first = await createParentNotification(db, input);
const second = await createParentNotification(db, input);
expect(first.created).toBe(true);
expect(second.created).toBe(false);
expect(await countRows('parent_notifications')).toBe(1);
expect(JSON.stringify(saved.payload)).not.toContain('answers');
expect(JSON.stringify(saved.payload)).not.toContain('correct_answer');
```

- [ ] **Step 2: Implement canonical insert helper**

```ts
export async function createParentNotification(db: D1Database, input: CreateParentNotificationInput) {
  const id = `pn-${crypto.randomUUID()}`;
  const result = await db.prepare(`
    INSERT OR IGNORE INTO parent_notifications (
      id, student_id, kind, source_type, source_id, title, body,
      payload_json, is_important, published_at, expires_at, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, input.studentId, input.kind, input.sourceType, input.sourceId,
    input.title.slice(0, 160), input.body.slice(0, 2000),
    JSON.stringify(input.payload || {}), input.isImportant ? 1 : 0,
    input.publishedAt, input.expiresAt || null, input.createdBy || 'system', input.publishedAt,
  ).run();
  return { id, created: Number(result.meta.changes || 0) === 1 };
}
```

- [ ] **Step 3: Produce quiz-result notifications**

After a successful result insert, only when `canonicalStudentId` is non-null:

```ts
await createParentNotification(db, {
  studentId: canonicalStudentId,
  kind: 'quiz_result',
  sourceType: 'result',
  sourceId: String(resultId),
  title: 'Có kết quả bài kiểm tra mới',
  body: `${body.quizTitle || 'Bài kiểm tra'}: ${score.toFixed(1)}/10, đúng ${correctCount}/${totalQuestions} câu.`,
  payload: { resultId: String(resultId), quizId, score, correctCount, totalQuestions },
  publishedAt: now,
});
```

- [ ] **Step 4: Produce result-report notifications**

Extend the result-report runtime with `insertParentNotification`. Use source type `result_report`, source id `phieuId`, and payload `{ phieuId, resultId, quizId }`. Do not include the old public token or parent phone.

- [ ] **Step 5: Produce homework notifications**

- On `createAssignment` when status is `OPEN`, fan out `homework_assigned` to every active student in the class.
- On transition from non-OPEN to OPEN in `updateAssignment`, fan out once using source id `${assignmentId}:published`.
- After `publishGrade`, create `homework_graded` for `row.student_id` with score and a feedback summary limited to 240 characters.
- Do not notify on draft save or archive.

- [ ] **Step 6: Produce certificate notifications**

Keep the existing student notification. Add a parent notification for each successful certificate:

```ts
await createParentNotification(env.DB, {
  studentId: student.student_id,
  kind: 'certificate_issued',
  sourceType: 'certificate',
  sourceId: student.certificate_id,
  title: 'Con có chứng nhận mới',
  body: `Đã nhận chứng nhận: ${batchTitle}`,
  payload: { certificateId: student.certificate_id, batchId },
  publishedAt: now,
});
```

- [ ] **Step 7: Add daily due reminders**

Add cron `0 23 * * *` (06:00 Asia/Ho_Chi_Minh). In scheduled handler branch on `event.cron`:

```ts
if (event.cron === '0 23 * * *') {
  await createDueHomeworkReminders(env.DB, new Date());
  return;
}
```

The service selects open homework due within the next 24 hours, skips students with a submission, and creates source id `${assignmentId}:${localDate}` so retries remain idempotent.

- [ ] **Step 8: Verify and commit**

```bash
npx vitest run tests/parentNotificationService.worker.test.ts tests/parentNotificationProducers.worker.test.ts tests/resultReportDelivery.worker.test.ts --maxWorkers=1
git add workers/src/parentPortal/notificationService.ts workers/src/parentPortal/deadlineReminderService.ts workers/src/routes/results.ts workers/src/routes/resultReports/deliveryItemService.ts workers/src/routes/homework.ts workers/src/services/certificateBatchProcessor.ts workers/src/index.ts workers/wrangler.toml tests/parentNotificationService.worker.test.ts tests/parentNotificationProducers.worker.test.ts
git commit -m "feat(parent-portal): generate automatic parent notifications"
```

---

### Task 6: Teacher class announcements and delivery tracking

**Files:**
- Create: `workers/src/routes/parentPortal/teacherAnnouncementRoutes.ts`
- Modify: `workers/src/routes/parentPortal/index.ts`
- Test: `tests/parentAnnouncements.worker.test.ts`

**Interfaces:**
- `POST /api/parent-announcements` body `{ classId, title, body, isImportant, expiresAt? }`.
- `GET /api/parent-announcements?classId=` returns each announcement with `targetCount`, `readCount`, `unreadCount`.
- `POST /api/parent-announcements/:id/revoke` revokes source notifications.
- `GET /api/parent-delivery?classId=&kind=` returns per-student activation and latest-view state.

- [ ] **Step 1: Write failing scope and content tests**

Cover other-teacher 403, title/body limits, invalid expiry, archived class, HTML treated as text, fan-out count and revoke behavior.

```ts
expect(response.status).toBe(201);
expect(payload.data.delivery).toEqual({ targetCount: 32, createdCount: 32 });
expect(saved.body).toBe('<b>Không render HTML</b>');
```

- [ ] **Step 2: Implement create announcement**

Validate with Zod:

```ts
const schema = z.object({
  classId: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(2000),
  isImportant: z.boolean().default(false),
  expiresAt: z.string().datetime().optional(),
});
```

Insert `parent_class_announcements`, then fan out one `class_announcement` per active student. Source id is the announcement id.

- [ ] **Step 3: Implement revoke and metrics**

Revoke transaction:

```sql
UPDATE parent_class_announcements
SET status='REVOKED', revoked_at=?
WHERE id=? AND status='PUBLISHED';

UPDATE parent_notifications
SET revoked_at=?
WHERE source_type='class_announcement' AND source_id=? AND revoked_at IS NULL;
```

Metrics query must scope class ownership and count only non-revoked notifications.

- [ ] **Step 4: Implement delivery endpoint**

Return only teacher-safe fields:

```ts
{
  studentId,
  studentName,
  parentAccessStatus: 'not_issued' | 'pending' | 'active' | 'revoked',
  unreadCount,
  lastViewedAt
}
```

Do not return PIN, access code or parent phone in this endpoint.

- [ ] **Step 5: Verify and commit**

```bash
npx vitest run tests/parentAnnouncements.worker.test.ts tests/parentPortalTeacherLinks.worker.test.ts --maxWorkers=1
git add workers/src/routes/parentPortal/teacherAnnouncementRoutes.ts workers/src/routes/parentPortal/index.ts tests/parentAnnouncements.worker.test.ts
git commit -m "feat(parent-portal): add class announcements and delivery status"
```

---

### Task 7: Parent feed, dashboard and year-history APIs

**Files:**
- Create: `workers/src/parentPortal/dashboardService.ts`
- Create: `workers/src/parentPortal/historyService.ts`
- Create: `workers/src/routes/parentPortal/dashboardRoutes.ts`
- Create: `workers/src/routes/parentPortal/notificationRoutes.ts`
- Create: `workers/src/routes/parentPortal/historyRoutes.ts`
- Modify: `workers/src/routes/parentPortal/index.ts`
- Test: `tests/parentDashboard.worker.test.ts`
- Test: `tests/parentNotifications.worker.test.ts`
- Test: `tests/parentHistory.worker.test.ts`

**Interfaces:**
- Every handler consumes a verified `ParentSessionContext` and never accepts student identity from client input.
- Pagination defaults to 20 and caps at 50.
- Result detail never returns answer-level data.

- [ ] **Step 1: Write cross-student isolation tests**

For every endpoint, create parent A and student B fixtures. Add `studentId=B` to query/body and assert only A data is returned. For detail ids belonging to B, assert 404 rather than 403 to avoid resource enumeration.

- [ ] **Step 2: Implement week-window utility**

```ts
export function resolveIctWeekWindow(weekStart?: string): {
  weekStart: string; weekEnd: string; previousWeekStart: string;
  currentStartUtc: string; currentEndUtc: string; previousStartUtc: string;
}
```

`weekStart` must match `YYYY-MM-DD` and be a Monday in Asia/Ho_Chi_Minh. Invalid values return 400.

- [ ] **Step 3: Implement dashboard query**

Dashboard combines:

- `results` by `student_id` for current/previous week.
- `hw_submissions` latest attempt per assignment.
- open `hw_assignments` for pending count.
- unread `parent_notifications`.
- subject summary by `quizzes.category`.
- latest 10 activities across quiz and homework.
- top 3 important/unread notifications.

Recommendations are deterministic:

```ts
if (pendingAssignments > 0) recommendations.push(`Cùng con hoàn thành ${pendingAssignments} bài tập đang chờ.`);
if (weakest && weakest.correctRate < 70) recommendations.push(`Dành 15 phút ôn thêm môn ${weakest.subject}.`);
if (metrics.completedQuizzes === 0) recommendations.push('Khuyến khích con hoàn thành ít nhất một bài trong tuần này.');
if (recommendations.length === 0) recommendations.push('Con đang duy trì tiến độ tốt. Hãy tiếp tục động viên con.');
```

- [ ] **Step 4: Implement notification feed**

Feed filters:

- `kind` must be a canonical enum.
- `unread=true` adds `read_at IS NULL`.
- Exclude revoked and expired notifications.
- Cursor is base64url of `{ publishedAt, id }`; order `published_at DESC, id DESC`.
- Read mutation uses `WHERE id=? AND student_id=?`.
- `read-all` updates only active notifications for the session student.

- [ ] **Step 5: Implement result history/detail**

List item:

```ts
{
  id, quizTitle, subject, score, correctCount, totalQuestions,
  correctRate, submittedAt, classification, hasTeacherReport
}
```

Detail may add `comment`, `needsImprovement`, `encouragement`, but must select no `answers` column. Classification: `>=9 Xuất sắc`, `>=8 Tốt`, `>=6.5 Khá`, `>=5 Đạt`, otherwise `Cần cố gắng`.

- [ ] **Step 6: Implement assignments and certificates history**

Assignments combine class homework with latest student submission and expose status:

```ts
type ParentAssignmentStatus = 'pending' | 'submitted' | 'graded' | 'overdue';
```

Certificates select only records with `status='sent'`, non-revoked, and include `imageUrl`, title, teacher name, issued date and quiz title.

- [ ] **Step 7: Verify and commit**

```bash
npx vitest run tests/parentDashboard.worker.test.ts tests/parentNotifications.worker.test.ts tests/parentHistory.worker.test.ts --maxWorkers=1
git add workers/src/parentPortal/dashboardService.ts workers/src/parentPortal/historyService.ts workers/src/routes/parentPortal/dashboardRoutes.ts workers/src/routes/parentPortal/notificationRoutes.ts workers/src/routes/parentPortal/historyRoutes.ts workers/src/routes/parentPortal/index.ts tests/parentDashboard.worker.test.ts tests/parentNotifications.worker.test.ts tests/parentHistory.worker.test.ts
git commit -m "feat(parent-portal): add dashboard feed and year history APIs"
```

---

### Task 8: Frontend API registry, service and Zustand store

**Files:**
- Create: `src/services/api/routes/parents.ts`
- Modify: `src/services/api/routes/index.ts`
- Create: `src/features/parent-portal/types.ts`
- Create: `src/features/parent-portal/parentPortalService.ts`
- Create: `src/features/parent-portal/useParentPortalStore.ts`
- Test: `src/services/api/__tests__/parentRoutes.test.ts`
- Test: `src/features/parent-portal/useParentPortalStore.test.ts`

**Interfaces:**
- Service methods map one-to-one to the API surface.
- Store persists nothing; restore always calls `/api/parent/session`.
- Parent cookie is sent by `credentials:'include'`; no bearer header.

- [ ] **Step 1: Write failing route tests**

```ts
expect(resolveApiRoute('parent_login')).toMatchObject({ method: 'POST', auth: 'public' });
expect(resolveApiRoute('get_parent_dashboard')).toMatchObject({ method: 'GET', auth: 'public' });
expect(resolveApiRoute('create_parent_link')).toMatchObject({ method: 'POST', auth: 'session' });
```

Parent-authenticated routes use `auth:'public'` in the existing registry because parent cookie is independent and server-side middleware owns validation. Add comments to prevent future developers from treating them as unauthenticated endpoints.

- [ ] **Step 2: Add exact route registry**

Actions:

```ts
create_parent_link
get_parent_link
reissue_parent_link
revoke_parent_link
create_parent_announcement
list_parent_announcements
revoke_parent_announcement
get_parent_delivery
get_parent_activation
activate_parent_link
parent_login
get_parent_session
parent_logout
get_parent_dashboard
list_parent_notifications
mark_parent_notification_read
mark_all_parent_notifications_read
list_parent_results
get_parent_result
list_parent_assignments
list_parent_certificates
```

- [ ] **Step 3: Implement service facade**

Expose typed functions and unwrap `{ data }`. Do not expose generic `executeApiAction` to components.

- [ ] **Step 4: Implement store state machine**

```ts
interface ParentPortalState {
  session: ParentStudentProfile | null;
  dashboard: ParentDashboardPayload | null;
  notifications: ParentNotificationItem[];
  unreadCount: number;
  isRestoring: boolean;
  isLoading: boolean;
  error: string | null;
  restoreSession(): Promise<void>;
  login(accessCode: string, pin: string): Promise<boolean>;
  activate(token: string, pin: string): Promise<boolean>;
  logout(): Promise<void>;
  loadDashboard(weekStart?: string): Promise<void>;
  loadNotifications(): Promise<void>;
  markNotificationRead(id: string): Promise<void>;
}
```

401 from a parent-authenticated endpoint must clear in-memory session and navigate logic must redirect to `/login`.

- [ ] **Step 5: Verify and commit**

```bash
npx vitest run src/services/api/__tests__/parentRoutes.test.ts src/features/parent-portal/useParentPortalStore.test.ts src/services/api/__tests__/apiClient.test.ts --maxWorkers=1
git add src/services/api/routes/parents.ts src/services/api/routes/index.ts src/features/parent-portal/types.ts src/features/parent-portal/parentPortalService.ts src/features/parent-portal/useParentPortalStore.ts src/services/api/__tests__/parentRoutes.test.ts src/features/parent-portal/useParentPortalStore.test.ts
git commit -m "feat(parent-portal): add frontend data layer"
```

---

### Task 9: Host boundary, activation and login UI

**Files:**
- Create: `src/app/hostContext.ts`
- Modify: `src/app/AppRoutes.tsx`
- Modify: `src/app/lazyViews.ts`
- Create: `src/features/parent-portal/ParentPortalApp.tsx`
- Create: `src/features/parent-portal/layout/ParentPortalLayout.tsx`
- Create: `src/features/parent-portal/pages/ParentActivatePage.tsx`
- Create: `src/features/parent-portal/pages/ParentLoginPage.tsx`
- Modify: `src/config/featureFlags.ts`
- Test: `tests/ParentPortalApp.test.tsx`
- Modify: `tests/AppShell.test.tsx`

**Interfaces:**
- Parent host routes: `/`, `/activate`, `/login`, `/dashboard`, `/notifications`, `/results`, `/results/:id`, `/assignments`, `/certificates`, `/profile`.
- Main host must not expose parent route content.

- [ ] **Step 1: Write failing host/routing tests**

Mock hostname `phuhuynh.thitong.site` and assert parent shell renders without HomePage, ChatBot, public footer or teacher/student stores. On localhost, require `?portal=parent`; normal localhost root keeps the existing app.

- [ ] **Step 2: Implement hostname resolver**

```ts
export function resolveHostContext(hostname: string, search = ''): 'parent' | 'main' {
  const normalized = hostname.toLowerCase();
  if (normalized === 'phuhuynh.thitong.site') return 'parent';
  if ((normalized === 'localhost' || normalized === '127.0.0.1')
      && new URLSearchParams(search).get('portal') === 'parent') return 'parent';
  return 'main';
}
```

Feature flag must gate only Parent Portal rendering, not the main app.

- [ ] **Step 3: Implement route guard**

- `/` restores session then redirects to `/dashboard` or `/login`.
- Unauthenticated access to protected routes redirects `/login` with `replace`.
- Authenticated access to `/login` redirects `/dashboard`.
- Suspense fallback is a Parent Portal branded skeleton, not the main app loader.

- [ ] **Step 4: Implement activation page**

- Read token from URL.
- Fetch preview before showing PIN form.
- Show student name/class for confirmation.
- PIN input: `inputMode="numeric"`, `pattern="[0-9]*"`, `maxLength={6}`, `autoComplete="new-password"`.
- Confirm PIN field required.
- After successful submit, remove token from browser history with `navigate('/dashboard', { replace:true })`.
- Never render token into an error message.

- [ ] **Step 5: Implement login page**

- Access code input auto-uppercases and strips spaces.
- PIN uses `autoComplete="current-password"`.
- Generic invalid credential message.
- Buttons/input touch target minimum 44 px.
- Include a concise instruction: “Mã truy cập nằm trên phiếu QR giáo viên đã cấp.”

- [ ] **Step 6: Verify and commit**

```bash
npx vitest run tests/ParentPortalApp.test.tsx tests/AppShell.test.tsx --maxWorkers=1
git add src/app/hostContext.ts src/app/AppRoutes.tsx src/app/lazyViews.ts src/features/parent-portal/ParentPortalApp.tsx src/features/parent-portal/layout/ParentPortalLayout.tsx src/features/parent-portal/pages/ParentActivatePage.tsx src/features/parent-portal/pages/ParentLoginPage.tsx src/config/featureFlags.ts tests/ParentPortalApp.test.tsx tests/AppShell.test.tsx
git commit -m "feat(parent-portal): add parent host and authentication UI"
```

---

### Task 10: Dashboard, notifications and history UI

**Files:**
- Create all Parent Portal pages/components listed in File Structure.
- Test: `tests/ParentDashboardPage.test.tsx`
- Test: `tests/ParentNotificationsPage.test.tsx`
- Test: `tests/ParentHistoryPages.test.tsx`

**Interfaces:**
- Mobile-first navigation order: Tổng quan, Kết quả, Bài tập, Chứng nhận, Cá nhân.
- Notification bell appears in header and links to full feed.
- Filters are URL-backed so refresh preserves selection.

- [ ] **Step 1: Write failing component tests**

Dashboard must show:

```ts
expect(screen.getByText('Tổng quan tuần')).toBeInTheDocument();
expect(screen.getByText('Điểm trung bình')).toBeInTheDocument();
expect(screen.getByText('Bài đã hoàn thành')).toBeInTheDocument();
expect(screen.getByText('Bài tập đang chờ')).toBeInTheDocument();
expect(screen.getByText('Môn cần cải thiện')).toBeInTheDocument();
```

Also test loading skeleton, empty week, API error with retry, session expired redirect and 99+ unread badge.

- [ ] **Step 2: Implement responsive shell**

- Header: avatar, student name/class, notification bell.
- Desktop `lg+`: left sidebar width 240 px.
- Mobile: fixed bottom navigation with safe-area padding.
- Main content max width 1200 px.
- All pages use Vietnamese labels and visible focus styles.

- [ ] **Step 3: Implement dashboard page**

Section order:

1. Student greeting and week selector.
2. Six metrics.
3. Current-vs-previous-week progress.
4. Strong/weak subject cards with confidence label.
5. Important notifications, maximum 3.
6. Deterministic recommendations.
7. Recent activity, maximum 10.

Do not use red for weak performance; use neutral amber language “Cần ôn thêm”.

- [ ] **Step 4: Implement notification bell/feed**

Kinds map to icons and labels. Clicking an item marks it read before navigating to its source. Add “Đánh dấu tất cả đã đọc”. Exclude revoked items from UI even if stale store data contains them.

- [ ] **Step 5: Implement results pages**

Filter bar:

- period: week/month/semester/all.
- subject.
- date range generated from school year.

Detail shows score, correct/incorrect counts, accuracy, classification, teacher comment, improvement area and encouragement. No question list or answers.

- [ ] **Step 6: Implement assignments/certificates/profile**

Assignments tabs: `Đang làm`, `Đã nộp`, `Đã chấm`, `Quá hạn`. Certificates use secure image links and a detail modal. Profile shows only student name, class, avatar, access code masked except last 4 characters, and logout.

- [ ] **Step 7: Verify accessibility and commit**

```bash
npx vitest run tests/ParentDashboardPage.test.tsx tests/ParentNotificationsPage.test.tsx tests/ParentHistoryPages.test.tsx --maxWorkers=1
npx tsc --noEmit -p tsconfig.json
git add src/features/parent-portal tests/ParentDashboardPage.test.tsx tests/ParentNotificationsPage.test.tsx tests/ParentHistoryPages.test.tsx
git commit -m "feat(parent-portal): add dashboard notifications and history UI"
```

---

### Task 11: Teacher QR, announcement and delivery UI

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/features/class-management/components/ParentAccessModal.tsx`
- Create: `src/features/class-management/components/ParentAnnouncementModal.tsx`
- Create: `src/features/class-management/components/ParentDeliveryPanel.tsx`
- Modify: `src/features/class-management/components/StudentTable/StudentTable.tsx`
- Modify: `src/features/class-management/views/ClassDetailView.tsx`
- Test: `tests/ParentAccessModal.test.tsx`
- Test: `tests/ParentAnnouncementModal.test.tsx`
- Modify: `tests/ClassDetailView.test.tsx`

**Interfaces:**
- `ParentAccessModal` consumes `{ studentId, studentName, className }`.
- QR encodes only the exact activation URL.
- Class detail owns modal state; table row remains presentational.

- [ ] **Step 1: Install QR dependency after failing test exists**

```bash
npm install qrcode
npm install -D @types/qrcode
```

Then run `npm run audit:dependencies:production`; expected critical=0 and high=0.

- [ ] **Step 2: Implement Parent Access modal**

States:

- Not issued: button `Tạo mã QR`.
- Pending: QR, access code, expiry, print/copy/reissue/revoke.
- Active: no activation QR; show activation date, masked code, reissue/revoke.
- Revoked: option create new.

Generate SVG:

```ts
const svg = await QRCode.toString(activationUrl, {
  type: 'svg', errorCorrectionLevel: 'M', margin: 2, width: 320,
});
```

Printed sheet may show student name/class outside the QR. It must state: “QR chỉ dùng một lần. Sau khi kích hoạt, đăng nhập bằng mã truy cập và PIN.”

- [ ] **Step 3: Extend StudentTable action**

Add a `QrCode` action on desktop/mobile with aria label `Cấp quyền phụ huynh cho <name>`. Pass selection to `ClassDetailView`; do not fetch API inside each row.

- [ ] **Step 4: Implement class announcement modal**

Fields: title, body, important switch, optional expiry. Show target student count before send. Confirmation text must explain this is one-way and parents cannot reply in MVP.

- [ ] **Step 5: Implement delivery panel**

Summary cards:

- Đã cấp quyền.
- Đã kích hoạt.
- Chưa kích hoạt.
- Phụ huynh có thông báo chưa đọc.

Table supports filtering activation status and unread count. It must not expose PIN or full access code.

- [ ] **Step 6: Verify and commit**

```bash
npx vitest run tests/ParentAccessModal.test.tsx tests/ParentAnnouncementModal.test.tsx tests/ClassDetailView.test.tsx --maxWorkers=1
npm run audit:dependencies:production
git add package.json package-lock.json src/features/class-management tests/ParentAccessModal.test.tsx tests/ParentAnnouncementModal.test.tsx tests/ClassDetailView.test.tsx
git commit -m "feat(parent-portal): add teacher QR and announcement tools"
```

---

### Task 12: Domain, API base, CORS and security headers

**Files:**
- Modify: `src/services/api/config.ts`
- Modify: `workers/src/middleware/cors.ts`
- Modify: `vercel.json`
- Modify: `.env.example`
- Test: `tests/workersApiUrl.test.ts`
- Create: `tests/vercelConfig.test.ts`
- Modify: `tests/systemSecurity.worker.test.ts`

**Interfaces:**
- Browser on parent host uses same-origin `/api/*` through Vercel rewrite.
- Parent origin is allowed by Worker CORS as fallback.
- Entire parent site is `noindex,nofollow`.

- [ ] **Step 1: Write failing config tests**

```ts
expect(resolveWorkersApiBaseUrl({
  configuredUrl: REMOTE_WORKERS_API_URL,
  isDev: false,
  hostname: 'phuhuynh.thitong.site',
})).toBe('');

expect(corsHeaders(parentRequest, production)['Access-Control-Allow-Origin'])
  .toBe('https://phuhuynh.thitong.site');
```

Parse `vercel.json` and assert `/api/:path*` rewrite remains first, SPA fallback remains present, and global parent host content receives noindex via HTML meta plus headers where Vercel path matching applies.

- [ ] **Step 2: Update API base and CORS**

Add exact production origin `https://phuhuynh.thitong.site`. Do not add wildcard `*.thitong.site` to CORS.

- [ ] **Step 3: Add Parent Portal SEO and cache policy**

Parent shell sets:

```html
<meta name="robots" content="noindex,nofollow" />
<meta name="referrer" content="no-referrer" />
```

Activation/login responses and pages must use `Cache-Control: no-store`. Preserve asset immutable caching.

- [ ] **Step 4: Manual domain procedure requiring approval**

1. Add `phuhuynh.thitong.site` to the existing Vercel project.
2. Add the DNS record exactly as Vercel reports; proxy setting follows Vercel verification guidance.
3. Do not add a new Worker custom route for the parent host; `/api` continues through Vercel rewrite to `https://phieu.thitong.site/api/...`.
4. Verify TLS, HSTS, host-only cookie, origin guard, activation URL and logout on the real host.

- [ ] **Step 5: Verify and commit**

```bash
npx vitest run tests/workersApiUrl.test.ts tests/vercelConfig.test.ts tests/systemSecurity.worker.test.ts --maxWorkers=1
git add src/services/api/config.ts workers/src/middleware/cors.ts vercel.json .env.example tests/workersApiUrl.test.ts tests/vercelConfig.test.ts tests/systemSecurity.worker.test.ts
git commit -m "chore(parent-portal): configure parent domain security"
```

---

### Task 13: Observability, E2E, rollout and rollback

**Files:**
- Create: `cypress/e2e/parent-portal.cy.ts`
- Create: `docs/runbooks/parent-portal-rollout.md`
- Modify: `src/config/featureFlags.ts`
- Modify: `.env.example`
- Test: `tests/parentPortalObservability.worker.test.ts`

**Interfaces:**
- Feature flag `VITE_FEATURE_PARENT_PORTAL_V1=false` by default.
- Pilot one class, maximum 40 students, seven calendar days.
- Logs contain event names/ids but never secret values.

- [ ] **Step 1: Add structured safe events**

Log only:

```ts
logger.info('[ParentPortal] link_created', { linkId, studentId, actor: user.username });
logger.info('[ParentPortal] activated', { linkId, studentId });
logger.info('[ParentPortal] login_success', { linkId, studentId });
logger.warn('[ParentPortal] login_failed', { reason: 'invalid_credentials' });
logger.info('[ParentPortal] notification_created', { kind, sourceType, sourceId, studentId });
```

Tests must fail if log arguments include `token`, `pin`, `pinHash`, `accessCode` or cookie contents.

- [ ] **Step 2: Write Cypress happy path**

Scenario:

1. Teacher logs in.
2. Opens class and creates QR for student An.
3. Test extracts activation URL from mocked API response, not by OCR.
4. Parent opens activation URL, sets PIN and reaches dashboard.
5. Parent sees only An’s data.
6. Teacher publishes result report, homework, class announcement and certificate fixtures.
7. Parent sees four notification categories, marks one/read-all.
8. Parent filters year results and opens safe detail.
9. Parent logs out and protected page redirects to login.

- [ ] **Step 3: Write Cypress isolation/revocation path**

- Modify URL/query/body with student B id; no B data appears.
- Open B result id; API returns 404.
- Teacher revokes An link; current parent cookie immediately receives 401.
- Reissued QR invalidates previous activation/session.

- [ ] **Step 4: Write rollout runbook**

Required sections:

- prerequisites and secret checks;
- D1 export backup command;
- local migration and smoke tests;
- backend-compatible-first deployment order;
- remote migration approval gate;
- frontend deploy with flag off;
- domain verification;
- pilot enablement for one class;
- metrics and incident contacts;
- rollback steps.

Remote migration command must be documented but marked manual:

```bash
npx wrangler d1 execute itongquiz-db --remote --config workers/wrangler.toml --file=workers/migrations/0037_add_parent_portal_complete.sql
```

- [ ] **Step 5: Run full quality gate**

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

Expected: critical=0, high=0; all tests/typechecks/build/dry-run/E2E PASS. If sitemap generation fails only because the execution environment has no network, run `npx vite build` as additional frontend evidence but do not call the full build passing.

- [ ] **Step 6: Pilot success criteria**

For seven days:

- at least 60% issued links activated;
- at least 40% active parents open dashboard during the week;
- at least 50% parent notifications viewed;
- zero cross-student access incidents;
- teacher can issue access for a 40-student class within five minutes;
- parent dashboard p95 under 500 ms at Worker;
- parent login error rate under 5% after excluding deliberate test attempts.

- [ ] **Step 7: Rollback procedure**

1. Set `VITE_FEATURE_PARENT_PORTAL_V1=false` and redeploy frontend.
2. Revoke pilot links to invalidate sessions if security-related.
3. Roll back frontend/backend to previous deployments.
4. Keep new tables and `results.student_id` for audit unless a data-removal decision is approved.
5. Run `0037_drop_parent_portal_complete.sql` only when no parent session/link/notification data needs retention.
6. Do not remove `results.student_id` in emergency rollback.

- [ ] **Step 8: Commit QA and runbook**

```bash
git add cypress/e2e/parent-portal.cy.ts docs/runbooks/parent-portal-rollout.md src/config/featureFlags.ts .env.example tests/parentPortalObservability.worker.test.ts
git commit -m "test(parent-portal): add rollout and end-to-end gates"
```

---

## Milestones and Estimated Engineering Effort

| Milestone | Tasks | Deliverable | Estimate |
|---|---:|---|---:|
| Foundation | 1–2 | Schema, contracts, crypto and isolated session | 3–4 days |
| Secure access | 3–4 | Teacher QR lifecycle and parent auth | 3–4 days |
| Communication engine | 5–6 | Automatic notifications and class announcements | 4–5 days |
| Parent data APIs | 7 | Dashboard/feed/year history | 3–4 days |
| Parent frontend | 8–10 | Data layer, auth, dashboard and history UI | 5–7 days |
| Teacher tools | 11 | QR, announcements and delivery metrics | 2–3 days |
| Production readiness | 12–13 | Domain, security, E2E and pilot runbook | 3–4 days |
| **Total** | **1–13** | **Production-ready MVP before pilot** | **23–31 engineering days** |

The estimate assumes one engineer, existing test fixtures can be reused, and no major repair is needed in legacy result-to-student mapping. It excludes approval wait time, DNS propagation and the seven-day pilot observation window.

## Acceptance Criteria

### Authentication and isolation

- Each active parent link maps to exactly one student.
- Activation QR is one-time, expires in seven days and contains no personal data.
- PIN and token are never stored in plaintext.
- Parent cookie is separate from teacher/student cookies and host-only.
- Revocation or reissue invalidates current sessions immediately.
- No Parent API can return another student’s data by changing URL, query or body.

### Dashboard and history

- Default page shows the current ICT week.
- Dashboard shows score average, completed quizzes, learning time, accuracy, pending homework and unread notifications.
- Parent can browse the full school year with filters.
- Result detail never includes question text, selected answer or correct answer.

### Notifications

- Website bell shows unread count and full feed.
- Automatic notifications exist for quiz results, teacher reports, assigned/due/graded homework and certificates.
- Teacher can send and revoke class announcements.
- Duplicate processing never creates duplicate notifications.
- Teacher can see activation/read metrics without seeing parent secrets.

### UX and accessibility

- Parent UI is mobile-first and usable at 320 px width.
- Inputs and controls have labels, focus states and minimum 44 px targets.
- Loading, empty, error, retry and expired-session states exist on every data page.
- Navigation works with keyboard and screen-reader labels.

### Production readiness

- Security scan, dependency audit, unit/integration tests, typechecks, build, Worker dry-run and Cypress pass.
- Feature flag supports immediate frontend disable.
- Runbook documents backup, migration, deployment, pilot and rollback.
- Production changes remain behind manual approval gates.

## Explicitly Out of Scope for MVP

- Two-way chat, comments or replies from parents.
- Zalo, SMS, email or Web Push delivery.
- Multiple children in one parent account.
- Multiple guardians with separate read receipts for one student.
- Parent editing student profile, phone number, password or academic data.
- AI-generated parent recommendations; MVP recommendations are deterministic.
- Class ranking, comparison with classmates or answer-level review.
- Native iOS/Android app.

## Recommended Execution Order

Use **Subagent-Driven Development**. Tasks 1–4 are strictly sequential. After Task 4, Tasks 5 and 7 may be investigated in parallel but must merge through the shared contract and notification service review gate. Frontend Tasks 8–10 start only after Task 7 API contracts are green. Task 11 can begin after Task 3 and Task 6 APIs are stable. Tasks 12–13 remain last because they depend on final routes, cookies and UI behavior.
