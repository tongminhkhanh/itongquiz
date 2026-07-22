# AI Quiz Generation V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nâng cấp luồng ra đề bằng AI để hạn mức không thể bị né, tài liệu chỉ được gửi một lần, đầu ra được kiểm định bằng mã trước khi hiển thị, chế độ đề thi/ôn tập có hành vi khác nhau, và giáo viên có tiến trình rõ ràng để kiểm tra trước khi lưu.

**Architecture:** Giữ Cloudflare Worker làm ranh giới tin cậy cho mọi yêu cầu AI. Mỗi thao tác AI có `actionId`, `workflow` và `stage`; Worker dùng D1 để giữ chỗ hạn mức, chống trừ lặp, hoàn lượt khi upstream thất bại và giới hạn số lần gọi trong một workflow. Frontend tiếp tục phụ trách trải nghiệm soạn đề, nhưng mọi đầu ra AI được coi là dữ liệu không tin cậy và phải đi qua Zod schema, kiểm tra blueprint, sửa có mục tiêu rồi mới đưa vào `QuizPreview`.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest 4, Cypress 15, Cloudflare Workers, Cloudflare D1, Zod 4, existing AI proxy at `/api/ai/chat`.

## Global Constraints

- Không thêm dependency runtime mới; dùng `zod`, Vitest, Cypress và các tiện ích đang có.
- Không thay đổi schema lưu `quizzes` và `questions` trong giai đoạn này.
- Hạn mức giáo viên giữ nguyên `5` thao tác AI thành công mỗi ngày; admin không giới hạn.
- Một thao tác tạo cả đề hoặc sinh lại một câu chỉ tính một lượt khi bước tạo chính nhận upstream HTTP 2xx.
- OCR, reviewer và một lần sửa có mục tiêu trong cùng `actionId` không tính thêm lượt.
- Auth lỗi, rate-limit lỗi, upstream non-2xx hoặc timeout trước bước tạo chính phải hoàn lại lượt đã giữ.
- Một `actionId` chỉ thuộc một tài khoản và một workflow; tái sử dụng sai trả về HTTP `409`.
- File nguồn tối đa `10 MiB`; chỉ chấp nhận PDF và ảnh JPEG/PNG/WebP.
- Không ghi prompt, nội dung OCR, đáp án, file base64, token hoặc thông tin học sinh vào log.
- Mọi chuỗi giao diện và prompt tiếng Việt phải là UTF-8 có dấu, không còn chuỗi mojibake như `Kh?ng`, `T?I LI?U`.
- Tính năng V2 được bảo vệ bởi `VITE_FEATURE_AI_QUIZ_V2`; mặc định `false` cho đến checkpoint rollout.
- Mỗi task phải chạy test liên quan trước, sau đó chạy `npm run build` tại checkpoint.

---

## File Structure

### Worker security and quota

- Create `workers/migrations/0037_create_ai_generation_actions.sql` — tạo bảng ledger thao tác AI và bảo đảm bảng hạn mức tồn tại bằng migration.
- Create `workers/src/services/teacherAiQuotaLedger.ts` — giữ lượt, hoàn lượt, chốt thành công và hết hạn reservation.
- Create `workers/src/services/aiRequestPolicy.ts` — kiểm tra workflow/stage, giới hạn số lần gọi và thứ tự gọi.
- Modify `workers/src/routes/aiProxy.ts` — áp auth, policy và quota ngay tại ranh giới AI.
- Modify `workers/src/routes/teacherAiQuota.ts` — chỉ đọc ledger/service, không tự tạo bảng khi request chạy.

### Frontend request workflow

- Create `src/services/ai/aiAction.ts` — tạo `actionId` và kiểu metadata dùng chung ở client.
- Modify `src/services/ai/workerAiClient.ts` — gửi metadata, hỗ trợ `AbortSignal`, giữ timeout hiện tại.
- Modify `src/services/ai/extractTextFromPdf.ts` — OCR dùng stage riêng và trả tài liệu có cấu trúc.
- Modify `src/features/quiz-generator/hooks/useQuizGeneration.ts` — một `actionId` xuyên suốt OCR → generate → review/repair.

### Blueprint and validation

- Create `src/features/quiz-generator/domain/quizBlueprint.ts` — ý định đề, phân bổ dạng câu và độ khó.
- Create `src/services/ai/schemas/quizGenerationSchema.ts` — Zod discriminated union cho đầu ra AI.
- Create `src/services/ai/quizAudit.ts` — kiểm tra số lượng, đáp án, độ khó, trùng lặp và cấu trúc.
- Create `src/services/ai/quizRepair.ts` — tạo prompt sửa đúng phần lỗi và hợp nhất kết quả.
- Modify `src/services/ai/prompts/quizPromptBuilder.ts` — yêu cầu chính xác blueprint và khác biệt exam/practice.

### Teacher UX

- Create `src/features/quiz-generator/components/QuestionBlueprintSection.tsx` — chỉnh số câu theo dạng.
- Create `src/features/quiz-generator/components/GenerationProgressPanel.tsx` — hiển thị bước, lỗi và nút hủy.
- Create `src/features/quiz-generator/components/OcrPreviewSection.tsx` — chọn trang OCR trước khi tạo đề.
- Modify `src/components/TeacherDashboard/CreateTab.tsx` — kết nối các phần V2 sau feature flag.
- Modify `src/features/quiz-generator/components/GeneralInfoSection.tsx` — gợi ý AI tiếng Việt và “Áp dụng tất cả”.

### Verification and rollout

- Create `tests/teacherAiQuotaLedger.worker.test.ts`.
- Create `tests/aiProxy.worker.test.ts`.
- Create `tests/quizBlueprint.test.ts`.
- Create `tests/quizGenerationSchema.test.ts`.
- Create `tests/quizRepair.test.ts`.
- Create `tests/utf8SourceGuard.test.ts`.
- Create `cypress/e2e/ai-quiz-generation-v2.cy.ts`.
- Create `docs/runbooks/ai-quiz-generation-v2-rollout.md`.

---

## Phase 1 — Security, quota and request reliability

### Task 1: Persist the AI action ledger in D1

**Files:**
- Create: `workers/migrations/0037_create_ai_generation_actions.sql`
- Create: `workers/src/services/teacherAiQuotaLedger.ts`
- Create: `tests/teacherAiQuotaLedger.worker.test.ts`
- Modify: `workers/src/routes/teacherAiQuota.ts`
- Modify: `tests/d1MigrationLayout.test.ts`

**Interfaces:**
- Consumes: `D1Database`, authenticated `username`, role and Bangkok date key.
- Produces:

```ts
export type AiWorkflow = 'QUIZ_CREATE' | 'QUESTION_REGENERATE' | 'GENERIC';
export type AiActionStatus = 'RESERVED' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED';

export interface AiActionReservation {
  actionId: string;
  workflow: AiWorkflow;
  status: AiActionStatus;
  usedCount: number;
  dailyLimit: number | null;
  wasCreated: boolean;
}

export async function reserveAiAction(
  db: D1Database,
  input: { actionId: string; username: string; role: 'teacher' | 'admin'; workflow: AiWorkflow; now?: Date },
): Promise<AiActionReservation>;

export async function succeedAiAction(db: D1Database, actionId: string, username: string, now?: Date): Promise<void>;
export async function failAiAction(db: D1Database, actionId: string, username: string, failureCode: string, now?: Date): Promise<void>;
export async function expireStaleAiActions(db: D1Database, username: string, now?: Date): Promise<number>;
```

- [ ] **Step 1: Write the migration layout test first**

Update the final assertion in `tests/d1MigrationLayout.test.ts`:

```ts
expect(migrations.at(-1)).toBe('0037_create_ai_generation_actions.sql');
```

Add a test that reads the migration and verifies both tables are migration-owned:

```ts
it('stores teacher AI quota and action reservations in migrations', () => {
  const sql = fs.readFileSync(path.join(migrationsDir, '0037_create_ai_generation_actions.sql'), 'utf8');
  expect(sql).toContain('CREATE TABLE IF NOT EXISTS teacher_ai_daily_usage');
  expect(sql).toContain('CREATE TABLE IF NOT EXISTS ai_generation_actions');
  expect(sql).toContain("CHECK(status IN ('RESERVED', 'SUCCEEDED', 'FAILED', 'EXPIRED'))");
});
```

- [ ] **Step 2: Run the migration test and confirm RED**

Run:

```bash
npx vitest run tests/d1MigrationLayout.test.ts
```

Expected: FAIL because `0037_create_ai_generation_actions.sql` does not exist and the last migration is still `0036`.

- [ ] **Step 3: Create the migration**

Create `workers/migrations/0037_create_ai_generation_actions.sql` with this schema:

```sql
CREATE TABLE IF NOT EXISTS teacher_ai_daily_usage (
  username TEXT NOT NULL,
  usage_date TEXT NOT NULL,
  used_count INTEGER NOT NULL DEFAULT 0 CHECK(used_count >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (username, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_teacher_ai_daily_usage_date
ON teacher_ai_daily_usage(usage_date);

CREATE TABLE IF NOT EXISTS ai_generation_actions (
  action_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  workflow TEXT NOT NULL CHECK(workflow IN ('QUIZ_CREATE', 'QUESTION_REGENERATE', 'GENERIC')),
  status TEXT NOT NULL CHECK(status IN ('RESERVED', 'SUCCEEDED', 'FAILED', 'EXPIRED')),
  usage_date TEXT NOT NULL,
  upstream_calls INTEGER NOT NULL DEFAULT 0 CHECK(upstream_calls >= 0),
  ocr_calls INTEGER NOT NULL DEFAULT 0 CHECK(ocr_calls >= 0),
  generate_calls INTEGER NOT NULL DEFAULT 0 CHECK(generate_calls >= 0),
  review_calls INTEGER NOT NULL DEFAULT 0 CHECK(review_calls >= 0),
  repair_calls INTEGER NOT NULL DEFAULT 0 CHECK(repair_calls >= 0),
  failure_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_actions_user_date
ON ai_generation_actions(username, usage_date, status);

CREATE INDEX IF NOT EXISTS idx_ai_generation_actions_stale
ON ai_generation_actions(status, updated_at);
```

- [ ] **Step 4: Write ledger behavior tests**

In `tests/teacherAiQuotaLedger.worker.test.ts`, cover these exact cases:

```ts
it('reserves one slot only once for the same action id', async () => {
  const first = await reserveAiAction(db, teacherInput);
  const second = await reserveAiAction(db, teacherInput);
  expect(first.wasCreated).toBe(true);
  expect(second.wasCreated).toBe(false);
  expect(db.usedCount).toBe(1);
});

it('releases a reserved slot when the action fails', async () => {
  await reserveAiAction(db, teacherInput);
  await failAiAction(db, teacherInput.actionId, teacherInput.username, 'UPSTREAM_503');
  expect(db.usedCount).toBe(0);
  expect(db.actions.get(teacherInput.actionId)?.status).toBe('FAILED');
});

it('keeps the slot consumed after success', async () => {
  await reserveAiAction(db, teacherInput);
  await succeedAiAction(db, teacherInput.actionId, teacherInput.username);
  expect(db.usedCount).toBe(1);
  expect(db.actions.get(teacherInput.actionId)?.status).toBe('SUCCEEDED');
});

it('rejects the sixth teacher action and leaves used count at five', async () => {
  db.usedCount = 5;
  await expect(reserveAiAction(db, teacherInput)).rejects.toMatchObject({ code: 'AI_DAILY_LIMIT_REACHED' });
  expect(db.usedCount).toBe(5);
});

it('does not persist usage for admins', async () => {
  const result = await reserveAiAction(db, { ...teacherInput, role: 'admin' });
  expect(result.dailyLimit).toBeNull();
  expect(db.usedCount).toBe(0);
});
```

- [ ] **Step 5: Implement the ledger service**

Use D1 conditional updates, not read-then-write JavaScript. `reserveAiAction` must:

1. Expire reservations older than 15 minutes for the same teacher.
2. Return the existing action when `action_id`, `username` and `workflow` match.
3. Throw code `AI_ACTION_CONFLICT` when the same `action_id` belongs to another username or workflow.
4. Insert the daily usage row if absent.
5. Increment `used_count` only when it is below `5`.
6. Insert the action as `RESERVED` only after a slot was obtained.

Use this error class:

```ts
export class AiQuotaError extends Error {
  constructor(public readonly code: 'AI_DAILY_LIMIT_REACHED' | 'AI_ACTION_CONFLICT') {
    super(code === 'AI_DAILY_LIMIT_REACHED'
      ? 'Bạn đã dùng hết 5 lượt tạo đề AI hôm nay.'
      : 'Mã thao tác AI đã được sử dụng cho một yêu cầu khác.');
  }
}
```

`failAiAction` must decrement only when the current status is `RESERVED`; repeated failure calls must be idempotent.

- [ ] **Step 6: Replace runtime table creation in quota route**

Remove `ensureTeacherAiQuotaTable` from `workers/src/routes/teacherAiQuota.ts`. Keep `GET /api/teacher-ai-quota`; deprecate `POST /consume` by returning:

```ts
return jsonResponse({
  status: 'error',
  code: 'AI_QUOTA_CONSUME_MOVED',
  message: 'Hạn mức AI được tính tự động khi yêu cầu AI thành công.',
}, 410);
```

- [ ] **Step 7: Verify and commit**

Run:

```bash
npx vitest run tests/d1MigrationLayout.test.ts tests/teacherAiQuotaLedger.worker.test.ts
```

Expected: PASS.

Commit:

```bash
git add workers/migrations/0037_create_ai_generation_actions.sql workers/src/services/teacherAiQuotaLedger.ts workers/src/routes/teacherAiQuota.ts tests/d1MigrationLayout.test.ts tests/teacherAiQuotaLedger.worker.test.ts
git commit -m "feat(ai): add idempotent teacher quota ledger"
```

---

### Task 2: Enforce workflow policy inside `/api/ai/chat`

**Files:**
- Create: `workers/src/services/aiRequestPolicy.ts`
- Create: `tests/aiProxy.worker.test.ts`
- Modify: `workers/src/routes/aiProxy.ts`
- Modify: `workers/src/index.ts`

**Interfaces:**
- Consumes: ledger functions from Task 1 and authenticated JWT payload.
- Produces:

```ts
export type AiStage = 'OCR' | 'GENERATE' | 'REVIEW' | 'REPAIR' | 'REGENERATE' | 'GENERIC';

export interface AiRequestMeta {
  actionId: string;
  workflow: 'QUIZ_CREATE' | 'QUESTION_REGENERATE' | 'GENERIC';
  stage: AiStage;
}

export function parseAiRequestMeta(raw: unknown): AiRequestMeta;
export async function authorizeAiStage(db: D1Database, username: string, meta: AiRequestMeta): Promise<void>;
export async function recordAiStageSuccess(db: D1Database, username: string, meta: AiRequestMeta): Promise<void>;
```

- [ ] **Step 1: Write policy tests first**

Add tests for:

```ts
it('rejects teacher AI requests without metadata', async () => {
  currentUser = { username: 'teacher-a', role: 'teacher' };
  const response = await handleAiProxy(request({ model: 'gemini-2.5-flash', messages: [{}] }), env, '/api/ai/chat', 'POST');
  expect(response?.status).toBe(400);
  await expect(response?.json()).resolves.toMatchObject({ code: 'AI_META_REQUIRED' });
});

it('allows at most OCR -> GENERATE -> REVIEW for one quiz action', async () => {
  await call('OCR');
  await call('GENERATE');
  await call('REVIEW');
  const fourth = await call('REVIEW');
  expect(fourth.status).toBe(409);
});

it('returns 403 when a student requests QUIZ_CREATE', async () => {
  currentUser = { username: 'student-a', role: 'student' };
  const response = await call('GENERATE', 'QUIZ_CREATE');
  expect(response.status).toBe(403);
});

it('releases the reservation on upstream 503 during GENERATE', async () => {
  upstream.mockResolvedValue(new Response('down', { status: 503 }));
  const response = await call('GENERATE');
  expect(response.status).toBe(503);
  expect(db.action.status).toBe('FAILED');
  expect(db.usedCount).toBe(0);
});
```

- [ ] **Step 2: Run tests and confirm RED**

```bash
npx vitest run tests/aiProxy.worker.test.ts
```

Expected: FAIL because metadata and workflow policy do not exist.

- [ ] **Step 3: Implement metadata parsing**

`parseAiRequestMeta` must accept only this body field:

```json
{
  "_meta": {
    "actionId": "ai-<uuid>",
    "workflow": "QUIZ_CREATE",
    "stage": "GENERATE"
  }
}
```

Validation rules:

```ts
const ACTION_ID = /^ai-[a-z0-9-]{20,80}$/i;
const WORKFLOWS = new Set(['QUIZ_CREATE', 'QUESTION_REGENERATE', 'GENERIC']);
const STAGES = new Set(['OCR', 'GENERATE', 'REVIEW', 'REPAIR', 'REGENERATE', 'GENERIC']);
```

Return code `AI_META_REQUIRED` for missing metadata and `AI_META_INVALID` for malformed metadata.

- [ ] **Step 4: Implement the workflow state machine**

Use these hard limits:

| Workflow | Allowed stages | Count limits | Required order |
|---|---|---:|---|
| `QUIZ_CREATE` | `OCR`, `GENERATE`, `REVIEW`, `REPAIR` | each at most 1 | OCR optional; GENERATE before REVIEW/REPAIR |
| `QUESTION_REGENERATE` | `REGENERATE` | exactly 1 | no other stage |
| `GENERIC` | `GENERIC` | exactly 1 | no other stage |

Return `409` with code `AI_STAGE_CONFLICT` when order or count is invalid.

- [ ] **Step 5: Integrate quota around the upstream fetch**

For teacher/admin workflows:

```ts
const reservation = await reserveAiAction(env.DB, {
  actionId: meta.actionId,
  username: authResult.user.username,
  role: authResult.user.role === 'admin' ? 'admin' : 'teacher',
  workflow: meta.workflow,
});

try {
  await authorizeAiStage(env.DB, authResult.user.username, meta);
  const aiResponse = await fetch(upstreamUrl, upstreamInit);
  if (!aiResponse.ok) {
    if (meta.stage === 'OCR' || meta.stage === 'GENERATE' || meta.stage === 'REGENERATE' || meta.stage === 'GENERIC') {
      await failAiAction(env.DB, meta.actionId, authResult.user.username, `UPSTREAM_${aiResponse.status}`);
    }
    return errorResponse(`AI service error (${aiResponse.status})`, aiResponse.status);
  }
  await recordAiStageSuccess(env.DB, authResult.user.username, meta);
  if (meta.stage === 'GENERATE' || meta.stage === 'REGENERATE' || meta.stage === 'GENERIC') {
    await succeedAiAction(env.DB, meta.actionId, authResult.user.username);
  }
  return proxyResponse(aiResponse);
} catch (error) {
  await failAiAction(env.DB, meta.actionId, authResult.user.username, 'UPSTREAM_NETWORK_ERROR');
  return errorResponse('Dịch vụ AI tạm thời không khả dụng.', 503);
}
```

Admin requests use the same policy but do not update usage count.

- [ ] **Step 6: Keep route-level rate limiting closed**

Retain the existing `10 requests/minute` rate limit for `/api/ai/*`. Change its key to include authenticated role and path only after auth is resolved; do not put username into logs or response.

- [ ] **Step 7: Verify and commit**

```bash
npx vitest run tests/aiProxy.worker.test.ts tests/teacherAiQuotaLedger.worker.test.ts
```

Expected: PASS.

Commit:

```bash
git add workers/src/services/aiRequestPolicy.ts workers/src/routes/aiProxy.ts workers/src/index.ts tests/aiProxy.worker.test.ts
git commit -m "fix(ai): enforce quota at the worker boundary"
```

---

### Task 3: Add action metadata and cancellation to the client

**Files:**
- Create: `src/services/ai/aiAction.ts`
- Modify: `src/services/ai/workerAiClient.ts`
- Modify: `src/services/ai/__tests__/workerAiClient.test.ts`

**Interfaces:**
- Consumes: `AiRequestMeta` wire shape from Task 2.
- Produces:

```ts
export interface ClientAiAction {
  actionId: string;
  workflow: 'QUIZ_CREATE' | 'QUESTION_REGENERATE' | 'GENERIC';
}

export const createAiAction = (workflow: ClientAiAction['workflow']): ClientAiAction;

export interface WorkerAiRequestOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  action: ClientAiAction & { stage: 'OCR' | 'GENERATE' | 'REVIEW' | 'REPAIR' | 'REGENERATE' | 'GENERIC' };
}
```

- [ ] **Step 1: Extend the existing client tests**

Add assertions:

```ts
it('sends the action envelope without exposing auth tokens', async () => {
  const action = { actionId: 'ai-1234567890abcdefghij', workflow: 'QUIZ_CREATE' as const, stage: 'GENERATE' as const };
  await requestWorkerAiText({ model: 'gemini-2.5-flash', messages: [{}] }, { action });
  const body = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body));
  expect(body._meta).toEqual(action);
  expect((fetchSpy.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBeUndefined();
});

it('aborts when the caller cancels', async () => {
  const controller = new AbortController();
  fetchSpy.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  }));
  const promise = requestWorkerAiText(payload, { action, signal: controller.signal });
  controller.abort();
  await expect(promise).rejects.toThrow('Đã hủy yêu cầu AI.');
});
```

- [ ] **Step 2: Run tests and confirm RED**

```bash
npx vitest run src/services/ai/__tests__/workerAiClient.test.ts
```

Expected: FAIL because the options do not contain `action` or `signal`.

- [ ] **Step 3: Implement action IDs**

```ts
export const createAiAction = (workflow: ClientAiAction['workflow']): ClientAiAction => ({
  actionId: `ai-${crypto.randomUUID()}`,
  workflow,
});
```

Do not store action IDs in localStorage.

- [ ] **Step 4: Merge timeout and caller cancellation**

Use one internal `AbortController`. Forward caller abort to it and distinguish messages:

```ts
if (options.signal?.aborted) throw new Error('Đã hủy yêu cầu AI.');
const onAbort = () => controller.abort('caller');
options.signal?.addEventListener('abort', onAbort, { once: true });
const timeoutId = setTimeout(() => controller.abort('timeout'), options.timeoutMs ?? 300_000);
```

In `catch`, return:

- caller cancelled → `Đã hủy yêu cầu AI.`
- timeout → `Yêu cầu AI quá thời gian. Vui lòng thử lại.`

Always remove the listener in `finally`.

- [ ] **Step 5: Verify and commit**

```bash
npx vitest run src/services/ai/__tests__/workerAiClient.test.ts
```

Expected: PASS.

Commit:

```bash
git add src/services/ai/aiAction.ts src/services/ai/workerAiClient.ts src/services/ai/__tests__/workerAiClient.test.ts
git commit -m "feat(ai): add cancellable action-scoped requests"
```

---

### Task 4: Use one action for OCR, generation and review

**Files:**
- Modify: `src/features/quiz-generator/hooks/useQuizGeneration.ts`
- Modify: `src/services/ai/extractTextFromPdf.ts`
- Modify: `src/services/geminiService.ts`
- Modify: `src/services/ai/providers/openaiProvider.ts`
- Modify: `src/services/ai/providers/geminiProvider.ts`
- Test: `tests/quizGenerationWorkflow.test.ts`

**Interfaces:**
- Consumes: `createAiAction`, `WorkerAiRequestOptions` from Task 3.
- Produces:

```ts
export interface QuizAiExecutionContext {
  action: ClientAiAction;
  signal?: AbortSignal;
}
```

- [ ] **Step 1: Write workflow tests**

Mock `extractTextFromPdf` and `generateQuiz` and assert:

```ts
it('uses the same action id for OCR, generate and review', async () => {
  await runPdfGeneration();
  const ocrContext = extractMock.mock.calls[0][2];
  const generationContext = generateMock.mock.calls[0][8];
  expect(ocrContext.action.actionId).toBe(generationContext.action.actionId);
  expect(ocrContext.stage).toBe('OCR');
  expect(generationContext.stage).toBe('GENERATE');
});

it('does not attach the original file after OCR succeeds', async () => {
  await runPdfGeneration();
  expect(generateMock.mock.calls[0][3]).toBeUndefined();
  expect(String(generateMock.mock.calls[0][2])).toContain('NỘI DUNG OCR');
});

it('uses a new QUESTION_REGENERATE action for a manual single-question retry', async () => {
  await regenerate(question);
  expect(generateMock.mock.calls[0][8].action.workflow).toBe('QUESTION_REGENERATE');
  expect(generateMock.mock.calls[0][8].stage).toBe('REGENERATE');
});
```

- [ ] **Step 2: Run test and confirm RED**

```bash
npx vitest run tests/quizGenerationWorkflow.test.ts
```

Expected: FAIL because the workflow context is not propagated.

- [ ] **Step 3: Create and retain one action in `handleGenerate`**

At the start of a validated request:

```ts
const action = createAiAction('QUIZ_CREATE');
const controller = new AbortController();
setActiveGeneration({ actionId: action.actionId, controller });
```

Pass stage `OCR` to extraction, stage `GENERATE` to the generator and stage `REVIEW` to reviewer calls.

- [ ] **Step 4: Stop sending the file twice**

After OCR succeeds:

```ts
generationContent = [form.content.trim(), formatOcrSource(ocrDocument)].filter(Boolean).join('\n\n');
generationFile = undefined;
```

The provider must receive `undefined` for `file` in PDF mode after OCR. Image questions from the image library remain unaffected.

- [ ] **Step 5: Preserve one automatic repair/reviewer call**

`validateQuizWithAI` receives the same `actionId` with stage `REVIEW`. It must not create a new action.

- [ ] **Step 6: Expose cancellation from the hook**

Return:

```ts
cancelGeneration: () => activeGeneration?.controller.abort(),
```

Clear `activeGeneration` in `finally`.

- [ ] **Step 7: Verify and commit**

```bash
npx vitest run tests/quizGenerationWorkflow.test.ts src/services/ai/__tests__/workerAiClient.test.ts
```

Expected: PASS.

Commit:

```bash
git add src/features/quiz-generator/hooks/useQuizGeneration.ts src/services/ai/extractTextFromPdf.ts src/services/geminiService.ts src/services/ai/providers/openaiProvider.ts src/services/ai/providers/geminiProvider.ts tests/quizGenerationWorkflow.test.ts
git commit -m "fix(ai): keep document generation in one quota action"
```

---

### Checkpoint A: Security and cost controls

- [ ] Apply migration locally:

```bash
npx wrangler d1 migrations apply itongquiz-db --local --config workers/wrangler.toml
```

Expected: `0037_create_ai_generation_actions.sql` applied successfully.

- [ ] Run focused tests:

```bash
npx vitest run tests/d1MigrationLayout.test.ts tests/teacherAiQuotaLedger.worker.test.ts tests/aiProxy.worker.test.ts tests/quizGenerationWorkflow.test.ts src/services/ai/__tests__/workerAiClient.test.ts
```

Expected: PASS.

- [ ] Run production build:

```bash
npm run build
```

Expected: exit code `0`.

- [ ] Human review before Phase 2: verify the exact quota semantics and whether one manual single-question regeneration should consume one lượt.

---

## Phase 2 — Blueprint, deterministic validation and targeted repair

### Task 5: Separate quiz intent from content source and define a blueprint

**Files:**
- Create: `src/features/quiz-generator/domain/quizBlueprint.ts`
- Create: `tests/quizBlueprint.test.ts`
- Modify: `src/features/quiz-generator/domain/quizCreation.types.ts`
- Modify: `src/features/quiz-generator/domain/buildQuizGenerationRequest.ts`
- Modify: `src/services/geminiService.ts`

**Interfaces:**

```ts
export type QuizIntent = 'EXAM' | 'PRACTICE';
export type QuizSourceMode = 'TOPIC' | 'DOCUMENT';

export interface QuestionTypeAllocation {
  type: QuestionType;
  count: number;
}

export interface QuizBlueprint {
  intent: QuizIntent;
  sourceMode: QuizSourceMode;
  totalQuestions: number;
  typeAllocations: QuestionTypeAllocation[];
  difficultyLevels: { level1: number; level2: number; level3: number };
}

export function buildBalancedTypeAllocations(types: QuestionType[], total: number): QuestionTypeAllocation[];
export function validateQuizBlueprint(blueprint: QuizBlueprint): string[];
```

- [ ] **Step 1: Write blueprint tests**

```ts
it('distributes ten questions across four types without changing the total', () => {
  const result = buildBalancedTypeAllocations([
    QuestionType.MCQ,
    QuestionType.TRUE_FALSE,
    QuestionType.SHORT_ANSWER,
    QuestionType.MATCHING,
  ], 10);
  expect(result.map(item => item.count)).toEqual([3, 3, 2, 2]);
  expect(result.reduce((sum, item) => sum + item.count, 0)).toBe(10);
});

it('rejects mismatched type and difficulty totals', () => {
  expect(validateQuizBlueprint({
    intent: 'EXAM',
    sourceMode: 'TOPIC',
    totalQuestions: 10,
    typeAllocations: [{ type: QuestionType.MCQ, count: 9 }],
    difficultyLevels: { level1: 3, level2: 5, level3: 2 },
  })).toContain('Tổng số câu theo dạng phải bằng 10.');
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx vitest run tests/quizBlueprint.test.ts
```

- [ ] **Step 3: Implement deterministic balancing**

Allocate `Math.floor(total / typeCount)` to every selected type, then distribute the remainder from the first selected type onward. Reject total outside `1..40` and negative allocations.

- [ ] **Step 4: Add blueprint to generation options**

Extend `QuizGenerationOptions`:

```ts
blueprint: QuizBlueprint;
```

Keep legacy fields during the feature-flag period, but derive them from blueprint in one adapter so the prompt has a single source of truth.

- [ ] **Step 5: Verify and commit**

```bash
npx vitest run tests/quizBlueprint.test.ts tests/quizCreationDomain.test.ts
```

Commit:

```bash
git add src/features/quiz-generator/domain/quizBlueprint.ts src/features/quiz-generator/domain/quizCreation.types.ts src/features/quiz-generator/domain/buildQuizGenerationRequest.ts src/services/geminiService.ts tests/quizBlueprint.test.ts
git commit -m "feat(ai): define an explicit quiz blueprint"
```

---

### Task 6: Make EXAM and PRACTICE prompts materially different

**Files:**
- Modify: `src/services/ai/prompts/quizPromptBuilder.ts`
- Create: `tests/quizPromptBuilder.test.ts`

**Interfaces:**
- Consumes: `QuizBlueprint` from Task 5.
- Produces: prompt text with exact type counts and intent rules.

- [ ] **Step 1: Write prompt contract tests**

```ts
it('writes exact question counts for every selected type', () => {
  const prompt = buildPrompt('Phân số', '4', '', optionsWithBlueprint);
  expect(prompt).toContain('MCQ: 4 câu');
  expect(prompt).toContain('TRUE_FALSE: 2 câu');
  expect(prompt).toContain('SHORT_ANSWER: 2 câu');
  expect(prompt).toContain('MATCHING: 2 câu');
});

it('uses exam rules without hints', () => {
  const prompt = buildPrompt('Phân số', '4', '', examOptions);
  expect(prompt).toContain('[INTENT: EXAM]');
  expect(prompt).toContain('Không đưa gợi ý trong nội dung câu hỏi');
});

it('uses practice rules with learning feedback', () => {
  const prompt = buildPrompt('Phân số', '4', '', practiceOptions);
  expect(prompt).toContain('[INTENT: PRACTICE]');
  expect(prompt).toContain('Lời giải phải hướng dẫn từng bước');
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx vitest run tests/quizPromptBuilder.test.ts
```

- [ ] **Step 3: Add exact intent sections**

Use these rules:

```ts
const INTENT_PROMPTS = {
  EXAM: `
[INTENT: EXAM]
- Câu hỏi ngắn gọn, trung lập, không đưa gợi ý trong nội dung câu hỏi.
- Không lặp cùng một kỹ năng bằng cách đổi số đơn giản.
- Phương án nhiễu phải hợp lý nhưng chỉ có đúng số đáp án theo schema.
- explanation vẫn phải đầy đủ để giáo viên duyệt, nhưng không xuất hiện khi học sinh đang làm bài.`,
  PRACTICE: `
[INTENT: PRACTICE]
- Sắp xếp từ kiến thức cốt lõi đến vận dụng.
- Lời giải phải hướng dẫn từng bước, nêu lỗi sai thường gặp và một mẹo nhớ ngắn.
- Ngôn ngữ khuyến khích, không gây áp lực.`,
} as const;
```

Print a `TYPE ALLOCATION` block with one line per type and require exact equality.

- [ ] **Step 4: Verify and commit**

```bash
npx vitest run tests/quizPromptBuilder.test.ts tests/quizCreationDomain.test.ts
```

Commit:

```bash
git add src/services/ai/prompts/quizPromptBuilder.ts tests/quizPromptBuilder.test.ts
git commit -m "feat(ai): distinguish exam and practice generation"
```

---

### Task 7: Validate every generated question with Zod

**Files:**
- Create: `src/services/ai/schemas/quizGenerationSchema.ts`
- Create: `tests/quizGenerationSchema.test.ts`
- Modify: `src/services/ai/utils/jsonRepair.ts`

**Interfaces:**

```ts
export const GeneratedQuizSchema: z.ZodType<GeneratedQuizPayload>;
export function parseGeneratedQuiz(raw: unknown): GeneratedQuizPayload;
```

The root payload must contain:

```ts
interface GeneratedQuizPayload {
  title: string;
  detectedCategory?: string;
  detectedLesson?: string;
  suggestedTags?: string[];
  questions: Question[];
}
```

- [ ] **Step 1: Write schema tests for valid and invalid structures**

Cover at minimum:

```ts
it('rejects MCQ when correctAnswer is outside the option range', () => {
  expect(() => parseGeneratedQuiz({
    title: 'Đề',
    questions: [{ type: 'MCQ', question: '1 + 1 = ?', options: ['1', '2'], correctAnswer: 'D', explanation: '...' }],
  })).toThrow();
});

it('rejects empty categorization content instead of inventing placeholders', () => {
  expect(() => parseGeneratedQuiz({
    title: 'Đề',
    questions: [{
      type: 'CATEGORIZATION', question: 'Phân loại',
      categories: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
      items: [{ id: 'i1', content: '', categoryId: 'a' }], explanation: '...',
    }],
  })).toThrow();
});

it('accepts a matching question with three unique pairs', () => {
  expect(parseGeneratedQuiz(validMatching).questions).toHaveLength(1);
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx vitest run tests/quizGenerationSchema.test.ts
```

- [ ] **Step 3: Implement discriminated schemas**

Create schemas for every type currently selectable in `QuestionTypeSelector.tsx`. Common fields:

```ts
const CommonQuestionSchema = z.object({
  id: z.string().optional(),
  question: z.string().trim().min(1).max(4000),
  explanation: z.string().trim().min(1).max(6000),
  difficultyLevel: z.number().int().min(1).max(3),
});
```

Use `.superRefine` for cross-field rules:

- MCQ answer letter must reference an existing option.
- MULTIPLE_SELECT must have 2–3 unique answers.
- TRUE_FALSE must have 2–4 items.
- MATCHING must have 3–6 non-empty pairs.
- DRAG_DROP placeholder count must equal `blanks.length`.
- CATEGORIZATION category IDs must exist and every item content must be non-empty.
- ORDERING `correctOrder` must be a permutation of item indexes/IDs.

- [ ] **Step 4: Stop silent placeholder repair**

In `jsonRepair.ts`, retain math normalization and metadata normalization, but remove code that inserts `(Mục 1)` or assigns the first category when data is missing. Invalid structures must surface to the audit/repair layer.

- [ ] **Step 5: Verify and commit**

```bash
npx vitest run tests/quizGenerationSchema.test.ts tests/mathObservability.worker.test.ts
```

Commit:

```bash
git add src/services/ai/schemas/quizGenerationSchema.ts src/services/ai/utils/jsonRepair.ts tests/quizGenerationSchema.test.ts
git commit -m "feat(ai): validate generated quizzes with strict schemas"
```

---

### Task 8: Audit blueprint compliance and duplicate questions

**Files:**
- Create: `src/services/ai/quizAudit.ts`
- Create: `tests/quizAudit.test.ts`

**Interfaces:**

```ts
export type QuizAuditCode =
  | 'QUESTION_COUNT_MISMATCH'
  | 'TYPE_COUNT_MISMATCH'
  | 'DIFFICULTY_COUNT_MISMATCH'
  | 'DUPLICATE_QUESTION'
  | 'INVALID_ANSWER'
  | 'MISSING_EXPLANATION';

export interface QuizAuditIssue {
  code: QuizAuditCode;
  questionIndexes: number[];
  message: string;
  repairable: boolean;
}

export function auditGeneratedQuiz(quiz: GeneratedQuizPayload, blueprint: QuizBlueprint): QuizAuditIssue[];
```

- [ ] **Step 1: Write audit tests**

```ts
it('reports a missing question instead of slicing silently', () => {
  const issues = auditGeneratedQuiz(quizWithNineQuestions, blueprintForTen);
  expect(issues).toContainEqual(expect.objectContaining({ code: 'QUESTION_COUNT_MISMATCH', repairable: true }));
});

it('reports near-duplicate questions after normalizing numbers and punctuation', () => {
  const issues = auditGeneratedQuiz(quizWithNearDuplicates, blueprint);
  expect(issues.some(issue => issue.code === 'DUPLICATE_QUESTION')).toBe(true);
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx vitest run tests/quizAudit.test.ts
```

- [ ] **Step 3: Implement deterministic checks**

Use normalized token Jaccard similarity without a dependency:

```ts
const similarity = (left: string, right: string): number => {
  const a = new Set(normalize(left).split(' ').filter(Boolean));
  const b = new Set(normalize(right).split(' ').filter(Boolean));
  const intersection = [...a].filter(token => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
};
```

Flag pairs at `>= 0.88`. Do not log full question text.

- [ ] **Step 4: Verify and commit**

```bash
npx vitest run tests/quizAudit.test.ts tests/quizGenerationSchema.test.ts
```

Commit:

```bash
git add src/services/ai/quizAudit.ts tests/quizAudit.test.ts
git commit -m "feat(ai): audit generated quiz blueprints"
```

---

### Task 9: Repair only missing or invalid questions once

**Files:**
- Create: `src/services/ai/quizRepair.ts`
- Create: `tests/quizRepair.test.ts`
- Modify: `src/services/geminiService.ts`
- Modify: `src/services/ai/providers/openaiProvider.ts`
- Modify: `src/services/ai/providers/geminiProvider.ts`

**Interfaces:**

```ts
export interface QuizRepairRequest {
  blueprint: QuizBlueprint;
  quiz: GeneratedQuizPayload;
  issues: QuizAuditIssue[];
}

export function buildQuizRepairPrompt(input: QuizRepairRequest): string;
export function mergeRepairedQuestions(
  original: GeneratedQuizPayload,
  repaired: GeneratedQuizPayload,
  issues: QuizAuditIssue[],
): GeneratedQuizPayload;
```

- [ ] **Step 1: Write repair tests**

```ts
it('requests exactly the two missing questions', () => {
  const prompt = buildQuizRepairPrompt({ blueprint, quiz: eightQuestionQuiz, issues: missingTwoIssues });
  expect(prompt).toContain('Tạo đúng 2 câu thay thế');
  expect(prompt).not.toContain(JSON.stringify(eightQuestionQuiz.questions));
});

it('replaces only invalid indexes and keeps valid question ids', () => {
  const merged = mergeRepairedQuestions(original, repaired, [{
    code: 'INVALID_ANSWER', questionIndexes: [3], message: '...', repairable: true,
  }]);
  expect(merged.questions[0]).toBe(original.questions[0]);
  expect(merged.questions[3].id).toBe(original.questions[3].id);
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx vitest run tests/quizRepair.test.ts
```

- [ ] **Step 3: Implement one repair pass**

Generation pipeline:

```ts
const parsedDraft = parseGeneratedQuiz(rawDraft);
const issues = auditGeneratedQuiz(parsedDraft, options.blueprint);
if (issues.some(issue => !issue.repairable)) throw new QuizGenerationValidationError(issues);

let finalQuiz = parsedDraft;
if (issues.length > 0) {
  onStepChange?.('repairing');
  const repairedRaw = await requestWorkerAiText(repairRequest, {
    action: { ...execution.action, stage: 'REPAIR' },
    signal: execution.signal,
  });
  finalQuiz = mergeRepairedQuestions(parsedDraft, parseGeneratedQuiz(parseAndRepairJSON(repairedRaw)), issues);
}

const remainingIssues = auditGeneratedQuiz(finalQuiz, options.blueprint);
if (remainingIssues.length > 0) throw new QuizGenerationValidationError(remainingIssues);
```

Allow exactly one repair call. Do not recursively retry.

- [ ] **Step 4: Keep reviewer optional and deterministic validation mandatory**

If reviewer fails, keep the deterministically valid result. If schema or audit fails, do not show the quiz even when reviewer returns a response.

- [ ] **Step 5: Verify and commit**

```bash
npx vitest run tests/quizRepair.test.ts tests/quizAudit.test.ts tests/quizGenerationSchema.test.ts
```

Commit:

```bash
git add src/services/ai/quizRepair.ts src/services/geminiService.ts src/services/ai/providers/openaiProvider.ts src/services/ai/providers/geminiProvider.ts tests/quizRepair.test.ts
git commit -m "feat(ai): repair only invalid generated questions"
```

---

### Checkpoint B: Question quality engine

- [ ] Run domain and AI tests:

```bash
npx vitest run tests/quizBlueprint.test.ts tests/quizPromptBuilder.test.ts tests/quizGenerationSchema.test.ts tests/quizAudit.test.ts tests/quizRepair.test.ts tests/quizCreationDomain.test.ts
```

Expected: PASS.

- [ ] Run all tests:

```bash
npm run test:run
```

Expected: PASS.

- [ ] Run build:

```bash
npm run build
```

Expected: exit code `0`.

- [ ] Human review: generate fixtures for Toán, Tiếng Việt and Tiếng Anh, then verify exact type/difficulty counts and no duplicate questions.

---

## Phase 3 — Teacher UX, OCR review and rollout

### Task 10: Add a visible question blueprint editor

**Files:**
- Create: `src/features/quiz-generator/components/QuestionBlueprintSection.tsx`
- Modify: `src/features/quiz-generator/components/QuestionSettingsSection.tsx`
- Modify: `src/components/teacher/QuizCreator/DifficultyLevelSelector.tsx`
- Modify: `src/features/quiz-generator/hooks/useQuizFormState.ts`
- Test: `tests/QuestionBlueprintSection.test.tsx`

**Interfaces:**
- Consumes: `QuizBlueprint`, `buildBalancedTypeAllocations`, validation errors.
- Produces: a valid blueprint before the generate button becomes enabled.

- [ ] **Step 1: Write component tests**

```tsx
it('keeps total question count unchanged when auto balancing types', async () => {
  render(<Harness />);
  await user.click(screen.getByRole('button', { name: 'AI tự cân đối' }));
  expect(screen.getByText('Tổng: 10 câu')).toBeInTheDocument();
  expect(screen.getAllByRole('spinbutton').map(input => Number((input as HTMLInputElement).value)).reduce((a, b) => a + b, 0)).toBe(10);
});

it('shows a blocking message when type totals do not match', async () => {
  render(<Harness />);
  await user.clear(screen.getByLabelText('Số câu Trắc nghiệm'));
  await user.type(screen.getByLabelText('Số câu Trắc nghiệm'), '9');
  expect(screen.getByText('Tổng số câu theo dạng phải bằng 10.')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx vitest run tests/QuestionBlueprintSection.test.tsx
```

- [ ] **Step 3: Implement the editor**

UI requirements:

- Intent cards: `Đề thi` and `Ôn tập`.
- One row per selected question type with `-`, numeric input and `+`.
- `AI tự cân đối` calls `buildBalancedTypeAllocations`.
- Total mismatch appears in red and disables generation.
- Difficulty inputs remain 0–40 and show the same total.
- On mobile, rows stack without horizontal scrolling.

- [ ] **Step 4: Remove `any` from `QuestionSettingsSection`**

Replace:

```ts
setDifficultyLevels: (v: any) => void;
```

with:

```ts
setDifficultyLevels: (value: DifficultyLevels) => void;
```

- [ ] **Step 5: Verify and commit**

```bash
npx vitest run tests/QuestionBlueprintSection.test.tsx tests/quizBlueprint.test.ts
```

Commit:

```bash
git add src/features/quiz-generator/components/QuestionBlueprintSection.tsx src/features/quiz-generator/components/QuestionSettingsSection.tsx src/components/teacher/QuizCreator/DifficultyLevelSelector.tsx src/features/quiz-generator/hooks/useQuizFormState.ts tests/QuestionBlueprintSection.test.tsx
git commit -m "feat(ai): add teacher-controlled question blueprint"
```

---

### Task 11: Show generation progress and support cancel

**Files:**
- Create: `src/features/quiz-generator/components/GenerationProgressPanel.tsx`
- Modify: `src/components/TeacherDashboard/CreateTab.tsx`
- Modify: `src/features/quiz-generator/hooks/useCreateQuizLogic.ts`
- Modify: `src/features/quiz-generator/hooks/useQuizGeneration.ts`
- Test: `tests/GenerationProgressPanel.test.tsx`

**Interfaces:**

```ts
export type GenerationStep =
  | 'idle'
  | 'reading_document'
  | 'generating'
  | 'reviewing'
  | 'repairing'
  | 'completed'
  | 'cancelled';
```

- [ ] **Step 1: Write UI tests**

```tsx
it('shows the active step and cancels the request', async () => {
  const onCancel = vi.fn();
  render(<GenerationProgressPanel step="reading_document" onCancel={onCancel} />);
  expect(screen.getByText('Đang đọc tài liệu')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Hủy tạo đề' }));
  expect(onCancel).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx vitest run tests/GenerationProgressPanel.test.tsx
```

- [ ] **Step 3: Implement exact labels**

```ts
const STEP_COPY = {
  idle: '',
  reading_document: 'Đang đọc tài liệu',
  generating: 'Đang tạo câu hỏi',
  reviewing: 'Đang kiểm tra đáp án',
  repairing: 'Đang sửa các câu chưa đạt',
  completed: 'Đã hoàn thành',
  cancelled: 'Đã hủy yêu cầu',
} as const;
```

Display no fake percentages. Use a stepper with completed/current/upcoming states.

- [ ] **Step 4: Connect cancel and sticky actions**

When generating, replace the generate buttons with the panel and one `Hủy tạo đề` button. After cancellation, preserve form input and do not decrement quota if the main generation request never received upstream 2xx.

- [ ] **Step 5: Verify and commit**

```bash
npx vitest run tests/GenerationProgressPanel.test.tsx tests/quizGenerationWorkflow.test.ts
```

Commit:

```bash
git add src/features/quiz-generator/components/GenerationProgressPanel.tsx src/components/TeacherDashboard/CreateTab.tsx src/features/quiz-generator/hooks/useCreateQuizLogic.ts src/features/quiz-generator/hooks/useQuizGeneration.ts tests/GenerationProgressPanel.test.tsx
git commit -m "feat(ai): show progress and allow cancellation"
```

---

### Task 12: Return structured OCR pages and let teachers select them

**Files:**
- Create: `src/features/quiz-generator/components/OcrPreviewSection.tsx`
- Create: `src/services/ai/schemas/ocrDocumentSchema.ts`
- Modify: `src/services/ai/extractTextFromPdf.ts`
- Modify: `src/features/quiz-generator/hooks/useQuizFormState.ts`
- Modify: `src/components/TeacherDashboard/CreateTab.tsx`
- Test: `tests/OcrPreviewSection.test.tsx`

**Interfaces:**

```ts
export interface OcrPage {
  pageNumber: number;
  text: string;
}

export interface OcrDocument {
  pages: OcrPage[];
  warnings: string[];
  wasTruncated: boolean;
}
```

- [ ] **Step 1: Write OCR schema and UI tests**

```ts
it('rejects empty OCR pages', () => {
  expect(() => parseOcrDocument({ pages: [{ pageNumber: 1, text: '' }], warnings: [], wasTruncated: false })).toThrow();
});
```

```tsx
it('generates content from selected pages only', async () => {
  render(<Harness pages={[page1, page2, page3]} />);
  await user.click(screen.getByLabelText('Trang 2'));
  expect(onChange).toHaveBeenLastCalledWith([1, 3]);
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx vitest run tests/OcrPreviewSection.test.tsx tests/ocrDocumentSchema.test.ts
```

- [ ] **Step 3: Change the OCR prompt to JSON**

Require this exact shape:

```json
{
  "pages": [{ "pageNumber": 1, "text": "..." }],
  "warnings": [],
  "wasTruncated": false
}
```

Use `response_format: { "type": "json_object" }`. Limit each page text to `20,000` characters and total selected text to `60,000` characters.

- [ ] **Step 4: Implement preview behavior**

- All non-empty pages selected by default.
- Show page number and first 220 characters.
- Show `Tài liệu đã bị cắt bớt` when `wasTruncated` is true.
- Require at least one selected page.
- Generation concatenates only selected pages with markers `=== TRANG N ===`.

- [ ] **Step 5: Verify and commit**

```bash
npx vitest run tests/OcrPreviewSection.test.tsx tests/ocrDocumentSchema.test.ts tests/quizGenerationWorkflow.test.ts
```

Commit:

```bash
git add src/features/quiz-generator/components/OcrPreviewSection.tsx src/services/ai/schemas/ocrDocumentSchema.ts src/services/ai/extractTextFromPdf.ts src/features/quiz-generator/hooks/useQuizFormState.ts src/components/TeacherDashboard/CreateTab.tsx tests/OcrPreviewSection.test.tsx tests/ocrDocumentSchema.test.ts
git commit -m "feat(ai): add selectable OCR page preview"
```

---

### Task 13: Finish Vietnamese copy and AI suggestions

**Files:**
- Modify: `src/features/quiz-generator/components/GeneralInfoSection.tsx`
- Modify: `src/features/quiz-generator/components/PedagogicalProfileSection.tsx`
- Modify: `src/services/teacherAiQuotaService.ts`
- Modify: `src/services/ai/extractTextFromPdf.ts`
- Modify: `src/services/ai/workerAiClient.ts`
- Create: `tests/utf8SourceGuard.test.ts`

**Interfaces:**
- No new public API.

- [ ] **Step 1: Write a source guard test**

Scan only user-facing AI files and fail on known mojibake tokens:

```ts
const forbidden = [
  'Kh?ng', 'Vui l?ng', 'T?I LI?U', 'N?i dung', 'Y?u c?u',
  'B?n l?', 'tr? v?', 'Dinh huong ra de', 'Bam Thong tu 27',
];

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  for (const token of forbidden) expect(source, `${file} contains ${token}`).not.toContain(token);
}
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx vitest run tests/utf8SourceGuard.test.ts
```

Expected: FAIL on the current corrupted strings.

- [ ] **Step 3: Replace all user-facing copy with Vietnamese UTF-8**

Required labels in `GeneralInfoSection.tsx`:

- `Gợi ý từ AI`
- `Áp dụng môn học`
- `Dùng tên bài này`
- `Thêm nhãn`
- `Áp dụng tất cả`

`Áp dụng tất cả` must apply category, title and all unique tags without overwriting a non-empty teacher title unless the teacher confirms by clicking the dedicated title button.

- [ ] **Step 4: Verify and commit**

```bash
npx vitest run tests/utf8SourceGuard.test.ts tests/quizCreationDomain.test.ts
```

Commit:

```bash
git add src/features/quiz-generator/components/GeneralInfoSection.tsx src/features/quiz-generator/components/PedagogicalProfileSection.tsx src/services/teacherAiQuotaService.ts src/services/ai/extractTextFromPdf.ts src/services/ai/workerAiClient.ts tests/utf8SourceGuard.test.ts
git commit -m "fix(ai): restore Vietnamese copy and suggestions"
```

---

### Task 14: Add feature flag, E2E coverage and rollout runbook

**Files:**
- Modify: `src/config/featureFlags.ts`
- Modify: `.env.example`
- Modify: `src/components/TeacherDashboard/CreateTab.tsx`
- Create: `cypress/e2e/ai-quiz-generation-v2.cy.ts`
- Create: `docs/runbooks/ai-quiz-generation-v2-rollout.md`

**Interfaces:**

```ts
export const isAiQuizV2Enabled = (): boolean => resolveFeatureFlag(
  import.meta.env.VITE_FEATURE_AI_QUIZ_V2,
  false,
);
```

- [ ] **Step 1: Add feature-flag tests**

Extend the existing feature flag tests to assert false by default and true for `1`, `true`, `yes`, `on`, `enabled`.

- [ ] **Step 2: Gate the V2 path**

`CreateTab` uses V2 blueprint, OCR preview and progress only when `isAiQuizV2Enabled()` is true. Legacy generation remains callable while the flag is false. Do not duplicate save/publish logic.

- [ ] **Step 3: Add Cypress happy-path and failure-path tests**

`cypress/e2e/ai-quiz-generation-v2.cy.ts` must mock:

1. GET quota returns `5/5`.
2. OCR returns three pages.
3. Generate returns a valid ten-question quiz.
4. Generate failure returns `503` and quota remains unchanged.
5. Cancel aborts the pending request and keeps form values.

Assertions:

```ts
cy.contains('Đang đọc tài liệu').should('be.visible');
cy.findByLabelText('Trang 2').uncheck();
cy.contains('Đang kiểm tra đáp án').should('be.visible');
cy.contains('10 câu').should('be.visible');
cy.contains('Lưu đề').should('be.enabled');
```

- [ ] **Step 4: Write the rollout runbook**

The runbook must contain exact order:

1. Backup D1 bookmark with `npx wrangler d1 time-travel info itongquiz-db --config workers/wrangler.toml`.
2. Apply migration `0037` remotely.
3. Deploy Worker with frontend flag still false.
4. Smoke test admin unlimited and teacher first/fifth/sixth actions.
5. Enable `VITE_FEATURE_AI_QUIZ_V2=true` and deploy frontend.
6. Monitor for 30 minutes using action status counts and Worker logs.
7. Rollback by setting the feature flag false; do not roll back the additive migration.

Include D1 verification queries:

```sql
SELECT status, COUNT(*) FROM ai_generation_actions GROUP BY status;
SELECT username, usage_date, used_count FROM teacher_ai_daily_usage ORDER BY usage_date DESC LIMIT 20;
SELECT action_id, workflow, status, upstream_calls, failure_code
FROM ai_generation_actions
ORDER BY created_at DESC
LIMIT 20;
```

- [ ] **Step 5: Run all verification**

```bash
npm run test:run
npm run build
npx cypress run --spec cypress/e2e/ai-quiz-generation-v2.cy.ts
npm run security:check
```

Expected: all commands exit `0`.

- [ ] **Step 6: Commit**

```bash
git add src/config/featureFlags.ts .env.example src/components/TeacherDashboard/CreateTab.tsx cypress/e2e/ai-quiz-generation-v2.cy.ts docs/runbooks/ai-quiz-generation-v2-rollout.md
git commit -m "test(ai): add v2 rollout gate and end-to-end coverage"
```

---

## Final Acceptance Criteria

- [ ] A teacher cannot bypass the daily quota by calling `/api/ai/chat` directly without a valid action envelope.
- [ ] The same `actionId` cannot consume more than one slot or exceed its workflow stage limits.
- [ ] Failed OCR/generation upstream calls release reserved teacher quota.
- [ ] PDF/image bytes are uploaded only for OCR; generation receives extracted text and no original file.
- [ ] EXAM and PRACTICE generate observably different prompts and behavior.
- [ ] Exact question counts are enforced by type and difficulty.
- [ ] Invalid answers, empty structures, missing explanations and duplicate questions are detected before preview.
- [ ] At most one targeted repair call runs; valid questions are preserved.
- [ ] Teachers can cancel, review OCR pages and see real named stages.
- [ ] No known mojibake remains in AI prompts or teacher-facing copy.
- [ ] Legacy flow remains available while `VITE_FEATURE_AI_QUIZ_V2=false`.
- [ ] Full Vitest suite, production build, Cypress V2 spec and security check pass.

## Dependency Order

```text
Task 1 quota ledger
  └─ Task 2 Worker policy
       └─ Task 3 client action metadata
            └─ Task 4 unified workflow

Task 5 blueprint
  └─ Task 6 prompt intent
  └─ Task 7 schema
       └─ Task 8 audit
            └─ Task 9 targeted repair

Task 5 + Task 4
  └─ Task 10 blueprint UI
  └─ Task 11 progress/cancel
  └─ Task 12 OCR preview

Tasks 1–12
  └─ Task 13 UTF-8 cleanup
       └─ Task 14 rollout and E2E
```

## Parallelization

- Tasks 5–8 may start after Task 3 and can run in parallel with Task 4 if shared signatures are frozen first.
- Task 10 and Task 13 can run in parallel after blueprint interfaces are stable.
- Task 11 depends on Task 4 cancellation.
- Task 12 depends on the OCR execution context from Task 4.
- Task 14 is sequential and starts only after all earlier tasks pass.

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Concurrent requests over-consume quota | High | Conditional D1 update, unique `action_id`, idempotent fail/succeed functions |
| Reservation remains after browser closes | Medium | Expire `RESERVED` actions after 15 minutes during quota read/reserve |
| Auxiliary REVIEW/REPAIR is abused | Medium | One call per stage, required stage order, fixed workflow and action ownership |
| Zod schema rejects legacy but usable AI output | Medium | Feature flag, fixtures for every supported question type, one targeted repair pass |
| PDF OCR response is too large | Medium | 20k/page and 60k selected total, visible truncation warning |
| V2 changes break save/publish | High | Preserve `Quiz` output shape and reuse existing `QuizPreview`/persistence code |
| AI latency increases from validation/repair | Medium | Repair only when deterministic issues exist; never recursive retry |
| Migration rollout fails | High | Additive migration, D1 time-travel bookmark, flag remains false until smoke test |

## Execution Handoff

After approval, implement with one of these modes:

1. **Subagent-Driven (recommended):** fresh subagent per task, review after every task and human checkpoints after A and B.
2. **Inline Execution:** execute sequentially in this session with `executing-plans`, stopping at each checkpoint.
