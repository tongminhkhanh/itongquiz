# AI Quiz Generation V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** NÃ¢ng cáº¥p luá»“ng ra Ä‘á» báº±ng AI Ä‘á»ƒ háº¡n má»©c khÃ´ng thá»ƒ bá»‹ nÃ©, tÃ i liá»‡u chá»‰ Ä‘Æ°á»£c gá»­i má»™t láº§n, Ä‘áº§u ra Ä‘Æ°á»£c kiá»ƒm Ä‘á»‹nh báº±ng mÃ£ trÆ°á»›c khi hiá»ƒn thá»‹, cháº¿ Ä‘á»™ Ä‘á» thi/Ã´n táº­p cÃ³ hÃ nh vi khÃ¡c nhau, vÃ  giÃ¡o viÃªn cÃ³ tiáº¿n trÃ¬nh rÃµ rÃ ng Ä‘á»ƒ kiá»ƒm tra trÆ°á»›c khi lÆ°u.

**Architecture:** Giá»¯ Cloudflare Worker lÃ m ranh giá»›i tin cáº­y cho má»i yÃªu cáº§u AI. Má»—i thao tÃ¡c AI cÃ³ `actionId`, `workflow` vÃ  `stage`; Worker dÃ¹ng D1 Ä‘á»ƒ giá»¯ chá»— háº¡n má»©c, chá»‘ng trá»« láº·p, hoÃ n lÆ°á»£t khi upstream tháº¥t báº¡i vÃ  giá»›i háº¡n sá»‘ láº§n gá»i trong má»™t workflow. Frontend tiáº¿p tá»¥c phá»¥ trÃ¡ch tráº£i nghiá»‡m soáº¡n Ä‘á», nhÆ°ng má»i Ä‘áº§u ra AI Ä‘Æ°á»£c coi lÃ  dá»¯ liá»‡u khÃ´ng tin cáº­y vÃ  pháº£i Ä‘i qua Zod schema, kiá»ƒm tra blueprint, sá»­a cÃ³ má»¥c tiÃªu rá»“i má»›i Ä‘Æ°a vÃ o `QuizPreview`.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest 4, Cypress 15, Cloudflare Workers, Cloudflare D1, Zod 4, existing AI proxy at `/api/ai/chat`.

## Global Constraints

- KhÃ´ng thÃªm dependency runtime má»›i; dÃ¹ng `zod`, Vitest, Cypress vÃ  cÃ¡c tiá»‡n Ã­ch Ä‘ang cÃ³.
- KhÃ´ng thay Ä‘á»•i schema lÆ°u `quizzes` vÃ  `questions` trong giai Ä‘oáº¡n nÃ y.
- Háº¡n má»©c giÃ¡o viÃªn giá»¯ nguyÃªn `5` thao tÃ¡c AI thÃ nh cÃ´ng má»—i ngÃ y; admin khÃ´ng giá»›i háº¡n.
- Má»™t thao tÃ¡c táº¡o cáº£ Ä‘á» hoáº·c sinh láº¡i má»™t cÃ¢u chá»‰ tÃ­nh má»™t lÆ°á»£t khi bÆ°á»›c táº¡o chÃ­nh nháº­n upstream HTTP 2xx.
- OCR, reviewer vÃ  má»™t láº§n sá»­a cÃ³ má»¥c tiÃªu trong cÃ¹ng `actionId` khÃ´ng tÃ­nh thÃªm lÆ°á»£t.
- Auth lá»—i, rate-limit lá»—i, upstream non-2xx hoáº·c timeout trÆ°á»›c bÆ°á»›c táº¡o chÃ­nh pháº£i hoÃ n láº¡i lÆ°á»£t Ä‘Ã£ giá»¯.
- Má»™t `actionId` chá»‰ thuá»™c má»™t tÃ i khoáº£n vÃ  má»™t workflow; tÃ¡i sá»­ dá»¥ng sai tráº£ vá» HTTP `409`.
- File nguá»“n tá»‘i Ä‘a `10 MiB`; chá»‰ cháº¥p nháº­n PDF vÃ  áº£nh JPEG/PNG/WebP.
- KhÃ´ng ghi prompt, ná»™i dung OCR, Ä‘Ã¡p Ã¡n, file base64, token hoáº·c thÃ´ng tin há»c sinh vÃ o log.
- Má»i chuá»—i giao diá»‡n vÃ  prompt tiáº¿ng Viá»‡t pháº£i lÃ  UTF-8 cÃ³ dáº¥u, khÃ´ng cÃ²n chuá»—i mojibake nhÆ° `Kh?ng`, `T?I LI?U`.
- TÃ­nh nÄƒng V2 Ä‘Æ°á»£c báº£o vá»‡ bá»Ÿi `VITE_FEATURE_AI_QUIZ_V2`; máº·c Ä‘á»‹nh `false` cho Ä‘áº¿n checkpoint rollout.
- Má»—i task pháº£i cháº¡y test liÃªn quan trÆ°á»›c, sau Ä‘Ã³ cháº¡y `npm run build` táº¡i checkpoint.

---

## File Structure

### Worker security and quota

- Create `workers/migrations/0039_create_ai_generation_actions.sql` â€” táº¡o báº£ng ledger thao tÃ¡c AI vÃ  báº£o Ä‘áº£m báº£ng háº¡n má»©c tá»“n táº¡i báº±ng migration.
- Create `workers/src/services/teacherAiQuotaLedger.ts` â€” giá»¯ lÆ°á»£t, hoÃ n lÆ°á»£t, chá»‘t thÃ nh cÃ´ng vÃ  háº¿t háº¡n reservation.
- Create `workers/src/services/aiRequestPolicy.ts` â€” kiá»ƒm tra workflow/stage, giá»›i háº¡n sá»‘ láº§n gá»i vÃ  thá»© tá»± gá»i.
- Modify `workers/src/routes/aiProxy.ts` â€” Ã¡p auth, policy vÃ  quota ngay táº¡i ranh giá»›i AI.
- Modify `workers/src/routes/teacherAiQuota.ts` â€” chá»‰ Ä‘á»c ledger/service, khÃ´ng tá»± táº¡o báº£ng khi request cháº¡y.

### Frontend request workflow

- Create `src/services/ai/aiAction.ts` â€” táº¡o `actionId` vÃ  kiá»ƒu metadata dÃ¹ng chung á»Ÿ client.
- Modify `src/services/ai/workerAiClient.ts` â€” gá»­i metadata, há»— trá»£ `AbortSignal`, giá»¯ timeout hiá»‡n táº¡i.
- Modify `src/services/ai/extractTextFromPdf.ts` â€” OCR dÃ¹ng stage riÃªng vÃ  tráº£ tÃ i liá»‡u cÃ³ cáº¥u trÃºc.
- Modify `src/features/quiz-generator/hooks/useQuizGeneration.ts` â€” má»™t `actionId` xuyÃªn suá»‘t OCR â†’ generate â†’ review/repair.

### Blueprint and validation

- Create `src/features/quiz-generator/domain/quizBlueprint.ts` â€” Ã½ Ä‘á»‹nh Ä‘á», phÃ¢n bá»• dáº¡ng cÃ¢u vÃ  Ä‘á»™ khÃ³.
- Create `src/services/ai/schemas/quizGenerationSchema.ts` â€” Zod discriminated union cho Ä‘áº§u ra AI.
- Create `src/services/ai/quizAudit.ts` â€” kiá»ƒm tra sá»‘ lÆ°á»£ng, Ä‘Ã¡p Ã¡n, Ä‘á»™ khÃ³, trÃ¹ng láº·p vÃ  cáº¥u trÃºc.
- Create `src/services/ai/quizRepair.ts` â€” táº¡o prompt sá»­a Ä‘Ãºng pháº§n lá»—i vÃ  há»£p nháº¥t káº¿t quáº£.
- Modify `src/services/ai/prompts/quizPromptBuilder.ts` â€” yÃªu cáº§u chÃ­nh xÃ¡c blueprint vÃ  khÃ¡c biá»‡t exam/practice.

### Teacher UX

- Create `src/features/quiz-generator/components/QuestionBlueprintSection.tsx` â€” chá»‰nh sá»‘ cÃ¢u theo dáº¡ng.
- Create `src/features/quiz-generator/components/GenerationProgressPanel.tsx` â€” hiá»ƒn thá»‹ bÆ°á»›c, lá»—i vÃ  nÃºt há»§y.
- Create `src/features/quiz-generator/components/OcrPreviewSection.tsx` â€” chá»n trang OCR trÆ°á»›c khi táº¡o Ä‘á».
- Modify `src/components/TeacherDashboard/CreateTab.tsx` â€” káº¿t ná»‘i cÃ¡c pháº§n V2 sau feature flag.
- Modify `src/features/quiz-generator/components/GeneralInfoSection.tsx` â€” gá»£i Ã½ AI tiáº¿ng Viá»‡t vÃ  â€œÃp dá»¥ng táº¥t cáº£â€.

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

## Phase 1 â€” Security, quota and request reliability

### Task 1: Persist the AI action ledger in D1

**Files:**
- Create: `workers/migrations/0039_create_ai_generation_actions.sql`
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
expect(migrations.at(-1)).toBe('0039_create_ai_generation_actions.sql');
```

Add a test that reads the migration and verifies both tables are migration-owned:

```ts
it('stores teacher AI quota and action reservations in migrations', () => {
  const sql = fs.readFileSync(path.join(migrationsDir, '0039_create_ai_generation_actions.sql'), 'utf8');
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

Expected: FAIL because `0039_create_ai_generation_actions.sql` does not exist and the last migration is still `0036`.

- [ ] **Step 3: Create the migration**

Create `workers/migrations/0039_create_ai_generation_actions.sql` with this schema:

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
      ? 'Báº¡n Ä‘Ã£ dÃ¹ng háº¿t 5 lÆ°á»£t táº¡o Ä‘á» AI hÃ´m nay.'
      : 'MÃ£ thao tÃ¡c AI Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng cho má»™t yÃªu cáº§u khÃ¡c.');
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
  message: 'Háº¡n má»©c AI Ä‘Æ°á»£c tÃ­nh tá»± Ä‘á»™ng khi yÃªu cáº§u AI thÃ nh cÃ´ng.',
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
git add workers/migrations/0039_create_ai_generation_actions.sql workers/src/services/teacherAiQuotaLedger.ts workers/src/routes/teacherAiQuota.ts tests/d1MigrationLayout.test.ts tests/teacherAiQuotaLedger.worker.test.ts
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
  return errorResponse('Dá»‹ch vá»¥ AI táº¡m thá»i khÃ´ng kháº£ dá»¥ng.', 503);
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
  await expect(promise).rejects.toThrow('ÄÃ£ há»§y yÃªu cáº§u AI.');
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
if (options.signal?.aborted) throw new Error('ÄÃ£ há»§y yÃªu cáº§u AI.');
const onAbort = () => controller.abort('caller');
options.signal?.addEventListener('abort', onAbort, { once: true });
const timeoutId = setTimeout(() => controller.abort('timeout'), options.timeoutMs ?? 300_000);
```

In `catch`, return:

- caller cancelled â†’ `ÄÃ£ há»§y yÃªu cáº§u AI.`
- timeout â†’ `YÃªu cáº§u AI quÃ¡ thá»i gian. Vui lÃ²ng thá»­ láº¡i.`

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
  expect(String(generateMock.mock.calls[0][2])).toContain('Ná»˜I DUNG OCR');
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

Expected: `0039_create_ai_generation_actions.sql` applied successfully.

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

- [ ] Human review before Phase 2: verify the exact quota semantics and whether one manual single-question regeneration should consume one lÆ°á»£t.

---

## Phase 2 â€” Blueprint, deterministic validation and targeted repair

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
  })).toContain('Tá»•ng sá»‘ cÃ¢u theo dáº¡ng pháº£i báº±ng 10.');
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
  const prompt = buildPrompt('PhÃ¢n sá»‘', '4', '', optionsWithBlueprint);
  expect(prompt).toContain('MCQ: 4 cÃ¢u');
  expect(prompt).toContain('TRUE_FALSE: 2 cÃ¢u');
  expect(prompt).toContain('SHORT_ANSWER: 2 cÃ¢u');
  expect(prompt).toContain('MATCHING: 2 cÃ¢u');
});

it('uses exam rules without hints', () => {
  const prompt = buildPrompt('PhÃ¢n sá»‘', '4', '', examOptions);
  expect(prompt).toContain('[INTENT: EXAM]');
  expect(prompt).toContain('KhÃ´ng Ä‘Æ°a gá»£i Ã½ trong ná»™i dung cÃ¢u há»i');
});

it('uses practice rules with learning feedback', () => {
  const prompt = buildPrompt('PhÃ¢n sá»‘', '4', '', practiceOptions);
  expect(prompt).toContain('[INTENT: PRACTICE]');
  expect(prompt).toContain('Lá»i giáº£i pháº£i hÆ°á»›ng dáº«n tá»«ng bÆ°á»›c');
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
- CÃ¢u há»i ngáº¯n gá»n, trung láº­p, khÃ´ng Ä‘Æ°a gá»£i Ã½ trong ná»™i dung cÃ¢u há»i.
- KhÃ´ng láº·p cÃ¹ng má»™t ká»¹ nÄƒng báº±ng cÃ¡ch Ä‘á»•i sá»‘ Ä‘Æ¡n giáº£n.
- PhÆ°Æ¡ng Ã¡n nhiá»…u pháº£i há»£p lÃ½ nhÆ°ng chá»‰ cÃ³ Ä‘Ãºng sá»‘ Ä‘Ã¡p Ã¡n theo schema.
- explanation váº«n pháº£i Ä‘áº§y Ä‘á»§ Ä‘á»ƒ giÃ¡o viÃªn duyá»‡t, nhÆ°ng khÃ´ng xuáº¥t hiá»‡n khi há»c sinh Ä‘ang lÃ m bÃ i.`,
  PRACTICE: `
[INTENT: PRACTICE]
- Sáº¯p xáº¿p tá»« kiáº¿n thá»©c cá»‘t lÃµi Ä‘áº¿n váº­n dá»¥ng.
- Lá»i giáº£i pháº£i hÆ°á»›ng dáº«n tá»«ng bÆ°á»›c, nÃªu lá»—i sai thÆ°á»ng gáº·p vÃ  má»™t máº¹o nhá»› ngáº¯n.
- NgÃ´n ngá»¯ khuyáº¿n khÃ­ch, khÃ´ng gÃ¢y Ã¡p lá»±c.`,
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
    title: 'Äá»',
    questions: [{ type: 'MCQ', question: '1 + 1 = ?', options: ['1', '2'], correctAnswer: 'D', explanation: '...' }],
  })).toThrow();
});

it('rejects empty categorization content instead of inventing placeholders', () => {
  expect(() => parseGeneratedQuiz({
    title: 'Äá»',
    questions: [{
      type: 'CATEGORIZATION', question: 'PhÃ¢n loáº¡i',
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
- MULTIPLE_SELECT must have 2â€“3 unique answers.
- TRUE_FALSE must have 2â€“4 items.
- MATCHING must have 3â€“6 non-empty pairs.
- DRAG_DROP placeholder count must equal `blanks.length`.
- CATEGORIZATION category IDs must exist and every item content must be non-empty.
- ORDERING `correctOrder` must be a permutation of item indexes/IDs.

- [ ] **Step 4: Stop silent placeholder repair**

In `jsonRepair.ts`, retain math normalization and metadata normalization, but remove code that inserts `(Má»¥c 1)` or assigns the first category when data is missing. Invalid structures must surface to the audit/repair layer.

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
  expect(prompt).toContain('Táº¡o Ä‘Ãºng 2 cÃ¢u thay tháº¿');
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

- [ ] Human review: generate fixtures for ToÃ¡n, Tiáº¿ng Viá»‡t and Tiáº¿ng Anh, then verify exact type/difficulty counts and no duplicate questions.

---

## Phase 3 â€” Teacher UX, OCR review and rollout

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
  await user.click(screen.getByRole('button', { name: 'AI tá»± cÃ¢n Ä‘á»‘i' }));
  expect(screen.getByText('Tá»•ng: 10 cÃ¢u')).toBeInTheDocument();
  expect(screen.getAllByRole('spinbutton').map(input => Number((input as HTMLInputElement).value)).reduce((a, b) => a + b, 0)).toBe(10);
});

it('shows a blocking message when type totals do not match', async () => {
  render(<Harness />);
  await user.clear(screen.getByLabelText('Sá»‘ cÃ¢u Tráº¯c nghiá»‡m'));
  await user.type(screen.getByLabelText('Sá»‘ cÃ¢u Tráº¯c nghiá»‡m'), '9');
  expect(screen.getByText('Tá»•ng sá»‘ cÃ¢u theo dáº¡ng pháº£i báº±ng 10.')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx vitest run tests/QuestionBlueprintSection.test.tsx
```

- [ ] **Step 3: Implement the editor**

UI requirements:

- Intent cards: `Äá» thi` and `Ã”n táº­p`.
- One row per selected question type with `-`, numeric input and `+`.
- `AI tá»± cÃ¢n Ä‘á»‘i` calls `buildBalancedTypeAllocations`.
- Total mismatch appears in red and disables generation.
- Difficulty inputs remain 0â€“40 and show the same total.
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
  expect(screen.getByText('Äang Ä‘á»c tÃ i liá»‡u')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Há»§y táº¡o Ä‘á»' }));
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
  reading_document: 'Äang Ä‘á»c tÃ i liá»‡u',
  generating: 'Äang táº¡o cÃ¢u há»i',
  reviewing: 'Äang kiá»ƒm tra Ä‘Ã¡p Ã¡n',
  repairing: 'Äang sá»­a cÃ¡c cÃ¢u chÆ°a Ä‘áº¡t',
  completed: 'ÄÃ£ hoÃ n thÃ nh',
  cancelled: 'ÄÃ£ há»§y yÃªu cáº§u',
} as const;
```

Display no fake percentages. Use a stepper with completed/current/upcoming states.

- [ ] **Step 4: Connect cancel and sticky actions**

When generating, replace the generate buttons with the panel and one `Há»§y táº¡o Ä‘á»` button. After cancellation, preserve form input and do not decrement quota if the main generation request never received upstream 2xx.

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
- Show `TÃ i liá»‡u Ä‘Ã£ bá»‹ cáº¯t bá»›t` when `wasTruncated` is true.
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

- `Gá»£i Ã½ tá»« AI`
- `Ãp dá»¥ng mÃ´n há»c`
- `DÃ¹ng tÃªn bÃ i nÃ y`
- `ThÃªm nhÃ£n`
- `Ãp dá»¥ng táº¥t cáº£`

`Ãp dá»¥ng táº¥t cáº£` must apply category, title and all unique tags without overwriting a non-empty teacher title unless the teacher confirms by clicking the dedicated title button.

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
cy.contains('Äang Ä‘á»c tÃ i liá»‡u').should('be.visible');
cy.findByLabelText('Trang 2').uncheck();
cy.contains('Äang kiá»ƒm tra Ä‘Ã¡p Ã¡n').should('be.visible');
cy.contains('10 cÃ¢u').should('be.visible');
cy.contains('LÆ°u Ä‘á»').should('be.enabled');
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
  â””â”€ Task 2 Worker policy
       â””â”€ Task 3 client action metadata
            â””â”€ Task 4 unified workflow

Task 5 blueprint
  â””â”€ Task 6 prompt intent
  â””â”€ Task 7 schema
       â””â”€ Task 8 audit
            â””â”€ Task 9 targeted repair

Task 5 + Task 4
  â””â”€ Task 10 blueprint UI
  â””â”€ Task 11 progress/cancel
  â””â”€ Task 12 OCR preview

Tasks 1â€“12
  â””â”€ Task 13 UTF-8 cleanup
       â””â”€ Task 14 rollout and E2E
```

## Parallelization

- Tasks 5â€“8 may start after Task 3 and can run in parallel with Task 4 if shared signatures are frozen first.
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
