# Spec: Learning Adventure — Student Dashboard Phase 1

**Status:** Approved for specification

**Date:** 2026-07-18

**Surface:** Student dashboard after login

**Primary implementation target:** `src/components/HomePage/StudentDashboardUI.tsx`

## 1. Objective

Thiết kế lại dashboard học sinh theo hướng **Learning Adventure**: vui tươi, thân thiện với học sinh tiểu học, dễ hiểu và tạo động lực nhưng không biến trang học tập thành một màn hình game gây xao nhãng.

Giai đoạn 1 tập trung vào:

- Làm rõ việc quan trọng nhất học sinh cần làm ngay.
- Đưa bài được giao lên trước các nội dung gamification.
- Giảm độ nặng của gradient, hiệu ứng và trang trí.
- Chuẩn hóa trạng thái dữ liệu, responsive, accessibility và motion.
- Giữ nguyên toàn bộ nghiệp vụ, API và chức năng hiện có.

### Người dùng chính

Học sinh tiểu học sử dụng chuột, cảm ứng hoặc bàn phím trên điện thoại, máy tính bảng và máy tính để bàn.

### Kết quả mong muốn

Khi mở dashboard, học sinh phải nhận ra trong vài giây:

1. Hôm nay em cần làm bài nào.
2. Bài nào đã xong, bài nào còn lại hoặc đã đóng.
3. Tiến độ học tập hiện tại của em.
4. Em có thể luyện thêm môn nào.
5. Phần thưởng và huy hiệu là nội dung hỗ trợ, không lấn át nhiệm vụ học tập.

---

## 2. Scope

### Trong phạm vi Phase 1

- Tái cấu trúc bố cục và thứ bậc thông tin của dashboard học sinh.
- Làm mới visual style theo hướng Playful Kids nhẹ nhàng.
- Chuẩn hóa card, button, heading, icon và khoảng cách.
- Thiết kế loading, empty, error, retry và trạng thái xử lý.
- Hoàn thiện responsive tại 375px, 768px, 1024px và 1440px.
- Hoàn thiện keyboard navigation, focus, semantics và progress accessibility.
- Giảm chuyển động thừa và hỗ trợ `prefers-reduced-motion`.
- Giữ các luồng hiện có: bài được giao, bài tập về nhà, luyện tập, điểm danh, nhiệm vụ ngày/tuần, rương thưởng, nhịp học, huy hiệu, chứng nhận, thi trực tiếp, thông báo, tài khoản và đổi mật khẩu.

### Ngoài phạm vi Phase 1

- Không thay đổi schema dữ liệu.
- Không thêm hoặc sửa API.
- Không thay đổi quy tắc tính xu, EXP, streak, nhiệm vụ, rương hoặc huy hiệu.
- Không thêm Story Mode, bản đồ phiêu lưu, pet evolution, mini-game hoặc PvP.
- Không thay đổi quy trình làm bài, nộp bài hoặc thi trực tiếp.
- Không thêm dependency UI mới nếu chưa được duyệt riêng.
- Không viết lại toàn bộ hệ thống gamification.

---

## 3. Design Direction

### Tên hướng thiết kế

**Learning Adventure — Playful Kids**

### Tính cách giao diện

- Vui tươi nhưng không ồn ào.
- Mềm mại, sáng, thoáng và dễ đọc.
- Bo góc rõ nhưng không phóng đại mọi thành phần.
- Minh họa nhỏ dùng để hỗ trợ nhận biết, không chiếm không gian chính.
- Cảm giác khích lệ, không tạo áp lực hoặc cạnh tranh quá mức.

### Visual principles

- Nền trang sáng và trung tính, ưu tiên slate/blue rất nhạt.
- Card chủ yếu dùng nền trắng, border nhẹ và shadow nhỏ.
- Màu xanh là màu hành động chính.
- Màu pastel chỉ dùng để phân nhóm hoặc biểu thị trạng thái.
- Không dùng gradient đậm trong dashboard chính.
- Gradient nhẹ chỉ được dùng có kiểm soát cho chi tiết phần thưởng hoặc minh họa nhỏ; không dùng làm nền diện tích lớn.
- Không dùng nhiều màu cạnh tranh trong cùng một card.
- Typography phải tạo phân cấp rõ bằng kích thước, weight và khoảng cách, không phụ thuộc màu sắc.

### Typography hierarchy

- Một `h1` trong hero.
- Tiêu đề khu vực là `h2`.
- Tiêu đề card hoặc item là `h3`.
- Nội dung chính ưu tiên 16px trở lên ở mobile khi không bị giới hạn không gian.
- Metadata có thể nhỏ hơn nhưng không dưới mức gây khó đọc.
- Giữ font stack hiện có; Phase 1 không thêm font dependency mới.

---

## 4. Information Architecture

Thứ tự ưu tiên nội dung:

1. **Header và hero định hướng.**
2. **Bài cần làm / bài được giao.**
3. **Tiến độ và nhiệm vụ học tập.**
4. **Thư viện luyện tập.**
5. **Huy hiệu, bộ sưu tập và phần thưởng.**

Gamification phải hỗ trợ hành vi học tập, không được xuất hiện trước bài cần làm trên mobile.

### Desktop structure

```text
Header
Hero
Main grid: 2fr / min 300px 1fr
  Main column
    Bài cần làm
    Bài tập về nhà
    Nhiệm vụ tuần hoặc tiến độ chi tiết
    Thư viện luyện tập
  Side column
    Tiến độ hôm nay
    Rương thưởng
    Nhịp học tuần này
    Huy hiệu / bộ sưu tập
Footer
```

Việc gom hoặc tách “Nhiệm vụ tuần” giữa hai cột được phép trong kế hoạch triển khai, miễn giữ đúng thứ bậc và responsive đã duyệt.

### Mobile structure

```text
Header tối giản
Hero
Bài cần làm
Bài tập về nhà
Tiến độ / nhiệm vụ
Rương thưởng / nhịp học / huy hiệu
Thư viện luyện tập
```

---

## 5. Component Specification

### 5.1 Header

Header giữ đầy đủ chức năng hiện có nhưng giảm mật độ thị giác.

- Logo và tên sản phẩm không lấn át nội dung.
- Thông báo, thành tích, thi trực tiếp và tài khoản vẫn truy cập được.
- Số dư, streak hoặc trạng thái gamification được trình bày gọn, không tạo thành nhiều badge cạnh tranh.
- Dropdown tài khoản mở bằng click và bàn phím; không phụ thuộc hover.
- Mobile ưu tiên logo, thông báo và tài khoản; các mục phụ có thể gom vào menu hiện có.

### 5.2 Hero

Hero là vùng chào và định hướng, không phải banner quảng cáo.

- Có một `h1` chào học sinh.
- Có một câu mô tả ngắn, dễ hiểu.
- Có một CTA chính dẫn tới hành động học tập hiện có có ưu tiên cao nhất.
- Khi còn bài được giao chưa hoàn thành, CTA ưu tiên đưa học sinh tới bài cần làm.
- Khi không còn bài được giao, CTA có thể dẫn tới thư viện luyện tập.
- Điểm danh là hành động phụ, không dùng pulse liên tục.
- Minh họa nhỏ, không chiếm quá nhiều chiều cao.
- Desktop có thể chia hai vùng; mobile xếp dọc và CTA toàn chiều ngang.
- Không dùng nền gradient xanh đậm toàn khối như hiện tại.

### 5.3 Bài cần làm

Đây là khu vực quan trọng nhất sau hero.

Mỗi card phải hiển thị rõ:

- Tên bài.
- Loại hoặc môn học khi dữ liệu hiện có cho phép.
- Thời lượng.
- Số lượt đã làm / số lượt tối đa.
- Deadline hoặc trạng thái đóng khi có dữ liệu.
- Trạng thái bằng cả chữ và icon/màu.
- CTA rõ ràng: `Làm bài ngay`, `Xem kết quả` hoặc `Đã đóng` theo logic hiện có.

Quy tắc:

- Card chưa hoàn thành có độ nổi bật cao nhất.
- Card đã hoàn thành giảm nhấn nhưng vẫn đủ tương phản.
- Card đã đóng không cho tương tác và giải thích rõ trạng thái.
- Không dùng opacity thấp làm tín hiệu duy nhất.
- Mobile: CTA toàn chiều ngang.
- Desktop: CTA có thể nằm bên phải.
- Phân trang hiện có phải được giữ nguyên.

### 5.4 Bài tập về nhà

`StudentHomeworkSection` tiếp tục hoạt động với dữ liệu và modal hiện có.

- Visual style phải đồng nhất với khu vực bài cần làm.
- Không thay đổi luồng chọn bài, xem submission hoặc nộp bài.
- Trạng thái nộp bài, hạn nộp và phản hồi phải dễ quét.
- Error của khu vực này không làm mất các khu vực khác.

### 5.5 Tiến độ hôm nay

Tiến độ hôm nay thay thế cảm giác “accordion lớn chiếm chỗ” bằng summary gọn và thông tin dễ đọc.

Trạng thái thu gọn luôn hiển thị:

- Tổng số nhiệm vụ đã hoàn thành / tổng số nhiệm vụ.
- Chuỗi ngày hiện tại.
- Affordance mở rộng rõ ràng.

Trạng thái mở rộng:

- Hiển thị các nhiệm vụ hiện có.
- Mỗi nhiệm vụ có tiêu đề, mô tả, tiến độ, phần thưởng và trạng thái nhận thưởng.
- CTA nhận thưởng giữ đúng logic hiện có.
- Progress bar có semantics đầy đủ.

Đặc tả này thay thế `docs/specs/2026-07-05-journey-accordion-ux-spec.md` tại các điểm có xung đột về thứ tự ưu tiên. Trên mobile, bài cần làm phải nằm trước phần tiến độ/gamification.

### 5.6 Nhiệm vụ tuần

- Có tiêu đề, thời điểm reset và danh sách nhiệm vụ.
- Card nhiệm vụ dùng phân cấp nhẹ, không dùng gradient đậm.
- Hiển thị tiến độ bằng số và thanh tiến độ.
- Trạng thái `Đang làm`, `Sẵn sàng nhận`, `Đã nhận` đi kèm chữ.
- Nút nhận thưởng có đủ trạng thái processing, completed và disabled.

### 5.7 Rương thưởng

- Là card hỗ trợ, không lớn hơn khu vực bài cần làm.
- Nội dung giải thích rõ điều kiện mở rương.
- Trạng thái: chưa đủ điều kiện, sẵn sàng, đang xử lý, đã mở.
- Không dùng animation lặp liên tục.
- Phần thưởng có thể dùng màu ấm hoặc minh họa nhỏ nhưng không phá vỡ hệ màu chung.

### 5.8 Nhịp học tuần này

- Hiển thị số ngày đã hoàn thành / mục tiêu.
- Có thanh tiến độ và mô tả ngắn.
- Không dùng ngôn ngữ gây áp lực khi học sinh chưa đạt mục tiêu.
- CTA Gift Shop chỉ hiển thị khi feature flag hiện có bật.

### 5.9 Sổ huy hiệu và bộ sưu tập

- Hiển thị tối đa một nhóm nhỏ trên dashboard.
- `Xem tất cả` mở gallery hiện có.
- Huy hiệu chưa có dùng empty state hướng dẫn hành động đầu tiên.
- Bộ sưu tập, vé gợi ý và khiên chuỗi giữ dữ liệu hiện có.
- Huy hiệu/phần thưởng không được đặt trước bài cần làm trên mobile.

### 5.10 Thư viện luyện tập

- Card môn học là hành động thực sự: dùng `button` hoặc `a` phù hợp.
- Không dùng `div` click được.
- Mỗi card có icon, tên môn, mô tả và số bài khi có dữ liệu.
- Không dùng nền gradient đậm toàn card.
- Màu pastel hoặc accent nhỏ giúp phân biệt môn.
- Mobile một cột; tablet hai cột; desktop ba đến bốn cột.
- Empty state giải thích rõ khi không có môn luyện tập.

### 5.11 Modals và secondary flows

Các modal điểm danh, đổi mật khẩu, phần thưởng, avatar, badge, bài tập về nhà và thi trực tiếp phải tiếp tục hoạt động.

- Không thay đổi nghiệp vụ.
- Có focus management hợp lý.
- Có thể đóng bằng nút rõ ràng và bàn phím khi phù hợp.
- Mobile không bắt buộc mọi modal chiếm toàn màn hình nếu nội dung ngắn; lựa chọn cụ thể được chốt ở kế hoạch triển khai.

---

## 6. Data States and Usage Experience

### Loading

Thay spinner rời rạc bằng skeleton đúng hình dạng nội dung:

- Hero có skeleton tiêu đề và CTA.
- Danh sách bài tập có 2–3 card giả.
- Tiến độ và nhiệm vụ có thanh skeleton.
- Không làm toàn trang nhấp nháy khi chỉ một khu vực đang tải lại.
- Khi đã có dữ liệu cũ, giữ dữ liệu đó trong lúc refresh nếu store hiện tại hỗ trợ.

### Empty state

Mỗi khu vực có thông điệp riêng:

- Không có bài được giao: **“Em đã hoàn thành tất cả nhiệm vụ hiện tại.”**
- Chưa có nhiệm vụ tuần: **“Nhiệm vụ mới sẽ sớm xuất hiện.”**
- Chưa có huy hiệu: hướng dẫn hành động đầu tiên để mở huy hiệu.
- Không có môn luyện tập: giải thích rõ thay vì để khoảng trống.

Empty state dùng minh họa nhỏ, không chiếm quá nhiều chiều cao.

### Error and retry

- Lỗi tải dữ liệu hiển thị trong chính khu vực bị lỗi.
- Có nút `Thử lại` khi có action tải lại tương ứng.
- Không làm biến mất các khu vực vẫn có dữ liệu.
- Thông báo lỗi viết dễ hiểu với học sinh, không hiển thị mã kỹ thuật hoặc raw exception.
- Lỗi một store không được biến thành full-page error nếu các store khác vẫn dùng được.

### Button states

Mọi nút phải thể hiện rõ:

- Mặc định.
- Hover.
- Focus.
- Đang xử lý.
- Đã hoàn thành.
- Vô hiệu hóa.

Nút vô hiệu hóa vẫn đủ tương phản, không chỉ dùng opacity để biểu thị trạng thái.

---

## 7. Accessibility

- Tất cả card có hành động dùng `button` hoặc `a`, không dùng `div role="button"` trừ trường hợp đặc biệt có lý do được ghi lại.
- Focus ring xanh rõ ràng khi dùng bàn phím.
- Vùng bấm tối thiểu 44 × 44px.
- Icon trang trí dùng `aria-hidden="true"`.
- Icon mang ý nghĩa có nhãn hỗ trợ hoặc text tương ứng.
- Progress bar có `role="progressbar"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow` và tên truy cập được.
- Dropdown tài khoản mở được bằng click và bàn phím, không phụ thuộc hover.
- Trạng thái màu luôn đi kèm chữ hoặc icon.
- Một `h1` trong hero, các khu vực dùng `h2`, card dùng `h3`.
- Không tạo keyboard trap trong modal.
- Thứ tự tab phải bám theo thứ tự hiển thị.
- Nội dung cập nhật sau retry hoặc nhận thưởng phải có phản hồi truy cập được theo pattern toast/live-region hiện có.
- Contrast phải đạt mức sử dụng thực tế cho text, button và trạng thái disabled; không dùng pastel nhạt cho text chính.

---

## 8. Motion

Chỉ sử dụng chuyển động để phản hồi thao tác:

- Hover card: nâng tối đa 3px.
- Icon: scale tối đa 1.04.
- Mở rộng nhiệm vụ: opacity và translate nhẹ.
- Modal: fade và scale rất nhỏ.
- Thời lượng 180–240ms.
- Không dùng pulse liên tục cho nút thi trực tiếp hoặc điểm danh.
- Không animate `width`; thanh tiến độ dùng `scaleX` với `transform-origin: left` hoặc cập nhật không transition.
- Không stagger animation theo danh sách dài làm chậm khả năng đọc.
- Tắt hoặc tối giản chuyển động khi có `prefers-reduced-motion: reduce`.

---

## 9. Responsive Requirements

### Mobile — 375px

- Header tối giản.
- Hero xếp dọc, CTA toàn chiều ngang.
- Bài cần làm hiển thị trước mọi gamification.
- Tất cả panel một cột.
- Không có nội dung chỉ xuất hiện khi hover.
- Không có horizontal overflow.
- Button chính và button trong card ưu tiên full width khi cần.
- Text, badge và metadata được wrap; không ép card rộng hơn viewport.

### Tablet — 768px

- Hero chia hai vùng khi đủ không gian.
- Nhiệm vụ và rương thưởng có thể đặt cạnh nhau.
- Thư viện môn học hai cột.
- Header vẫn giữ vùng bấm tối thiểu 44px.

### Desktop — 1024px và 1440px

- Grid chính: `minmax(0, 2fr) minmax(300px, 1fr)`.
- Bài được giao nằm ở cột chính.
- Tiến độ, rương và nhịp học nằm ở cột phụ.
- Thư viện môn học ba đến bốn cột.
- Không vượt quá chiều rộng nội dung 1280px.
- Hai cột không được tạo overflow do child thiếu `min-width: 0`.

---

## 10. Technical Context

### Existing stack

- React.
- TypeScript.
- Vite.
- Tailwind utility classes trong component hiện tại.
- Framer Motion đang được sử dụng.
- Lucide React và Fluent Emoji assets.
- Zustand stores cho classroom, assignment, homework, gamification và game loop.

### Existing integration points to preserve

- `useClassroomStore()`.
- `useAssignmentStore()`.
- `useHomeworkStore()`.
- `useGamificationStore()`.
- `useGameLoopStore()`.
- `StudentHomeworkSection`.
- `SubjectLibrary`.
- `StudentAchievementsPage`.
- `BadgeGallery`.
- `NotificationBell`.
- `CurrentAnnouncementBanner`.
- Live exam components and status hook.
- Attendance, reward, avatar and password flows.

### Expected implementation structure

Kế hoạch triển khai nên ưu tiên tách `StudentDashboardUI.tsx` thành các component trình bày nhỏ mà không thay đổi ownership dữ liệu ngay trong Phase 1.

Các vùng có thể tách:

```text
src/components/HomePage/student-dashboard/
  StudentDashboardHeader.tsx
  StudentDashboardHero.tsx
  AssignedWorkSection.tsx
  AssignedWorkCard.tsx
  TodayProgressCard.tsx
  WeeklyMissionsCard.tsx
  RewardChestCard.tsx
  WeeklyRhythmCard.tsx
  AchievementSummaryCard.tsx
  SubjectPracticeGrid.tsx
  DashboardSkeletons.tsx
  DashboardEmptyState.tsx
  DashboardSectionError.tsx
```

Tên và số file cuối cùng được chốt trong implementation plan. Không tách store hoặc API chỉ để phục vụ thay đổi giao diện.

---

## 11. Commands

```bash
# Cài dependency sạch
npm ci

# Chạy ứng dụng
npm run dev

# Unit/integration tests
npm run test:run

# Production build
npm run build

# Visual regression capture/check khi triển khai UI
npm run test:visual:capture
npm run test:visual:check
```

Repository hiện không có script lint/typecheck độc lập được khai báo ở root; TypeScript và bundling được xác nhận qua test/build theo cấu hình hiện tại.

---

## 12. Testing Strategy

### Automated

- Unit tests cho logic hiển thị trạng thái card nếu được tách thành helper.
- Component tests cho:
  - loading skeleton;
  - empty state;
  - khu vực lỗi và retry;
  - trạng thái button;
  - thứ tự heading;
  - semantics của progress bar;
  - assigned work đặt trước gamification trên mobile DOM order;
  - account dropdown keyboard behavior.
- Giữ toàn bộ test hiện có xanh.
- Production build phải thành công.

### Visual and responsive

Kiểm tra tối thiểu tại:

- 375 × 812.
- 768 × 1024.
- 1024 × 768.
- 1440 × 900.

Tại mỗi viewport kiểm tra:

- Không horizontal overflow.
- Không text hoặc button bị cắt.
- Card order đúng.
- CTA đủ lớn.
- Hero không chiếm quá nhiều chiều cao.
- Sidebar/main grid không tràn.

### Accessibility and interaction

- Duyệt toàn trang bằng bàn phím.
- Kiểm tra focus ring.
- Kiểm tra menu tài khoản.
- Kiểm tra modal open/close và focus.
- Kiểm tra progress semantics bằng accessibility tree.
- Kiểm tra `prefers-reduced-motion`.
- Kiểm tra chuột, cảm ứng và bàn phím.

### Visual quality gate

- `Impeccable detect = 0` cho phạm vi dashboard học sinh.
- Không còn gradient đậm trong dashboard chính.
- Không có animation liên tục gây mất tập trung.
- Typography có phân cấp rõ ràng.

---

## 13. Boundaries

### Always do

- Giữ nguyên dữ liệu và nghiệp vụ hiện có.
- Bảo toàn mọi action đang hoạt động.
- Chạy test và build trước khi commit triển khai.
- Kiểm tra desktop, tablet và mobile.
- Dùng semantic HTML trước ARIA custom.
- Hiển thị lỗi theo từng khu vực.
- Có fallback khi asset minh họa không tải được.

### Ask first

- Thêm dependency mới.
- Thay đổi store ownership hoặc data-fetching architecture.
- Thêm feature flag mới.
- Sửa API, Worker, D1 hoặc schema.
- Thay đổi quy tắc chọn CTA chính nếu cần logic nghiệp vụ mới.
- Xóa hoặc ẩn một chức năng hiện có.

### Never do

- Thay đổi API hoặc nghiệp vụ trong Phase 1.
- Bỏ chức năng chỉ để đơn giản hóa layout.
- Dùng `div` click được cho card hành động.
- Dùng màu làm tín hiệu trạng thái duy nhất.
- Dùng animation lặp liên tục.
- Hiển thị raw technical error cho học sinh.
- Làm toàn trang loading khi chỉ một khu vực refresh.
- Đặt gamification trước bài cần làm trên mobile.
- Commit các thay đổi không liên quan từ workspace chính.

---

## 14. Acceptance Criteria — Phase 1

Phase 1 được coi là đạt khi tất cả điều kiện sau đúng:

- [ ] Không thay đổi nghiệp vụ hoặc API.
- [ ] Không mất chức năng hiện có.
- [ ] Bài cần làm là nội dung ưu tiên sau hero và đứng trước gamification trên mobile.
- [ ] Không có horizontal overflow tại 375px, 768px, 1024px và 1440px.
- [ ] `Impeccable detect = 0` trong phạm vi dashboard học sinh.
- [ ] Typography có phân cấp rõ ràng.
- [ ] Không còn gradient đậm trong dashboard chính.
- [ ] Không có animation liên tục gây mất tập trung.
- [ ] Loading dùng skeleton theo khu vực.
- [ ] Empty state có thông điệp riêng cho từng khu vực.
- [ ] Error hiển thị cục bộ và có retry khi khả dụng.
- [ ] Button có đủ default, hover, focus, processing, completed và disabled.
- [ ] Tất cả hành động hoạt động bằng chuột, cảm ứng và bàn phím.
- [ ] Focus ring rõ ràng và vùng bấm tối thiểu 44 × 44px.
- [ ] Progress bar có semantics truy cập đầy đủ.
- [ ] `prefers-reduced-motion: reduce` được hỗ trợ.
- [ ] Toàn bộ test hiện có đạt.
- [ ] Production build thành công.

---

## 15. Approved Decisions

1. Hướng thiết kế: **Learning Adventure — Playful Kids**.
2. Giai đoạn 1 là thay đổi UI/UX, không thay đổi API hoặc nghiệp vụ.
3. Bài được giao phải được ưu tiên trước gamification, đặc biệt trên mobile.
4. Dashboard dùng pastel nhẹ, khoảng trắng thoáng, card bo tròn và chuyển động nhẹ.
5. Loading dùng skeleton theo hình dạng nội dung.
6. Empty/error/retry được xử lý theo từng khu vực.
7. Accessibility, responsive và reduced motion là tiêu chí bắt buộc, không phải phần cải tiến tùy chọn.
8. Không dùng gradient đậm hoặc pulse liên tục trong dashboard chính.
9. Chiều rộng nội dung tối đa 1280px.
10. Sau tài liệu này, bước tiếp theo là viết implementation plan và task breakdown để duyệt trước khi sửa mã giao diện.

## 16. Open Questions

Không có câu hỏi chặn việc lập kế hoạch triển khai. Các quyết định kỹ thuật chi tiết như ranh giới component, thứ tự tách file và phạm vi visual regression sẽ được trình bày trong implementation plan, nhưng không được làm thay đổi các yêu cầu đã duyệt trong đặc tả này.
