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

- [ ] Task 1: Tạo presentation types và pure UI helpers.
- [ ] Task 2: Tạo skeleton, empty state và section error primitives.
- [ ] Task 3: Tách header và account menu có keyboard support.
- [ ] Task 4: Tạo hero nhẹ và khu vực bài được giao ưu tiên.

### Checkpoint A

- [ ] Full test suite đạt.
- [ ] Assigned work nằm ngay sau hero trong DOM.
- [ ] Không thay đổi API/store contract.
- [ ] Review 375px và 1440px.

### Phase 2: Progress, Rewards, and Practice

- [ ] Task 5: Tách tiến độ ngày và nhiệm vụ tuần.
- [ ] Task 6: Tách reward sidebar và chỉnh accessibility cho BadgeGallery.
- [ ] Task 7: Tạo semantic practice grid và sửa semantics homework cards.

### Checkpoint B

- [ ] Main column và sidebar đúng kiến trúc.
- [ ] Mobile đặt bài học trước gamification.
- [ ] Mọi secondary flow hiện có vẫn hoạt động.

### Phase 3: Composition and Verification

- [ ] Task 8: Compose responsive shell, reduced motion và modal accessibility.
- [ ] Task 9: Thêm Cypress responsive regression và chạy final quality gate.

### Checkpoint C

- [ ] `npm run test:run` đạt.
- [ ] `npm run build` đạt.
- [ ] Cypress đạt tại 375/768/1024/1440.
- [ ] Không horizontal overflow.
- [ ] Keyboard, touch, mouse hoạt động.
- [ ] Reduced motion hoạt động.
- [ ] Impeccable detect = 0.
- [ ] GitNexus không phát hiện thay đổi API/Worker/nghiệp vụ.

## Detailed Plan

Xem: `docs/superpowers/plans/2026-07-18-learning-adventure-dashboard.md`.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Dashboard monolith lớn | High | Tách JSX nhỏ, không chuyển orchestration. |
| Regression assignment/live exam | High | Integration tests và giữ nguyên early returns/handlers. |
| UI loading độc lập gây nhấp nháy | Medium | Section skeleton và local errors. |
| Auth Cypress thiếu dữ liệu | Medium | Dùng env test credentials hoặc browser evidence có ghi nhận blocker. |
