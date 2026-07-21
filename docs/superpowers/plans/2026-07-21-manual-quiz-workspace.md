# Phòng soạn đề thủ công — Implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Xây dựng trang “Phòng soạn đề thủ công” toàn màn hình, có autosave hai tầng, trình công thức toán trực quan, kiểm tra trước xuất bản và bộ thao tác tăng tốc cho giáo viên.

**Architecture:** Route riêng tải một workspace feature độc lập. Zustand giữ draft và trạng thái UI; local repository chống mất dữ liệu, API draft có revision hỗ trợ đồng bộ. Editor hiện có được tách phần form để render inline. Preview dùng renderer hiện có. Validation và math insertion là các module thuần để kiểm thử riêng.

**Tech stack:** React 19, TypeScript, React Router 7, Zustand 5, Tailwind CSS, Vitest/Testing Library, Cypress, `@dnd-kit`, `better-react-mathjax`, Cloudflare Workers, D1, Cloudinary.

## Global constraints

- Route tạo mới: `/teacher/quizzes/manual/new`.
- Route chỉnh sửa: `/teacher/quizzes/manual/:quizId/edit`.
- Desktop mặc định ba cột; tablet hai cột; mobile một cột theo tab.
- Không gradient; không shadow nặng; dùng Warm Human Education.
- Touch target tối thiểu 44px.
- Không yêu cầu giáo viên biết LaTeX.
- Local autosave trong 800ms; remote autosave sau 2 giây không nhập.
- Không lưu `File`, object URL hoặc base64 lớn trong draft JSON.
- Xuất bản bị khóa khi còn lỗi bắt buộc.
- Mỗi task kết thúc bằng test liên quan và một commit riêng.

---

## Bản đồ phụ thuộc

```text
Route + data contracts
        │
        ├── Workspace store + bootstrap
        │       ├── Inline question editor
        │       ├── Navigator / reorder
        │       └── Preview
        │
        ├── Draft API + local autosave
        │       └── Recovery / conflict UI
        │
        ├── Math composer
        │       └── Validation math
        │
        ├── Points persistence
        │       └── Full quiz validation
        │               └── Publish drawer / publish transaction
        │
        └── Media, bank, import, bulk actions
                └── Responsive, a11y, E2E, rollout
```

# Giai đoạn 1 — Không gian soạn đề và autosave

## Task 1: Thêm route và điểm vào workspace

**Files:**

- Modify: `src/app/AppRoutes.tsx`
- Modify: `src/app/lazyViews.tsx`
- Create: `src/features/manual-quiz-workspace/ManualQuizWorkspacePage.tsx`
- Create: `src/features/manual-quiz-workspace/components/ManualQuizWorkspaceGuard.tsx`
- Test: `tests/ManualQuizWorkspaceRoute.test.tsx`

**Produces:**

- `ManualQuizWorkspacePage`
- Route params `quizId?: string`
- Guard giáo viên/admin

**Acceptance criteria:**

- [ ] Giáo viên đăng nhập mở được cả route tạo mới và chỉnh sửa.
- [ ] Người chưa đăng nhập bị chuyển về `/`.
- [ ] Route không làm thay đổi `quizStore.view` hoặc mở dashboard phía sau.

**Steps:**

- [ ] Viết test route tạo mới, route chỉnh sửa và guard chưa đăng nhập.
- [ ] Chạy `npm test -- --run tests/ManualQuizWorkspaceRoute.test.tsx`; xác nhận test fail vì route chưa tồn tại.
- [ ] Lazy-load page trong `lazyViews.tsx` và khai báo hai route trong `AppRoutes.tsx`.
- [ ] Page đọc `useParams`, kiểm tra auth và render shell tạm có `data-testid="manual-quiz-workspace"`.
- [ ] Chạy lại test và `npm run build`.
- [ ] Commit: `feat(manual-quiz): add dedicated workspace routes`.

## Task 2: Chuyển nút “Tạo đề thủ công” sang route mới

**Files:**

- Modify: `src/components/TeacherDashboard/CreateTab.tsx`
- Modify: `src/components/TeacherDashboard/quiz-preview/EmptyQuizPreview.tsx`
- Modify: `src/features/quiz-generator/hooks/useQuizFormState.ts`
- Test: `tests/QuizPreview.test.tsx`
- Test: `tests/CreateTab.manualNavigation.test.tsx`

**Produces:**

- Navigation state `ManualQuizSeed` gồm title, classLevel, category, timeLimit, tags, access settings.

**Acceptance criteria:**

- [ ] Bấm “Tạo đề thủ công” điều hướng đến route mới.
- [ ] Thông tin cơ bản đã nhập được truyền sang workspace.
- [ ] Không còn tạo một quiz rỗng trong cột preview.

**Steps:**

- [ ] Viết test với MemoryRouter, kiểm tra pathname và navigation state.
- [ ] Tách `buildManualQuizSeed()` thành hàm thuần trong `useQuizFormState.ts` hoặc file domain nhỏ.
- [ ] Dùng `useNavigate()` trong `CreateTab`; `EmptyQuizPreview` chỉ gọi callback điều hướng.
- [ ] Cập nhật test cũ đang kỳ vọng `handleStartManual` tạo đề tại chỗ.
- [ ] Chạy `npm test -- --run tests/QuizPreview.test.tsx tests/CreateTab.manualNavigation.test.tsx`.
- [ ] Commit: `refactor(manual-quiz): open full workspace from create tab`.

## Task 3: Định nghĩa draft model và Zustand store

**Files:**

- Create: `src/features/manual-quiz-workspace/types/manualQuizWorkspace.types.ts`
- Create: `src/features/manual-quiz-workspace/store/useManualQuizWorkspaceStore.ts`
- Create: `src/features/manual-quiz-workspace/store/manualQuizWorkspaceSelectors.ts`
- Test: `tests/manualQuizWorkspaceStore.test.ts`

**Interfaces:**

```ts
export type ManualQuizSaveStatus =
  | 'idle'
  | 'saving-local'
  | 'saving-remote'
  | 'saved'
  | 'offline'
  | 'conflict'
  | 'error';

export interface ManualQuizDraftEnvelope {
  schemaVersion: 1;
  draftId: string;
  quizId?: string;
  ownerUsername: string;
  revision: number;
  quiz: Quiz;
  selectedQuestionId: string | null;
  targetPoints: number;
  updatedAt: string;
}
```

**Acceptance criteria:**

- [ ] Store khởi tạo được từ seed hoặc quiz có sẵn.
- [ ] Cập nhật câu không mutate object cũ.
- [ ] Select, add, duplicate, remove và reorder giữ ID ổn định.
- [ ] Store tính tổng điểm, lỗi/cảnh báo count bằng selector.

**Steps:**

- [ ] Viết test cho init, update, duplicate, remove, reorder và selector tổng điểm.
- [ ] Tạo types, state/actions và selectors.
- [ ] Dùng `crypto.randomUUID()` với fallback deterministic trong test.
- [ ] Chạy `npm test -- --run tests/manualQuizWorkspaceStore.test.ts`.
- [ ] Commit: `feat(manual-quiz): add workspace draft store`.

## Task 4: Xây shell desktop ba cột

**Files:**

- Modify: `src/features/manual-quiz-workspace/ManualQuizWorkspacePage.tsx`
- Create: `src/features/manual-quiz-workspace/components/WorkspaceHeader.tsx`
- Create: `src/features/manual-quiz-workspace/components/QuestionNavigator.tsx`
- Create: `src/features/manual-quiz-workspace/components/QuestionEditorPane.tsx`
- Create: `src/features/manual-quiz-workspace/components/StudentPreviewPane.tsx`
- Create: `src/features/manual-quiz-workspace/components/WorkspaceStatusBar.tsx`
- Test: `tests/ManualQuizWorkspaceLayout.test.tsx`

**Acceptance criteria:**

- [ ] Desktop hiển thị ba pane với chiều rộng 280px / flexible / 380px.
- [ ] Header và status bar sticky.
- [ ] Mỗi pane cuộn độc lập nhưng không có danh sách giới hạn 500px.
- [ ] Preview và navigator có nút thu gọn.

**Steps:**

- [ ] Viết test landmark/header và class responsive quan trọng.
- [ ] Dựng shell theo Stitch screen `abf3ed58606f4b16aceb0485e948dd0f`.
- [ ] Nối header title, save status và summary selectors từ store.
- [ ] Chạy test và kiểm tra ở viewport 1440×900 bằng Cypress component hoặc browser QA.
- [ ] Commit: `feat(manual-quiz): build three-pane authoring shell`.

## Task 5: Tách editor form khỏi modal lồng

**Files:**

- Modify: `src/features/quiz-editor/components/QuestionEditorModal/QuestionEditorModal.tsx`
- Create: `src/features/quiz-editor/components/QuestionEditorModal/QuestionEditorForm.tsx`
- Modify: `src/components/TeacherDashboard/quiz-preview/EditorOverlay.tsx`
- Modify: `src/features/manual-quiz-workspace/components/QuestionEditorPane.tsx`
- Test: `tests/QuestionEditorForm.test.tsx`
- Test: `tests/QuizPreview.test.tsx`

**Produces:**

```ts
interface QuestionEditorFormProps {
  editingQuestion: Question;
  draft: AnyEditorDraft;
  onDraftChange(updater: (prev: AnyEditorDraft) => AnyEditorDraft): void;
  onSave(): void;
  onCancel?(): void;
  mode: 'inline' | 'modal';
}
```

**Acceptance criteria:**

- [ ] Workspace render editor inline, không backdrop.
- [ ] Luồng preview cũ chỉ có một backdrop/modal.
- [ ] Tất cả 14 loại câu hỏi vẫn dùng dispatcher hiện có.

**Steps:**

- [ ] Viết test inline mode không có `role="dialog"` và modal mode có dialog.
- [ ] Di chuyển SharedHeaderEditor, TypeEditorDispatcher và body/footer vào `QuestionEditorForm`.
- [ ] Giữ `QuestionEditorModal` làm wrapper focus-managed.
- [ ] Xóa container overlay dư trong `EditorOverlay`.
- [ ] Nối workspace store qua `questionToDraft`/`draftToQuestion` hiện có.
- [ ] Chạy `npm test -- --run tests/QuestionEditorForm.test.tsx tests/QuizPreview.test.tsx`.
- [ ] Commit: `refactor(quiz-editor): support inline question editing`.

## Task 6: Autosave local và phục hồi sau reload

**Files:**

- Create: `src/features/manual-quiz-workspace/draft/manualQuizDraftSerializer.ts`
- Create: `src/features/manual-quiz-workspace/draft/manualQuizDraftRepository.ts`
- Create: `src/features/manual-quiz-workspace/hooks/useManualQuizAutosave.ts`
- Create: `src/features/manual-quiz-workspace/components/DraftRecoveryDialog.tsx`
- Test: `tests/manualQuizDraftRepository.test.ts`
- Test: `tests/useManualQuizAutosave.test.tsx`

**Interfaces:**

```ts
saveLocalDraft(envelope: ManualQuizDraftEnvelope): void;
loadLocalDraft(ownerUsername: string, draftId: string): ManualQuizDraftEnvelope | null;
removeLocalDraft(ownerUsername: string, draftId: string): void;
```

**Acceptance criteria:**

- [ ] Thay đổi được lưu local trong tối đa 800ms.
- [ ] Serializer từ chối `File`, blob URL và base64 ảnh lớn.
- [ ] Reload hiển thị hộp Tiếp tục/Bỏ bản nháp nếu draft mới hơn seed.
- [ ] Lỗi quota không làm mất state đang soạn và được báo thân thiện.

**Steps:**

- [ ] Viết unit test serializer/version/quota và fake-timer test debounce.
- [ ] Dùng key `itongquiz:manual-draft:v1:<username>:<draftId>`.
- [ ] Ghi timestamp và hash nội dung để không ghi lại khi không đổi.
- [ ] Thêm `beforeunload` chỉ khi có thay đổi chưa ghi local.
- [ ] Chạy tests.
- [ ] Commit: `feat(manual-quiz): add resilient local autosave`.

## Task 7: Remote draft API có revision

**Files:**

- Create: `workers/migrations/00XX_create_quiz_drafts.sql`
- Modify: `workers/schema.sql`
- Create: `shared/manual-quiz-draft.contract.ts`
- Create: `workers/src/routes/quizDrafts.ts`
- Modify: `workers/src/index.ts`
- Create: `src/services/manualQuizDraftService.ts`
- Test: `tests/quizDraftRoutes.worker.test.ts`
- Test: `tests/manualQuizDraftService.test.ts`

**D1 schema:**

```sql
CREATE TABLE quiz_drafts (
  id TEXT PRIMARY KEY,
  owner_username TEXT NOT NULL,
  quiz_id TEXT,
  draft_json TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  expires_at TEXT
);
CREATE INDEX idx_quiz_drafts_owner_updated
  ON quiz_drafts(owner_username, updated_at DESC);
```

**API:**

- `GET /api/quiz-drafts/:id`
- `PUT /api/quiz-drafts/:id` với `expectedRevision`
- `DELETE /api/quiz-drafts/:id`

**Acceptance criteria:**

- [ ] Chỉ owner hoặc admin đọc/sửa/xóa draft.
- [ ] Revision sai trả `409 DRAFT_CONFLICT` và bản server hiện tại.
- [ ] Payload có giới hạn kích thước và được validate bằng contract.
- [ ] Student luôn nhận 403.

**Steps:**

- [ ] Trước khi sửa route handler, chạy gitNexus `api_impact` cho route mới và ghi nhận nếu index chưa có.
- [ ] Viết worker tests auth, create/update, conflict, payload quá lớn, delete.
- [ ] Thêm migration/schema, contract parser và repository queries.
- [ ] Thêm service client dùng auth transport hiện tại.
- [ ] Chạy `npm test -- --run tests/quizDraftRoutes.worker.test.ts tests/manualQuizDraftService.test.ts`.
- [ ] Commit: `feat(manual-quiz): persist versioned remote drafts`.

## Task 8: Đồng bộ remote, offline và conflict

**Files:**

- Modify: `src/features/manual-quiz-workspace/hooks/useManualQuizAutosave.ts`
- Create: `src/features/manual-quiz-workspace/hooks/useDraftConflictResolution.ts`
- Create: `src/features/manual-quiz-workspace/components/DraftConflictDialog.tsx`
- Modify: `src/features/manual-quiz-workspace/components/WorkspaceHeader.tsx`
- Test: `tests/useRemoteManualQuizAutosave.test.tsx`

**Acceptance criteria:**

- [ ] Remote save chạy sau 2 giây không nhập và sau local save.
- [ ] Offline đổi trạng thái nhưng không khóa editor.
- [ ] Khi online lại, sync bản mới nhất.
- [ ] 409 không tự ghi đè; giáo viên chọn Bản trên máy hoặc Bản trên hệ thống.

**Steps:**

- [ ] Viết fake-timer tests cho debounce, offline/online và 409.
- [ ] Nối service, AbortController và sequence token để bỏ response cũ.
- [ ] Thêm conflict dialog so sánh updatedAt, device label và question count.
- [ ] Chạy tests.
- [ ] Commit: `feat(manual-quiz): sync drafts and resolve conflicts`.

### Checkpoint giai đoạn 1

- [ ] Route mới hoạt động end-to-end.
- [ ] Không còn modal lồng khi soạn thủ công.
- [ ] Reload và mất mạng không làm mất nội dung.
- [ ] `npm test` và `npm run build` pass.
- [ ] Review giao diện desktop theo Stitch.

# Giai đoạn 2 — Trình công thức toán trực quan

## Task 9: Tách math insertion thành domain module

**Files:**

- Create: `src/features/manual-quiz-workspace/math-composer/mathTemplates.ts`
- Create: `src/features/manual-quiz-workspace/math-composer/mathInsertion.ts`
- Modify: `src/features/quiz-editor/components/QuestionEditorModal/editors/shared.tsx`
- Modify: `tests/MathFormulaToolbar.test.tsx`
- Create: `tests/mathInsertion.test.ts`

**Produces:**

```ts
insertMathTemplate(input: {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  template: MathTemplate;
  values?: Record<string, string>;
}): FormulaInsertionResult;
```

**Acceptance criteria:**

- [ ] Các template cũ giữ nguyên output.
- [ ] Thêm toán tử, hỗn số, phần trăm, giá trị tuyệt đối, đơn vị diện tích/thể tích.
- [ ] Caret đặt đúng vào placeholder tiếp theo.
- [ ] Domain module không import React.

**Steps:**

- [ ] Chuyển tests hiện có sang module mới và thêm table-driven tests.
- [ ] Implement template registry với label tiếng Việt, category, field schema và formatter.
- [ ] `shared.tsx` gọi module mới để tương thích editor cũ.
- [ ] Chạy math tests.
- [ ] Commit: `refactor(math): centralize formula insertion templates`.

## Task 10: Xây MathComposerPanel và hộp nhập trực quan

**Files:**

- Create: `src/features/manual-quiz-workspace/math-composer/MathComposerPanel.tsx`
- Create: `src/features/manual-quiz-workspace/math-composer/StructuredFormulaDialog.tsx`
- Create: `src/features/manual-quiz-workspace/math-composer/RecentFormulaList.tsx`
- Modify: `src/features/manual-quiz-workspace/components/QuestionEditorPane.tsx`
- Test: `tests/MathComposerPanel.test.tsx`

**Acceptance criteria:**

- [ ] Panel có năm nhóm công cụ đã chốt.
- [ ] Nút tối thiểu 44px và có aria-label tiếng Việt.
- [ ] Phân số/hỗn số/mũ/căn nhập bằng form trực quan và preview.
- [ ] Raw LaTeX mặc định ẩn.
- [ ] Công thức vừa dùng được lưu tối đa 8 mục theo giáo viên.

**Steps:**

- [ ] Viết interaction tests cho tab, phân số, recent formulas và advanced toggle.
- [ ] Render panel cố định dưới toolbar khi mở, không dùng popover nhỏ.
- [ ] Dùng `NewlineMathText` cho preview.
- [ ] Nối active field/cursor registry để chèn vào nội dung hoặc phương án đang focus.
- [ ] Chạy tests và kiểm tra keyboard.
- [ ] Commit: `feat(math): add visual formula composer for teachers`.

## Task 11: Live math validation và thông báo dễ hiểu

**Files:**

- Create: `src/features/manual-quiz-workspace/math-composer/useMathFieldValidation.ts`
- Modify: `src/utils/mathText.ts`
- Modify: `src/utils/questionMath.ts`
- Modify: `src/features/manual-quiz-workspace/components/QuestionEditorPane.tsx`
- Test: `tests/manualQuizMathValidation.test.tsx`

**Acceptance criteria:**

- [ ] Preview cập nhật tức thời khi gõ hoặc chèn.
- [ ] Lỗi chỉ rõ vị trí và cách sửa bằng tiếng Việt.
- [ ] Không chặn lưu câu khi người dùng đang nhập dở; chỉ chặn xuất bản.
- [ ] Telemetry không gửi nguyên nội dung câu hỏi.

**Steps:**

- [ ] Viết tests cho ngoặc thiếu, delimiter thiếu, command không hỗ trợ và chuỗi hợp lệ.
- [ ] Map error code kỹ thuật sang message giáo viên.
- [ ] Debounce phân tích 150ms để tránh render nặng.
- [ ] Chạy math tests và visual regression hiện có.
- [ ] Commit: `feat(math): provide live teacher-friendly validation`.

### Checkpoint giai đoạn 2

- [ ] Giáo viên chèn phân số không gõ LaTeX.
- [ ] Chèn đúng vào mọi field toán hỗ trợ.
- [ ] Preview học sinh và preview editor đồng nhất.
- [ ] Math unit tests và screenshot tests pass.

# Giai đoạn 3 — Điểm, validation và xuất bản

## Task 12: Persist điểm và lời giải thống nhất

**Files:**

- Modify: `src/types/domain.types.ts`
- Modify: `workers/src/types.ts`
- Create: `workers/migrations/00XY_add_question_authoring_fields.sql`
- Modify: `workers/schema.sql`
- Modify: `workers/src/utils/helpers.ts`
- Modify: `workers/src/routes/quizzes.ts`
- Test: `tests/quizRoutes.authoringFields.worker.test.ts`

**Data model:**

```ts
export interface QuestionMetadata extends QuestionSkillMetadataFields {
  tags?: string[] | string;
  mathFormatVersion?: number;
  points?: number;
  explanation?: string;
}
```

D1 thêm `points REAL` và `explanation TEXT DEFAULT ''` vào `questions`.

**Acceptance criteria:**

- [ ] Create, update, fetch và duplicate giữ points/explanation.
- [ ] Public/student DTO không rò dữ liệu đáp án; explanation chỉ trả theo policy hiện có.
- [ ] Quiz cũ không có points vẫn hoạt động.

**Steps:**

- [ ] Chạy gitNexus `api_impact` trước khi sửa `quizzes.ts`.
- [ ] Viết failing worker tests.
- [ ] Thêm migration, types, insert mapping và persisted-row mapping.
- [ ] Cập nhật duplicate values và SQL placeholder count.
- [ ] Chạy worker tests và full route tests.
- [ ] Commit: `feat(quizzes): persist authoring points and explanations`.

## Task 13: Xây validation engine thuần

**Files:**

- Create: `src/features/manual-quiz-workspace/validation/manualQuizValidation.ts`
- Create: `src/features/manual-quiz-workspace/validation/questionValidators.ts`
- Create: `src/features/manual-quiz-workspace/validation/validationActions.ts`
- Test: `tests/manualQuizValidation.test.ts`

**Interfaces:**

```ts
export interface ManualQuizIssue {
  code: string;
  severity: 'error' | 'warning' | 'success';
  message: string;
  questionId?: string;
  field?: string;
  action?: 'go-to-question' | 'fix-points' | 'fix-time' | 'retry-media';
}

validateManualQuiz(quiz: Quiz, context: ValidationContext): ManualQuizIssue[];
```

**Acceptance criteria:**

- [ ] Có validator cho mọi `QuestionType` hiện tại.
- [ ] MCQ phát hiện option rỗng, trùng và correctAnswer không tồn tại.
- [ ] Math issues được gộp theo question/field.
- [ ] Điểm/time/media có error hoặc warning đúng mức.

**Steps:**

- [ ] Viết table-driven tests mỗi loại câu và các quy tắc toàn đề.
- [ ] Tách common text/answer normalization.
- [ ] Không import React/store/API trong validation module.
- [ ] Chạy unit tests.
- [ ] Commit: `feat(manual-quiz): validate complete authoring drafts`.

## Task 14: Publish validation drawer và hành động sửa nhanh

**Files:**

- Create: `src/features/manual-quiz-workspace/components/PublishValidationDrawer.tsx`
- Create: `src/features/manual-quiz-workspace/components/PointDistributionDialog.tsx`
- Modify: `src/features/manual-quiz-workspace/components/WorkspaceHeader.tsx`
- Modify: `src/features/manual-quiz-workspace/components/WorkspaceStatusBar.tsx`
- Test: `tests/PublishValidationDrawer.test.tsx`

**Acceptance criteria:**

- [ ] Drawer theo Stitch screen `07bc575572c14221a8e2622e448461bc`.
- [ ] Lỗi, cảnh báo và mục hoàn tất được nhóm rõ.
- [ ] “Đi đến câu” select và focus đúng field.
- [ ] Chia đều điểm và đổi thời gian cập nhật store có undo.
- [ ] Nút Xuất bản disabled khi còn error.

**Steps:**

- [ ] Viết interaction tests cho group, navigation, point distribution và disabled state.
- [ ] Render progress summary dựa trên issue list.
- [ ] Thêm focus return khi đóng drawer.
- [ ] Chạy tests.
- [ ] Commit: `feat(manual-quiz): add pre-publish validation workflow`.

## Task 15: Publish transaction và dọn draft

**Files:**

- Create: `src/features/manual-quiz-workspace/hooks/useManualQuizPublish.ts`
- Modify: `src/features/manual-quiz-workspace/ManualQuizWorkspacePage.tsx`
- Modify: `src/services/manualQuizDraftService.ts`
- Modify: `src/features/manual-quiz-workspace/draft/manualQuizDraftRepository.ts`
- Test: `tests/useManualQuizPublish.test.tsx`

**Acceptance criteria:**

- [ ] Publish luôn validate lại snapshot cuối cùng.
- [ ] Tạo mới dùng `createQuiz`; chỉnh sửa dùng `updateQuiz`.
- [ ] Chỉ xóa local/remote draft sau khi canonical save thành công.
- [ ] Save lỗi giữ nguyên draft và cho retry.
- [ ] Thành công chuyển về Manage tab hoặc trang chi tiết đề.

**Steps:**

- [ ] Viết tests success/failure/race/double-click.
- [ ] Dùng mutex hoặc request ID để ngăn publish hai lần.
- [ ] Sau success, remove draft, refresh quiz store, navigate.
- [ ] Chạy tests.
- [ ] Commit: `feat(manual-quiz): publish validated drafts safely`.

### Checkpoint giai đoạn 3

- [ ] Điểm/lời giải round-trip qua API.
- [ ] Không thể xuất bản đề lỗi.
- [ ] Sửa lỗi từ drawer đưa đúng tới câu/field.
- [ ] Draft chỉ bị xóa sau publish thành công.

# Giai đoạn 4 — Tăng tốc thao tác

## Task 16: Navigator kéo thả, nhân bản và hoàn tác xóa

**Files:**

- Modify: `src/features/manual-quiz-workspace/components/QuestionNavigator.tsx`
- Create: `src/features/manual-quiz-workspace/components/QuestionNavigatorItem.tsx`
- Create: `src/features/manual-quiz-workspace/hooks/useQuestionUndo.ts`
- Modify: `src/features/manual-quiz-workspace/store/useManualQuizWorkspaceStore.ts`
- Test: `tests/QuestionNavigator.test.tsx`

**Acceptance criteria:**

- [ ] Kéo thả bằng `@dnd-kit`.
- [ ] Có nút lên/xuống thay thế cho keyboard/a11y.
- [ ] Nhân bản tạo ID mới và chọn bản sao.
- [ ] Xóa hiển thị Hoàn tác, phục hồi đúng vị trí trong 8 giây.

**Steps:**

- [ ] Viết tests reorder, keyboard move, duplicate và undo.
- [ ] Dùng stable ID; không dùng array index làm key.
- [ ] Persist reorder qua autosave.
- [ ] Chạy tests.
- [ ] Commit: `feat(manual-quiz): speed up question list operations`.

## Task 17: Bộ chọn loại câu hỏi và thao tác một lần bấm

**Files:**

- Create: `src/features/manual-quiz-workspace/components/QuestionTypePicker.tsx`
- Modify: `src/components/TeacherDashboard/quiz-preview/questionTypes.ts`
- Modify: `src/features/manual-quiz-workspace/components/QuestionNavigator.tsx`
- Modify: `src/features/manual-quiz-workspace/store/useManualQuizWorkspaceStore.ts`
- Test: `tests/QuestionTypePicker.test.tsx`

**Acceptance criteria:**

- [ ] Bốn dạng phổ biến thêm bằng một lần bấm và mở editor ngay.
- [ ] Dạng khác được nhóm Phổ biến/Tương tác/Ngôn ngữ/Hình ảnh.
- [ ] Mỗi dạng có mô tả ngắn và ví dụ.
- [ ] Draft mặc định có số dòng/phương án đủ để bắt đầu nhập.

**Steps:**

- [ ] Viết tests quick add và grouped picker.
- [ ] Nâng `createManualQuestionDraft` để tạo draft hợp lệ tối thiểu theo từng type.
- [ ] Chạy tests.
- [ ] Commit: `feat(manual-quiz): simplify question type selection`.

## Task 18: Upload, paste và quản lý ảnh

**Files:**

- Create: `src/features/manual-quiz-workspace/components/MediaDropzone.tsx`
- Create: `src/features/manual-quiz-workspace/hooks/useQuestionMediaUpload.ts`
- Modify: `src/services/cloudinaryService.ts`
- Modify: `src/features/manual-quiz-workspace/components/QuestionEditorPane.tsx`
- Test: `tests/MediaDropzone.test.tsx`

**Acceptance criteria:**

- [ ] Chọn file, kéo thả và paste clipboard đều upload được.
- [ ] Nén ảnh trước upload bằng dependency hiện có.
- [ ] Hiển thị progress, retry, replace, remove và alt text.
- [ ] Autosave chỉ lưu URL sau upload, không lưu base64.

**Steps:**

- [ ] Viết tests file validation, paste, progress, success/failure.
- [ ] Giới hạn MIME và kích thước; sanitize alt text.
- [ ] Reuse `uploadToCloudinary` và image compression.
- [ ] Chạy tests.
- [ ] Commit: `feat(manual-quiz): support teacher-friendly image upload`.

## Task 19: Kho câu hỏi dạng drawer

**Files:**

- Refactor: `src/features/quiz-editor/components/TestBankModal.tsx`
- Create: `src/features/quiz-editor/components/TestBankBrowser.tsx`
- Create: `src/features/manual-quiz-workspace/components/QuestionBankDrawer.tsx`
- Modify: `src/features/manual-quiz-workspace/ManualQuizWorkspacePage.tsx`
- Test: `tests/QuestionBankDrawer.test.tsx`

**Acceptance criteria:**

- [ ] Modal cũ và drawer mới dùng chung browser/search logic.
- [ ] Chọn nhiều câu rồi thêm một lần.
- [ ] Câu được clone ID và giữ metadata/LaTeX.
- [ ] Bộ lọc loại, độ khó, môn và từ khóa hoạt động.

**Steps:**

- [ ] Viết tests browser logic và multi-select.
- [ ] Tách component thuần khỏi modal wrapper.
- [ ] Nối drawer vào workspace.
- [ ] Chạy tests.
- [ ] Commit: `refactor(question-bank): reuse browser in manual workspace`.

## Task 20: Import Excel/CSV và Word có màn hình rà soát

**Files:**

- Create: `src/features/manual-quiz-workspace/import/spreadsheetQuestionImporter.ts`
- Create: `src/features/manual-quiz-workspace/import/docxQuestionImporter.ts`
- Create: `src/features/manual-quiz-workspace/import/QuestionImportReview.tsx`
- Create: `src/features/manual-quiz-workspace/components/QuestionImportDrawer.tsx`
- Test: `tests/questionImporters.test.ts`
- Test: `tests/QuestionImportReview.test.tsx`

**Dependencies:**

- Reuse `papaparse`/`exceljs` cho CSV/XLSX.
- Add `mammoth` cho DOCX text/table extraction.

**Acceptance criteria:**

- [ ] CSV/XLSX map được mẫu chính thức và báo lỗi theo dòng.
- [ ] DOCX tách câu, phương án và đáp án khi nhận diện chắc chắn.
- [ ] Dòng không chắc chắn đi vào review, không tự bỏ hoặc tự xuất bản.
- [ ] Giáo viên chọn câu nào được nhập.

**Steps:**

- [ ] Viết fixtures nhỏ cho CSV/XLSX/DOCX và failing parser tests.
- [ ] Implement parser thành kết quả `{accepted, needsReview, rejected}`.
- [ ] Tạo review UI có sửa nhanh type/answer.
- [ ] Chèn accepted questions vào store bằng transaction có undo.
- [ ] Chạy tests và build để kiểm tra bundle impact; lazy-load importer.
- [ ] Commit: `feat(manual-quiz): import questions with review workflow`.

## Task 21: Bulk actions và AI trợ giúp có kiểm soát

**Files:**

- Create: `src/features/manual-quiz-workspace/components/BulkQuestionActions.tsx`
- Create: `src/features/manual-quiz-workspace/hooks/useBulkQuestionSelection.ts`
- Modify: `src/features/manual-quiz-workspace/store/useManualQuizWorkspaceStore.ts`
- Modify: `src/features/quiz-editor/hooks/useSmartDistractors.ts`
- Test: `tests/BulkQuestionActions.test.tsx`

**Acceptance criteria:**

- [ ] Chọn nhiều câu để đổi độ khó, điểm, xóa hoặc lưu kho.
- [ ] AI tạo đáp án nhiễu/lời giải chỉ ghi vào draft sau khi giáo viên xác nhận.
- [ ] Không tự thay correct answer.
- [ ] Có preview thay đổi và undo.

**Steps:**

- [ ] Viết tests bulk updates và AI accept/reject.
- [ ] Thêm selection mode và transaction history giới hạn.
- [ ] Reuse smart distractor service, thêm confirmation surface.
- [ ] Chạy tests.
- [ ] Commit: `feat(manual-quiz): add bulk and assisted authoring actions`.

### Checkpoint giai đoạn 4

- [ ] Giáo viên thêm/reorder/duplicate/import câu nhanh.
- [ ] Paste ảnh và kho câu hỏi hoạt động.
- [ ] Các thao tác phá hủy đều có undo hoặc confirmation phù hợp.
- [ ] Importer được lazy-load để không tăng initial bundle đáng kể.

# Giai đoạn 5 — Responsive, accessibility và production rollout

## Task 22: Tablet và mobile responsive

**Files:**

- Modify: `src/features/manual-quiz-workspace/ManualQuizWorkspacePage.tsx`
- Modify: `src/features/manual-quiz-workspace/components/QuestionNavigator.tsx`
- Modify: `src/features/manual-quiz-workspace/components/StudentPreviewPane.tsx`
- Create: `src/features/manual-quiz-workspace/components/WorkspaceMobileTabs.tsx`
- Test: `tests/ManualQuizWorkspaceResponsive.test.tsx`

**Acceptance criteria:**

- [ ] Tablet khớp Stitch screen `2d09ce7561ed4a23a411735e0af67479`.
- [ ] Tablet có 2 cột và preview drawer.
- [ ] Mobile có tab Danh sách/Soạn/Xem trước.
- [ ] Không overflow ngang ở 390px, 768px, 1024px và 1440px.

**Steps:**

- [ ] Viết viewport-aware component/E2E assertions.
- [ ] Dùng CSS grid breakpoints; không dùng JS width cho layout cơ bản.
- [ ] Giữ bottom action bar và safe-area inset.
- [ ] Chạy tests và screenshot ở bốn viewport.
- [ ] Commit: `feat(manual-quiz): support responsive authoring layouts`.

## Task 23: Keyboard, focus và accessibility

**Files:**

- Create: `src/features/manual-quiz-workspace/hooks/useWorkspaceKeyboardShortcuts.ts`
- Modify: `src/features/manual-quiz-workspace/components/*`
- Test: `tests/ManualQuizWorkspaceAccessibility.test.tsx`

**Shortcuts:**

- `Ctrl/Cmd + S`: lưu draft ngay.
- `Ctrl/Cmd + Enter`: lưu câu và sang câu tiếp.
- `Alt + ArrowUp/ArrowDown`: di chuyển câu.
- `Escape`: đóng drawer/panel hiện tại.

**Acceptance criteria:**

- [ ] Tab order hợp lý và focus không mất khi thêm/sửa câu.
- [ ] Drawer/dialog trap focus và trả focus về trigger.
- [ ] Kéo thả có keyboard alternative.
- [ ] Zoom 200% vẫn truy cập được action chính.

**Steps:**

- [ ] Viết keyboard/focus tests.
- [ ] Thêm shortcut nhưng bỏ qua khi xung đột với IME hoặc browser controls.
- [ ] Thêm aria-live cho save status và validation summary.
- [ ] Chạy tests.
- [ ] Commit: `feat(manual-quiz): improve keyboard and screen-reader access`.

## Task 24: Observability, E2E và rollout

**Files:**

- Create: `src/features/manual-quiz-workspace/manualQuizTelemetry.ts`
- Create: `cypress/e2e/manual-quiz-workspace.cy.ts`
- Modify: `src/app/AppRoutes.tsx`
- Modify: `.env.example`
- Modify: `docs/runbooks/manual-quiz-workspace-rollout.md`

**Feature flag:**

- `VITE_FEATURE_MANUAL_QUIZ_WORKSPACE_V1`

**Metrics không chứa nội dung câu hỏi:**

- workspace opened/completed/abandoned.
- autosave local/remote success/failure/conflict.
- validation issue count theo code.
- math template usage theo template ID.
- publish duration/failure code.

**Acceptance criteria:**

- [ ] E2E tạo đề 4 câu, chèn phân số, reload phục hồi, sửa lỗi, publish.
- [ ] Telemetry không gửi title, question text, answer hoặc student data.
- [ ] Feature flag cho phép rollback về luồng cũ.
- [ ] Runbook có enable, smoke test, monitor và rollback.

**Steps:**

- [ ] Viết E2E trước, chạy xác nhận fail ở môi trường test.
- [ ] Thêm event wrapper có allowlist fields.
- [ ] Gắn feature flag ở entry button và route.
- [ ] Viết runbook rollout 10% giáo viên nội bộ → 50% → 100%.
- [ ] Chạy `npm test`, `npm run build`, Cypress E2E và security scan.
- [ ] Commit: `chore(manual-quiz): add rollout gates and e2e coverage`.

### Checkpoint hoàn tất

- [ ] Targeted unit/integration tests pass.
- [ ] Full `npm test` pass.
- [ ] `npm run build` pass.
- [ ] Cypress desktop/tablet/mobile smoke pass.
- [ ] Worker route tests pass.
- [ ] `review_diff` không có P1/P2.
- [ ] Security scan không phát hiện secret hoặc payload nhạy cảm.
- [ ] Product owner duyệt UI desktop, validation drawer và tablet theo Stitch.
- [ ] Rollout qua feature flag, có rollback đã thử.

# Phân chia phát hành

## Release A — MVP sử dụng được

Tasks 1–8, 12–15, 22–24 tối thiểu.

Giá trị giao hàng:

- Route toàn màn hình.
- Ba cột/2 cột responsive.
- Inline editor.
- Local + remote autosave.
- Validation trước publish.
- Điểm câu hỏi.
- Feature flag và E2E.

## Release B — Math composer hoàn chỉnh

Tasks 9–11.

Giá trị giao hàng:

- Giáo viên chèn công thức trực quan.
- Không cần gõ LaTeX.
- Preview và validation tức thời.

## Release C — Năng suất nâng cao

Tasks 16–21.

Giá trị giao hàng:

- Reorder, duplicate, undo, grouped picker.
- Paste/upload ảnh.
- Kho câu hỏi drawer.
- Import bảng tính/Word có review.
- Bulk actions và AI trợ giúp có xác nhận.

# Rủi ro và giảm thiểu

| Rủi ro | Mức | Giảm thiểu |
|---|---:|---|
| Draft lớn vượt localStorage | Cao | Không lưu blob/base64; remote draft; giới hạn payload; cảnh báo quota |
| Xung đột nhiều tab/thiết bị | Cao | Revision + 409; dialog chọn bản; không last-write-wins im lặng |
| Thêm points phá chấm điểm cũ | Cao | Fallback equal-weight; migration nullable; test quiz cũ |
| Tách editor làm hỏng 14 loại câu | Cao | Giữ dispatcher; modal wrapper tương thích; tests theo type |
| MathJax render chậm | Trung bình | Debounce 150ms; preview câu đang chọn; lazy panel |
| Import DOCX không chính xác | Trung bình | Kết quả ba nhóm; bắt buộc review; không auto-publish |
| Ba cột chật trên laptop | Trung bình | Pane thu gọn; focus mode; tablet breakpoint sớm |
| Bundle tăng | Trung bình | Lazy-load workspace, importer, MathComposer và preview drawer |
| Autosave gây quá tải API | Trung bình | Debounce 2s, hash no-op, AbortController, backoff |

# Thứ tự thực thi khuyến nghị

1. Task 1–5 để có workspace dùng được trên local.
2. Task 6–8 để bảo vệ dữ liệu trước khi mở beta.
3. Task 12–15 để hoàn thiện điểm/validation/publish.
4. Task 22–24 để đủ điều kiện rollout Release A.
5. Task 9–11 phát hành Math composer.
6. Task 16–21 triển khai từng lát năng suất độc lập.

Không thực hiện toàn bộ 24 task trong một commit hoặc một phiên dài. Mỗi task phải được review trước khi sang task kế tiếp; checkpoint bắt buộc chạy full test/build.
