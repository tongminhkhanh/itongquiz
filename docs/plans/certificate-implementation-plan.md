# Kế hoạch Triển khai Tính năng Certificate - iTongQuiz

**Ngày tạo:** 14/07/2026  
**Tổng effort ước tính:** 95 - 110 giờ  
**Thời gian gợi ý:** Từ 15/07/2026

---

## Tóm tắt

Kế hoạch này tổng hợp toàn bộ các trao đổi về tính năng **Certificate** (tạo, gửi, quản lý và xác thực giấy chứng nhận) cho dự án iTongQuiz.

---

## Epic 1: Backend Certificate (Core)

| Task ID | Task | Assignee | Effort | Deadline | Status |
|---------|------|----------|--------|----------|--------|
| 1.1 | Hoàn thiện `certificateRenderer.ts` (Font tùy chỉnh + QR composite) | Backend Dev | 8-10h | 18/07 | In Progress |
| 1.2 | Tối ưu `certificateBatchProcessor.ts` | Backend Dev | 4h | 16/07 | Done |
| 1.3 | Viết đầy đủ API routes (`certificates.ts`) | Backend Dev | 6-8h | 17/07 | In Progress |
| 1.4 | Tích hợp Cloudflare Queues cho batch lớn | Backend Dev | 6h | 22/07 | To Do |
| 1.5 | Viết Migration SQL cho các bảng Certificate | Backend Dev | 3h | 16/07 | To Do |

---

## Epic 2: Teacher Dashboard

| Task ID | Task | Assignee | Effort | Deadline | Status |
|---------|------|----------|--------|----------|--------|
| 2.1 | Xây dựng `CreateCertificatePage.tsx` (Multi-step) | Frontend Dev | 10-12h | 20/07 | In Progress |
| 2.2 | Xây dựng `CertificateListPage.tsx` | Frontend Dev | 4h | 16/07 | Done |
| 2.3 | Xây dựng `CertificateBatchDetailPage.tsx` | Frontend Dev | 5h | 17/07 | Done |
| 2.4 | Xây dựng `TemplateManagementPage.tsx` + Upload | Frontend Dev | 6h | 19/07 | In Progress |
| 2.5 | Hoàn thiện `useCertificates` hook | Fullstack | 4h | 18/07 | In Progress |

---

## Epic 3: Student Dashboard

| Task ID | Task | Assignee | Effort | Deadline | Status |
|---------|------|----------|--------|----------|--------|
| 3.1 | Xây dựng `MyCertificatesPage.tsx` | Frontend Dev | 5h | 17/07 | Done |
| 3.2 | Thêm tính năng xem chi tiết + Tải chứng nhận | Frontend Dev | 4h | 19/07 | To Do |
| 3.3 | Tích hợp thông báo khi có chứng nhận mới | Fullstack | 3h | 20/07 | To Do |

---

## Epic 4: Notification Realtime

| Task ID | Task | Assignee | Effort | Deadline | Status |
|---------|------|----------|--------|----------|--------|
| 4.1 | Thiết kế bảng `notifications` | Backend Dev | 2h | 15/07 | Done |
| 4.2 | Viết API Notification | Backend Dev | 4h | 16/07 | Done |
| 4.3 | Xây dựng **Durable Object** cho Realtime | Backend Dev | 8h | 19/07 | In Progress |
| 4.4 | Viết React Hook `useRealtimeNotifications` | Frontend Dev | 4h | 18/07 | Done |
| 4.5 | Tích hợp gửi notification vào flow tạo batch | Fullstack | 4h | 20/07 | To Do |

---

## Epic 5: QR Code + Public Verification

| Task ID | Task | Assignee | Effort | Deadline | Status |
|---------|------|----------|--------|----------|--------|
| 5.1 | Tích hợp QR Code vào `certificateRenderer` | Backend Dev | 6h | 18/07 | In Progress |
| 5.2 | Xây dựng trang xác thực công khai | Frontend Dev | 5h | 19/07 | In Progress |
| 5.3 | API `/api/verify-certificate/:id` | Backend Dev | 3h | 17/07 | Done |

---

## Epic 6: Upload & Quản lý Template

| Task ID | Task | Assignee | Effort | Deadline | Status |
|---------|------|----------|--------|----------|--------|
| 6.1 | API Upload Template | Backend Dev | 4h | 17/07 | Done |
| 6.2 | Trang quản lý Template cho giáo viên | Frontend Dev | 6h | 20/07 | In Progress |

---

## Epic 7: Admin Dashboard

| Task ID | Task | Assignee | Effort | Deadline | Status |
|---------|------|----------|--------|----------|--------|
| 7.1 | Xây dựng `AdminCertificateDashboard.tsx` | Frontend Dev | 8h | 21/07 | In Progress |
| 7.2 | Thêm Filter + Biểu đồ thống kê | Frontend Dev | 6h | 23/07 | To Do |

---

## Epic 8: Testing, Migration & Documentation

| Task ID | Task | Assignee | Effort | Deadline | Status |
|---------|------|----------|--------|----------|--------|
| 8.1 | Viết Unit Test + Integration Test | Fullstack | 8-10h | 25/07 | To Do |
| 8.2 | Viết Migration SQL đầy đủ | Backend Dev | 4h | 16/07 | To Do |
| 8.3 | Viết tài liệu kỹ thuật (API Spec + Flow) | Fullstack | 4h | 24/07 | To Do |