# Unified Notification System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Triển khai hệ thống thông báo bốn tầng cho login, giáo viên, học sinh và admin theo bản Stitch, với hộp thư cá nhân dùng chung, ticker truy cập được và composer quản trị có preview.

**Architecture:** Mở rộng `announcements` cho thông báo phát rộng và tái sử dụng `notifications` cho hộp thư cá nhân. Worker cung cấp API danh sách announcement theo vai trò và API inbox theo JWT. Frontend dùng contract chung, selector thuần và các component bề mặt độc lập. Rollout qua feature flag, giữ route/shape legacy trong ít nhất một release.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, Zustand hiện có, Cloudflare Workers, D1, Vitest, Testing Library.

**Global Constraints:**

- Trước khi sửa bất kỳ function, class hoặc method nào, chạy GitNexus `impact({ target, direction: "upstream" })` và báo blast radius. Dừng để cảnh báo nếu risk là HIGH hoặc CRITICAL.
- Trước mỗi commit, chạy GitNexus `detect_changes({ scope: "all", base_ref: "main", worktree: "<active-worktree>" })`.
- Không làm mất các thay đổi không liên quan trong worktree.
- Không render HTML từ nội dung thông báo.
- Mọi CTA chỉ dùng đường dẫn nội bộ hoặc HTTPS đã được validate.
- Mọi nút icon có accessible name và vùng chạm tối thiểu 44 × 44 px.
- Bản thiết kế nguồn: `docs/superpowers/specs/2026-07-24-unified-notification-system-design.md`.
- Stitch project: `projects/2361569551710625712`.

---

## Task 1: Tạo contract dùng chung và migration D1

**Files:**

- Create: `shared/notifications.contract.ts`
- Create: `workers/migrations/0042_unified_notifications.sql`
- Modify: `workers/schema.sql`
- Create: `tests/notificationsContract.test.ts`
- Create: `tests/unifiedNotificationsMigration.worker.test.ts`

- [ ] **Step 1: Viết contract tests đang fail**

```ts
import {
  ANNOUNCEMENT_CHANNELS,
  NOTIFICATION_PRIORITIES,
  isAnnouncementChannel,
  isNotificationPriority,
  resolveNotificationTarget,
} from '../shared/notifications.contract';

it('accepts only supported priority and channel values', () => {
  expect(NOTIFICATION_PRIORITIES).toEqual([
    'INFO', 'REMINDER', 'IMPORTANT', 'URGENT',
  ]);
  expect(ANNOUNCEMENT_CHANNELS).toEqual([
    'CRITICAL_STRIP', 'TICKER', 'BANNER', 'INBOX',
  ]);
  expect(isNotificationPriority('URGENT')).toBe(true);
  expect(isNotificationPriority('critical')).toBe(false);
  expect(isAnnouncementChannel('TICKER')).toBe(true);
});

it('rejects unsafe URL targets', () => {
  expect(resolveNotificationTarget({
    type: 'system',
    data: {},
    actionUrl: 'javascript:alert(1)',
  })).toBeNull();
});
```

- [ ] **Step 2: Chạy tests và xác nhận fail**

Run:

```bash
npx vitest run tests/notificationsContract.test.ts tests/unifiedNotificationsMigration.worker.test.ts
```

Expected: FAIL vì contract và migration chưa tồn tại.

- [ ] **Step 3: Tạo contract**

Contract tối thiểu:

```ts
export const NOTIFICATION_PRIORITIES = [
  'INFO', 'REMINDER', 'IMPORTANT', 'URGENT',
] as const;

export const ANNOUNCEMENT_CHANNELS = [
  'CRITICAL_STRIP', 'TICKER', 'BANNER', 'INBOX',
] as const;

export const NOTIFICATION_TYPES = [
  'assignment_created',
  'assignment_due_soon',
  'assignment_submitted',
  'homework_graded',
  'live_exam_ready',
  'result_report_ready',
  'certificate_issued',
  'certificate_batch_completed',
  'delivery_failed',
  'gift_delivered',
  'system',
] as const;

export type NotificationPriority = typeof NOTIFICATION_PRIORITIES[number];
export type AnnouncementChannel = typeof ANNOUNCEMENT_CHANNELS[number];
export type NotificationType = typeof NOTIFICATION_TYPES[number];

export interface InboxNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string | null;
  actionUrl: string | null;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
  expiresAt: string | null;
}
```

`resolveNotificationTarget` phải map type/payload theo allowlist và chỉ nhận internal path hoặc HTTPS.

- [ ] **Step 4: Tạo migration 0042 và đồng bộ schema**

Migration phải:

- Thêm `priority`, `channels_json`, `dismissible`, `cta_label`, `surface_overrides_json` vào `announcements`.
- Thêm `priority`, `action_url`, `source_type`, `source_id`, `expires_at` vào `notifications`.
- Backfill `channels_json` từ `is_active` và `is_banner_active`.
- Thêm `idx_notifications_inbox` và unique partial index chống trùng source.
- Không xóa cột legacy.

Migration test đọc raw SQL và xác nhận đầy đủ column, check constraint, backfill và index.

- [ ] **Step 5: Chạy tests và xác nhận pass**

Run:

```bash
npx vitest run tests/notificationsContract.test.ts tests/unifiedNotificationsMigration.worker.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add shared/notifications.contract.ts workers/migrations/0042_unified_notifications.sql workers/schema.sql tests/notificationsContract.test.ts tests/unifiedNotificationsMigration.worker.test.ts
git commit -m "feat(notifications): add unified contracts and schema"
```

---

## Task 2: Nâng API announcement từ một item thành collection theo kênh

**Files:**

- Modify: `workers/src/routes/announcements.ts`
- Modify: `src/services/announcementService.ts`
- Modify: `src/services/api/routes/system.ts`
- Create: `tests/announcements.worker.test.ts`
- Create: `tests/announcementService.test.ts`

- [ ] **Step 1: Chạy GitNexus impact**

Phân tích tối thiểu:

- `handleAnnouncementRoutes`
- `mapAnnouncement`
- `getAnnouncement`
- `validateBody`

Ghi lại direct callers, execution flows và risk trước khi sửa.

- [ ] **Step 2: Viết worker tests đang fail**

Cases bắt buộc:

- Public login chỉ nhận audience `ALL`.
- Teacher nhận `ALL` và `TEACHERS`.
- Student nhận `ALL` và `STUDENTS`.
- API trả tối đa 20 item đang trong lịch.
- Kết quả sắp theo priority rồi thời gian.
- `URGENT` không có `CRITICAL_STRIP` bị từ chối khi publish.
- Không có channel bị từ chối khi publish.
- `ctaLabel` yêu cầu `bannerLink`.
- Legacy `GET /api/announcements` vẫn có trường `announcement` bên cạnh `data.items` trong giai đoạn chuyển đổi.

Response mục tiêu:

```ts
{
  status: 'success',
  data: {
    items: Announcement[],
    generatedAt: string,
  },
  announcement: Announcement | null,
}
```

- [ ] **Step 3: Chạy worker tests và xác nhận fail**

Run:

```bash
npx vitest run tests/announcements.worker.test.ts
```

Expected: FAIL vì route hiện dùng `LIMIT 1` và chưa có channel/priority.

- [ ] **Step 4: Cập nhật worker**

Mở rộng row mapper:

```ts
function parseChannels(value: string): AnnouncementChannel[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter(isAnnouncementChannel)
      : [];
  } catch {
    return [];
  }
}
```

Query current:

```sql
SELECT * FROM announcements
WHERE status IN ('PUBLISHED', 'SCHEDULED')
  AND (starts_at IS NULL OR starts_at <= ?)
  AND (ends_at IS NULL OR ends_at > ?)
  AND <audience predicate>
ORDER BY
  CASE priority
    WHEN 'URGENT' THEN 4
    WHEN 'IMPORTANT' THEN 3
    WHEN 'REMINDER' THEN 2
    ELSE 1
  END DESC,
  starts_at DESC,
  updated_at DESC
LIMIT 20
```

Validation dùng helpers trong contract và giữ `safeLink`/`safeImage`.

- [ ] **Step 5: Cập nhật frontend service theo compatibility adapter**

Đổi API service thành:

```ts
export async function getAnnouncements(
  role?: 'teacher' | 'student',
): Promise<Announcement[]> {
  const payload = await callApi<AnnouncementResponse>(action);
  if (Array.isArray(payload?.data?.items)) return payload.data.items.map(mapAnnouncement);
  if (payload?.announcement) return [mapAnnouncement(payload.announcement)];
  return [];
}
```

Giữ `getAnnouncement()` tạm thời bằng cách trả phần tử đầu tiên để không phá caller cũ.

- [ ] **Step 6: Chạy tests và xác nhận pass**

Run:

```bash
npx vitest run tests/announcements.worker.test.ts tests/announcementService.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add workers/src/routes/announcements.ts src/services/announcementService.ts src/services/api/routes/system.ts tests/announcements.worker.test.ts tests/announcementService.test.ts
git commit -m "feat(notifications): return channel-aware announcements"
```

---

## Task 3: Tạo API hộp thư generic và giữ route certificate tương thích

**Files:**

- Create: `workers/src/routes/notifications/repository.ts`
- Create: `workers/src/routes/notifications/route.ts`
- Modify: `workers/src/index.ts`
- Modify: `workers/src/middleware/auth.ts`
- Modify: `workers/src/routes/certificates/notificationHandlers.ts`
- Modify: `src/services/api/routes/system.ts`
- Create: `tests/notifications.worker.test.ts`
- Modify: `tests/certificates.worker.test.ts`

- [ ] **Step 1: Chạy GitNexus impact**

Phân tích:

- `handleGetNotifications`
- `handleMarkNotificationRead`
- Worker request dispatcher trong `workers/src/index.ts`
- `verifyToken`

Nếu dispatcher có risk HIGH, báo blast radius trước khi sửa và giới hạn thay đổi ở một nhánh route mới.

- [ ] **Step 2: Viết tests đang fail**

Cases:

- GET chỉ trả item của `JWT user_id + role`.
- `filter=unread` thêm `is_read = 0`.
- Cursor là opaque token từ `created_at + id`; cursor lỗi trả 400.
- Limit mặc định 20, tối đa 50.
- Item hết hạn không trả về.
- PATCH read của người khác trả 404.
- PATCH read-all chỉ cập nhật user/role hiện tại.
- `data` JSON hỏng trở thành `{}`.
- Legacy certificate GET/PATCH gọi cùng repository và giữ snake_case response cũ.

- [ ] **Step 3: Chạy tests và xác nhận fail**

Run:

```bash
npx vitest run tests/notifications.worker.test.ts tests/certificates.worker.test.ts
```

Expected: notification tests FAIL; certificate tests hiện có vẫn PASS.

- [ ] **Step 4: Implement repository**

API repository:

```ts
export interface NotificationIdentity {
  userId: string;
  role: 'student' | 'teacher' | 'admin';
}

export async function listNotifications(
  db: D1Database,
  identity: NotificationIdentity,
  input: { filter: 'all' | 'unread'; cursor?: string; limit: number },
): Promise<{ items: InboxNotification[]; nextCursor: string | null }>;

export async function markNotificationRead(
  db: D1Database,
  identity: NotificationIdentity,
  id: string,
): Promise<boolean>;

export async function markAllNotificationsRead(
  db: D1Database,
  identity: NotificationIdentity,
): Promise<number>;
```

Mọi SQL update phải có `WHERE user_id = ? AND user_role = ?`.

- [ ] **Step 5: Implement route generic**

Routes:

- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`

Thứ tự match phải kiểm tra `/read-all` trước `/:id/read`.

- [ ] **Step 6: Chuyển certificate handler sang adapter**

`handleGetNotifications` và `handleMarkNotificationRead` gọi repository generic, sau đó map camelCase về legacy snake_case. Không nhân đôi SQL.

- [ ] **Step 7: Chạy tests và xác nhận pass**

Run:

```bash
npx vitest run tests/notifications.worker.test.ts tests/certificates.worker.test.ts tests/systemSecurity.worker.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add workers/src/routes/notifications workers/src/index.ts workers/src/middleware/auth.ts workers/src/routes/certificates/notificationHandlers.ts src/services/api/routes/system.ts tests/notifications.worker.test.ts tests/certificates.worker.test.ts
git commit -m "feat(notifications): add role-safe inbox API"
```

---

## Task 4: Xây hook inbox bền vững và selector announcement

**Files:**

- Create: `src/features/notifications/selectAnnouncements.ts`
- Create: `src/features/notifications/notificationService.ts`
- Create: `src/features/notifications/useNotificationInbox.ts`
- Modify: `src/hooks/useRealtimeNotifications.ts`
- Create: `tests/selectAnnouncements.test.ts`
- Create: `tests/useNotificationInbox.test.tsx`

- [ ] **Step 1: Chạy GitNexus impact**

Phân tích `useRealtimeNotifications` và các caller. Mục tiêu là giữ adapter cũ để `NotificationBell` và certificate tests chưa bị phá.

- [ ] **Step 2: Viết selector tests đang fail**

Cases:

- Chọn một item ưu tiên cao nhất cho từng channel.
- Không chọn item ngoài surface override.
- `URGENT` được chọn cho strip trước `IMPORTANT`.
- Không lặp cùng announcement trong strip và banner.
- Input không bị mutate.

API:

```ts
export function selectAnnouncementSurfaces(
  items: Announcement[],
  surface: NotificationSurface,
): {
  critical: Announcement | null;
  ticker: Announcement | null;
  banner: Announcement | null;
};
```

- [ ] **Step 3: Viết hook tests đang fail**

Fake timers xác minh:

- Fetch ban đầu.
- Poll sau 30 giây khi tab visible.
- Không poll khi hidden.
- Fetch ngay khi visible trở lại.
- Lỗi giữ nguyên items và đặt `isStale`.
- Backoff tăng dần.
- `markRead` và `markAllRead` optimistic, rollback khi request fail.

- [ ] **Step 4: Chạy tests và xác nhận fail**

Run:

```bash
npx vitest run tests/selectAnnouncements.test.ts tests/useNotificationInbox.test.tsx
```

Expected: FAIL vì module chưa tồn tại.

- [ ] **Step 5: Implement selector và service**

Service chỉ gọi action registry:

```ts
export async function fetchNotificationInbox(input: InboxQuery): Promise<InboxPage>;
export async function readNotification(id: string): Promise<void>;
export async function readAllNotifications(): Promise<void>;
```

Không nhận `userId` từ caller để gửi lên API.

- [ ] **Step 6: Implement hook**

State:

```ts
interface NotificationInboxState {
  items: InboxNotification[];
  unreadCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  isStale: boolean;
  error: string | null;
}
```

Cleanup toàn bộ timer và listener trong effect. Abort request khi unmount.

- [ ] **Step 7: Giữ adapter cũ**

`useRealtimeNotifications(userId)` gọi hook mới nhưng map field về `CertificateNotification` cho caller cũ. `userId` chỉ dùng để bật/tắt hook, không gửi lên API.

- [ ] **Step 8: Chạy tests và xác nhận pass**

Run:

```bash
npx vitest run tests/selectAnnouncements.test.ts tests/useNotificationInbox.test.tsx tests/certificateFrontend.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/features/notifications src/hooks/useRealtimeNotifications.ts tests/selectAnnouncements.test.ts tests/useNotificationInbox.test.tsx tests/certificateFrontend.test.tsx
git commit -m "feat(notifications): add resilient inbox state"
```

---

## Task 5: Xây các component UI dùng chung theo Stitch

**Files:**

- Create: `src/features/notifications/components/CriticalAlertStrip.tsx`
- Create: `src/features/notifications/components/AnnouncementTicker.tsx`
- Create: `src/features/notifications/components/InFlowAnnouncementBanner.tsx`
- Create: `src/features/notifications/components/NotificationCenter.tsx`
- Create: `src/features/notifications/components/NotificationListItem.tsx`
- Create: `src/features/notifications/components/NotificationSurfaceStack.tsx`
- Create: `src/features/notifications/components/index.ts`
- Modify: `styles/animations.css`
- Create: `tests/notificationSurfaces.test.tsx`
- Create: `tests/NotificationCenter.test.tsx`

- [ ] **Step 1: Viết component tests đang fail**

Ticker:

- Có landmark/name “Thông báo chung”.
- Chỉ animate khi overflow.
- Pause button đổi `aria-pressed`.
- Hover và focus pause.
- Reduced motion không gắn animation.

Banner:

- Nằm trong flow, không có class `fixed`.
- Dismiss key chứa surface, id và updatedAt.
- Chặn `javascript:` URL.

Notification center:

- Accessible name chuông chứa unread count.
- Lọc tất cả/chưa đọc.
- Mark all.
- Escape đóng và trả focus.
- Click ngoài đóng desktop.
- Item action đánh dấu đọc trước khi navigate.
- Mobile render bottom sheet.

- [ ] **Step 2: Chạy tests và xác nhận fail**

Run:

```bash
npx vitest run tests/notificationSurfaces.test.tsx tests/NotificationCenter.test.tsx
```

Expected: FAIL vì component chưa tồn tại.

- [ ] **Step 3: Implement surface components**

Dismiss key:

```ts
const key = [
  'itongquiz:announcement-dismissed',
  surface,
  announcement.id,
  announcement.updatedAt,
].join(':');
```

Ticker phải dùng `ResizeObserver` để xác định overflow. CSS:

```css
@media (prefers-reduced-motion: reduce) {
  .notification-ticker__track {
    animation: none !important;
    transform: none !important;
  }
}
```

- [ ] **Step 4: Implement notification center**

Desktop panel:

```tsx
<section
  role="dialog"
  aria-modal="false"
  aria-labelledby={titleId}
  className="absolute right-0 top-full mt-2 w-[min(420px,calc(100vw-2rem))]"
>
```

Mobile bottom sheet dùng portal hiện có nếu có; nếu không, dùng fixed overlay chỉ cho dialog, không áp dụng cho announcement strip/banner.

- [ ] **Step 5: Chạy tests và xác nhận pass**

Run:

```bash
npx vitest run tests/notificationSurfaces.test.tsx tests/NotificationCenter.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/notifications/components styles/animations.css tests/notificationSurfaces.test.tsx tests/NotificationCenter.test.tsx
git commit -m "feat(notifications): build accessible notification surfaces"
```

---

## Task 6: Tích hợp login, teacher và student; tách chuông khỏi quản trị

**Files:**

- Modify: `src/components/HomePage/LoginLandingPage.tsx`
- Modify: `src/components/HomePage/HomePage.tsx`
- Modify: `src/components/TeacherDashboard/TeacherDashboardLayout.tsx`
- Modify: `src/components/TeacherDashboard/teacher-dashboard-shell/TeacherDashboardHeader.tsx`
- Modify: `src/components/TeacherDashboard/teacher-dashboard-shell/useDashboardPermissions.ts`
- Modify: `src/components/HomePage/student-dashboard/StudentDashboardContent.tsx`
- Modify: `src/components/HomePage/student-dashboard/StudentDashboardHeader.tsx`
- Modify: `src/components/common/NotificationBell.tsx`
- Modify: `tests/TeacherDashboardShell.test.tsx`
- Create: `tests/loginNotificationIntegration.test.tsx`
- Create: `tests/studentNotificationIntegration.test.tsx`

- [ ] **Step 1: Chạy GitNexus impact cho từng integration symbol**

Phân tích:

- `LoginLandingPage`
- `HomePage`
- `TeacherDashboardLayout`
- `TeacherDashboardHeader`
- `StudentDashboardContent`
- `StudentDashboardHeader`
- `NotificationBell`

Nếu có symbol HIGH/CRITICAL, báo trước và chia thay đổi thành commit nhỏ theo layout.

- [ ] **Step 2: Viết integration tests đang fail**

Login:

- Render ticker và banner công khai.
- Banner không có `position: fixed`.
- Form đăng nhập vẫn là phần tử tương tác đầu tiên sau vùng thông báo.

Teacher:

- Teacher thường thấy chuông inbox và mở panel.
- Teacher thường không thấy nút quản lý.
- Admin thấy cả chuông inbox và nút “Quản lý thông báo”.
- Nút quản lý mới chuyển tab `announcements`.

Student:

- Header dùng inbox mới.
- Item bài mới điều hướng đúng assignment.
- Chứng nhận và phiếu kết quả vẫn deep-link như trước.

- [ ] **Step 3: Chạy tests và xác nhận fail**

Run:

```bash
npx vitest run tests/loginNotificationIntegration.test.tsx tests/TeacherDashboardShell.test.tsx tests/studentNotificationIntegration.test.tsx
```

Expected: FAIL do integration cũ.

- [ ] **Step 4: Tích hợp login**

Thay fetch một item bằng `NotificationSurfaceStack surface="LOGIN"`. Chèn ticker ngay sau landing header và banner trong nội dung hero/form. Xóa timer 500 ms và fixed banner khỏi luồng login.

- [ ] **Step 5: Tích hợp teacher**

Header nhận callback/identity cho `NotificationCenter`.

```tsx
<NotificationCenter
  role={props.isAdmin ? 'admin' : 'teacher'}
  userId={props.teacherId}
  onNavigate={props.onNotificationNavigate}
/>

{props.isAdmin && (
  <button
    type="button"
    aria-label="Quản lý thông báo"
    onClick={() => props.setActiveTab('announcements')}
  >
    <Megaphone aria-hidden="true" />
  </button>
)}
```

Không đưa `announcements` ra khỏi `ADMIN_TABS`; chỉ sửa semantics của chuông.

- [ ] **Step 6: Tích hợp student**

Render stack theo audience student và dùng `NotificationCenter` trong header. Mapper target:

- assignment → mở bài được giao
- result report → mở phiếu kết quả
- certificate → mở thành tích/chứng nhận
- live exam → mở phòng thi
- URL → chỉ internal/HTTPS

- [ ] **Step 7: Giữ adapter `NotificationBell`**

`NotificationBell` có thể bọc `NotificationCenter` trong một release để caller và tests cũ tiếp tục hoạt động. Đánh dấu comment deprecation kèm đường dẫn component mới, không xóa ngay.

- [ ] **Step 8: Chạy tests và xác nhận pass**

Run:

```bash
npx vitest run tests/loginNotificationIntegration.test.tsx tests/TeacherDashboardShell.test.tsx tests/studentNotificationIntegration.test.tsx tests/certificateFrontend.test.tsx tests/systemManagementUi.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/components/HomePage src/components/TeacherDashboard src/components/common/NotificationBell.tsx tests/loginNotificationIntegration.test.tsx tests/TeacherDashboardShell.test.tsx tests/studentNotificationIntegration.test.tsx tests/certificateFrontend.test.tsx tests/systemManagementUi.test.tsx
git commit -m "feat(notifications): integrate role-aware notification UI"
```

---

## Task 7: Thiết kế lại admin composer và preview đa bề mặt

**Files:**

- Modify: `src/components/TeacherDashboard/AnnouncementSettings.tsx`
- Create: `src/features/notifications/admin/AnnouncementComposer.tsx`
- Create: `src/features/notifications/admin/AnnouncementDistributionFields.tsx`
- Create: `src/features/notifications/admin/AnnouncementPreview.tsx`
- Create: `src/features/notifications/admin/validateAnnouncementDraft.ts`
- Create: `tests/AnnouncementComposer.test.tsx`
- Modify: `tests/systemManagementUi.test.tsx`

- [ ] **Step 1: Chạy GitNexus impact**

Phân tích `AnnouncementSettings` và các API actions create/update/publish. Báo blast radius trước khi tách component.

- [ ] **Step 2: Viết validation tests đang fail**

Cases:

- Không channel → lỗi.
- `URGENT` thiếu `CRITICAL_STRIP` → lỗi.
- Có CTA label nhưng thiếu link → lỗi.
- URL không an toàn → lỗi.
- `endsAt <= startsAt` → lỗi.
- Scheduled thiếu startsAt → lỗi.
- Draft được phép lưu dù chưa hoàn chỉnh; publish thì không.

- [ ] **Step 3: Viết composer tests đang fail**

Cases:

- Ba khu vực Content/Distribution/Preview.
- Chuyển preview Login/Teacher/Student.
- Chuyển Desktop/Mobile.
- Preview sử dụng chính các component production.
- Publish hiển thị summary lỗi và focus trường đầu tiên.
- Save draft gửi `status: DRAFT`.
- Publish gửi đầy đủ priority/channels/audience/dismissible.
- Nút “Gửi thử” không gọi publish API.

- [ ] **Step 4: Chạy tests và xác nhận fail**

Run:

```bash
npx vitest run tests/AnnouncementComposer.test.tsx
```

Expected: FAIL vì composer mới chưa tồn tại.

- [ ] **Step 5: Implement composer theo Stitch**

Desktop:

```text
[ Nội dung 40% ] [ Phân phối 30% ] [ Preview sticky 30% ]
```

Mobile:

```text
Nội dung → Phân phối → Xem trước
```

Fields:

- title, body, CTA label/link, image
- audience
- channels
- priority
- startsAt, endsAt
- dismissible
- surface overrides

Preview phải dùng `CriticalAlertStrip`, `AnnouncementTicker`, `InFlowAnnouncementBanner` thật với `interactive={false}`.

- [ ] **Step 6: Biến `AnnouncementSettings` thành shell**

Giữ list/lifecycle hiện có và render `AnnouncementComposer` trong vùng tạo/sửa. Không thay đổi quyền admin.

- [ ] **Step 7: Chạy tests và xác nhận pass**

Run:

```bash
npx vitest run tests/AnnouncementComposer.test.tsx tests/systemManagementUi.test.tsx tests/announcements.worker.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/TeacherDashboard/AnnouncementSettings.tsx src/features/notifications/admin tests/AnnouncementComposer.test.tsx tests/systemManagementUi.test.tsx
git commit -m "feat(notifications): redesign admin announcement composer"
```

---

## Task 8: Phát sinh các notification nghiệp vụ đầu tiên

**Files:**

- Create: `workers/src/services/notificationWriter.ts`
- Modify: `workers/src/routes/assignments.ts`
- Modify: `workers/src/routes/homework.ts`
- Modify: `workers/src/routes/resultReports/route.ts`
- Modify: `workers/src/routes/certificates/notificationWriter.ts`
- Create: `tests/notificationWriter.worker.test.ts`
- Modify: `tests/assignmentRoutesValidation.worker.test.ts`
- Modify: `tests/certificates.worker.test.ts`

- [ ] **Step 1: Xác nhận chính xác symbol bằng GitNexus query/context**

Tên file/symbol route có thể khác theo refactor hiện tại. Dùng GitNexus query cho:

- tạo assignment
- học sinh nộp bài
- giáo viên chấm homework
- hoàn tất result report
- hoàn tất certificate batch

Sau đó chạy impact cho symbol thực tế trước khi sửa. Nếu `workers/src/routes/assignments.ts` hoặc `homework.ts` đã được tách, cập nhật danh sách file của task theo context nhưng giữ nguyên phạm vi nghiệp vụ.

- [ ] **Step 2: Viết writer tests đang fail**

Writer:

```ts
export async function createNotification(
  db: D1Database,
  input: CreateNotificationInput,
): Promise<'created' | 'duplicate'>;

export async function createNotifications(
  db: D1Database,
  inputs: CreateNotificationInput[],
): Promise<{ created: number; duplicate: number }>;
```

Cases:

- Validate type/priority/action URL.
- Dedupe cùng user/role/source/type.
- Batch dùng `db.batch`.
- Payload JSON serialize an toàn.

- [ ] **Step 3: Chạy tests và xác nhận fail**

Run:

```bash
npx vitest run tests/notificationWriter.worker.test.ts
```

Expected: FAIL vì writer chưa tồn tại.

- [ ] **Step 4: Implement writer và tích hợp các event**

Event tối thiểu cho release đầu:

- Assignment publish → `assignment_created` cho học sinh.
- Bài sắp hết hạn được tạo bởi job/scheduler hiện có nếu có; nếu repo chưa có scheduler, chưa phát tự động và không thêm cron mới trong task này.
- Student submit → `assignment_submitted` cho giáo viên.
- Homework graded → `homework_graded` cho học sinh.
- Result report ready → `result_report_ready`.
- Certificate batch complete → `certificate_batch_completed` cho giáo viên và `certificate_issued` cho học sinh.

Notification write cùng transaction/batch với trạng thái nghiệp vụ khi có thể. Lỗi notification không được làm mất bản ghi nghiệp vụ đã commit; với luồng không thể atomic, log structured error để retry.

- [ ] **Step 5: Chạy tests và xác nhận pass**

Run:

```bash
npx vitest run tests/notificationWriter.worker.test.ts tests/assignmentRoutesValidation.worker.test.ts tests/certificates.worker.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add workers/src/services/notificationWriter.ts workers/src/routes tests/notificationWriter.worker.test.ts tests/assignmentRoutesValidation.worker.test.ts tests/certificates.worker.test.ts
git commit -m "feat(notifications): emit assignment and result events"
```

---

## Task 9: Feature flag, responsive verification và rollout

**Files:**

- Modify: `src/components/TeacherDashboard/TeacherDashboardLayout.tsx`
- Modify: `src/components/HomePage/LoginLandingPage.tsx`
- Modify: `src/components/HomePage/student-dashboard/StudentDashboardContent.tsx`
- Create: `tests/unifiedNotificationsFeatureFlag.test.tsx`
- Create: `cypress/e2e/unified-notifications.cy.ts`
- Modify: `CHANGELOG.md`
- Create: `docs/runbooks/unified-notifications-rollout.md`

- [ ] **Step 1: Chạy GitNexus impact cho ba layout integration symbols**

Chỉ thêm nhánh flag; không thay đổi routing ngoài notification UI.

- [ ] **Step 2: Viết flag tests đang fail**

Cases:

- Flag off render UI legacy.
- Flag on render stack mới.
- Nếu API collection lỗi, UI không crash và layout vẫn dùng được.

Feature flag lấy từ system settings với key:

```text
unified_notifications_v1
```

- [ ] **Step 3: Chạy tests và xác nhận fail**

Run:

```bash
npx vitest run tests/unifiedNotificationsFeatureFlag.test.tsx
```

Expected: FAIL vì flag chưa được nối.

- [ ] **Step 4: Implement flag và fallback**

Không fetch hai hệ thống song song. Selector:

```ts
const notificationsEnabled =
  systemSettings.unified_notifications_v1 === true;
```

Flag off giữ component legacy. Flag on chỉ dùng stack mới.

- [ ] **Step 5: Viết Cypress flow**

Viewport và flow:

- Login desktop 1440 × 900.
- Teacher desktop 1440 × 900.
- Student desktop 1440 × 900.
- Student mobile 390 × 844.

Assertions:

- Không overlay navigation/form.
- Pause ticker.
- Open/filter/close inbox.
- Escape trả focus.
- Admin có nút quản lý riêng.
- Mobile bottom sheet không vượt `85dvh`.

- [ ] **Step 6: Viết runbook rollout**

Runbook gồm:

- Apply migration 0042.
- Deploy worker trước frontend.
- Smoke test legacy endpoints.
- Bật flag cho admin nội bộ.
- Bật teacher/student theo từng giai đoạn.
- Chỉ số theo dõi và cách tắt flag.
- Điều kiện xóa route legacy ở release sau.

- [ ] **Step 7: Chạy verification đầy đủ**

Run:

```bash
npx vitest run tests/notificationsContract.test.ts tests/unifiedNotificationsMigration.worker.test.ts tests/announcements.worker.test.ts tests/announcementService.test.ts tests/notifications.worker.test.ts tests/certificates.worker.test.ts tests/selectAnnouncements.test.ts tests/useNotificationInbox.test.tsx tests/notificationSurfaces.test.tsx tests/NotificationCenter.test.tsx tests/loginNotificationIntegration.test.tsx tests/TeacherDashboardShell.test.tsx tests/studentNotificationIntegration.test.tsx tests/AnnouncementComposer.test.tsx tests/notificationWriter.worker.test.ts tests/unifiedNotificationsFeatureFlag.test.tsx
npm run build
npx cypress run --spec cypress/e2e/unified-notifications.cy.ts
```

Expected: tất cả PASS; build không có TypeScript/Vite error.

- [ ] **Step 8: Kiểm tra trực quan với Stitch**

So sánh bốn viewport với screen IDs:

- Login: `8a7b577b90e6411a8bb7f340638daa27`
- Teacher: `f5fbbb472c544acaa9bceba57e6e2247`
- Student desktop: `86be1b50afbd48b794483c1c1452bf5e`
- Student mobile: `067677cef46844dead632bd06843b8b4`
- Composer: `f4b9743a681c4af4a0b1f22efcc0d596`

Chấp nhận sai khác nhỏ về copy hoặc dữ liệu thật; không chấp nhận khác về hierarchy, behavior, mobile sheet và sự tách biệt chuông/admin.

- [ ] **Step 9: Cập nhật changelog và commit**

```bash
git add src tests cypress/e2e/unified-notifications.cy.ts CHANGELOG.md docs/runbooks/unified-notifications-rollout.md
git commit -m "feat(notifications): complete guarded notification rollout"
```

---

## Final Review Checklist

- [ ] Chạy `git diff --check`.
- [ ] Chạy GitNexus `detect_changes({ scope: "compare", base_ref: "main" })`.
- [ ] Xem toàn bộ affected processes; không có flow ngoài notification, announcement, login shell, teacher shell, student shell và nghiệp vụ phát notification.
- [ ] Quét các dấu hiệu nội dung dang dở và xác nhận file mới đã hoàn chỉnh.
- [ ] Xác nhận feature notification không dùng API chèn HTML trực tiếp của React.
- [ ] Xác nhận type priority/channel/type chỉ đến từ `shared/notifications.contract.ts`.
- [ ] Xác nhận mọi update read có điều kiện user + role.
- [ ] Xác nhận `NotificationBell` legacy còn hoạt động trong một release.
- [ ] Xác nhận reduced motion, Escape, focus return, 44 px target và color-plus-label.
- [ ] Xác nhận flag off rollback được mà không rollback database migration.
- [ ] Chạy `npm run build`.
- [ ] Chạy test suite notification mục tiêu.
- [ ] Review diff và ghi rõ migration/deploy order trong PR.
