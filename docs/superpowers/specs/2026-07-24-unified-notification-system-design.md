# Hệ thống thông báo thống nhất ItOngQuiz

Ngày: 2026-07-24  
Trạng thái: Đã chốt thiết kế, sẵn sàng lập kế hoạch triển khai  
Phạm vi: Trang đăng nhập, dashboard giáo viên, dashboard học sinh và khu vực quản trị

## 1. Tham chiếu thiết kế Stitch

- Project: `projects/2361569551710625712`
- Design system: `assets/7121534155558445257`
- Login desktop: `8a7b577b90e6411a8bb7f340638daa27`
- Teacher dashboard desktop: `f5fbbb472c544acaa9bceba57e6e2247`
- Student dashboard desktop: `86be1b50afbd48b794483c1c1452bf5e`
- Admin notification composer desktop: `f4b9743a681c4af4a0b1f22efcc0d596`
- Student notification mobile: `067677cef46844dead632bd06843b8b4`

Bản mobile đầu tiên đã được loại bỏ vì dùng nhầm nội dung dành cho giáo viên. Màn hình `067677cef46844dead632bd06843b8b4` là bản đã sửa đúng đối tượng học sinh.

## 2. Bối cảnh và vấn đề hiện tại

Hệ thống đang có ba cơ chế gần giống thông báo nhưng chưa cùng một mô hình:

1. `AnnouncementMarquee` lấy một thông báo chung và chạy chữ liên tục. Thành phần này chỉ xuất hiện trong giao diện trang chủ cũ, chưa có nút tạm dừng và chưa xử lý `prefers-reduced-motion`.
2. `AnnouncementBanner` hiển thị dạng `fixed` phía trên cùng với `z-index` rất cao. Nó có thể che header hoặc biểu mẫu đăng nhập và dùng quy tắc lưu trạng thái đã đóng không đồng nhất giữa các màn hình.
3. `NotificationBell` là hộp thư cá nhân nhưng hiện chủ yếu phục vụ chứng nhận và phiếu kết quả của học sinh. Hook có tên “realtime” nhưng thực tế thăm dò mỗi 30 giây và xóa dữ liệu cũ khi lỗi tạm thời.

Chuông trên dashboard giáo viên hiện gọi `setActiveTab('announcements')`. Tab này chỉ dành cho admin nên giáo viên thường bị điều hướng trở lại tổng quan. Chuông cá nhân và công cụ quản trị thông báo đang bị trộn cùng một hành vi.

API thông báo hệ thống chỉ trả một bản ghi đang hoạt động qua `LIMIT 1`. Vì vậy không thể đồng thời trình bày một cảnh báo khẩn, một dòng tin chung và một banner quan trọng theo đúng vai trò.

## 3. Mục tiêu

- Cung cấp một ngôn ngữ UI thống nhất cho thông báo ở login, giáo viên và học sinh.
- Phân biệt rõ thông báo hệ thống, tin chạy, banner quan trọng và hộp thư cá nhân.
- Bảo đảm giáo viên có hộp thư thật; admin có nút quản trị riêng.
- Cho phép admin chọn đối tượng, kênh, độ ưu tiên, lịch hiển thị, CTA và xem trước từng bề mặt.
- Không che nội dung hoặc điều hướng chính.
- Hoạt động tốt trên desktop và mobile.
- Đáp ứng WCAG 2.2 AA cho tương phản, bàn phím, focus, chuyển động và vùng chạm.
- Tái sử dụng bảng `notifications` hiện có thay vì tạo thêm một hộp thư song song.

## 4. Ngoài phạm vi

- Push notification của trình duyệt hoặc ứng dụng native.
- Gửi SMS, email, Zalo hoặc thông báo cho phụ huynh.
- Trung tâm phân tích chiến dịch nâng cao.
- Cá nhân hóa bằng AI.
- Thay đổi toàn bộ giao diện dashboard ngoài các vùng liên quan đến thông báo.

## 5. Mô hình bốn tầng

### 5.1 `CRITICAL_STRIP`

Dành cho sự cố hoặc thông tin bắt buộc phải biết, ví dụ hệ thống bảo trì khẩn.

- Hiển thị tĩnh, không chạy chữ.
- Nằm trong luồng bố cục ngay dưới header.
- Có nhãn mức độ và biểu tượng kèm chữ; không truyền đạt chỉ bằng màu.
- Mặc định không đóng được. Nếu admin bật `dismissible`, nút đóng phải ghi nhận theo người dùng hoặc theo trình duyệt ở trang login.
- Mỗi bề mặt chỉ hiện tối đa một cảnh báo khẩn, ưu tiên bản mới nhất.

### 5.2 `TICKER`

Dành cho tin chung như lịch thi, cập nhật tính năng hoặc lời nhắc nhẹ.

- Nằm ngay dưới header và không dùng `position: fixed`.
- Chỉ chạy khi nội dung thực sự tràn chiều rộng.
- Có nút “Tạm dừng/Tiếp tục”.
- Tự tạm dừng khi hover hoặc focus nằm trong vùng ticker.
- Với `prefers-reduced-motion: reduce`, hiển thị tĩnh và cho phép mở rộng nội dung.
- Một ticker tại một thời điểm; chọn theo độ ưu tiên rồi đến thời gian cập nhật.

### 5.3 `BANNER`

Dành cho nội dung quan trọng nhưng không khẩn, có thể có hình và CTA.

- Hiển thị trong phần nội dung chính, không che header hoặc form login.
- Có tiêu đề, nội dung ngắn, CTA tùy chọn và nút đóng nếu được cấu hình.
- Khóa đã đóng dùng `announcementId + updatedAt + surface`, để nội dung mới của cùng thông báo có thể xuất hiện lại.
- Liên kết chỉ chấp nhận đường dẫn nội bộ hoặc HTTPS; ảnh chỉ từ host được cho phép.

### 5.4 `INBOX`

Dành cho thông báo cá nhân có hành động hoặc lịch sử.

- Chuông có badge số chưa đọc, giới hạn hiển thị `99+`.
- Panel desktop neo vào chuông; mobile dùng bottom sheet toàn chiều rộng.
- Có bộ lọc `Tất cả` và `Chưa đọc`.
- Có “Đánh dấu tất cả đã đọc”.
- Click một mục đánh dấu đã đọc trước khi điều hướng.
- Giữ dữ liệu cũ khi polling lỗi; hiển thị trạng thái kết nối nhẹ thay vì làm badge biến mất.
- Escape đóng panel và focus trở về nút chuông.

## 6. Ma trận bề mặt theo vai trò

| Bề mặt | CRITICAL_STRIP | TICKER | BANNER | INBOX |
|---|---|---|---|---|
| Login | Thông báo công khai `ALL` | Tin công khai `ALL` | Banner công khai trong vùng hero/form | Không |
| Giáo viên | `ALL` hoặc `TEACHERS` | `ALL` hoặc `TEACHERS` | `ALL` hoặc `TEACHERS` | Bài được giao, bài nộp mới, lỗi phát hành, tiến trình chứng nhận, hệ thống |
| Học sinh | `ALL` hoặc `STUDENTS` | `ALL` hoặc `STUDENTS` | `ALL` hoặc `STUDENTS` | Bài mới, sắp hết hạn, đã chấm, thi trực tiếp, phiếu kết quả, chứng nhận, quà |
| Admin | Như giáo viên | Như giáo viên | Như giáo viên | Như giáo viên, cộng cảnh báo vận hành |

Admin có thêm nút biểu tượng loa với nhãn “Quản lý thông báo”. Nút này tách biệt hoàn toàn với chuông hộp thư cá nhân.

## 7. Thứ bậc và quy tắc ưu tiên

Độ ưu tiên:

```ts
export const NOTIFICATION_PRIORITIES = [
  'INFO',
  'REMINDER',
  'IMPORTANT',
  'URGENT',
] as const;
```

Quy tắc:

- `URGENT` bắt buộc dùng `CRITICAL_STRIP`; không được chỉ phát qua ticker.
- `IMPORTANT` phù hợp với banner hoặc inbox.
- `REMINDER` phù hợp với ticker hoặc inbox.
- `INFO` phù hợp với ticker hoặc inbox.
- Cùng một announcement có thể phát qua nhiều kênh, nhưng mỗi kênh chỉ có một cấu hình nội dung chuẩn; UI không lặp cùng thông tin hai lần trong cùng viewport nếu cả strip và banner cùng hoạt động.
- Thứ tự chọn: `URGENT > IMPORTANT > REMINDER > INFO`, sau đó `startsAt DESC`, `updatedAt DESC`.

## 8. Ngôn ngữ thiết kế

### 8.1 Typography

- Font chính: `Be Vietnam Pro`.
- Tiêu đề màn hình: 24–30 px, weight 700.
- Tiêu đề card/panel: 16–20 px, weight 600–700.
- Nội dung: 14–16 px, line-height tối thiểu 1.5.
- Metadata: 12–14 px nhưng không thấp hơn 12 px.

### 8.2 Màu

- Primary cyan: `#0EA5E9`.
- Primary dark blue: `#1E40AF`.
- Accent orange: `#F97316`.
- Text chính: `#172033`.
- Text phụ: `#526174`.
- Border: `#E5E7EB`.
- Background nhẹ: `#F8FAFC`.
- Success: xanh lá đi cùng icon và nhãn.
- Warning: vàng/cam đi cùng icon và nhãn.
- Error/urgent: đỏ đi cùng icon và nhãn.

### 8.3 Hình khối

- Radius chuẩn: 12 px; panel lớn 16 px.
- Border 1 px; shadow nhẹ, không dùng hiệu ứng claymorphism nặng.
- Vùng chạm tối thiểu 44 × 44 px.
- Focus ring 2 px màu `#0EA5E9`, có offset rõ.
- Không dùng emoji làm icon giao diện; dùng Lucide đồng nhất.

## 9. Chi tiết thành phần

### 9.1 `NotificationSurfaceStack`

Thành phần điều phối các thông báo công khai của một bề mặt:

```ts
interface NotificationSurfaceStackProps {
  surface: 'LOGIN' | 'TEACHER_DASHBOARD' | 'STUDENT_DASHBOARD';
  role?: 'teacher' | 'student' | 'admin';
}
```

Nó tải danh sách announcement đang hoạt động một lần, chọn strip/ticker/banner bằng selector thuần và render theo thứ tự:

1. Critical strip
2. Ticker
3. Nội dung chính của trang
4. Banner tại vị trí do layout chỉ định

### 9.2 `AnnouncementTicker`

- `aria-label="Thông báo chung"`.
- Nút pause có `aria-pressed`.
- Nội dung CTA là link thật, không bọc toàn vùng ticker.
- Không nhân đôi DOM để chạy chữ nếu người dùng giảm chuyển động.
- Tốc độ dựa trên độ dài, tối thiểu 18 giây và tối đa 40 giây.

### 9.3 `NotificationCenter`

```ts
interface NotificationCenterProps {
  userId: string | null;
  role: 'student' | 'teacher' | 'admin';
  onNavigate: (target: NotificationTarget) => void;
}
```

Panel có:

- Header “Thông báo”.
- Badge hoặc text số chưa đọc.
- Tabs `Tất cả`, `Chưa đọc`.
- Nút `Đánh dấu tất cả đã đọc`.
- List item: icon loại, tiêu đề, nội dung tối đa hai dòng, thời gian tương đối, chấm chưa đọc.
- Empty state theo bộ lọc.
- Trạng thái lỗi polling không phá dữ liệu hiện có.

### 9.4 Admin composer

Bố cục desktop ba cột:

1. Nội dung: tiêu đề, mô tả, CTA, ảnh.
2. Phân phối: đối tượng, kênh, ưu tiên, lịch bắt đầu/kết thúc, cho phép đóng.
3. Preview sticky: Login/Giáo viên/Học sinh và Desktop/Mobile.

Validation hiển thị ngay cạnh trường lỗi và có tóm tắt lỗi khi publish. Hành động cuối:

- `Lưu nháp`
- `Gửi thử`
- `Xuất bản` hoặc `Lên lịch`

`Gửi thử` chỉ render preview bằng payload hiện tại; không ghi notification cho người dùng thật.

## 10. Mô hình dữ liệu

### 10.1 Announcement hệ thống

Mở rộng bảng `announcements` hiện có:

```sql
ALTER TABLE announcements ADD COLUMN priority TEXT NOT NULL DEFAULT 'INFO'
  CHECK (priority IN ('INFO', 'REMINDER', 'IMPORTANT', 'URGENT'));
ALTER TABLE announcements ADD COLUMN channels_json TEXT NOT NULL DEFAULT '["TICKER"]';
ALTER TABLE announcements ADD COLUMN dismissible INTEGER NOT NULL DEFAULT 1
  CHECK (dismissible IN (0, 1));
ALTER TABLE announcements ADD COLUMN cta_label TEXT;
ALTER TABLE announcements ADD COLUMN surface_overrides_json TEXT NOT NULL DEFAULT '{}';
```

`channels_json` chỉ nhận các giá trị:

```ts
type AnnouncementChannel =
  | 'CRITICAL_STRIP'
  | 'TICKER'
  | 'BANNER'
  | 'INBOX';
```

Các cột legacy `is_active` và `is_banner_active` vẫn được đọc trong giai đoạn chuyển đổi, nhưng composer mới chỉ ghi mô hình `channels_json`. Migration backfill:

- `is_active = true` thêm `TICKER`.
- `is_banner_active = true` thêm `BANNER`.
- Nếu cả hai false, giữ `[]`.

### 10.2 Hộp thư cá nhân

Tái sử dụng bảng `notifications`:

```sql
ALTER TABLE notifications ADD COLUMN priority TEXT NOT NULL DEFAULT 'INFO'
  CHECK (priority IN ('INFO', 'REMINDER', 'IMPORTANT', 'URGENT'));
ALTER TABLE notifications ADD COLUMN action_url TEXT;
ALTER TABLE notifications ADD COLUMN source_type TEXT;
ALTER TABLE notifications ADD COLUMN source_id TEXT;
ALTER TABLE notifications ADD COLUMN expires_at TEXT;
```

Chỉ mục bổ sung:

```sql
CREATE INDEX IF NOT EXISTS idx_notifications_inbox
ON notifications(user_id, user_role, is_read, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_source_dedupe
ON notifications(user_id, user_role, source_type, source_id, type)
WHERE source_type IS NOT NULL AND source_id IS NOT NULL;
```

### 10.3 Hợp đồng dùng chung

Tạo `shared/notifications.contract.ts` làm nguồn type duy nhất cho worker và frontend:

```ts
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

export type NotificationTarget =
  | { kind: 'assignment'; assignmentId: string }
  | { kind: 'result-report'; reportId: string }
  | { kind: 'certificate'; certificateId: string }
  | { kind: 'live-exam'; examId: string }
  | { kind: 'url'; url: string };
```

Các loại ban đầu:

```ts
type NotificationType =
  | 'assignment_created'
  | 'assignment_due_soon'
  | 'assignment_submitted'
  | 'homework_graded'
  | 'live_exam_ready'
  | 'result_report_ready'
  | 'certificate_issued'
  | 'certificate_batch_completed'
  | 'delivery_failed'
  | 'gift_delivered'
  | 'system';
```

## 11. API

### 11.1 Announcement

`GET /api/announcements/current` trả về:

```json
{
  "status": "success",
  "data": {
    "items": [],
    "generatedAt": "2026-07-24T00:00:00.000Z"
  }
}
```

Không còn `LIMIT 1`; giới hạn tối đa 20 bản ghi sau khi lọc audience, trạng thái và lịch. Frontend chịu trách nhiệm chọn một item cho mỗi bề mặt/kênh bằng selector dùng chung.

Endpoint admin giữ nguyên nhưng request/response bổ sung `priority`, `channels`, `dismissible`, `ctaLabel` và `surfaceOverrides`.

### 11.2 Inbox

- `GET /api/notifications?filter=all|unread&cursor=<opaque>&limit=20`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`

Quyền sở hữu luôn lấy từ JWT; client không gửi `user_id` để truy vấn hay cập nhật. API cũ `/api/certificates/notifications` được giữ một release, gọi cùng repository và trả shape tương thích trước khi loại bỏ.

## 12. Polling, cache và lỗi

- Polling mặc định 30 giây khi tab đang visible.
- Dừng polling khi `document.visibilityState !== 'visible'`.
- Fetch ngay khi tab trở lại visible.
- Nếu fetch lỗi, giữ list và unread count gần nhất; đặt `isStale=true`.
- Backoff 30 giây, 60 giây, 120 giây; tối đa 5 phút.
- Optimistic update cho đọc một mục và đọc tất cả; rollback khi server từ chối.
- Không ghi nội dung thông báo cá nhân vào localStorage.

## 13. Trạng thái đọc và đóng

- `isRead` là trạng thái cá nhân ở server.
- Dismiss banner cho người đã login ưu tiên lưu server ở giai đoạn sau; phiên bản đầu dùng localStorage với key:

```text
itongquiz:announcement-dismissed:<surface>:<id>:<updatedAt>
```

- Login không có danh tính nên luôn dùng key theo trình duyệt.
- Publish bản cập nhật làm thay đổi `updatedAt`, vì vậy banner được phép hiện lại.

## 14. Accessibility

- Tất cả nút icon có accessible name.
- Panel chuông dùng `role="dialog"`, `aria-modal="false"` trên desktop và `aria-modal="true"` trên mobile bottom sheet.
- Focus đi vào tiêu đề hoặc mục đầu tiên khi mở; Escape đóng; focus quay lại nút chuông.
- Click ngoài đóng panel desktop.
- Ticker có pause thật và tôn trọng reduced motion.
- Badge không phải nguồn duy nhất truyền đạt unread; accessible name của chuông chứa số chưa đọc.
- Mức độ luôn có icon và text.
- Thứ tự DOM khớp thứ tự nhìn thấy.
- Vùng chạm tối thiểu 44 px.

## 15. Responsive

- Desktop: inbox rộng 380–420 px, neo bên phải chuông.
- Tablet: panel tối đa `calc(100vw - 32px)`.
- Mobile: bottom sheet `max-height: 85dvh`, footer và close action luôn truy cập được.
- Dòng ticker mobile rút gọn một dòng; nút pause vẫn hiển thị.
- Admin composer mobile chuyển thành ba bước `Nội dung → Phân phối → Xem trước`, giữ thanh hành động cuối màn hình.

## 16. Bảo mật

- Chỉ admin được tạo, sửa, publish, archive announcement hệ thống.
- Worker tiếp tục kiểm tra HTTPS/đường dẫn nội bộ cho CTA.
- Ảnh chỉ chấp nhận host API, R2 public URL hoặc allowlist.
- Nội dung luôn render dạng text; không dùng API chèn HTML trực tiếp của React.
- Inbox chỉ truy vấn và cập nhật theo JWT identity.
- Source ID và payload không được dùng trực tiếp để dựng URL; target phải qua mapper allowlist.
- Tất cả publish/update được ghi audit log.

## 17. Quan sát và đo lường

Giai đoạn đầu ghi các sự kiện nội bộ không chứa nội dung:

- `notification_inbox_opened`
- `notification_item_opened`
- `notification_mark_all_read`
- `announcement_cta_clicked`
- `announcement_dismissed`
- `announcement_ticker_paused`

Thuộc tính cho phép: role, surface, channel, type, priority. Không ghi tên, nội dung hoặc ID học sinh vào analytics.

## 18. Kiểm thử

- Contract tests cho priority, channel, type và target.
- Worker tests cho audience, lịch, nhiều announcement cùng lúc, quyền sở hữu inbox, read-all, pagination và legacy route.
- Component tests cho pause/reduced motion, dismissal key, panel keyboard/focus, filters và optimistic rollback.
- Integration tests cho login, teacher, student và admin composer.
- E2E responsive cho login desktop, teacher desktop, student desktop và student mobile theo Stitch.
- `axe` hoặc kiểm tra tương đương cho các màn hình chính.

## 19. Triển khai và tương thích

### Giai đoạn 1

- Thêm contract, migration và API generic.
- Giữ response legacy và route certificate.
- Frontend mới đọc được cả `{ announcement }` và `{ data: { items } }`.

### Giai đoạn 2

- Bật UI mới theo feature flag `unified_notifications_v1`.
- Tích hợp login, teacher và student.
- Tách chuông cá nhân khỏi nút admin.

### Giai đoạn 3

- Bật composer mới.
- Backfill channel legacy.
- Theo dõi lỗi và tỷ lệ mở.

### Giai đoạn 4

- Gỡ code banner fixed và shape legacy sau ít nhất một release ổn định.

## 20. Tiêu chí nghiệm thu

- Login có ticker và banner trong luồng, không che form ở 320 px trở lên.
- Giáo viên thường mở được hộp thư cá nhân từ chuông.
- Admin có chuông cá nhân và nút quản lý riêng.
- Học sinh nhận đúng bài mới, hạn nộp, kết quả và chứng nhận.
- Một cảnh báo khẩn, một ticker và một banner có thể hoạt động đồng thời theo đúng priority.
- Ticker dừng bằng nút, hover, focus và reduced motion.
- Panel điều khiển hoàn toàn bằng bàn phím, Escape trả focus về chuông.
- Polling lỗi không xóa dữ liệu đang hiển thị.
- Mark read và mark all chỉ tác động notification thuộc JWT user.
- Composer chặn publish khi không có kênh, nội dung bắt buộc hoặc lịch không hợp lệ.
- Các route cũ tiếp tục hoạt động trong giai đoạn chuyển đổi.

## 21. Quyết định thiết kế đã chốt

- Chọn kiến trúc bốn tầng thay vì một banner dùng cho mọi trường hợp.
- Chọn bố cục trong luồng thay vì banner fixed.
- Chọn một inbox dùng chung cho giáo viên/học sinh/admin, dựa trên bảng `notifications`.
- Chọn `Be Vietnam Pro` và phong cách card sạch, thân thiện; không áp dụng claymorphism nặng.
- Chọn polling bền vững trước, chưa triển khai WebSocket/Durable Object trong phạm vi này.
- Chọn feature flag và compatibility adapter để rollout không gián đoạn.
