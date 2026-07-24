# AI Quiz Schema Validation Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ngăn lỗi tạo đề do AI trả sai cấu trúc `DROPDOWN` và `CATEGORIZATION`, cho phép đúng một lượt sửa cấu trúc trước khi hủy, đồng thời chỉ hiển thị thông báo dễ hiểu cho giáo viên.

**Architecture:** Tăng độ chính xác ở nguồn bằng hợp đồng JSON đầy đủ trong prompt V2. Tại biên nhận dữ liệu AI, dùng `GeneratedQuizSchema.safeParse()` để phát hiện lỗi và thực hiện tối đa một lượt schema-repair cho workflow `QUIZ_CREATE`; kết quả sửa vẫn phải vượt qua schema nghiêm ngặt trước khi đi vào audit hiện có. Lỗi schema cuối cùng được đóng gói thành typed error chứa chi tiết kỹ thuật an toàn, còn giao diện chỉ nhận thông báo ngắn bằng tiếng Việt.

**Tech Stack:** TypeScript 5.8, React 19, Vite 6, Vitest 4, Zod 4, Cloudflare Worker AI gateway, GitNexus.

## Global Constraints

- Không bật `VITE_FEATURE_AI_BLUEPRINT_V3` như một cách né lỗi; phải sửa đúng pipeline V2 đang chạy.
- Không làm `categoryId`, `blanks`, `categories` hoặc các trường schema bắt buộc trở thành optional.
- Không tự suy đoán hoặc tự bịa `categoryId`, đáp án dropdown hay nhóm phân loại ở client.
- Chỉ được gọi AI sửa cấu trúc tối đa một lần cho mỗi lượt `QUIZ_CREATE`; không retry đệ quy.
- Không tự động schema-repair cho workflow `QUESTION_REGENERATE`.
- Không hiển thị Zod JSON, stack trace, nội dung raw quiz hoặc prompt nội bộ trong toast.
- Không thêm dependency mới.
- Mọi thay đổi production phải có test RED trước, sau đó GREEN, rồi mới refactor.
- Thực hiện trong worktree riêng từ `origin/main`, nhánh đề xuất: `fix/ai-quiz-schema-repair`.
- Không deploy production trước khi targeted tests, related tests, build, browser verification và code review đều đạt.

---

## File Map

### Files to create

- `src/services/ai/quizGenerationErrors.ts`
  - Định nghĩa lỗi schema có kiểu, chuyển Zod issue thành dữ liệu an toàn và ánh xạ lỗi sang thông báo cho giáo viên.

### Files to modify

- `src/services/ai/prompts/quizPromptBuilder.ts`
  - Bổ sung hợp đồng JSON đầy đủ cho `DROPDOWN` và `CATEGORIZATION` trong prompt V2.
- `src/services/ai/quizRepair.ts`
  - Tạo prompt chuyên biệt để sửa toàn bộ draft chưa parse được dựa trên danh sách Zod issue.
- `src/services/geminiService.ts`
  - Thêm bước safe-parse và tối đa một lượt schema-repair trước audit/semantic repair hiện có.
- `src/features/quiz-generator/hooks/useQuizGeneration.ts`
  - Không chuyển thẳng `error.message` của Zod lên toast; dùng mapper lỗi thân thiện.

### Tests to modify

- `tests/quizPromptBuilder.test.ts`
  - Khóa hợp đồng prompt của hai dạng câu gây lỗi.
- `tests/quizGenerationSchema.test.ts`
  - Khẳng định schema vẫn từ chối dữ liệu mơ hồ, tránh việc “sửa” bằng cách nới schema.
- `tests/quizGenerationPipeline.test.ts`
  - Khóa hành vi một lượt schema-repair trước audit và không retry vô hạn.
- `tests/quizGenerationWorkflow.test.tsx`
  - Khóa nội dung toast thân thiện, không chứa JSON kỹ thuật.

---

### Task 1: Specify Exact V2 Contracts for Interactive Question Types

**Files:**
- Modify: `tests/quizPromptBuilder.test.ts`
- Modify: `src/services/ai/prompts/quizPromptBuilder.ts:65-81`

**Interfaces:**
- Consumes: `buildPrompt(topic, classLevel, content, options): string`.
- Produces: prompt V2 chứa JSON mẫu đầy đủ và quy tắc tham chiếu ID cho `DROPDOWN` và `CATEGORIZATION`.

- [ ] **Step 1: Add a failing prompt-contract test**

Thêm fixture và test sau vào `tests/quizPromptBuilder.test.ts`:

```ts
const interactiveOptions: QuizGenerationOptions = {
  title: 'Đề tương tác',
  questionCount: 2,
  questionTypes: [QuestionType.DROPDOWN, QuestionType.CATEGORIZATION],
  difficultyLevels: { level1: 1, level2: 1, level3: 0 },
  blueprint: {
    intent: 'PRACTICE',
    sourceMode: 'TOPIC',
    totalQuestions: 2,
    typeAllocations: [
      { type: QuestionType.DROPDOWN, count: 1 },
      { type: QuestionType.CATEGORIZATION, count: 1 },
    ],
    difficultyLevels: { level1: 1, level2: 1, level3: 0 },
  },
};

it('includes exact dropdown and categorization JSON contracts', () => {
  const prompt = buildPrompt('Từ loại', '4', '', interactiveOptions);

  expect(prompt).toContain(
    '"blanks":[{"id":"1","options":["lựa chọn 1","lựa chọn 2"],"correctAnswer":"lựa chọn 1"}]',
  );
  expect(prompt).toContain(
    '"categories":[{"id":"nhom-1","name":"Tên nhóm 1"},{"id":"nhom-2","name":"Tên nhóm 2"}]',
  );
  expect(prompt).toContain(
    '"items":[{"id":"item-1","content":"Nội dung cần phân loại","categoryId":"nhom-1"}]',
  );
  expect(prompt).toContain(
    'Mỗi items[].categoryId phải trùng chính xác với một categories[].id đã khai báo',
  );
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npm run test:run -- tests/quizPromptBuilder.test.ts
```

Expected: test mới FAIL vì prompt hiện chỉ mô tả ngắn `blanks`, `categories` và `items`, chưa chứa hợp đồng JSON đầy đủ.

- [ ] **Step 3: Replace the two incomplete descriptions**

Trong `buildTypeDescriptions()`, thay hai giá trị bằng nội dung cụ thể sau:

```ts
DROPDOWN: [
  'DROPDOWN (Điền vào chỗ trống bằng danh sách chọn.)',
  'Format bắt buộc:',
  '{"type":"DROPDOWN","question":"Chọn đáp án đúng","text":"Thủ đô Việt Nam là [1].","blanks":[{"id":"1","options":["lựa chọn 1","lựa chọn 2"],"correctAnswer":"lựa chọn 1"}],"explanation":"Giải thích đầy đủ.","difficultyLevel":2}',
  'Mỗi [id] trong text phải có đúng một object cùng id trong blanks.',
  'correctAnswer phải thuộc options của chính blank đó.',
].join(' '),
CATEGORIZATION: [
  'CATEGORIZATION (Kéo thả từng mục vào nhóm.)',
  'Format bắt buộc:',
  '{"type":"CATEGORIZATION","question":"Phân loại các mục","categories":[{"id":"nhom-1","name":"Tên nhóm 1"},{"id":"nhom-2","name":"Tên nhóm 2"}],"items":[{"id":"item-1","content":"Nội dung cần phân loại","categoryId":"nhom-1"}],"explanation":"Giải thích đầy đủ.","difficultyLevel":2}',
  'Mỗi categories[].id và items[].id phải khác nhau, không được rỗng.',
  'Mỗi items[].categoryId phải trùng chính xác với một categories[].id đã khai báo.',
].join(' '),
```

- [ ] **Step 4: Run the prompt test and verify GREEN**

Run:

```bash
npm run test:run -- tests/quizPromptBuilder.test.ts
```

Expected: toàn bộ test trong file PASS.

- [ ] **Step 5: Commit the prevention layer**

```bash
git add tests/quizPromptBuilder.test.ts src/services/ai/prompts/quizPromptBuilder.ts
git commit -m "fix(ai): specify interactive question contracts"
```

---

### Task 2: Preserve Strict Schema Behavior

**Files:**
- Modify: `tests/quizGenerationSchema.test.ts`
- No production file changes in this task.

**Interfaces:**
- Consumes: `parseGeneratedQuiz(raw): GeneratedQuizPayload`.
- Produces: regression guarantees that invalid references and malformed dropdown blanks remain rejected.

- [ ] **Step 1: Add an explicit categorization-reference regression test**

```ts
it('rejects categorization items whose categoryId is empty or unknown', () => {
  expect(() => parseGeneratedQuiz({
    title: 'Đề phân loại',
    questions: [{
      type: QuestionType.CATEGORIZATION,
      question: 'Phân loại',
      categories: [
        { id: 'nhom-1', name: 'Nhóm 1' },
        { id: 'nhom-2', name: 'Nhóm 2' },
      ],
      items: [
        { id: 'item-1', content: 'Mục hợp lệ', categoryId: 'nhom-1' },
        { id: 'item-2', content: 'Mục lỗi', categoryId: '' },
      ],
      explanation: 'Giải thích đầy đủ.',
      difficultyLevel: 2,
    }],
  })).toThrow();
});
```

- [ ] **Step 2: Add an explicit dropdown-object regression test**

```ts
it('rejects dropdown blanks represented as plain strings', () => {
  expect(() => parseGeneratedQuiz({
    title: 'Đề dropdown',
    questions: [{
      type: QuestionType.DROPDOWN,
      question: 'Chọn đáp án',
      text: 'Thủ đô Việt Nam là [1].',
      blanks: ['Hà Nội'],
      explanation: 'Hà Nội là thủ đô Việt Nam.',
      difficultyLevel: 1,
    }],
  })).toThrow();
});
```

- [ ] **Step 3: Run and document the baseline**

Run:

```bash
npm run test:run -- tests/quizGenerationSchema.test.ts
```

Expected: hai test mới PASS ngay vì schema hiện đã đúng. Đây là characterization gate, không phải RED cho production code; mục đích là ngăn triển khai sau làm schema yếu đi.

- [ ] **Step 4: Commit the strict-contract guard**

```bash
git add tests/quizGenerationSchema.test.ts
git commit -m "test(ai): preserve strict interactive question schemas"
```

---

### Task 3: Define Typed Schema Errors and a Safe Repair Prompt

**Files:**
- Create: `src/services/ai/quizGenerationErrors.ts`
- Modify: `src/services/ai/quizRepair.ts`
- Modify: `tests/quizGenerationPipeline.test.ts`

**Interfaces:**
- Produces:
  - `GeneratedQuizSchemaIssue`.
  - `GeneratedQuizSchemaError`.
  - `toGeneratedQuizSchemaIssues(issues)`.
  - `getQuizGenerationUserMessage(error)`.
  - `buildQuizSchemaRepairPrompt(input)`.
- Consumes later in Task 4: `GeneratedQuizSchemaError`, `toGeneratedQuizSchemaIssues`, `buildQuizSchemaRepairPrompt`.

- [ ] **Step 1: Add a failing test for the schema-repair prompt**

Trong `tests/quizGenerationPipeline.test.ts`, import hàm chưa tồn tại:

```ts
import { buildQuizSchemaRepairPrompt } from '../src/services/ai/quizRepair';
```

Thêm test:

```ts
it('builds a schema repair prompt with safe issue paths and the raw draft', () => {
  const prompt = buildQuizSchemaRepairPrompt({
    quiz: {
      title: 'Bản nháp lỗi',
      questions: [{
        type: QuestionType.CATEGORIZATION,
        items: [{ id: 'item-1', content: 'Mục', categoryId: '' }],
      }],
    },
    issues: [{
      path: ['questions', 0, 'items', 0, 'categoryId'],
      code: 'too_small',
      message: 'Invalid input',
    }],
  });

  expect(prompt).toContain('[LỖI SCHEMA]');
  expect(prompt).toContain('questions.0.items.0.categoryId');
  expect(prompt).toContain('too_small');
  expect(prompt).toContain('"title":"Bản nháp lỗi"');
  expect(prompt).toContain('Không được bỏ câu hợp lệ');
});
```

- [ ] **Step 2: Run and verify RED**

Run:

```bash
npm run test:run -- tests/quizGenerationPipeline.test.ts
```

Expected: FAIL vì `buildQuizSchemaRepairPrompt` chưa được export.

- [ ] **Step 3: Create the typed error module**

Tạo `src/services/ai/quizGenerationErrors.ts`:

```ts
import { z } from 'zod';

export interface GeneratedQuizSchemaIssue {
  path: Array<string | number>;
  code: string;
  message: string;
}

export const GENERATED_QUIZ_SCHEMA_USER_MESSAGE =
  'AI tạo một số câu chưa đúng cấu trúc. Vui lòng thử tạo lại đề hoặc giảm số dạng câu trong một lần.';

export class GeneratedQuizSchemaError extends Error {
  readonly code = 'AI_QUIZ_SCHEMA_INVALID';

  constructor(public readonly issues: GeneratedQuizSchemaIssue[]) {
    super(GENERATED_QUIZ_SCHEMA_USER_MESSAGE);
    this.name = 'GeneratedQuizSchemaError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const toGeneratedQuizSchemaIssues = (
  issues: z.core.$ZodIssue[],
): GeneratedQuizSchemaIssue[] => issues.map((issue) => ({
  path: issue.path.filter(
    (part): part is string | number => typeof part === 'string' || typeof part === 'number',
  ),
  code: issue.code,
  message: issue.message,
}));

export const getQuizGenerationUserMessage = (error: unknown): string => {
  if (error instanceof GeneratedQuizSchemaError || error instanceof z.ZodError) {
    return GENERATED_QUIZ_SCHEMA_USER_MESSAGE;
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Đã xảy ra lỗi khi tạo đề.';
};
```

Lưu ý khi triển khai: nếu TypeScript của Zod 4 không expose `z.core.$ZodIssue` qua namespace hiện tại, dùng `z.ZodIssue` hoặc derive type từ `z.ZodError['issues'][number]`; không dùng `any`.

- [ ] **Step 4: Add the schema-repair prompt builder**

Thêm vào `src/services/ai/quizRepair.ts`:

```ts
import type { GeneratedQuizSchemaIssue } from './quizGenerationErrors';

export interface QuizSchemaRepairRequest {
  quiz: unknown;
  issues: GeneratedQuizSchemaIssue[];
}

export function buildQuizSchemaRepairPrompt(input: QuizSchemaRepairRequest): string {
  const issueLines = input.issues.map((issue) => {
    const path = issue.path.join('.') || '<root>';
    return `- ${path} | ${issue.code} | ${issue.message}`;
  });

  return [
    'Bạn đang sửa cấu trúc JSON của một đề do AI tạo.',
    'Chỉ trả về một JSON object hoàn chỉnh, không dùng markdown hoặc lời dẫn.',
    '[LỖI SCHEMA]',
    ...issueLines,
    '[BẢN NHÁP]',
    JSON.stringify(input.quiz),
    '[YÊU CẦU]',
    'Sửa đúng các trường sai cấu trúc theo lỗi schema.',
    'Không được bỏ câu hợp lệ, không đổi nội dung đúng nếu không cần thiết.',
    'Không tự giảm số câu và không thêm dạng câu ngoài bản nháp.',
    'Mọi items[].categoryId phải trùng với một categories[].id.',
    'Mọi DROPDOWN.blanks[] phải là object gồm id, options và correctAnswer.',
  ].join('\n');
}
```

- [ ] **Step 5: Run and verify GREEN**

Run:

```bash
npm run test:run -- tests/quizGenerationPipeline.test.ts
```

Expected: test prompt mới PASS và các test pipeline hiện có vẫn PASS.

- [ ] **Step 6: Commit typed errors and prompt builder**

```bash
git add src/services/ai/quizGenerationErrors.ts src/services/ai/quizRepair.ts tests/quizGenerationPipeline.test.ts
git commit -m "feat(ai): define schema repair diagnostics"
```

---

### Task 4: Repair an Invalid Draft Once Before Semantic Audit

**Files:**
- Modify: `tests/quizGenerationPipeline.test.ts`
- Modify: `src/services/geminiService.ts:112-185`

**Interfaces:**
- Consumes:
  - `GeneratedQuizSchema.safeParse(raw)`.
  - `buildQuizSchemaRepairPrompt(input)`.
  - `GeneratedQuizSchemaError`.
  - `toGeneratedQuizSchemaIssues(issues)`.
- Produces: `runDeterministicQualityPipeline()` chỉ tiếp tục audit sau khi có draft hợp lệ; schema-repair tối đa một lần.

- [ ] **Step 1: Add a failing pipeline test for categorization/dropdown repair**

Thêm fixture:

```ts
const malformedInteractiveDraft = {
  title: 'Bản nháp tương tác',
  questions: [
    {
      type: QuestionType.CATEGORIZATION,
      question: 'Phân loại',
      categories: [
        { id: 'nhom-1', name: 'Nhóm 1' },
        { id: 'nhom-2', name: 'Nhóm 2' },
      ],
      items: [
        { id: 'item-1', content: 'Mục hợp lệ', categoryId: 'nhom-1' },
        { id: 'item-2', content: 'Mục lỗi', categoryId: '' },
      ],
      explanation: 'Giải thích phân loại.',
      difficultyLevel: 1,
    },
    {
      type: QuestionType.DROPDOWN,
      question: 'Chọn đáp án',
      text: 'Thủ đô Việt Nam là [1].',
      blanks: ['Hà Nội'],
      explanation: 'Hà Nội là thủ đô.',
      difficultyLevel: 2,
    },
  ],
};

const repairedInteractiveDraft = {
  title: 'Bản sửa tương tác',
  questions: [
    {
      type: QuestionType.CATEGORIZATION,
      question: 'Phân loại',
      categories: [
        { id: 'nhom-1', name: 'Nhóm 1' },
        { id: 'nhom-2', name: 'Nhóm 2' },
      ],
      items: [
        { id: 'item-1', content: 'Mục hợp lệ', categoryId: 'nhom-1' },
        { id: 'item-2', content: 'Mục lỗi', categoryId: 'nhom-2' },
      ],
      explanation: 'Giải thích phân loại.',
      difficultyLevel: 1,
    },
    {
      type: QuestionType.DROPDOWN,
      question: 'Chọn đáp án',
      text: 'Thủ đô Việt Nam là [1].',
      blanks: [{
        id: '1',
        options: ['Hà Nội', 'Huế'],
        correctAnswer: 'Hà Nội',
      }],
      explanation: 'Hà Nội là thủ đô.',
      difficultyLevel: 2,
    },
  ],
};
```

Tạo options cho đúng hai loại và test:

```ts
it('repairs an invalid provider draft once before semantic audit', async () => {
  const interactivePipelineOptions: QuizGenerationOptions = {
    title: 'Đề tương tác',
    questionCount: 2,
    questionTypes: [QuestionType.CATEGORIZATION, QuestionType.DROPDOWN],
    difficultyLevels: { level1: 1, level2: 1, level3: 0 },
    blueprint: {
      intent: 'PRACTICE',
      sourceMode: 'TOPIC',
      totalQuestions: 2,
      typeAllocations: [
        { type: QuestionType.CATEGORIZATION, count: 1 },
        { type: QuestionType.DROPDOWN, count: 1 },
      ],
      difficultyLevels: { level1: 1, level2: 1, level3: 0 },
    },
  };
  mocks.generateWithOpenAIResilient.mockResolvedValue(malformedInteractiveDraft);
  mocks.requestWorkerAiText.mockImplementation(async (body, requestOptions) => {
    if (requestOptions?.action?.stage === 'REPAIR') {
      expect(JSON.stringify(body)).toContain('[LỖI SCHEMA]');
      return JSON.stringify(repairedInteractiveDraft);
    }
    if (requestOptions?.action?.stage === 'REVIEW') {
      return JSON.stringify(repairedInteractiveDraft);
    }
    throw new Error(`Unexpected stage ${String(requestOptions?.action?.stage)}`);
  });

  const result = await generateQuiz(
    'Từ loại',
    '4',
    '',
    undefined,
    interactivePipelineOptions,
    undefined,
    'openai',
    undefined,
    execution,
  );

  expect(result.questions).toHaveLength(2);
  expect(result.questions[0].items[1].categoryId).toBe('nhom-2');
  expect(result.questions[1].blanks[0]).toEqual({
    id: '1',
    options: ['Hà Nội', 'Huế'],
    correctAnswer: 'Hà Nội',
  });
  expect(mocks.requestWorkerAiText.mock.calls.map((call) => call[1]?.action?.stage))
    .toEqual(['REPAIR', 'REVIEW']);
});
```

- [ ] **Step 2: Run and verify RED**

Run:

```bash
npm run test:run -- tests/quizGenerationPipeline.test.ts
```

Expected: FAIL với Zod error trước khi `requestWorkerAiText` được gọi.

- [ ] **Step 3: Add one bounded schema-repair helper inside `geminiService.ts`**

Import:

```ts
import {
  GeneratedQuizSchema,
  parseGeneratedQuiz,
  parseGeneratedQuizV3,
  type GeneratedQuizPayload,
} from './ai/schemas/quizGenerationSchema';
import {
  GeneratedQuizSchemaError,
  toGeneratedQuizSchemaIssues,
} from './ai/quizGenerationErrors';
import {
  buildQuizRepairPrompt,
  buildQuizSchemaRepairPrompt,
  buildQuizSlotRepairPrompt,
  createQuizRepairPlan,
  createQuizSlotRepairPlan,
  mergeRepairedQuestions,
  mergeRepairedSlots,
  QuizGenerationValidationError,
} from './ai/quizRepair';
```

Thêm helper trước `runDeterministicQualityPipeline`:

```ts
const parseDraftWithOneSchemaRepair = async (
  result: unknown,
  execution: QuizAiExecutionContext | undefined,
  onStepChange?: (step: QuizGenerationStep) => void,
): Promise<GeneratedQuizPayload> => {
  const normalized = validateAndFixQuiz(result);
  const initial = GeneratedQuizSchema.safeParse(normalized);
  if (initial.success) return initial.data;

  const initialIssues = toGeneratedQuizSchemaIssues(initial.error.issues);
  const canRepair = execution?.action.workflow === 'QUIZ_CREATE';
  if (!canRepair) throw new GeneratedQuizSchemaError(initialIssues);

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
  }, toWorkerOptions({ ...execution, stage: 'REPAIR' }));

  const repairedRaw = validateAndFixQuiz(parseAndRepairJSON(repairedText));
  const repaired = GeneratedQuizSchema.safeParse(repairedRaw);
  if (!repaired.success) {
    throw new GeneratedQuizSchemaError(
      toGeneratedQuizSchemaIssues(repaired.error.issues),
    );
  }
  return repaired.data;
};
```

Thay dòng đầu của `runDeterministicQualityPipeline`:

```ts
const parsedDraft = await parseDraftWithOneSchemaRepair(
  result,
  execution,
  onStepChange,
);
```

Không thay đổi semantic audit/repair bên dưới.

- [ ] **Step 4: Run and verify GREEN for the repair path**

Run:

```bash
npm run test:run -- tests/quizGenerationPipeline.test.ts
```

Expected: test mới PASS; ba test pipeline hiện có vẫn PASS.

- [ ] **Step 5: Add a regression test proving valid drafts add no schema-repair call**

```ts
it('does not add a schema repair call when the provider draft is already valid', async () => {
  mocks.generateWithOpenAIResilient.mockResolvedValue({
    title: 'Đề hợp lệ',
    questions: [makeMcq(1), makeMcq(2)],
  });
  mocks.requestWorkerAiText.mockImplementation(async (_body, requestOptions) => {
    if (requestOptions?.action?.stage === 'REVIEW') {
      return JSON.stringify({
        title: 'Đề đã duyệt',
        questions: [makeMcq(1), makeMcq(2)],
      });
    }
    throw new Error(`Unexpected stage ${String(requestOptions?.action?.stage)}`);
  });

  const result = await generateQuiz(
    'Phân số',
    '4',
    '',
    undefined,
    options,
    undefined,
    'openai',
    undefined,
    execution,
  );

  expect(result.questions).toHaveLength(2);
  expect(mocks.requestWorkerAiText.mock.calls.map((call) => call[1]?.action?.stage))
    .toEqual(['REVIEW']);
});
```

- [ ] **Step 6: Add a regression test for a second malformed repair response**

```ts
it('stops after one schema repair when the repaired response is still invalid', async () => {
  mocks.generateWithOpenAIResilient.mockResolvedValue(malformedInteractiveDraft);
  mocks.requestWorkerAiText.mockResolvedValue(JSON.stringify(malformedInteractiveDraft));

  await expect(generateQuiz(
    'Từ loại',
    '4',
    '',
    undefined,
    {
      title: 'Đề lỗi',
      questionCount: 2,
      questionTypes: [QuestionType.CATEGORIZATION, QuestionType.DROPDOWN],
      difficultyLevels: { level1: 1, level2: 1, level3: 0 },
      blueprint: {
        intent: 'PRACTICE',
        sourceMode: 'TOPIC',
        totalQuestions: 2,
        typeAllocations: [
          { type: QuestionType.CATEGORIZATION, count: 1 },
          { type: QuestionType.DROPDOWN, count: 1 },
        ],
        difficultyLevels: { level1: 1, level2: 1, level3: 0 },
      },
    },
    undefined,
    'openai',
    undefined,
    execution,
  )).rejects.toMatchObject({
    name: 'GeneratedQuizSchemaError',
    code: 'AI_QUIZ_SCHEMA_INVALID',
  });

  expect(mocks.requestWorkerAiText).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 7: Add a regression test proving malformed regeneration does not auto-repair**

```ts
it('does not schema-repair an invalid single-question regeneration response', async () => {
  mocks.generateWithOpenAIResilient.mockResolvedValue(malformedInteractiveDraft);

  await expect(generateQuiz(
    'Từ loại',
    '4',
    '',
    undefined,
    {
      title: 'Sinh lại câu hỏi',
      questionCount: 1,
      questionTypes: [QuestionType.CATEGORIZATION],
      difficultyLevels: { level1: 1, level2: 0, level3: 0 },
      blueprint: {
        intent: 'PRACTICE',
        sourceMode: 'TOPIC',
        totalQuestions: 1,
        typeAllocations: [{ type: QuestionType.CATEGORIZATION, count: 1 }],
        difficultyLevels: { level1: 1, level2: 0, level3: 0 },
      },
    },
    undefined,
    'openai',
    undefined,
    {
      action: {
        actionId: 'ai-invalid-regeneration-1234',
        workflow: 'QUESTION_REGENERATE',
      },
      stage: 'REGENERATE',
    },
  )).rejects.toMatchObject({
    name: 'GeneratedQuizSchemaError',
    code: 'AI_QUIZ_SCHEMA_INVALID',
  });

  expect(mocks.requestWorkerAiText).not.toHaveBeenCalled();
});
```

- [ ] **Step 8: Run and verify all bounded-repair guarantees**

Run:

```bash
npm run test:run -- tests/quizGenerationPipeline.test.ts
```

Expected:

- malformed `QUIZ_CREATE` draft gets one schema-repair call;
- second malformed response throws without REVIEW;
- valid draft goes directly to REVIEW without schema repair;
- malformed `QUESTION_REGENERATE` response throws without auxiliary AI calls;
- all pre-existing pipeline tests remain PASS.

- [ ] **Step 9: Commit the bounded repair pipeline**

```bash
git add src/services/geminiService.ts tests/quizGenerationPipeline.test.ts
git commit -m "fix(ai): repair invalid generated quiz schemas once"
```

---

### Task 5: Replace Raw Zod JSON with a Teacher-Friendly Error

**Files:**
- Modify: `tests/quizGenerationWorkflow.test.tsx:1-232` (import typed error helpers, add two tests, and pass `aiBlueprintV3Enabled: false` in the hook fixture)
- Modify: `src/features/quiz-generator/hooks/useQuizGeneration.ts:335-346`

**Interfaces:**
- Consumes: `getQuizGenerationUserMessage(error): string`.
- Produces: generation toast không chứa Zod issue JSON; lỗi API thông thường vẫn giữ message hiện có.

- [ ] **Step 1: Expose the mocked toast function to the test**

Thêm import sau phần mock declarations:

```ts
import { showError } from '../src/utils/toast';
import {
  GeneratedQuizSchemaError,
  GENERATED_QUIZ_SCHEMA_USER_MESSAGE,
} from '../src/services/ai/quizGenerationErrors';

const showErrorMock = vi.mocked(showError);
```

Bảo đảm fixture `renderGeneration()` truyền rõ flag V3:

```ts
aiBlueprintV3Enabled: false,
```

- [ ] **Step 2: Add a failing user-message test**

```ts
it('shows a concise message instead of raw schema issue JSON', async () => {
  const form = makeForm();
  aiMocks.generateQuiz.mockRejectedValue(new GeneratedQuizSchemaError([{
    path: ['questions', 0, 'items', 3, 'categoryId'],
    code: 'too_small',
    message: 'Invalid input',
  }]));
  const { result } = renderGeneration(form);

  await act(async () => {
    await result.current.handleGenerate('exam');
  });

  expect(showErrorMock).toHaveBeenCalledWith(GENERATED_QUIZ_SCHEMA_USER_MESSAGE);
  expect(String(showErrorMock.mock.calls[0][0])).not.toContain('too_small');
  expect(String(showErrorMock.mock.calls[0][0])).not.toContain('questions');
  expect(String(showErrorMock.mock.calls[0][0])).not.toMatch(/^\s*\[/);
});
```

- [ ] **Step 3: Add a compatibility test for ordinary errors**

```ts
it('preserves actionable messages for non-schema generation errors', async () => {
  const form = makeForm();
  aiMocks.generateQuiz.mockRejectedValue(
    new Error('Đã hết lượt tạo đề AI hôm nay.'),
  );
  const { result } = renderGeneration(form);

  await act(async () => {
    await result.current.handleGenerate('exam');
  });

  expect(showErrorMock).toHaveBeenCalledWith('Đã hết lượt tạo đề AI hôm nay.');
});
```

- [ ] **Step 4: Run and verify RED**

Run:

```bash
npm run test:run -- tests/quizGenerationWorkflow.test.tsx
```

Expected: test schema-message FAIL nếu hook vẫn dùng trực tiếp `normalizedError.message` hoặc fixture thiếu flag bắt buộc.

- [ ] **Step 5: Use the error mapper in the generation catch block**

Thêm import:

```ts
import { getQuizGenerationUserMessage } from '../../../services/ai/quizGenerationErrors';
```

Thay nhánh lỗi trong `handleGenerate` bằng:

```ts
} catch (error: unknown) {
  if (controller.signal.aborted) {
    setGenerationStep('cancelled');
  } else {
    showError(getQuizGenerationUserMessage(error));
    setGenerationStep('idle');
  }
}
```

Không thay đổi catch của OCR trong `prepareOcrPreview`, vì nó xử lý loại lỗi khác và không gây toast JSON trong báo cáo này.

- [ ] **Step 6: Run and verify GREEN**

Run:

```bash
npm run test:run -- tests/quizGenerationWorkflow.test.tsx
```

Expected: toàn bộ workflow tests PASS; schema error dùng thông báo thân thiện, ordinary error vẫn giữ message.

- [ ] **Step 7: Commit the UI error boundary**

```bash
git add src/features/quiz-generator/hooks/useQuizGeneration.ts tests/quizGenerationWorkflow.test.tsx
git commit -m "fix(ai): show friendly schema validation errors"
```

---

### Task 6: Full Verification and Review Gate

**Files:**
- No intended production changes.
- Revert generated `public/sitemap.xml` after build if the build script modifies it without an intentional sitemap change.

**Interfaces:**
- Produces: fresh evidence that the prompt, strict schema, repair pipeline, UI error handling and V3 compatibility remain intact.

- [ ] **Step 1: Run the focused regression suite**

```bash
npm run test:run -- tests/quizPromptBuilder.test.ts tests/quizGenerationSchema.test.ts tests/quizGenerationPipeline.test.ts tests/quizGenerationWorkflow.test.tsx
```

Expected: all files PASS, zero failed tests.

- [ ] **Step 2: Run adjacent V2 and V3 quality tests**

```bash
npm run test:run -- tests/quizRepair.test.ts tests/quizAudit.test.ts tests/quizGenerationPipelineV3.test.ts tests/quizGenerationSchemaV3.test.ts tests/buildQuizGenerationRequestV3.test.ts
```

Expected: all files PASS; V3 behavior unchanged.

- [ ] **Step 3: Build the production frontend/worker router**

```bash
npm run build
```

Expected: exit code `0`. Existing non-blocking bundle-size warnings may remain, but no new TypeScript or Vite errors are allowed.

Nếu `public/sitemap.xml` chỉ thay đổi do build generation:

```bash
git restore -- public/sitemap.xml
```

- [ ] **Step 4: Run secret and diff review checks**

Use Local Coding tools:

```text
security_scan(changed_only=true)
review_diff()
```

Expected: no secrets; no P1/P2 findings.

- [ ] **Step 5: Run GitNexus change impact analysis**

Use:

```text
gitNexus.detect_changes(scope="all", worktree="C:\\itongquiz1\\itongquiz1\\.worktrees\\fix-ai-quiz-schema-repair")
```

Expected: inspect every affected process involving `generateQuiz`, `runDeterministicQualityPipeline`, `handleGenerate` and prompt generation. Any MEDIUM/HIGH finding must be resolved or explicitly reviewed before commit/PR.

- [ ] **Step 6: Verify the original browser scenario**

In a staging or preview deployment, use a test account and create a two-to-five-question quiz containing both `DROPDOWN` and `CATEGORIZATION`.

Verify:

1. A valid provider response creates the quiz normally.
2. A malformed first response can trigger at most one `REPAIR` request before optional `REVIEW`.
3. If the repair remains invalid, the toast is exactly:

```text
AI tạo một số câu chưa đúng cấu trúc. Vui lòng thử tạo lại đề hoặc giảm số dạng câu trong một lần.
```

4. The toast does not show `too_small`, `invalid_type`, `questions`, JSON arrays or stack traces.
5. Browser Console contains no new application error caused by this flow.
6. Network requests are not recursively repeated.

- [ ] **Step 7: Confirm scope and working tree**

```bash
git status --short
git diff --stat origin/main...HEAD
```

Expected: only the plan, listed source files and listed tests are changed. No environment files, generated build directories or unrelated formatting changes.

- [ ] **Step 8: Request code review before merge**

Review requirements:

- Correctness: schema repair occurs before semantic audit and only once.
- Architecture: strict schema remains the authority; no duplicated contract logic outside prompt/repair boundary.
- Security/privacy: no raw quiz body or prompt appears in user-visible errors or new console logs.
- Performance: malformed draft adds at most one AI call; valid drafts add zero calls.
- Compatibility: `QUESTION_REGENERATE` and V3 remain unchanged.

- [ ] **Step 9: Prepare a focused PR**

Suggested PR title:

```text
fix(ai): recover from invalid generated quiz schemas
```

PR body must include:

- Original failure paths: `questions[0].items[3].categoryId` and `questions[2].blanks`.
- RED/GREEN evidence for prompt, pipeline and UI tests.
- Maximum one extra AI repair call only when initial schema validation fails.
- Confirmation that schema was not weakened and V3 flags were not changed.
- Manual browser verification result.

---

## Acceptance Criteria

- [ ] Prompt V2 gives exact JSON contracts for `DROPDOWN` and `CATEGORIZATION`.
- [ ] Invalid `categoryId` and string-based dropdown blanks remain rejected by strict schema tests.
- [ ] Valid drafts reach audit without an extra schema-repair request.
- [ ] Invalid drafts under `QUIZ_CREATE` receive exactly one schema-repair attempt.
- [ ] A still-invalid repair response fails with `GeneratedQuizSchemaError` and does not retry.
- [ ] `QUESTION_REGENERATE` does not gain automatic repair/review calls.
- [ ] Existing semantic repair and reviewer behavior continues to pass.
- [ ] V3 pipeline tests remain unchanged and green.
- [ ] Teacher toast never exposes raw Zod JSON or technical issue paths.
- [ ] Non-schema errors retain their existing actionable messages.
- [ ] Focused tests, adjacent tests, build, secret scan and code review pass.
- [ ] Browser verification reproduces the original flow without a raw JSON toast.

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Structural repair and semantic repair both use stage `REPAIR` | Medium | Differentiate by prompt content and keep each bounded; test exact call sequence. Do not add an untyped ad-hoc stage. |
| Repair AI removes valid questions while fixing one field | High | Schema-repair prompt requires complete draft and preservation; subsequent blueprint audit verifies count/type/difficulty. |
| Infinite or costly retry loop | High | One helper call only; second schema failure throws typed error; test exact call count `1`. |
| Weakening schema hides bad AI output | High | Characterization tests assert malformed category/dropdown data remains rejected. |
| Raw quiz content leaks to UI/console | High | Typed error stores only paths/codes/messages; UI mapper emits fixed copy; no new raw logging. |
| Valid requests gain latency | Medium | Call schema-repair only after failed `safeParse`; test valid existing pipeline call counts. |
| Existing semantic repair receives a schema-repaired full quiz | Medium | Run existing `quizGenerationPipeline`, `quizRepair` and `quizAudit` tests unchanged. |
| V3 behavior regresses through shared facade changes | Medium | Run V3 pipeline/schema/request tests and avoid changing V3 functions. |

## Out of Scope

- Enabling or expanding Blueprint V3 rollout.
- Changing AI provider, model selection, quota or billing behavior.
- Modifying Cloudflare D1 schemas or stored quiz records.
- Auto-generating missing semantic content on the client.
- Refactoring all AI error classes or global toast infrastructure.
- Cleaning unrelated MathJax or console warnings.
- Adding generalized multi-attempt retry/backoff for AI generation.
