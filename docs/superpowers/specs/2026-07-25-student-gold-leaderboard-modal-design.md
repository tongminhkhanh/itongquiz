# Thiết kế popup Bảng vàng học sinh

**Ngày:** 25/07/2026  
**Phạm vi:** Dashboard học sinh iTongQuiz  
**Trạng thái:** Đã chốt để lập kế hoạch triển khai

## 1. Mục tiêu

Thay nút chữ **“Bảng vàng”** đang nổi ở góc phải bằng một nút cúp trực quan. Khi học sinh bấm vào cúp, hệ thống mở popup Bảng vàng hiển thị 10 học sinh đang có nhiều xu nhất, nhấn mạnh Top 3 và làm nổi bật học sinh hiện tại nếu em nằm trong danh sách.

## 2. Phạm vi MVP

### Bao gồm

- Nút cúp nổi thay hoàn toàn nút chữ hiện tại.
- Tooltip “Mở Bảng vàng” khi hover hoặc focus.
- Popup modal ở giữa màn hình trên desktop, bottom sheet trên mobile.
- Top 3 dạng bục xếp hạng.
- Danh sách hạng 4–10.
- Làm nổi bật học sinh đang đăng nhập khi có mặt trong Top 10.
- Trạng thái đang tải, rỗng, lỗi và nút thử lại.
- Đóng bằng nút X, bấm nền tối hoặc phím `Escape`.
- Trả focus về nút cúp sau khi đóng.
- Tôn trọng `prefers-reduced-motion`.
- Tải dữ liệu khi mở popup, không gọi API ngay khi dashboard vừa render.
- Cache dữ liệu trong 60 giây để hạn chế gọi API lặp lại.

### Không bao gồm trong MVP

- Tab Tuần này / Tháng này / Toàn thời gian.
- Xếp hạng theo điểm, độ chính xác, tốc độ hoặc chuỗi học tập.
- Hiển thị thứ hạng của học sinh nếu em nằm ngoài Top 10.
- Thay đổi API Worker, truy vấn D1 hoặc schema database. Frontend service chỉ được phép truyền lỗi lên store để phân biệt lỗi mạng với danh sách rỗng hợp lệ.
- Trao thưởng tự động cho Top 3.

Những mục này cần một hợp đồng dữ liệu mới vì API hiện tại chỉ trả về Top 10 theo **số xu đang có**.

## 3. Quy ước dữ liệu

Nguồn dữ liệu hiện tại:

- Route frontend: `get_top_gold_leaderboard`.
- Endpoint Worker: `GET /api/leaderboard/top-gold`.
- Kiểu dữ liệu: `TopGoldStudent` gồm `username`, `fullName`, `avatar`, `coins`.
- Truy vấn hiện tại sắp xếp `students.coins DESC` và giới hạn 10 bản ghi.

Do `coins` là số dư hiện có, nội dung popup phải dùng câu:

> “10 học sinh có số xu hiện có cao nhất”

Không dùng “tổng xu đã kiếm”, “thành tích tuần” hoặc “điểm học tập” vì các cách gọi đó không đúng với dữ liệu hiện tại.

## 4. Luồng tương tác

1. Dashboard render nút cúp nhưng chưa gọi API Bảng vàng.
2. Học sinh bấm nút cúp.
3. Popup mở ngay.
4. Store kiểm tra cache:
   - Cache còn hạn dưới 60 giây: hiển thị dữ liệu hiện có, không gọi API.
   - Chưa có cache hoặc cache hết hạn: gọi API.
5. Trong lần tải đầu, popup hiển thị skeleton.
6. Khi thành công:
   - Hạng 1–3 hiển thị tại khu vực bục.
   - Hạng 4–10 hiển thị thành danh sách.
   - Dòng của học sinh hiện tại có nền xanh nhạt và nhãn “Em”.
7. Khi lỗi:
   - Nếu chưa có cache: hiển thị thông báo lỗi và nút “Thử lại”.
   - Nếu đã có cache: giữ danh sách cũ, hiển thị cảnh báo nhỏ “Chưa cập nhật được dữ liệu mới”.
8. Khi đóng, focus quay lại nút cúp.

## 5. Kiến trúc component

### `StudentFloatingSidebar.tsx`

Giữ nguyên tên export để không ảnh hưởng nơi đang import. Component này chỉ làm nhiệm vụ:

- Quản lý `isOpen`.
- Render nút cúp nổi.
- Gọi `fetchTopGoldLeaderboard()` khi mở.
- Truyền dữ liệu và callback cho modal.

### `StudentGoldLeaderboardModal.tsx`

Component trình bày popup:

- Header và nút đóng.
- Trạng thái loading / error / empty / success.
- Top 3 podium.
- Danh sách hạng 4–10.
- Accessibility và animation.

### `StudentGoldPodium.tsx`

Component thuần hiển thị tối đa ba học sinh đầu bảng. Không tự gọi store hoặc API.

## 6. Thay đổi store

Store hiện dùng `isLoading` chung cho Pet, mua quà, phần thưởng và Bảng vàng. MVP tách trạng thái riêng để tránh tình trạng một thao tác gamification khác làm popup Bảng vàng hiện skeleton sai.

Thêm:

```ts
topGoldLeaderboardLoading: boolean;
topGoldLeaderboardError: string | null;
topGoldLeaderboardFetchedAt: number | null;
fetchTopGoldLeaderboard: (force?: boolean) => Promise<void>;
```

Chính sách cache:

```ts
const TOP_GOLD_CACHE_TTL_MS = 60_000;
```

## 7. Thiết kế giao diện

### Nút cúp

- Kích thước tối thiểu 52 × 52 px.
- Icon `Trophy` từ `lucide-react`.
- Nền amber/vàng nhạt, viền vàng, bóng đổ nhẹ.
- Hover nâng 2 px; focus ring màu sky.
- `aria-label="Mở Bảng vàng học sinh"`.
- Hiện trên cả desktop và mobile.

### Popup

- Desktop: rộng tối đa khoảng 760 px, cao tối đa 86–90 viewport.
- Mobile: bottom sheet rộng toàn màn hình, bo góc phía trên.
- Nền popup dùng màu `#FFFDF7` để đồng bộ dashboard học sinh.
- Nền phía sau dùng `bg-slate-950/40`.

### Top 3

- Hạng 1 đặt giữa và cao hơn.
- Hạng 2 bên trái, hạng 3 bên phải.
- Dùng huy chương/badge màu vàng, bạc, đồng.
- Hiển thị avatar, tên và số xu.

### Hạng 4–10

Mỗi dòng gồm:

- Số thứ hạng.
- Avatar.
- Họ tên.
- Số xu.
- Nhãn “Em” khi trùng `currentUsername`.

## 8. Accessibility

- Popup dùng `role="dialog"`, `aria-modal="true"`, `aria-labelledby` và `aria-describedby`.
- Nút đóng có tên truy cập rõ ràng.
- Focus chuyển vào popup khi mở và quay lại trigger khi đóng.
- Phím `Escape` đóng popup.
- Khi popup mở, body bị khóa cuộn.
- Skeleton có `aria-busy="true"`.
- Lỗi dùng `role="alert"`.
- Không chỉ dùng màu để thể hiện học sinh hiện tại; phải có nhãn “Em”.

## 9. Tiêu chí nghiệm thu

- Không còn nút chữ “Bảng vàng” ở góc phải.
- Nút cúp mở được popup bằng chuột và bàn phím.
- Dashboard không gọi endpoint Bảng vàng trước lần mở đầu tiên.
- API không bị gọi lại trong vòng 60 giây nếu dữ liệu đã tải thành công.
- Top 3 và hạng 4–10 hiển thị đúng thứ tự từ API.
- Avatar lỗi tự chuyển sang avatar mặc định.
- Trạng thái loading, empty, error và retry hoạt động.
- Modal đóng bằng X, nền tối và `Escape`.
- Không có horizontal overflow ở 360 px, 768 px và 1440 px.
- Test Vitest mục tiêu, toàn bộ test suite và production build đều vượt qua.

## 10. Rollback

Nếu popup mới gây lỗi production:

1. Revert commit UI để khôi phục nội dung cũ của `StudentFloatingSidebar.tsx`.
2. Có thể giữ thay đổi trạng thái riêng trong store vì thay đổi này tương thích ngược.
3. Không cần rollback database hoặc Worker vì MVP không thay backend.
