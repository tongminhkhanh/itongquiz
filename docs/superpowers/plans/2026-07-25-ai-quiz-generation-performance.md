# AI Quiz Generation Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Giảm thời gian chờ khi tạo đề AI bằng cách đưa reviewer ra khỏi đường chờ mặc định, giới hạn số lượt gọi AI, rút ngắn output, hiển thị tiến độ thật và xử lý ảnh sau khi đề đã xuất hiện.

**Architecture:** Giữ nguyên một endpoint `/api/ai/chat` và toàn bộ kiểm tra deterministic hiện có. Thêm một policy chất lượng rõ ràng: chế độ `fast` mặc định chỉ tạo → kiểm tra bằng code → sửa đúng phần lỗi nếu cần; chế độ `strict` mới gọi reviewer AI. Telemetry theo từng stage được ghi bất đồng bộ ở Worker, còn ảnh AI được hydrate sau khi đề đã hiển thị và dùng cùng action để không tính thêm lượt tạo đề.

**Tech Stack:** TypeScript, React 19, Vite, Cloudflare Workers, D1, Vitest, Testing Library.

## Global Constraints

- Đường tạo đề hợp lệ ở chế độ `fast` phải có đúng **1 upstream AI call**.
- Đường cần sửa ở chế độ `fast` được phép tối đa **2 upstream AI calls**: `GENERATE + REPAIR`.
- Reviewer AI không chạy mặc định; chỉ chạy khi giáo viên bật `strict`.
- Không hiển thị đề nếu schema hoặc deterministic audit vẫn còn lỗi.
- Không giảm chất lượng kiểm tra số câu, loại câu, độ khó, đáp án, câu trùng, schema, semantic contract hoặc định dạng toán.
- Ảnh AI không được chặn thời điểm hiển thị đề lần đầu.
- Tối đa **2 ảnh** được tạo song song.
- Tạo ảnh cho đề không được trừ thêm lượt quota tạo đề AI.
- Không lưu prompt, nội dung đề hoặc dữ liệu cá nhân vào bảng telemetry.
- Mục tiêu production sau rollout: median tạo đề 10 câu ≤ **20 giây**, P95 ≤ **60 giây**, ít nhất 90% action `QUIZ_CREATE` có `upstream_calls <= 2`.
- Root `npx tsc --noEmit` hiện có hai lỗi baseline ngoài phạm vi tại `AnnouncementSettings.tsx:210` và `AnnouncementSettings.tsx:212`; không được phát sinh lỗi mới.

---

## File Structure

### Contract và policy

- Create: `shared/ai-performance.contract.ts` — contract stage metric dùng giữa Worker và test.
- Create: `src/services/ai/quizQualityPolicy.ts` — quyết định có chạy reviewer hay không.
- Create: `src/services/ai/aiTimeoutPolicy.ts` — timeout theo stage.
- Create: `src/services/ai/generatedImageHydration.ts` — tách job ảnh, placeholder và worker pool concurrency 2.

### Frontend pipeline

- Modify: `src/services/geminiService.ts` — fast path, strict review, validating step, bỏ xử lý ảnh blocking.
- Modify: `src/services/ai/workerAiClient.ts` — timeout theo stage và `Server-Timing` diagnostics.
- Modify: `src/services/ai/imageGenerationService.ts` — nhận execution context `IMAGE`.
- Modify: `src/services/ai/prompts/quizPromptBuilder.ts` — lời giải ngắn mặc định.
- Modify: `src/features/quiz-generator/domain/buildQuizGenerationRequest.ts` — truyền quality/explanation options.
- Modify: `src/features/quiz-generator/domain/quizCreation.types.ts` — progress và form state contract.
- Modify: `src/features/quiz-generator/hooks/useQuizFormState.ts` — state `reviewMode`, `explanationDetail`.
- Modify: `src/features/quiz-generator/hooks/useQuizGeneration.ts` — hiển thị đề trước, hydrate ảnh sau.
- Modify: `src/features/quiz-generator/hooks/useCreateQuizLogic.ts` — expose state mới.
- Modify: `src/features/quiz-generator/components/PedagogicalProfileSection.tsx` — lựa chọn lời giải ngắn/chi tiết và kiểm tra nâng cao.
- Modify: `src/features/quiz-generator/components/GenerationProgressPanel.tsx` — stage thật và thời gian đã chờ.
- Modify: `src/components/TeacherDashboard/CreateTab.tsx` — truyền props và hiển thị trạng thái hydrate ảnh.
- Modify: `src/components/TeacherDashboard/quiz-preview/index.tsx` — truyền trạng thái hydrate tới toolbar.
- Modify: `src/components/TeacherDashboard/quiz-preview/QuizPreviewToolbar.tsx` — cho xem/sửa ngay, khóa lưu khi ảnh chưa hoàn tất.

### Worker và D1

- Create: `workers/migrations/0040_create_ai_stage_metrics.sql` — telemetry theo stage.
- Create: `workers/migrations/0041_add_ai_image_stage.sql` — quota-safe image stage.
- Create: `workers/src/services/aiPerformanceTelemetry.ts` — ghi metric bất đồng bộ.
- Modify: `workers/src/index.ts` — nhận `ExecutionContext` và chuyển vào AI route.
- Modify: `workers/src/routes/aiProxy.ts` — đo upstream TTFB, response headers, stage `IMAGE`.
- Modify: `workers/src/services/aiRequestPolicy.ts` — policy IMAGE tối đa 10 call/action.

### Tests

- Create: `tests/aiPerformanceTelemetry.worker.test.ts`.
- Create: `tests/quizQualityPolicy.test.ts`.
- Create: `tests/generatedImageHydration.test.ts`.
- Modify: `tests/aiProxy.worker.test.ts`.
- Modify: `tests/quizGenerationPipeline.test.ts`.
- Modify: `tests/quizGenerationPipelineV3.test.ts`.
- Modify: `tests/quizGenerationWorkflow.test.tsx`.
- Modify: `tests/GenerationProgressPanel.test.tsx`.
- Modify: `tests/QuizPreview.test.tsx`.

---

### Task 1: Ghi telemetry theo từng AI stage mà không tăng thời gian phản hồi

**Files:**
- Create: `shared/ai-performance.contract.ts`
- Create: `workers/migrations/0040_create_ai_stage_metrics.sql`
- Create: `workers/src/services/aiPerformanceTelemetry.ts`
- Create: `tests/aiPerformanceTelemetry.worker.test.ts`
- Modify: `workers/src/index.ts`
- Modify: `workers/src/routes/aiProxy.ts`
- Modify: `tests/aiProxy.worker.test.ts`

**Interfaces:**
- Consumes: `_meta.actionId`, `_meta.workflow`, `_meta.stage`, request `model`.
- Produces:

```ts
export type AiStageMetricStatus = 'SUCCEEDED' | 'FAILED';

export interface AiStageMetricInput {
  actionId: string;
  username: string;
  workflow: string;
  stage: string;
  model: string;
  status: AiStageMetricStatus;
  requestBytes: number;
  ttfbMs: number | null;
  errorCode?: string;
  createdAt: string;
}
```

- [ ] **Step 1: Viết test RED cho metric storage**

Create `tests/aiPerformanceTelemetry.worker.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { recordAiStageMetric } from '../workers/src/services/aiPerformanceTelemetry';

it('stores only timing metadata and never stores prompt content', async () => {
  const bind = vi.fn(() => ({ run: vi.fn(async () => ({ success: true })) }));
  const prepare = vi.fn(() => ({ bind }));
  const db = { prepare } as unknown as D1Database;

  await recordAiStageMetric(db, {
    actionId: 'ai-1234567890abcdefghij',
    username: 'teacher-a',
    workflow: 'QUIZ_CREATE',
    stage: 'GENERATE',
    model: 'gemini-2.5-flash',
    status: 'SUCCEEDED',
    requestBytes: 4800,
    ttfbMs: 12500,
    createdAt: '2026-07-25T00:00:00.000Z',
  });

  expect(prepare).toHaveBeenCalledOnce();
  expect(bind).toHaveBeenCalledWith(
    'ai-1234567890abcdefghij',
    'teacher-a',
    'QUIZ_CREATE',
    'GENERATE',
    'gemini-2.5-flash',
    'SUCCEEDED',
    4800,
    12500,
    null,
    '2026-07-25T00:00:00.000Z',
  );
  expect(JSON.stringify(bind.mock.calls)).not.toContain('messages');
});
```

- [ ] **Step 2: Chạy test để xác nhận RED**

Run:

```bash
npm run test:run -- tests/aiPerformanceTelemetry.worker.test.ts
```

Expected: FAIL vì module `aiPerformanceTelemetry` chưa tồn tại.

- [ ] **Step 3: Tạo contract và migration**

Create `shared/ai-performance.contract.ts` với interface ở phần Interfaces.

Create `workers/migrations/0040_create_ai_stage_metrics.sql`:

```sql
CREATE TABLE IF NOT EXISTS ai_generation_stage_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action_id TEXT NOT NULL,
  username TEXT NOT NULL,
  workflow TEXT NOT NULL,
  stage TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('SUCCEEDED', 'FAILED')),
  request_bytes INTEGER NOT NULL DEFAULT 0 CHECK(request_bytes >= 0),
  ttfb_ms INTEGER CHECK(ttfb_ms IS NULL OR ttfb_ms >= 0),
  error_code TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_stage_metrics_action
ON ai_generation_stage_metrics(action_id, created_at);

CREATE INDEX IF NOT EXISTS idx_ai_stage_metrics_stage_date
ON ai_generation_stage_metrics(stage, created_at);
```

- [ ] **Step 4: Implement metric writer**

Create `workers/src/services/aiPerformanceTelemetry.ts`:

```ts
import type { AiStageMetricInput } from '../../../shared/ai-performance.contract';

export async function recordAiStageMetric(
  db: D1Database,
  input: AiStageMetricInput,
): Promise<void> {
  await db.prepare(`
    INSERT INTO ai_generation_stage_metrics (
      action_id,
      username,
      workflow,
      stage,
      model,
      status,
      request_bytes,
      ttfb_ms,
      error_code,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    input.actionId,
    input.username,
    input.workflow,
    input.stage,
    input.model,
    input.status,
    input.requestBytes,
    input.ttfbMs,
    input.errorCode ?? null,
    input.createdAt,
  ).run();
}
```

- [ ] **Step 5: Chuyển Worker sang `ExecutionContext.waitUntil`**

Modify chính xác chữ ký trong `workers/src/index.ts`:

```ts
// Before
async fetch(request: Request, env: Env): Promise<Response> {

// After
async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
```

Đổi đúng lời gọi route:

```ts
// Before
response = await handleAiProxy(request, env, path, method);

// After
response = await handleAiProxy(request, env, path, method, ctx);
```

Modify signature trong `workers/src/routes/aiProxy.ts`:

```ts
export async function handleAiProxy(
  request: Request,
  env: Env,
  path: string,
  method: string,
  ctx?: ExecutionContext,
): Promise<Response | null> {
```

Ngay trước upstream fetch:

```ts
const upstreamStartedAt = Date.now();
const requestBytes = new TextEncoder().encode(JSON.stringify(upstreamBody)).byteLength;
```

Sau khi `fetch` trả response headers:

```ts
const ttfbMs = Date.now() - upstreamStartedAt;
const metricPromise = recordAiStageMetric(env.DB, {
  actionId: meta.actionId,
  username: authResult.user.username,
  workflow: meta.workflow,
  stage: meta.stage,
  model,
  status: aiResponse.ok ? 'SUCCEEDED' : 'FAILED',
  requestBytes,
  ttfbMs,
  errorCode: aiResponse.ok ? undefined : `UPSTREAM_${aiResponse.status}`,
  createdAt: new Date().toISOString(),
}).catch(() => console.error('[AI Proxy] Failed to persist performance metric'));

if (ctx) ctx.waitUntil(metricPromise);
else void metricPromise;
```

Add response headers:

```ts
'Server-Timing': `ai-upstream;dur=${ttfbMs}`,
'X-AI-Stage': meta.stage,
```

Không chờ metric insert trước khi trả stream.

- [ ] **Step 6: Bổ sung route test**

Trong `tests/aiProxy.worker.test.ts`, tạo fake context:

```ts
const pending: Promise<unknown>[] = [];
const ctx = {
  waitUntil(promise: Promise<unknown>) {
    pending.push(promise);
  },
} as ExecutionContext;
```

Gọi route với `ctx`, rồi kiểm tra:

```ts
expect(response.headers.get('X-AI-Stage')).toBe('GENERATE');
expect(response.headers.get('Server-Timing')).toMatch(/^ai-upstream;dur=\d+$/);
await Promise.all(pending);
```

- [ ] **Step 7: Chạy test GREEN và Worker typecheck**

```bash
npm run test:run -- tests/aiPerformanceTelemetry.worker.test.ts tests/aiProxy.worker.test.ts
npx tsc -p workers/tsconfig.json --noEmit
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add shared/ai-performance.contract.ts \
  workers/migrations/0040_create_ai_stage_metrics.sql \
  workers/src/services/aiPerformanceTelemetry.ts \
  workers/src/index.ts workers/src/routes/aiProxy.ts \
  tests/aiPerformanceTelemetry.worker.test.ts tests/aiProxy.worker.test.ts
git commit -m "feat(ai): record non-blocking stage performance metrics"
```

---

### Task 2: Đưa reviewer ra khỏi fast path và giới hạn call budget

**Files:**
- Create: `src/services/ai/quizQualityPolicy.ts`
- Create: `tests/quizQualityPolicy.test.ts`
- Modify: `src/services/geminiService.ts`
- Modify: `src/features/quiz-generator/domain/buildQuizGenerationRequest.ts`
- Modify: `tests/quizGenerationPipeline.test.ts`
- Modify: `tests/quizGenerationPipelineV3.test.ts`

**Interfaces:**

```ts
export type QuizReviewMode = 'fast' | 'strict';

export interface QuizQualityPolicyInput {
  workflow: 'QUIZ_CREATE' | 'QUESTION_REGENERATE' | 'GENERIC';
  reviewMode: QuizReviewMode;
}

export const shouldRunAiReviewer = (input: QuizQualityPolicyInput): boolean;
```

`QuizGenerationOptions` thêm trường additive:

```ts
reviewMode?: QuizReviewMode;
```

- [ ] **Step 1: Viết policy tests RED**

Create `tests/quizQualityPolicy.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { shouldRunAiReviewer } from '../src/services/ai/quizQualityPolicy';

describe('shouldRunAiReviewer', () => {
  it('skips reviewer in the default fast path', () => {
    expect(shouldRunAiReviewer({ workflow: 'QUIZ_CREATE', reviewMode: 'fast' })).toBe(false);
  });

  it('runs reviewer only for strict full-quiz creation', () => {
    expect(shouldRunAiReviewer({ workflow: 'QUIZ_CREATE', reviewMode: 'strict' })).toBe(true);
    expect(shouldRunAiReviewer({ workflow: 'QUESTION_REGENERATE', reviewMode: 'strict' })).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy RED**

```bash
npm run test:run -- tests/quizQualityPolicy.test.ts
```

Expected: FAIL vì module chưa tồn tại.

- [ ] **Step 3: Implement policy**

Create `src/services/ai/quizQualityPolicy.ts`:

```ts
import type { AiWorkflow } from './aiAction';

export type QuizReviewMode = 'fast' | 'strict';

export interface QuizQualityPolicyInput {
  workflow: AiWorkflow;
  reviewMode: QuizReviewMode;
}

export const shouldRunAiReviewer = ({
  workflow,
  reviewMode,
}: QuizQualityPolicyInput): boolean => (
  workflow === 'QUIZ_CREATE' && reviewMode === 'strict'
);
```

- [ ] **Step 4: Thêm option mặc định `fast`**

Trong `src/services/geminiService.ts`:

```ts
import type { QuizReviewMode } from './ai/quizQualityPolicy';
import { shouldRunAiReviewer } from './ai/quizQualityPolicy';

export interface QuizGenerationOptions {
  title: string;
  blueprint?: QuizBlueprint;
  blueprintV3?: QuizBlueprintV3;
  promptVersion?: 'ai-blueprint-v3';
  questionCount: number;
  questionTypes: QuestionType[];
  difficultyLevels?: { level1: number; level2: number; level3: number };
  promptProfile?: PromptProfileOptions;
  imageLibrary?: Array<{ id: string; name: string; data?: string }>;
  customPrompt?: string;
  isPdfMode?: boolean;
  reviewMode?: QuizReviewMode;
}
```

Tách reviewer V2 thành helper hoàn chỉnh:

```ts
const reviewGeneratedQuiz = async (
  finalQuiz: GeneratedQuizPayload,
  blueprint: QuizBlueprint,
  execution: QuizAiExecutionContext | undefined,
  onStepChange?: (step: QuizGenerationStep) => void,
): Promise<GeneratedQuizPayload> => {
  onStepChange?.('reviewing');
  try {
    const reviewedRaw = await validateQuizWithAI(
      finalQuiz,
      '',
      execution ? { ...execution, stage: 'REVIEW' } : undefined,
    );
    const reviewedQuiz = parseGeneratedQuiz(reviewedRaw);
    return auditGeneratedQuiz(reviewedQuiz, blueprint).length === 0
      ? reviewedQuiz
      : finalQuiz;
  } catch (error) {
    console.warn('[AI Validation Chain] Reviewer output was ignored.', error);
    return finalQuiz;
  }
};
```

Đổi chữ ký V2 pipeline:

```ts
const runDeterministicQualityPipeline = async (
  result: unknown,
  blueprint: QuizBlueprint,
  reviewMode: QuizReviewMode,
  execution: QuizAiExecutionContext | undefined,
  onStepChange?: (step: QuizGenerationStep) => void,
): Promise<GeneratedQuizPayload> => {
```

Cuối V2 pipeline:

```ts
const workflow = execution?.action.workflow ?? 'GENERIC';
if (shouldRunAiReviewer({ workflow, reviewMode })) {
  finalQuiz = await reviewGeneratedQuiz(finalQuiz, blueprint, execution, onStepChange);
}
```

Tách reviewer V3 thành helper đầy đủ:

```ts
const reviewGeneratedQuizV3 = async (
  finalQuiz: GeneratedQuizV3,
  blueprint: QuizBlueprintV3,
  execution: QuizAiExecutionContext | undefined,
  onStepChange?: (step: QuizGenerationStep) => void,
): Promise<GeneratedQuizV3> => {
  onStepChange?.('reviewing');
  try {
    const reviewedText = await requestWorkerAiText({
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'system', content: buildReviewerSystemPromptV3() },
        { role: 'user', content: buildReviewerUserPromptV3({ blueprint, quiz: finalQuiz }) },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }, toWorkerOptions(execution ? { ...execution, stage: 'REVIEW' } : undefined));
    const reviewedQuiz = parseGeneratedQuizV3Compatibility(parseAndRepairJSON(reviewedText));
    return auditGeneratedQuizV3(reviewedQuiz, blueprint).length === 0
      ? reviewedQuiz
      : finalQuiz;
  } catch (error) {
    console.warn('[AI Validation Chain V3] Reviewer output was ignored.', error);
    return finalQuiz;
  }
};
```

Đổi chữ ký V3 pipeline để nhận `reviewMode: QuizReviewMode`, rồi kết thúc bằng:

```ts
const workflow = execution?.action.workflow ?? 'GENERIC';
if (shouldRunAiReviewer({ workflow, reviewMode })) {
  finalQuiz = await reviewGeneratedQuizV3(finalQuiz, blueprint, execution, onStepChange);
}
```

Trong `generateQuiz`, truyền mode rõ ràng:

```ts
const reviewMode = options?.reviewMode ?? 'fast';

if (useV3 && options?.blueprintV3) {
  const finalQuizV3 = await runV3QualityPipeline(
    result,
    options.blueprintV3,
    reviewMode,
    requestExecution,
    onStepChange,
  );
  result = mapGeneratedQuizV3ToDomain(finalQuizV3);
} else if (options?.blueprint) {
  result = await runDeterministicQualityPipeline(
    result,
    options.blueprint,
    reviewMode,
    execution,
    onStepChange,
  );
}
```

Xóa hai reviewer block chạy vô điều kiện.

- [ ] **Step 5: Đảm bảo một action chỉ dùng tối đa một REPAIR call**

Thêm contract nội bộ trong `geminiService.ts`:

```ts
interface ParsedDraftResult {
  quiz: GeneratedQuizPayload;
  repairCallUsed: boolean;
}
```

Đổi chữ ký và implementation:

```ts
const parseDraftWithOneSchemaRepair = async (
  result: unknown,
  execution: QuizAiExecutionContext | undefined,
  onStepChange?: (step: QuizGenerationStep) => void,
): Promise<ParsedDraftResult> => {
  const normalized = validateAndFixQuiz(result);
  const initial = GeneratedQuizSchema.safeParse(normalized);
  if (initial.success) {
    return { quiz: initial.data, repairCallUsed: false };
  }

  const initialIssues = toGeneratedQuizSchemaIssues(initial.error.issues);
  if (execution?.action.workflow !== 'QUIZ_CREATE') {
    throw new GeneratedQuizSchemaError(initialIssues);
  }

  onStepChange?.('repairing');
  const repairedText = await requestWorkerAiText({
    model: 'gemini-2.5-flash',
    messages: [
      {
        role: 'system',
        content: 'Bạn sửa cấu trúc JSON đề thi. Chỉ trả về JSON object hợp lệ.',
      },
      {
        role: 'user',
        content: buildQuizSchemaRepairPrompt({ quiz: normalized, issues: initialIssues }),
      },
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' },
  }, toWorkerOptions(execution ? { ...execution, stage: 'REPAIR' } : undefined));

  const repairedRaw = validateAndFixQuiz(parseAndRepairJSON(repairedText));
  const repaired = GeneratedQuizSchema.safeParse(repairedRaw);
  if (!repaired.success) {
    throw new GeneratedQuizSchemaError(toGeneratedQuizSchemaIssues(repaired.error.issues));
  }
  return { quiz: repaired.data, repairCallUsed: true };
};
```

Trong `runDeterministicQualityPipeline`:

```ts
const parsed = await parseDraftWithOneSchemaRepair(result, execution, onStepChange);
let finalQuiz = parsed.quiz;
let repairCallUsed = parsed.repairCallUsed;
let issues = auditGeneratedQuiz(finalQuiz, blueprint);

if (issues.length > 0) {
  if (repairCallUsed) {
    throw new QuizGenerationValidationError(issues);
  }

  const repairInput = { blueprint, quiz: finalQuiz, issues };
  const repairPlan = createQuizRepairPlan(repairInput);
  if (repairPlan.requestedCount === 0) {
    throw new QuizGenerationValidationError(issues);
  }

  repairCallUsed = true;
  onStepChange?.('repairing');
  const repairedText = await requestWorkerAiText({
    model: 'gemini-2.5-flash',
    messages: [
      {
        role: 'system',
        content: 'Bạn sửa đúng các câu bị lỗi trong đề. Chỉ trả về JSON hợp lệ.',
      },
      { role: 'user', content: buildQuizRepairPrompt(repairInput) },
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' },
  }, toWorkerOptions(execution ? { ...execution, stage: 'REPAIR' } : undefined));

  const repairedQuiz = parseGeneratedQuiz(
    validateAndFixQuiz(parseAndRepairJSON(repairedText)),
  );
  finalQuiz = mergeRepairedQuestions(finalQuiz, repairedQuiz, issues);
  issues = auditGeneratedQuiz(finalQuiz, blueprint);
  if (issues.length > 0) {
    throw new QuizGenerationValidationError(issues);
  }
}
```

Điều này khớp server policy `repair_calls < 1` và ngăn client chờ một call chắc chắn bị 409.

- [ ] **Step 6: Cập nhật pipeline tests**

Trong `tests/quizGenerationPipeline.test.ts`:

```ts
it('returns a valid fast-path quiz without reviewer', async () => {
  const result = await generateQuiz(
    'Phân số', '4', '', undefined,
    { ...options, reviewMode: 'fast' },
    undefined, 'openai', undefined, execution,
  );

  expect(result.questions).toHaveLength(2);
  expect(mocks.requestWorkerAiText).not.toHaveBeenCalled();
});

it('uses only GENERATE + REPAIR in fast mode', async () => {
  await generateQuiz(
    'Phân số', '4', '', undefined,
    { ...options, reviewMode: 'fast' },
    undefined, 'openai', undefined, execution,
  );

  expect(mocks.requestWorkerAiText.mock.calls.map((call) => call[1]?.action?.stage))
    .toEqual(['REPAIR']);
});

it('keeps reviewer for strict mode', async () => {
  await generateQuiz(
    'Phân số', '4', '', undefined,
    { ...options, reviewMode: 'strict' },
    undefined, 'openai', undefined, execution,
  );

  expect(mocks.requestWorkerAiText.mock.calls.map((call) => call[1]?.action?.stage))
    .toEqual(['REPAIR', 'REVIEW']);
});
```

Trong `tests/quizGenerationPipelineV3.test.ts`, thêm hai test rõ ràng:

```ts
it('uses only REPAIR for an invalid V3 draft in fast mode', async () => {
  await generateQuiz(
    blueprint.topic,
    blueprint.classLevel,
    '',
    undefined,
    { ...options, reviewMode: 'fast' },
    undefined,
    'openai',
    undefined,
    execution,
  );

  expect(mocks.requestWorkerAiText.mock.calls.map((call) => call[1]?.action?.stage))
    .toEqual(['REPAIR']);
});

it('uses REPAIR then REVIEW for an invalid V3 draft in strict mode', async () => {
  await generateQuiz(
    blueprint.topic,
    blueprint.classLevel,
    '',
    undefined,
    { ...options, reviewMode: 'strict' },
    undefined,
    'openai',
    undefined,
    execution,
  );

  expect(mocks.requestWorkerAiText.mock.calls.map((call) => call[1]?.action?.stage))
    .toEqual(['REPAIR', 'REVIEW']);
});
```

- [ ] **Step 7: Chạy targeted tests**

```bash
npm run test:run -- \
  tests/quizQualityPolicy.test.ts \
  tests/quizGenerationPipeline.test.ts \
  tests/quizGenerationPipelineV3.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/services/ai/quizQualityPolicy.ts \
  src/services/geminiService.ts \
  src/features/quiz-generator/domain/buildQuizGenerationRequest.ts \
  tests/quizQualityPolicy.test.ts \
  tests/quizGenerationPipeline.test.ts \
  tests/quizGenerationPipelineV3.test.ts
git commit -m "perf(ai): make deterministic fast path the default"
```

---

### Task 3: Rút lời giải mặc định xuống 1–2 câu và cho phép chọn chi tiết

**Files:**
- Modify: `src/services/geminiService.ts`
- Modify: `src/services/ai/prompts/quizPromptBuilder.ts`
- Modify: `src/features/quiz-generator/domain/quizCreation.types.ts`
- Modify: `src/features/quiz-generator/domain/buildQuizGenerationRequest.ts`
- Modify: `src/features/quiz-generator/hooks/useQuizFormState.ts`
- Modify: `src/features/quiz-generator/hooks/useCreateQuizLogic.ts`
- Modify: `src/features/quiz-generator/components/PedagogicalProfileSection.tsx`
- Modify: `src/components/TeacherDashboard/CreateTab.tsx`
- Modify: `tests/quizPromptBuilder.test.ts`
- Modify: `tests/useCreateQuizLogic.contract.test.tsx`

**Interfaces:**

```ts
export type ExplanationDetail = 'concise' | 'detailed';
```

`QuizGenerationOptions` thêm:

```ts
explanationDetail?: ExplanationDetail;
```

- [ ] **Step 1: Viết prompt tests RED**

Trong `tests/quizPromptBuilder.test.ts`:

```ts
it('requests concise explanations by default', () => {
  const prompt = buildPrompt('Phân số', '4', '', {
    title: 'Ôn tập',
    questionCount: 10,
    questionTypes: [QuestionType.MCQ],
  });

  expect(prompt).toContain('Lời giải ngắn 1-2 câu');
  expect(prompt).not.toContain('bài giảng mini 2-4 câu');
});

it('supports detailed explanations when explicitly enabled', () => {
  const prompt = buildPrompt('Phân số', '4', '', {
    title: 'Ôn tập',
    questionCount: 10,
    questionTypes: [QuestionType.MCQ],
    explanationDetail: 'detailed',
  });

  expect(prompt).toContain('Lời giải chi tiết 2-4 câu');
});
```

- [ ] **Step 2: Chạy RED**

```bash
npm run test:run -- tests/quizPromptBuilder.test.ts
```

- [ ] **Step 3: Implement prompt selection**

Trong `quizPromptBuilder.ts`:

```ts
const buildExplanationPrompt = (
  detail: 'concise' | 'detailed' = 'concise',
): string => detail === 'detailed'
  ? `
    [EXPLANATION RULE - DETAILED]
    - Lời giải chi tiết 2-4 câu.
    - Nêu đáp án, quy tắc hoặc bước suy luận, và một mẹo nhớ ngắn.
  `
  : `
    [EXPLANATION RULE - CONCISE]
    - Lời giải ngắn 1-2 câu.
    - Nêu trực tiếp lý do đáp án đúng; không lặp lại nguyên câu hỏi.
  `;
```

Thay constant cũ bằng:

```ts
const explanationPrompt = buildExplanationPrompt(options?.explanationDetail);
```

- [ ] **Step 4: Thêm form state mặc định `concise`**

Trong `useQuizFormState.ts`:

```ts
const [explanationDetail, setExplanationDetail] = useState<ExplanationDetail>('concise');
const [reviewMode, setReviewMode] = useState<QuizReviewMode>('fast');
```

Thêm vào `BuildQuizGenerationOptionsInput`:

```ts
explanationDetail?: ExplanationDetail;
reviewMode?: QuizReviewMode;
```

Expose cả hai state qua return object và snapshot. Trong `buildQuizGenerationOptions`:

```ts
explanationDetail: input.explanationDetail ?? 'concise',
reviewMode: input.reviewMode ?? 'fast',
```

- [ ] **Step 5: Thêm lựa chọn UI**

`PedagogicalProfileSectionProps` thêm:

```ts
explanationDetail: ExplanationDetail;
onExplanationDetailChange: (value: ExplanationDetail) => void;
reviewMode: QuizReviewMode;
onReviewModeChange: (value: QuizReviewMode) => void;
```

Hiển thị hai control:

```tsx
<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
  <button
    type="button"
    aria-pressed={explanationDetail === 'concise'}
    onClick={() => onExplanationDetailChange('concise')}
  >
    Lời giải ngắn — nhanh hơn
  </button>
  <button
    type="button"
    aria-pressed={explanationDetail === 'detailed'}
    onClick={() => onExplanationDetailChange('detailed')}
  >
    Lời giải chi tiết — lâu hơn
  </button>
</div>

<label>
  <input
    type="checkbox"
    checked={reviewMode === 'strict'}
    onChange={(event) => onReviewModeChange(event.target.checked ? 'strict' : 'fast')}
  />
  Kiểm tra nâng cao bằng AI — chất lượng cao hơn nhưng chậm hơn
</label>
```

Default phải là `concise + fast`.

- [ ] **Step 6: Cập nhật contract tests**

Trong `tests/useCreateQuizLogic.contract.test.tsx`, xác nhận:

```ts
expect(result.current.explanationDetail).toBe('concise');
expect(result.current.reviewMode).toBe('fast');
```

- [ ] **Step 7: Chạy tests**

```bash
npm run test:run -- \
  tests/quizPromptBuilder.test.ts \
  tests/useCreateQuizLogic.contract.test.tsx \
  tests/useQuizCreationWorkflows.test.tsx
```

- [ ] **Step 8: Commit**

```bash
git add src/services/geminiService.ts \
  src/services/ai/prompts/quizPromptBuilder.ts \
  src/features/quiz-generator/domain/quizCreation.types.ts \
  src/features/quiz-generator/domain/buildQuizGenerationRequest.ts \
  src/features/quiz-generator/hooks/useQuizFormState.ts \
  src/features/quiz-generator/hooks/useCreateQuizLogic.ts \
  src/features/quiz-generator/components/PedagogicalProfileSection.tsx \
  src/components/TeacherDashboard/CreateTab.tsx \
  tests/quizPromptBuilder.test.ts tests/useCreateQuizLogic.contract.test.tsx
git commit -m "perf(ai): default to concise quiz explanations"
```

---

### Task 4: Hiển thị tiến độ thật và dùng timeout theo stage

**Files:**
- Create: `src/services/ai/aiTimeoutPolicy.ts`
- Modify: `src/services/ai/workerAiClient.ts`
- Modify: `src/services/geminiService.ts`
- Modify: `src/features/quiz-generator/domain/quizCreation.types.ts`
- Modify: `src/features/quiz-generator/hooks/useQuizGeneration.ts`
- Modify: `src/features/quiz-generator/hooks/useCreateQuizLogic.ts`
- Modify: `src/features/quiz-generator/components/GenerationProgressPanel.tsx`
- Modify: `src/components/TeacherDashboard/CreateTab.tsx`
- Modify: `tests/GenerationProgressPanel.test.tsx`
- Modify: `tests/quizGenerationWorkflow.test.tsx`

**Interfaces:**

```ts
export const AI_TIMEOUT_MS_BY_STAGE = {
  OCR: 120_000,
  GENERATE: 120_000,
  REPAIR: 60_000,
  REVIEW: 60_000,
  REGENERATE: 90_000,
  IMAGE: 90_000,
  GENERIC: 90_000,
} as const;
```

`GenerationStep` đổi thành:

```ts
export type GenerationStep =
  | 'idle'
  | 'reading_document'
  | 'generating'
  | 'validating'
  | 'repairing'
  | 'reviewing'
  | 'generating_images'
  | 'completed'
  | 'cancelled';
```

- [ ] **Step 1: Viết timeout policy test RED**

Create test trong `tests/workerAiClient.test.ts`:

```ts
it('uses a shorter timeout for repair than generation', () => {
  expect(resolveAiTimeoutMs('GENERATE')).toBe(120_000);
  expect(resolveAiTimeoutMs('REPAIR')).toBe(60_000);
});
```

- [ ] **Step 2: Implement timeout policy**

Create `src/services/ai/aiTimeoutPolicy.ts`:

```ts
import type { AiStage } from './aiAction';

export const AI_TIMEOUT_MS_BY_STAGE: Record<AiStage | 'IMAGE', number> = {
  OCR: 120_000,
  GENERATE: 120_000,
  REVIEW: 60_000,
  REPAIR: 60_000,
  REGENERATE: 90_000,
  IMAGE: 90_000,
  GENERIC: 90_000,
};

export const resolveAiTimeoutMs = (
  stage: AiStage | 'IMAGE',
  override?: number,
): number => override ?? AI_TIMEOUT_MS_BY_STAGE[stage];
```

Trong `workerAiClient.ts`, sau `resolveAiActionMeta`:

```ts
const timeoutMs = resolveAiTimeoutMs(actionMeta.stage, options.timeoutMs);
const timeoutId = setTimeout(() => {
  timedOut = true;
  controller.abort();
}, timeoutMs);
```

- [ ] **Step 3: Phát stage `validating` đúng thời điểm**

Trong `geminiService.ts`, ngay sau provider response và trước schema/audit:

```ts
onStepChange?.('validating');
```

Chỉ phát `reviewing` khi strict mode thực sự chạy. Chỉ phát `repairing` khi có call sửa.

- [ ] **Step 4: Lưu thời điểm bắt đầu trong hook**

Trong `useQuizGeneration.ts`:

```ts
const [generationStartedAt, setGenerationStartedAt] = useState<number | null>(null);
```

Khi bắt đầu OCR hoặc generate:

```ts
setGenerationStartedAt(Date.now());
```

Khi về `idle`, `completed`, `cancelled` giữ timestamp đủ để UI hiển thị tổng thời gian; reset khi bắt đầu action tiếp theo.

Return thêm:

```ts
generationStartedAt,
questionCount: form.difficultyLevels.level1
  + form.difficultyLevels.level2
  + form.difficultyLevels.level3,
```

- [ ] **Step 5: Cập nhật progress panel**

`GenerationProgressPanelProps`:

```ts
interface GenerationProgressPanelProps {
  step: GenerationStep;
  startedAt: number | null;
  questionCount: number;
  onCancel: () => void;
}
```

Copy chính xác:

```ts
const STEP_COPY: Record<GenerationStep, string> = {
  idle: '',
  reading_document: 'Đang đọc và nhận dạng tài liệu',
  generating: 'AI đang tạo câu hỏi',
  validating: 'Đang kiểm tra cấu trúc và đáp án',
  repairing: 'Đang sửa đúng các câu chưa đạt',
  reviewing: 'Đang kiểm tra nâng cao bằng AI',
  generating_images: 'Đang hoàn thiện hình ảnh',
  completed: 'Đã hoàn thành',
  cancelled: 'Đã hủy yêu cầu',
};
```

Dùng interval 1 giây:

```tsx
<p className="mt-1 text-xs text-slate-500">
  Đã chờ {elapsedSeconds} giây · Mục tiêu {questionCount} câu
</p>
```

Không hiển thị phần trăm giả.

- [ ] **Step 6: Bổ sung UI tests**

Trong `tests/GenerationProgressPanel.test.tsx` dùng fake timers:

```ts
vi.useFakeTimers();
render(
  <GenerationProgressPanel
    step="validating"
    startedAt={Date.now() - 12_000}
    questionCount={10}
    onCancel={vi.fn()}
  />,
);
expect(screen.getAllByText('Đang kiểm tra cấu trúc và đáp án')[0]).toBeInTheDocument();
expect(screen.getByText(/Đã chờ 12 giây · Mục tiêu 10 câu/)).toBeInTheDocument();
```

Trong workflow test, mock callback và xác nhận sequence fast path:

```ts
expect(steps).toEqual(['generating', 'validating', 'completed']);
```

- [ ] **Step 7: Chạy tests**

```bash
npm run test:run -- \
  tests/workerAiClient.test.ts \
  tests/GenerationProgressPanel.test.tsx \
  tests/quizGenerationWorkflow.test.tsx \
  tests/quizGenerationPipeline.test.ts
```

- [ ] **Step 8: Commit**

```bash
git add src/services/ai/aiTimeoutPolicy.ts \
  src/services/ai/workerAiClient.ts src/services/geminiService.ts \
  src/features/quiz-generator/domain/quizCreation.types.ts \
  src/features/quiz-generator/hooks/useQuizGeneration.ts \
  src/features/quiz-generator/hooks/useCreateQuizLogic.ts \
  src/features/quiz-generator/components/GenerationProgressPanel.tsx \
  src/components/TeacherDashboard/CreateTab.tsx \
  tests/workerAiClient.test.ts tests/GenerationProgressPanel.test.tsx \
  tests/quizGenerationWorkflow.test.tsx
git commit -m "feat(ai): show real generation stages and elapsed time"
```

---

### Task 5: Hiển thị đề trước và hydrate ảnh nền với concurrency 2

**Files:**
- Create: `workers/migrations/0041_add_ai_image_stage.sql`
- Create: `src/services/ai/generatedImageHydration.ts`
- Create: `tests/generatedImageHydration.test.ts`
- Modify: `src/services/ai/aiAction.ts`
- Modify: `workers/src/services/aiRequestPolicy.ts`
- Modify: `workers/src/routes/aiProxy.ts`
- Modify: `src/services/ai/imageGenerationService.ts`
- Modify: `src/services/geminiService.ts`
- Modify: `src/features/quiz-generator/hooks/useQuizGeneration.ts`
- Modify: `src/features/quiz-generator/hooks/useCreateQuizLogic.ts`
- Modify: `src/components/TeacherDashboard/CreateTab.tsx`
- Modify: `src/components/TeacherDashboard/quiz-preview/index.tsx`
- Modify: `src/components/TeacherDashboard/quiz-preview/QuizPreviewToolbar.tsx`
- Modify: `tests/aiProxy.worker.test.ts`
- Modify: `tests/QuizPreview.test.tsx`

**Interfaces:**

```ts
export interface GeneratedImageJob {
  questionIndex: number;
  prompt: string;
}

export interface PreparedGeneratedImages<TQuiz> {
  quiz: TQuiz;
  jobs: GeneratedImageJob[];
}

export function prepareGeneratedImageJobs<TQuiz>(quiz: TQuiz): PreparedGeneratedImages<TQuiz>;

export async function hydrateGeneratedImages(
  jobs: GeneratedImageJob[],
  options: {
    concurrency: 2;
    signal?: AbortSignal;
    generate: (prompt: string) => Promise<string | null>;
    onResolved: (questionIndex: number, image: string) => void;
  },
): Promise<void>;
```

- [ ] **Step 1: Viết concurrency tests RED**

Create `tests/generatedImageHydration.test.ts`:

```ts
it('returns placeholders immediately and runs at most two image jobs concurrently', async () => {
  const prepared = prepareGeneratedImageJobs({
    questions: [
      { type: 'IMAGE_QUESTION', image: 'IMAGE_PROMPT: hình 1' },
      { type: 'IMAGE_QUESTION', image: 'IMAGE_PROMPT: hình 2' },
      { type: 'IMAGE_QUESTION', image: 'IMAGE_PROMPT: hình 3' },
    ],
  });

  expect(prepared.jobs).toHaveLength(3);
  expect(prepared.quiz.questions[0].image).toContain('placehold.co');

  let active = 0;
  let maxActive = 0;
  const generate = vi.fn(async (prompt: string) => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await Promise.resolve();
    active -= 1;
    return `https://img.test/${encodeURIComponent(prompt)}`;
  });

  await hydrateGeneratedImages(prepared.jobs, {
    concurrency: 2,
    generate,
    onResolved: vi.fn(),
  });

  expect(maxActive).toBe(2);
});
```

- [ ] **Step 2: Implement placeholder + worker pool**

Create `generatedImageHydration.ts` với:

```ts
export function prepareGeneratedImageJobs<TQuiz extends { questions?: Array<Record<string, unknown>> }>(
  source: TQuiz,
): PreparedGeneratedImages<TQuiz> {
  const quiz = structuredClone(source);
  const jobs: GeneratedImageJob[] = [];
  (quiz.questions ?? []).forEach((question, questionIndex) => {
    if (question.type !== 'IMAGE_QUESTION') return;
    if (typeof question.image !== 'string' || !question.image.startsWith('IMAGE_PROMPT:')) return;
    const prompt = question.image.slice('IMAGE_PROMPT:'.length).trim();
    jobs.push({ questionIndex, prompt });
    question.image = `https://placehold.co/600x400?text=${encodeURIComponent('Đang tạo ảnh')}`;
  });
  return { quiz, jobs };
}

export async function hydrateGeneratedImages(
  jobs: GeneratedImageJob[],
  options: HydrateGeneratedImagesOptions,
): Promise<void> {
  let cursor = 0;
  const worker = async () => {
    while (cursor < jobs.length) {
      const job = jobs[cursor];
      cursor += 1;
      if (options.signal?.aborted) return;
      const image = await options.generate(job.prompt);
      if (image) options.onResolved(job.questionIndex, image);
    }
  };
  await Promise.all(Array.from({ length: Math.min(options.concurrency, jobs.length) }, worker));
}
```

- [ ] **Step 3: Thêm IMAGE stage không trừ quota**

Create migration `0041_add_ai_image_stage.sql`:

```sql
ALTER TABLE ai_generation_actions
ADD COLUMN image_calls INTEGER NOT NULL DEFAULT 0 CHECK(image_calls >= 0);
```

Frontend/Worker stage union thêm `IMAGE`.

Trong `aiRequestPolicy.ts`, cập nhật union và row:

```ts
export type AiStage =
  | 'OCR'
  | 'GENERATE'
  | 'REVIEW'
  | 'REPAIR'
  | 'REGENERATE'
  | 'IMAGE'
  | 'GENERIC';

interface AiActionPolicyRow {
  action_id: string;
  username: string;
  workflow: AiWorkflow;
  status: 'RESERVED' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED';
  upstream_calls: number;
  ocr_calls: number;
  generate_calls: number;
  review_calls: number;
  repair_calls: number;
  image_calls: number;
}
```

Cập nhật các map nguyên khối:

```ts
const IMAGE_CALL_LIMIT = 10;

const WORKFLOW_STAGES: Record<AiWorkflow, ReadonlySet<AiStage>> = {
  QUIZ_CREATE: new Set<AiStage>(['OCR', 'GENERATE', 'REVIEW', 'REPAIR', 'IMAGE']),
  QUESTION_REGENERATE: new Set<AiStage>(['REGENERATE']),
  GENERIC: new Set<AiStage>(['GENERIC']),
};

const STAGE_COLUMNS: Record<AiStage, keyof Pick<
  AiActionPolicyRow,
  'ocr_calls' | 'generate_calls' | 'review_calls' | 'repair_calls' | 'image_calls'
>> = {
  OCR: 'ocr_calls',
  GENERATE: 'generate_calls',
  REVIEW: 'review_calls',
  REPAIR: 'repair_calls',
  REGENERATE: 'generate_calls',
  IMAGE: 'image_calls',
  GENERIC: 'generate_calls',
};

const stageLimit = (stage: AiStage): number => stage === 'IMAGE' ? IMAGE_CALL_LIMIT : 1;
```

Thêm `image_calls` vào câu `SELECT` của `readAction`. Trong `assertActionCanRun` dùng:

```ts
const count = Number(action[STAGE_COLUMNS[meta.stage]] ?? 0);
if (!Number.isFinite(count) || count >= stageLimit(meta.stage)) {
  throw new AiRequestPolicyError('AI_STAGE_CONFLICT');
}
if (meta.stage === 'IMAGE' && action.generate_calls !== 1) {
  throw new AiRequestPolicyError('AI_STAGE_CONFLICT');
}
```

Trong `recordAiStageSuccess`, dùng `const limit = stageLimit(meta.stage)` và SQL `${column} < ${limit}`. `IMAGE` chỉ hợp lệ khi `generate_calls = 1`; `QUOTA_COMPLETION_STAGES` và `QUOTA_RELEASE_STAGES` không thêm IMAGE. `reserveAiAction` sẽ thấy action cũ và không tăng `teacher_ai_daily_usage`.

- [ ] **Step 4: Truyền action context khi tạo ảnh**

Modify `generateImage`:

```ts
export const generateImage = async (
  prompt: string,
  execution: QuizAiExecutionContext,
): Promise<ImageGenerationResult> => requestWorkerAi({
  model: DEFAULT_MODEL,
  messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
  max_tokens: 4096,
}, {
  action: { ...execution.action, stage: 'IMAGE' },
  signal: execution.signal,
});
```

- [ ] **Step 5: Bỏ ảnh khỏi critical path trong `generateQuiz`**

Đổi tên helper blocking hiện tại thành và giữ implementation đầy đủ:

```ts
export const resolveGeneratedImagesBlocking = async (result: unknown): Promise<unknown> => {
  if (!result || typeof result !== 'object') return result;
  const resultObject = result as Record<string, unknown>;
  if (!Array.isArray(resultObject.questions)) return result;

  const imageQuestions = (resultObject.questions as Record<string, unknown>[]).filter(
    (question) => question.type === 'IMAGE_QUESTION'
      && typeof question.image === 'string'
      && question.image.startsWith('IMAGE_PROMPT:'),
  );
  if (imageQuestions.length === 0) return resultObject;

  const imageServiceAvailable = await checkImageServiceAvailability();
  for (const question of resultObject.questions as Record<string, unknown>[]) {
    if (question.type !== 'IMAGE_QUESTION'
      || typeof question.image !== 'string'
      || !question.image.startsWith('IMAGE_PROMPT:')) continue;

    const prompt = question.image.replace('IMAGE_PROMPT:', '').trim();
    if (imageServiceAvailable) {
      const generated = await generateImage(prompt);
      question.image = generated.success && generated.data
        ? generated.data
        : `https://placehold.co/600x400?text=${encodeURIComponent(prompt.slice(0, 20))}`;
    } else {
      question.image = `https://placehold.co/600x400?text=${encodeURIComponent(prompt.slice(0, 20))}`;
    }
  }
  return resultObject;
};
```

Bỏ lời gọi blocking khỏi đường mặc định:

```ts
// Không gọi await resolveGeneratedImagesBlocking(result) trong fast path.
```

`generateQuiz` chỉ trả đề text đã qua deterministic audit; helper blocking vẫn tồn tại để Task 6 điều khiển bằng feature flag.

Trong `useQuizGeneration.ts` sau khi nhận result:

```ts
const prepared = prepareGeneratedImageJobs(result);
const detectedCategory = normalizeAiCategory(prepared.quiz.detectedCategory);
const detectedLesson = typeof prepared.quiz.detectedLesson === 'string'
  ? prepared.quiz.detectedLesson.trim()
  : '';
const suggestedTags = normalizeTags(prepared.quiz.suggestedTags);
const generatedQuiz = createQuizFromResult(
  prepared.quiz,
  options.title,
  detectedCategory,
  detectedLesson,
  suggestedTags,
);
form.setGeneratedQuiz(generatedQuiz);
setGenerationStep('completed');
setIsHydratingImages(prepared.jobs.length > 0);

void hydrateGeneratedImages(prepared.jobs, {
  concurrency: 2,
  signal: imageController.signal,
  generate: async (prompt) => {
    const generated = await generateImage(prompt, {
      action,
      stage: 'IMAGE',
      signal: imageController.signal,
    });
    return generated.success ? generated.data ?? null : null;
  },
  onResolved: (questionIndex, image) => {
    form.setGeneratedQuiz((current) => {
      if (!current) return current;
      const questions = current.questions.map((question, index) => (
        index === questionIndex ? { ...question, image } : question
      ));
      return { ...current, questions };
    });
  },
}).finally(() => setIsHydratingImages(false));
```

- [ ] **Step 6: Không khóa việc xem/sửa, chỉ khóa lưu khi ảnh đang chạy**

Expose `isHydratingImages` qua `useCreateQuizLogic`.

`QuizPreviewToolbarProps` thêm:

```ts
isHydratingImages: boolean;
```

Save button:

```tsx
<Button
  onClick={onSave}
  disabled={isHydratingImages}
  title={isHydratingImages ? 'Chờ hoàn thiện hình ảnh trước khi lưu đề' : undefined}
>
  {isHydratingImages ? 'Đang hoàn thiện ảnh...' : isSaving ? 'Đang lưu...' : 'Lưu đề'}
</Button>
```

Preview câu hỏi vẫn hiển thị ngay với placeholder.

- [ ] **Step 7: Chạy tests**

```bash
npm run test:run -- \
  tests/generatedImageHydration.test.ts \
  tests/aiProxy.worker.test.ts \
  tests/quizGenerationWorkflow.test.tsx \
  tests/QuizPreview.test.tsx
npx tsc -p workers/tsconfig.json --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add workers/migrations/0041_add_ai_image_stage.sql \
  src/services/ai/generatedImageHydration.ts \
  src/services/ai/aiAction.ts workers/src/services/aiRequestPolicy.ts \
  workers/src/routes/aiProxy.ts src/services/ai/imageGenerationService.ts \
  src/services/geminiService.ts \
  src/features/quiz-generator/hooks/useQuizGeneration.ts \
  src/features/quiz-generator/hooks/useCreateQuizLogic.ts \
  src/components/TeacherDashboard/CreateTab.tsx \
  src/components/TeacherDashboard/quiz-preview/index.tsx \
  src/components/TeacherDashboard/quiz-preview/QuizPreviewToolbar.tsx \
  tests/generatedImageHydration.test.ts tests/aiProxy.worker.test.ts \
  tests/quizGenerationWorkflow.test.tsx tests/QuizPreview.test.tsx
git commit -m "perf(ai): hydrate generated images after quiz display"
```

---

### Task 6: Feature flags, verification, rollout và benchmark production

**Files:**
- Modify: `.env.example`
- Modify: `src/config/featureFlags.ts`
- Modify: `src/features/quiz-generator/hooks/useCreateQuizLogic.ts`
- Create: `docs/runbooks/ai-generation-performance-rollout.md`

**Interfaces:**

```ts
export const isAiFastPathEnabled = (): boolean;
export const isAiDeferredImagesEnabled = (): boolean;
```

- [ ] **Step 1: Thêm flags mặc định an toàn**

`.env.example`:

```env
VITE_FEATURE_AI_FAST_PATH=false
VITE_FEATURE_AI_DEFER_IMAGES=false
```

`featureFlags.ts`:

```ts
export const isAiFastPathEnabled = (): boolean => resolveFeatureFlag(
  import.meta.env.VITE_FEATURE_AI_FAST_PATH,
  false,
);

export const isAiDeferredImagesEnabled = (): boolean => resolveFeatureFlag(
  import.meta.env.VITE_FEATURE_AI_DEFER_IMAGES,
  false,
);
```

Trong `useQuizGeneration.ts`, tính policy hiệu lực:

```ts
const effectiveReviewMode = isAiFastPathEnabled()
  ? form.reviewMode
  : 'strict';

const shouldDeferImages = isAiDeferredImagesEnabled();
```

Truyền `effectiveReviewMode` vào generation options. Sau khi nhận result:

```ts
const displayResult = shouldDeferImages
  ? result
  : await resolveGeneratedImagesBlocking(result);
```

Chỉ gọi `prepareGeneratedImageJobs` và background hydration khi `shouldDeferImages === true`. Khi flag fast path tắt, hệ thống quay về reviewer blocking; khi deferred images tắt, hệ thống quay về ảnh blocking. Xóa compatibility path ở release tiếp theo sau khi metrics ổn định.

- [ ] **Step 2: Viết rollout runbook**

Create `docs/runbooks/ai-generation-performance-rollout.md` với thứ tự:

1. Deploy migration `0040` và code telemetry, giữ cả hai flags `false`.
2. Thu baseline tối thiểu 20 action hoặc 24 giờ.
3. Bật `VITE_FEATURE_AI_FAST_PATH=true`, deploy frontend.
4. Theo dõi 24 giờ; rollback nếu validation failure tăng >2 điểm phần trăm hoặc P95 >60 giây.
5. Bật `VITE_FEATURE_AI_DEFER_IMAGES=true` sau khi fast path ổn định.
6. Theo dõi thêm 24 giờ trước khi xóa compatibility path.

- [ ] **Step 3: Chạy targeted verification**

```bash
npm run test:run -- \
  tests/aiPerformanceTelemetry.worker.test.ts \
  tests/aiProxy.worker.test.ts \
  tests/quizQualityPolicy.test.ts \
  tests/quizGenerationPipeline.test.ts \
  tests/quizGenerationPipelineV3.test.ts \
  tests/quizGenerationWorkflow.test.tsx \
  tests/GenerationProgressPanel.test.tsx \
  tests/generatedImageHydration.test.ts \
  tests/QuizPreview.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Chạy full quality gate**

```bash
npm run test:run
npx tsc -p workers/tsconfig.json --noEmit
npx tsc --noEmit
npm run build
npm run security:check
npx wrangler deploy --dry-run --config workers/wrangler.toml
```

Expected:
- Full Vitest PASS.
- Worker typecheck PASS.
- Root typecheck chỉ còn đúng hai lỗi baseline tại `AnnouncementSettings.tsx:210,212`.
- Build, security, Wrangler dry-run PASS.

- [ ] **Step 5: Chạy migration production**

```bash
npx wrangler d1 migrations apply itongquiz-db --remote --config workers/wrangler.toml
```

Expected: migrations `0040` và `0041` applied.

- [ ] **Step 6: Query benchmark production**

Baseline/after query:

```bash
npx wrangler d1 execute itongquiz-db --remote --config workers/wrangler.toml --command "SELECT stage, status, COUNT(*) AS calls, ROUND(AVG(ttfb_ms),1) AS avg_ttfb_ms, MAX(ttfb_ms) AS max_ttfb_ms FROM ai_generation_stage_metrics WHERE created_at >= datetime('now','-24 hours') GROUP BY stage, status ORDER BY stage, status;"
```

Call budget query:

```bash
npx wrangler d1 execute itongquiz-db --remote --config workers/wrangler.toml --command "SELECT upstream_calls, COUNT(*) AS actions FROM ai_generation_actions WHERE workflow='QUIZ_CREATE' AND created_at >= datetime('now','-24 hours') GROUP BY upstream_calls ORDER BY upstream_calls;"
```

Action latency query có median và P95:

```bash
npx wrangler d1 execute itongquiz-db --remote --config workers/wrangler.toml --command "WITH durations AS (SELECT (julianday(updated_at)-julianday(created_at))*86400.0 AS seconds FROM ai_generation_actions WHERE workflow='QUIZ_CREATE' AND status='SUCCEEDED' AND created_at >= datetime('now','-24 hours')), ranked AS (SELECT seconds, ROW_NUMBER() OVER (ORDER BY seconds) AS rn, COUNT(*) OVER () AS total FROM durations) SELECT total AS actions, ROUND(AVG(seconds),1) AS avg_seconds, ROUND((SELECT seconds FROM ranked r2 WHERE r2.rn >= CAST((ranked.total+1)/2 AS INTEGER) ORDER BY r2.rn LIMIT 1),1) AS median_seconds, ROUND((SELECT seconds FROM ranked r3 WHERE r3.rn >= CAST((ranked.total*95+99)/100 AS INTEGER) ORDER BY r3.rn LIMIT 1),1) AS p95_seconds, ROUND(MAX(seconds),1) AS max_seconds FROM ranked;"
```

- [ ] **Step 7: Production smoke test**

Dùng một tài khoản test giáo viên, tạo ba đề:

1. Chủ đề đơn giản, 10 câu, `fast + concise`.
2. Chủ đề có deliberate invalid fixture trên preview/staging để kích hoạt một repair.
3. Đề có 3 câu ảnh.

Xác nhận:

- Case 1 hiển thị đề sau 1 AI call.
- Case 2 tối đa 2 AI calls.
- Case 3 hiển thị đề trước, ảnh hoàn thiện sau, không tăng daily usage.
- Cancel hoạt động ở OCR, generate và image hydration.
- Save bị khóa chỉ trong lúc ảnh đang hydrate.

- [ ] **Step 8: Acceptance gate**

Chỉ coi rollout hoàn tất khi trong 24 giờ gần nhất:

- Median do dashboard/query tính được ≤20 giây.
- P95 ≤60 giây.
- Ít nhất 90% `QUIZ_CREATE` có `upstream_calls <= 2`.
- Không có action fast hợp lệ nào có `review_calls > 0`.
- Tỷ lệ FAILED không tăng hơn 2 điểm phần trăm so với baseline.
- Không có teacher daily usage tăng thêm do stage `IMAGE`.

- [ ] **Step 9: Commit docs/config**

```bash
git add .env.example src/config/featureFlags.ts \
  src/features/quiz-generator/hooks/useCreateQuizLogic.ts \
  docs/runbooks/ai-generation-performance-rollout.md
git commit -m "docs(ai): add performance rollout and acceptance gates"
```

---

## Final Verification Checklist

- [ ] Valid fast path = 1 call.
- [ ] Fast repair path ≤2 calls.
- [ ] Strict mode giữ reviewer và có cảnh báo “chậm hơn”.
- [ ] Lời giải mặc định 1–2 câu.
- [ ] Progress phản ánh stage thật, không phần trăm giả.
- [ ] Timeout theo stage, không còn mặc định 5 phút cho mọi bước.
- [ ] Đề xuất hiện trước ảnh.
- [ ] Image concurrency tối đa 2.
- [ ] Image stage không trừ quota.
- [ ] Telemetry không lưu prompt, câu hỏi hoặc dữ liệu học sinh.
- [ ] Full tests/build/security/dry-run đạt.
- [ ] Production metrics đạt acceptance gate trước khi bỏ compatibility path.

## Rollback

- Tắt `VITE_FEATURE_AI_DEFER_IMAGES` trước nếu có lỗi ảnh hoặc lưu đề.
- Tắt `VITE_FEATURE_AI_FAST_PATH` để quay về reviewer blocking.
- Không rollback migration `0040` hoặc `0041`; bảng/cột additive và tương thích ngược.
- Nếu Worker telemetry gây lỗi, tắt phần gọi `recordAiStageMetric` nhưng giữ bảng để không cần migration ngược.
- Nếu timeout mới gây false timeout, tăng riêng stage bị ảnh hưởng; không quay lại timeout 300 giây cho toàn bộ pipeline.
