# Announcement Composer Layout Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Ngăn khối **Nội dung** trong màn hình quản trị thông báo bị co về gần 0 px khi trang nằm trong Teacher Dashboard có sidebar và viewport desktop lớn.

**Architecture:** Giữ nguyên state, API và nghiệp vụ hiện tại. Thay layout ba cột lồng nhau bằng layout hai cột an toàn: khối Nội dung ở cột chính; Phân phối và Xem trước nằm trong một right rail xếp dọc. Đồng thời mở rộng vùng chứa tab thông báo để tận dụng chiều rộng còn lại của dashboard. Bổ sung kiểm thử hồi quy cấu trúc để lớp grid ba cột gây lỗi không quay trở lại.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest, Testing Library, Vite.

## Global Constraints

- Không thay đổi contract API thông báo hoặc payload phát hành.
- Không thay đổi hành vi lưu nháp, gửi thử, công bố, hủy lịch hoặc lưu trữ.
- Không thêm dependency mới.
- Giữ đầy đủ nhãn form và khả năng truy cập bàn phím hiện tại.
- Chỉ sửa các file thuộc màn hình quản trị thông báo và kiểm thử trực tiếp liên quan.

---

### Task 1: Add a failing layout regression test

**Files:**
- Modify: `tests/AnnouncementComposer.test.tsx`

**Interfaces:**
- Consumes: `AnnouncementComposer` từ `src/features/notifications/admin/AnnouncementComposer.tsx`.
- Produces: kiểm thử xác nhận layout không còn grid ba cột có minimum width 260 px + 300 px và có right rail riêng cho Phân phối/Xem trước.

- [x] **Step 1: Write the failing test**

Thêm vào `describe('AnnouncementComposer', ...)`:

```tsx
it('keeps the content editor in a flexible main column instead of a collapsing three-column grid', () => {
  render(<AnnouncementComposer />);

  const layout = screen.getByTestId('announcement-composer-layout');
  const main = screen.getByTestId('announcement-content-panel');
  const rail = screen.getByTestId('announcement-composer-rail');

  expect(layout).toContainElement(main);
  expect(layout).toContainElement(rail);
  expect(layout.className).not.toContain(
    'xl:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.9fr)_minmax(300px,1fr)]',
  );
  expect(layout.className).toContain(
    'xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]',
  );
});
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test:run -- tests/AnnouncementComposer.test.tsx
```

Expected: FAIL vì các `data-testid` mới chưa tồn tại.

---

### Task 2: Replace the collapsing nested grid

**Files:**
- Modify: `src/features/notifications/admin/AnnouncementComposer.tsx:115-211`

**Interfaces:**
- Consumes: `AnnouncementDistributionFields`, `AnnouncementPreview`, state `draft`, `errors`, `surface`, `device` hiện tại.
- Produces: DOM gồm một content panel linh hoạt và một right rail có minimum width 320 px ở breakpoint `xl`.

- [x] **Step 1: Implement the minimal safe layout**

Thay grid ba cột bằng:

```tsx
<div
  data-testid="announcement-composer-layout"
  className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]"
>
  <section
    data-testid="announcement-content-panel"
    className="min-w-0 space-y-4 rounded-2xl border bg-white p-5"
  >
    {/* giữ nguyên toàn bộ trường Nội dung */}
  </section>

  <div data-testid="announcement-composer-rail" className="min-w-0 space-y-5">
    <div className="rounded-2xl border bg-white p-5">
      <AnnouncementDistributionFields
        draft={draft}
        errors={errors}
        onChange={updateDraft}
      />
    </div>

    <section className="space-y-4 rounded-2xl border bg-slate-50 p-5 xl:sticky xl:top-20">
      {/* giữ nguyên controls và AnnouncementPreview */}
    </section>
  </div>
</div>
```

Không thay đổi các trường input hoặc callback.

- [x] **Step 2: Run the target test**

Run:

```bash
npm run test:run -- tests/AnnouncementComposer.test.tsx
```

Expected: PASS, 4 tests.

---

### Task 3: Give the announcement page the dashboard width it needs

**Files:**
- Modify: `src/components/TeacherDashboard/teacher-dashboard-shell/TeacherDashboardFeatureTabs.tsx:25-27`
- Modify: `tests/TeacherDashboardShell.test.tsx` only if an existing assertion requires updating; otherwise leave unchanged.

**Interfaces:**
- Consumes: `AnnouncementSettings` lazy tab.
- Produces: full-width bounded container aligned with the dashboard content area.

- [x] **Step 1: Expand only the announcement tab container**

Replace:

```tsx
<div className="max-w-4xl mx-auto"><AnnouncementSettings /></div>
```

with:

```tsx
<div className="mx-auto w-full max-w-[1440px]"><AnnouncementSettings /></div>
```

- [x] **Step 2: Run dashboard shell and composer tests**

Run:

```bash
npm run test:run -- tests/AnnouncementComposer.test.tsx tests/TeacherDashboardShell.test.tsx
```

Expected: PASS.

---

### Task 4: Verify production readiness of the fix

**Files:**
- Create: `cypress/component/announcement-composer-layout.cy.tsx`
- Review: all modified files.

**Interfaces:**
- Consumes: complete diff and production Tailwind styles through Cypress component testing.
- Produces: evidence that the editor remains visible at a 596 px desktop content column, stacks safely on mobile, compiles, and does not introduce adjacent regressions.

- [x] **Step 1: Run changed tests**

```bash
npm run test:run -- tests/AnnouncementComposer.test.tsx tests/TeacherDashboardShell.test.tsx
```

Expected: PASS.

- [x] **Step 2: Run real-browser responsive checks**

```bash
npx cypress run --component --spec cypress/component/announcement-composer-layout.cy.tsx --browser electron
```

Expected: 2 tests PASS at desktop and mobile viewports.

- [x] **Step 3: Run the production build**

```bash
npm run build
```

Expected: exit code 0.

- [x] **Step 4: Review the diff**

Confirm:

- API payload code in `AnnouncementSettings.tsx` is unchanged.
- No input, label, action button, validation or preview channel was removed.
- Legacy three-column class is absent.
- Content panel has `min-w-0`; right rail has `min-w-0`.
- Only the announcement tab width was expanded.

- [x] **Step 5: Leave changes on the isolated branch for review**

Branch: `codex/fix-announcement-composer-layout`.
