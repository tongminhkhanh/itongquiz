# Class Result Report Delivery — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Follow strict RED → GREEN → REFACTOR and commit after each completed task.

**Goal:** Cho phép giáo viên chọn đúng một lớp và một bài kiểm tra, kiểm tra một kết quả đại diện cho mỗi học sinh, rồi gửi phiếu vào tài khoản học sinh và tạo link phụ huynh riêng có theo dõi trạng thái.

**Architecture:** Thêm contract dùng chung và một route family `/api/result-reports` độc lập nhưng tái sử dụng các bảng phiếu, public link và notifications hiện có. Worker là nguồn sự thật cho roster, quyền lớp, kết quả đại diện và dữ liệu điểm; frontend chỉ gửi lựa chọn, nội dung nhận xét và tùy chọn delivery. Wizard mới thay batch panel cũ trong trang Kết quả học tập, còn modal phiếu từng dòng giữ nguyên.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, Vitest/Testing Library, Cloudflare Workers, D1, existing `callApi` registry.

---

## Task 1: Contract và bộ chọn lần làm thuần

**Files:**
- Create: `shared/result-reports.contract.ts`
- Create: `workers/src/routes/resultReports/attemptSelection.ts`
- Create: `tests/resultReportAttemptSelection.test.ts`

**Step 1: Write the failing tests**

Test các trường hợp:
- `latest` chọn `submittedAt` mới nhất.
- `highest` chọn điểm cao nhất và dùng lần mới nhất khi hòa điểm.
- `first` chọn lần sớm nhất.
- Một học sinh chỉ có một result đại diện.
- Hai học sinh trong roster trùng tên chuẩn hóa được đánh dấu `unresolved`, không tự gán result.
- Học sinh chưa có result được trả trong nhóm `notCompleted`.

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- tests/resultReportAttemptSelection.test.ts`

Expected: FAIL vì contract và selector chưa tồn tại.

**Step 3: Write minimal implementation**

Contract phải định nghĩa:
- `ResultReportAttemptPolicy`.
- Cohort request/response.
- Delivery request, batch detail, item status.
- Student report summary/detail.
- Error envelope `{ error: { code, message } }` và success envelope `{ data }`.

Selector nhận roster + result rows, chuẩn hóa tên theo locale Việt Nam, phát hiện duplicate roster names, tính `attemptCount` và chọn representative result theo policy.

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- tests/resultReportAttemptSelection.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add shared/result-reports.contract.ts workers/src/routes/resultReports/attemptSelection.ts tests/resultReportAttemptSelection.test.ts
git commit -m "feat(results): define result report delivery contract"
```

## Task 2: Migration D1 và schema tracking delivery

**Files:**
- Create: `workers/migrations/0032_add_result_report_delivery.sql`
- Create: `workers/rollbacks/0032_drop_result_report_delivery.sql`
- Modify: `workers/schema.sql`
- Modify: `workers/scripts/audit_d1_migration_state.sql`
- Modify: `tests/d1MigrationLayout.test.ts`
- Create: `tests/resultReportMigration.test.ts`

**Step 1: Write the failing tests**

Test file migration chứa:
- Các cột mới trên `phieu_batch`: `request_id`, `quiz_id`, `attempt_policy`, `notify_students`, `create_parent_links`, `delivery_status`, `updated_at`.
- Unique partial index theo `(teacher_id, request_id)`.
- Bảng `result_report_delivery_items` với unique `(batch_id, result_id)` và index theo batch/student/notification/link.
- Rollback xóa index/bảng mới; cột ALTER vẫn được giữ và nullable để rollback an toàn.
- Latest migration expectation là `0032`.

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- tests/resultReportMigration.test.ts tests/d1MigrationLayout.test.ts`

Expected: FAIL.

**Step 3: Write minimal migration/schema implementation**

Giữ tương thích toàn bộ batch homework cũ bằng cột nullable/default. Không thay bootstrap migration registry.

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- tests/resultReportMigration.test.ts tests/d1MigrationLayout.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add workers/migrations/0032_add_result_report_delivery.sql workers/rollbacks/0032_drop_result_report_delivery.sql workers/schema.sql workers/scripts/audit_d1_migration_state.sql tests/resultReportMigration.test.ts tests/d1MigrationLayout.test.ts
git commit -m "feat(results): add result report delivery schema"
```

## Task 3: Cohort API có quyền và server-authoritative

**Files:**
- Create: `workers/src/routes/resultReports/responses.ts`
- Create: `workers/src/routes/resultReports/request.ts`
- Create: `workers/src/routes/resultReports/cohortRepository.ts`
- Create: `workers/src/routes/resultReports/cohortHandler.ts`
- Create: `workers/src/routes/resultReports/types.ts`
- Create: `workers/src/routes/resultReports/route.ts`
- Create: `workers/src/routes/resultReports/index.ts`
- Modify: `workers/src/index.ts`
- Create: `tests/resultReportCohort.worker.test.ts`

**Step 1: Write the failing tests**

Test `POST /api/result-reports/cohort`:
- Bắt buộc JWT teacher/admin.
- Reject malformed `classId`, `quizId`, policy ngoài enum.
- Reject lớp không thuộc giáo viên.
- Reject quiz ngoài quyền hoặc không được giao cho lớp.
- Load roster từ `students` và results từ `results`, không tin danh sách frontend.
- Exclude archived students và result STARTED.
- Return đúng ready/notCompleted/unresolved và summary cho latest/highest/first.

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- tests/resultReportCohort.worker.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Route dùng `verifyJWTMiddleware`, `requireTeacherForClass` hoặc ownership query tương đương. Query quiz access theo pattern certificate batch. Response dùng shared contract.

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- tests/resultReportCohort.worker.test.ts tests/phieuRouteContracts.worker.test.ts`

Expected: PASS và route phiếu cũ không đổi.

**Step 5: Commit**

```bash
git add workers/src/routes/resultReports workers/src/index.ts tests/resultReportCohort.worker.test.ts
git commit -m "feat(results): add secure result report cohort API"
```

## Task 4: Batch delivery, idempotency, status, retry và student-owned reads

**Files:**
- Create: `workers/src/routes/resultReports/batchRequest.ts`
- Create: `workers/src/routes/resultReports/batchRepository.ts`
- Create: `workers/src/routes/resultReports/deliveryItemService.ts`
- Create: `workers/src/routes/resultReports/batchHandler.ts`
- Create: `workers/src/routes/resultReports/batchDetailHandler.ts`
- Create: `workers/src/routes/resultReports/retryHandler.ts`
- Create: `workers/src/routes/resultReports/revokeHandler.ts`
- Create: `workers/src/routes/resultReports/studentReportsHandler.ts`
- Modify: `workers/src/routes/resultReports/route.ts`
- Modify: `workers/src/routes/phieu/phieuPublishService.ts`
- Modify: `workers/src/routes/phieu/phieuRepository.ts`
- Modify: `workers/src/routes/certificates/notificationHandlers.ts`
- Create: `tests/resultReportDelivery.worker.test.ts`
- Create: `tests/resultReportStudentAccess.worker.test.ts`

**Step 1: Write the failing tests**

Test batch API:
- Server revalidates every selected result belongs to class + quiz + chosen cohort.
- Client cannot spoof student identity, score or class.
- Same `requestId` returns existing batch and creates no duplicate notification/link.
- Stable notification ID + `INSERT OR IGNORE` prevents duplicate on retry.
- Existing active public link is reused.
- Link expires after 30 days by default.
- Một item notification lỗi nhưng link thành công tạo `partial_failed`; retry chỉ chạy phần lỗi.
- Batch detail derives `viewed` from `notifications.is_read` and `opened` from `view_count`.
- Revoke one/all links updates parent status.

Test student APIs:
- `GET /api/result-reports/mine` chỉ trả phiếu của JWT student.
- `GET /api/result-reports/mine/:phieuId` rejects another student.
- Teacher cannot use student-owned endpoint.
- Marking notification read remains owner-scoped and batch status reflects it.

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- tests/resultReportDelivery.worker.test.ts tests/resultReportStudentAccess.worker.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Delivery flow:
1. Insert/fetch idempotent batch and delivery rows.
2. Per item, load canonical result scope and upsert canonical phiếu with only teacher comment fields from client.
3. Create/reuse parent link when enabled.
4. Insert notification `result_report_published` when enabled and student resolved.
5. Persist independent student/parent statuses and errors.

Không rollback item thành công khi item khác lỗi. Retry dùng chính delivery row và không lặp side effect đã thành công.

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- tests/resultReportDelivery.worker.test.ts tests/resultReportStudentAccess.worker.test.ts tests/phieuQuizResult.worker.test.ts tests/certificates.worker.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add workers/src/routes/resultReports workers/src/routes/phieu/phieuPublishService.ts workers/src/routes/phieu/phieuRepository.ts workers/src/routes/certificates/notificationHandlers.ts tests/resultReportDelivery.worker.test.ts tests/resultReportStudentAccess.worker.test.ts
git commit -m "feat(results): deliver class result reports securely"
```

## Task 5: Frontend API service, view models, Zalo và CSV

**Files:**
- Create: `src/services/api/routes/resultReports.ts`
- Modify: `src/services/api/routes/index.ts`
- Create: `src/features/results/services/resultReportDeliveryService.ts`
- Create: `src/features/results/model/resultReportDelivery.ts`
- Create: `src/features/results/utils/resultReportExport.ts`
- Create: `tests/resultReportDeliveryFrontend.test.ts`

**Step 1: Write the failing tests**

Test:
- Route registry tạo đúng method/path/body cho cohort, create/detail/retry/revoke/mine.
- Service unwrap `{ data }` và giữ error code/message.
- View model giữ selection khi filter search thay đổi.
- Message Zalo có tên, bài, link riêng và thời hạn.
- CSV escape dấu phẩy, dấu nháy, xuống dòng và tiếng Việt; không chứa link của học sinh khác trong một dòng.
- Request ID ổn định trong một lần submit/retry.

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- tests/resultReportDeliveryFrontend.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Service dùng `callApi`, shared contract và không tính cohort ở frontend. Export utility không gửi dữ liệu ra bên thứ ba.

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- tests/resultReportDeliveryFrontend.test.ts src/services/api/__tests__/routeResolver.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/services/api/routes/resultReports.ts src/services/api/routes/index.ts src/features/results/services/resultReportDeliveryService.ts src/features/results/model/resultReportDelivery.ts src/features/results/utils/resultReportExport.ts tests/resultReportDeliveryFrontend.test.ts
git commit -m "feat(results): add result report delivery client"
```

## Task 6: Wizard giáo viên desktop/mobile và tích hợp ResultsTab

**Files:**
- Create: `src/features/results/components/result-report-delivery/ResultReportDeliveryWizard.tsx`
- Create: `src/features/results/components/result-report-delivery/ResultReportStepper.tsx`
- Create: `src/features/results/components/result-report-delivery/ScopeStep.tsx`
- Create: `src/features/results/components/result-report-delivery/ReviewStep.tsx`
- Create: `src/features/results/components/result-report-delivery/DeliveryStep.tsx`
- Create: `src/features/results/components/result-report-delivery/DeliverySummary.tsx`
- Create: `src/features/results/components/result-report-delivery/StudentReportPreview.tsx`
- Create: `src/features/results/components/result-report-delivery/index.ts`
- Create: `src/features/results/hooks/useResultReportDelivery.ts`
- Modify: `src/components/TeacherDashboard/results-tab/ResultsActions.tsx`
- Modify: `src/components/TeacherDashboard/results-tab/ResultsToolbar.tsx`
- Modify: `src/components/TeacherDashboard/results-tab/ResultsTab.tsx`
- Modify: `src/components/TeacherDashboard/results-tab/ResultsOverlays.tsx`
- Modify: `src/components/TeacherDashboard/results-tab/types.ts`
- Modify: `tests/ResultsTab.test.tsx`
- Create: `tests/ResultReportDeliveryWizard.test.tsx`

**Step 1: Write the failing tests**

Test:
- Nút đổi thành `Tạo và gửi phiếu`.
- Nút disabled cho tới khi chọn một quiz và một lớp cụ thể.
- Search học sinh ngoài toolbar không thay cohort scope.
- Wizard mở với đúng class name/quiz id và resolve class id từ danh sách lớp thuộc quyền.
- Bước 1 hiển thị summary và học sinh chưa làm bị bỏ qua.
- Bước 2 giữ checkbox khi search/filter, preview/chỉnh comment và chọn style.
- Bước 3 mặc định bật student notification + parent links, hiển thị xác nhận chính xác.
- Submit khóa nút, dùng một requestId, hiển thị partial failure và retry.
- Focus trap, Escape, labels và sticky mobile actions.
- Modal phiếu từng dòng vẫn mở/cached như trước.

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- tests/ResultReportDeliveryWizard.test.tsx tests/ResultsTab.test.tsx`

Expected: FAIL.

**Step 3: Write minimal implementation**

Bám màn Stitch:
- Desktop two-column ở bước review.
- Mobile card list + preview sheet.
- Flat Warm Human Education, Be Vietnam Pro, không gradient/shadow nặng.
- Wizard gọi `getClasses()` khi mở để map class name → class id; cohort vẫn do Worker trả.
- Không xóa `PhieuFromResultsPanel` để giữ compatibility cho nơi khác, nhưng `ResultsOverlays` dùng wizard mới.

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- tests/ResultReportDeliveryWizard.test.tsx tests/ResultsTab.test.tsx tests/phieuResultFrontend.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/results/components/result-report-delivery src/features/results/hooks/useResultReportDelivery.ts src/components/TeacherDashboard/results-tab tests/ResultReportDeliveryWizard.test.tsx tests/ResultsTab.test.tsx
git commit -m "feat(results): add class report delivery wizard"
```

## Task 7: Phiếu kết quả trong tài khoản học sinh và notification deep-link

**Files:**
- Create: `src/features/results/components/student-reports/StudentResultReportsPage.tsx`
- Create: `src/features/results/components/student-reports/StudentResultReportCard.tsx`
- Create: `src/features/results/hooks/useStudentResultReports.ts`
- Modify: `src/components/common/NotificationBell.tsx`
- Modify: `src/components/HomePage/student-dashboard/dashboard.types.ts`
- Modify: `src/components/HomePage/student-dashboard/StudentDashboardHeader.tsx`
- Modify: `src/features/student-dashboard/components/content.types.ts`
- Modify: `src/features/student-dashboard/components/StudentDashboardContent.tsx`
- Modify: `src/features/student-dashboard/hooks/useStudentDashboardController.ts`
- Modify: `tests/certificateFrontend.test.tsx`
- Create: `tests/studentResultReports.test.tsx`

**Step 1: Write the failing tests**

Test:
- Notification certificate vẫn mở achievements.
- Notification `result_report_published` mark read rồi gọi `onOpenResultReport(phieuId)`.
- Dashboard chuyển sang section `resultReports` và mở đúng phiếu.
- Danh sách student reports có loading/error/empty.
- API không dùng public token cho view nội bộ.
- Công thức toán trong nhận xét tiếp tục render qua component an toàn.
- Mobile navigation/header vẫn có vùng chạm hợp lệ và không vỡ layout.

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- tests/studentResultReports.test.tsx tests/certificateFrontend.test.tsx`

Expected: FAIL.

**Step 3: Write minimal implementation**

Mở phiếu từ chuông bằng section state + selected phieu ID. Có nút quay lại dashboard và danh sách lịch sử phiếu.

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- tests/studentResultReports.test.tsx tests/certificateFrontend.test.tsx tests/studentDashboard*.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/results/components/student-reports src/features/results/hooks/useStudentResultReports.ts src/components/common/NotificationBell.tsx src/components/HomePage/student-dashboard src/features/student-dashboard tests/studentResultReports.test.tsx tests/certificateFrontend.test.tsx
git commit -m "feat(results): surface result reports to students"
```

## Task 8: Responsive E2E, full verification và hoàn tất nhánh

**Files:**
- Create: `cypress/component/result-report-delivery.cy.tsx`
- Modify: `docs/superpowers/plans/2026-07-21-class-result-report-delivery.md`
- Modify only if needed by tests: files from Tasks 1–7.

**Step 1: Write failing Cypress coverage**

Cover:
- Desktop wizard 3 bước.
- Mobile scope cards, student cards, sticky actions và preview sheet.
- Không horizontal overflow.
- Submit confirmation nêu đúng lớp/bài/số lượng.
- Partial failure summary có retry.

**Step 2: Run Cypress to verify it fails**

Run: `npx cypress run --component --spec cypress/component/result-report-delivery.cy.tsx`

Expected: FAIL trước khi fixture/harness hoàn chỉnh.

**Step 3: Complete minimal responsive fixes and mark plan checkboxes**

Không cập nhật visual baseline ngoài phạm vi nếu không có kiểm tra trực quan.

**Step 4: Run focused and full verification**

Run sequentially:

```bash
npx tsc --noEmit
npx tsc --noEmit -p workers/tsconfig.json
npm run test:run
npm run build
npx cypress run --component --spec cypress/component/result-report-delivery.cy.tsx
npm audit --omit=dev
```

Also run:
- `git diff --check`
- changed-files secret scan.
- heuristic diff review.
- GitNexus `detect_changes` on all uncommitted changes.

Expected:
- All tests/build/typechecks pass.
- No critical/high/moderate production audit issue.
- No P1/P2 review finding.
- Repository contains no generated `public/sitemap.xml` or `.agent` state changes.

**Step 5: Final commit if verification required fixes**

```bash
git add <only verified feature/test/doc files>
git commit -m "test(results): verify result report delivery flow"
```

**Step 6: Finish branch**

Use `finishing-a-development-branch`; report branch, commits, verification and integration options. Do not push, merge or deploy without explicit user instruction.
