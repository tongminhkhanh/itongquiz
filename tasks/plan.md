# Implementation Plan: Learning Adventure Student Dashboard Phase 1

## Overview

Tái cấu trúc dashboard học sinh thành giao diện Learning Adventure, giữ nguyên API và nghiệp vụ. `StudentDashboardUI.tsx` tiếp tục quản lý store, fetch, handler, live exam và modal; các phần JSX được tách thành presentation components có type rõ ràng và kiểm thử độc lập.

## Architecture Decisions

- Giữ orchestration trong `StudentDashboardUI.tsx`; chỉ tách presentation trong Phase 1.
- Bố cục mobile-first; bài được giao đứng trước gamification trong DOM.
- Khi không còn bài sẵn sàng, CTA hero chỉ cuộn tới thư viện luyện tập, không tự chọn môn.
- Desktop dùng `minmax(0, 2fr) minmax(300px, 1fr)`, max width 1280px.
- Dùng skeleton/error/empty state theo từng section.
- Dùng native button/a, focus rõ, target 44px và progressbar semantics.
- Dùng TDD và commit theo từng lát dọc.
- Không thêm dependency, API, Worker route, schema hoặc store contract.

## Task List

### Phase 1: Foundation and Learning Priority

- [x] Task 1: Tạo presentation types và pure UI helpers.
- [x] Task 2: Tạo skeleton, empty state và section error primitives.
- [x] Task 3: Tách header và account menu có keyboard support.
- [x] Task 4: Tạo hero nhẹ và khu vực bài được giao ưu tiên.

### Checkpoint A

- [x] Full test suite đạt.
- [x] Assigned work nằm ngay sau hero trong DOM.
- [x] Không thay đổi API/store contract.
- [ ] Review 375px và 1440px — chuyển sang authenticated Cypress ở Task 9; hiện bị chặn bởi thiếu credential.

### Phase 2: Progress, Rewards, and Practice

- [x] Task 5: Tách tiến độ ngày và nhiệm vụ tuần.
- [x] Task 6: Tách reward sidebar và chỉnh accessibility cho BadgeGallery.
- [x] Task 7: Tạo semantic practice grid và sửa semantics homework cards.

### Checkpoint B

- [x] Main column và sidebar đúng kiến trúc.
- [x] Mobile đặt bài học trước gamification.
- [x] Mọi secondary flow hiện có vẫn được giữ trong container và integration tests.

### Phase 3: Composition and Verification

- [x] Task 8: Compose responsive shell, reduced motion và modal accessibility.
- [ ] Task 9: Cypress spec đã thêm; authenticated viewport run và Impeccable gate đang bị chặn.

### Checkpoint C

- [x] Final `npm run test:run` đạt: 67 files, 371/371 tests.
- [x] Frontend production bundle đạt bằng `npx vite build`; root `npm run build` còn yêu cầu biến sitemap deployment.
- [ ] Cypress đạt tại 375/768/1024/1440 — thiếu `studentUsername` và `studentPassword`.
- [ ] Không horizontal overflow — Cypress assertion đã có nhưng chưa chạy authenticated.
- [ ] Keyboard, touch, mouse hoạt động — component keyboard tests đạt; browser flow chưa chạy authenticated.
- [ ] Reduced motion hoạt động — scoped CSS/component tests đạt; browser emulation chưa chạy authenticated.
- [ ] Impeccable detect = 0 — tool không có trong môi trường hiện tại.
- [x] GitNexus compare `main` đánh giá low risk, không có affected execution flow hoặc thay đổi API/Worker/nghiệp vụ.

## Detailed Plan

Xem: `docs/superpowers/plans/2026-07-18-learning-adventure-dashboard.md`.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Dashboard monolith lớn | High | Tách JSX nhỏ, không chuyển orchestration. |
| Regression assignment/live exam | High | Integration tests và giữ nguyên early returns/handlers. |
| UI loading độc lập gây nhấp nháy | Medium | Section skeleton và local errors. |
| Auth Cypress thiếu dữ liệu | Medium | Spec dùng `cy.env(['studentUsername', 'studentPassword'])`; lần chạy 2026-07-18 bị chặn vì cả hai giá trị vắng mặt. |
