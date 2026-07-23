# AI Question Blueprint Contract V3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nâng cấp AI Quiz Generation V2 thành pipeline blueprint theo từng câu, dùng một registry thống nhất cho đúng 13 dạng AI, kiểm định bằng `slotId`, chỉ repair slot lỗi và dùng `difficulty` làm field canonical.

**Architecture:** Giữ nguyên Worker security/quota/OCR/action workflow của V2. Phần V3 thêm registry contract theo nhóm dạng câu, `QuizBlueprintV3` chứa danh sách slot xác định, prompt sáu lớp chỉ nhúng contract được chọn, schema/audit/repair theo `slotId`, adapter tương thích V2 và feature flag độc lập để rollback về pipeline V2.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest 4, Cypress 15, Zod 4, Cloudflare Workers, D1, existing AI proxy `/api/ai/chat`.

## Global Constraints

- Chỉ đúng 13 dạng `aiSelectable`: `MCQ`, `TRUE_FALSE`, `SHORT_ANSWER`, `MATCHING`, `MULTIPLE_SELECT`, `DRAG_DROP`, `ORDERING`, `IMAGE_QUESTION`, `DROPDOWN`, `UNDERLINE`, `CATEGORIZATION`, `WORD_SCRAMBLE`, `RIDDLE`.
- `ERROR_CORRECTION` là `manualOnly`; `GEOMETRY` là `experimentalLegacy`.
- Không thêm dependency runtime mới.
- Không thay đổi schema D1 hoặc logic chấm điểm.
- `difficulty` là field canonical; `difficultyLevel` chỉ là alias tương thích V2.
- Không yêu cầu hoặc lưu `thought_process`/chain-of-thought.
- Deterministic schema/audit luôn bắt buộc; reviewer chỉ là lớp bổ sung.
- Repair tự động tối đa một lần trong cùng `QUIZ_CREATE actionId`.
- Sinh lại riêng một câu thành công dùng `QUESTION_REGENERATE actionId` mới và tính đúng một lượt AI.
- Không log prompt, OCR, câu hỏi, đáp án, file base64, token hoặc dữ liệu học sinh.
- Prompt và giao diện tiếng Việt phải là UTF-8 có dấu.
- V3 dùng `VITE_FEATURE_AI_BLUEPRINT_V3=false` mặc định và chỉ chạy khi V2 cũng bật.
- Production deploy và bật flag cần phê duyệt thủ công.
- Mỗi task viết test thất bại trước, triển khai tối thiểu, chạy test tập trung và commit độc lập.

---

## File Structure

### Question contract registry

- Create `src/services/ai/question-contracts/questionContract.types.ts` — kiểu chung của registry, issue và context.
- Create `src/services/ai/question-contracts/questionContract.shared.ts` — schema/text helpers dùng chung.
- Create `src/services/ai/question-contracts/questionTypeAvailability.ts` — phân loại toàn bộ enum.
- Create `src/services/ai/question-contracts/choiceQuestionContracts.ts` — MCQ, TRUE_FALSE, MULTIPLE_SELECT.
- Create `src/services/ai/question-contracts/completionQuestionContracts.ts` — SHORT_ANSWER, DRAG_DROP, DROPDOWN.
- Create `src/services/ai/question-contracts/interactionQuestionContracts.ts` — MATCHING, ORDERING, CATEGORIZATION.
- Create `src/services/ai/question-contracts/languageQuestionContracts.ts` — UNDERLINE, WORD_SCRAMBLE, RIDDLE.
- Create `src/services/ai/question-contracts/imageQuestionContract.ts` — IMAGE_QUESTION.
- Create `src/services/ai/question-contracts/questionContractRegistry.ts` — registry duy nhất và public selectors.

### Blueprint and prompt

- Modify `src/features/quiz-generator/domain/quizBlueprint.ts` — thêm `QuizBlueprintV3` và slot builder.
- Modify `src/features/quiz-generator/domain/buildQuizGenerationRequest.ts` — build V3 từ form V2.
- Create `src/services/ai/prompts/systemPromptBuilder.ts` — system prompt theo capability, không giả tìm kiếm.
- Create `src/services/ai/prompts/slotPromptBuilder.ts` — slot table và selected contract fragments.
- Create `src/services/ai/prompts/reviewerPromptBuilder.ts` — reviewer immutable contract.
- Create `src/services/ai/prompts/questionRegenerationPrompt.ts` — prompt sinh lại một slot.
- Modify `src/services/ai/prompts/quizPromptBuilder.ts` — prompt V3 sáu lớp và fallback V2.

### Validation, audit and repair

- Create `src/services/ai/schemas/generatedQuizV3Normalizer.ts` — compatibility adapter.
- Modify `src/services/ai/schemas/quizGenerationSchema.ts` — root V3 và union từ registry.
- Create `src/services/ai/quizDomainAdapter.ts` — strip metadata tạm và map về domain.
- Modify `src/services/ai/quizAudit.ts` — audit bằng `slotId`.
- Modify `src/services/ai/quizRepair.ts` — repair/merge bằng `slotId`.
- Modify `src/services/geminiService.ts` — tích hợp V3 pipeline và reviewer.
- Modify `src/services/ai/providers/openaiProvider.ts` — nhận system instruction V3.
- Modify `src/services/ai/providers/geminiProvider.ts` — nhận system instruction V3.
- Modify `src/services/ai/providers/perplexityProvider.ts` — nhận system instruction/capability V3.

### UI, compatibility and rollout

- Modify `src/components/teacher/QuizCreator/QuestionTypeSelector.tsx` — đọc từ registry.
- Modify `src/features/quiz-generator/components/QuestionBlueprintSection.tsx` — hiển thị slot summary.
- Modify `src/config/featureFlags.ts` and `.env.example` — flag V3.
- Modify `schemas/quiz.schema.ts` — phủ 13 dạng AI và manual-only error correction.
- Create `cypress/e2e/ai-question-blueprint-v3.cy.ts`.
- Create `docs/runbooks/ai-question-blueprint-v3-rollout.md`.

---

## Phase 1 — Freeze type coverage and common contracts

### Task 1: Classify every `QuestionType` exactly once

**Files:**
- Create: `src/services/ai/question-contracts/questionTypeAvailability.ts`
- Create: `tests/aiQuestionTypeRegistry.test.ts`
- Modify: `src/types/domain.types.ts` only if a type export is needed; do not change enum values.

**Interfaces:**

```ts
export type QuestionTypeAvailability =
  | 'aiSelectable'
  | 'manualOnly'
  | 'experimentalLegacy';

export const AI_SELECTABLE_QUESTION_TYPES: readonly AiSelectableQuestionType[];
export const MANUAL_ONLY_QUESTION_TYPES: readonly [QuestionType.ERROR_CORRECTION];
export const EXPERIMENTAL_LEGACY_QUESTION_TYPES: readonly [QuestionType.GEOMETRY];
export const getQuestionTypeAvailability: (type: QuestionType) => QuestionTypeAvailability;
```

- [ ] **Step 1: Write the enum coverage test**

```ts
it('classifies every QuestionType exactly once', () => {
  const groups = [
    AI_SELECTABLE_QUESTION_TYPES,
    MANUAL_ONLY_QUESTION_TYPES,
    EXPERIMENTAL_LEGACY_QUESTION_TYPES,
  ];
  const flattened = groups.flat();
  expect(new Set(flattened).size).toBe(flattened.length);
  expect(new Set(flattened)).toEqual(new Set(Object.values(QuestionType)));
});

it('keeps exactly thirteen AI-selectable types', () => {
  expect(AI_SELECTABLE_QUESTION_TYPES).toEqual([
    QuestionType.MCQ,
    QuestionType.TRUE_FALSE,
    QuestionType.SHORT_ANSWER,
    QuestionType.MATCHING,
    QuestionType.MULTIPLE_SELECT,
    QuestionType.DRAG_DROP,
    QuestionType.ORDERING,
    QuestionType.IMAGE_QUESTION,
    QuestionType.DROPDOWN,
    QuestionType.UNDERLINE,
    QuestionType.CATEGORIZATION,
    QuestionType.WORD_SCRAMBLE,
    QuestionType.RIDDLE,
  ]);
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx vitest run tests/aiQuestionTypeRegistry.test.ts
```

Expected: FAIL because the availability module does not exist.

- [ ] **Step 3: Implement the immutable classifications**

Use `as const satisfies readonly QuestionType[]`; do not derive AI types from `Object.values(QuestionType)`.

- [ ] **Step 4: Verify and commit**

```bash
npx vitest run tests/aiQuestionTypeRegistry.test.ts
```

Expected: PASS.

```bash
git add src/services/ai/question-contracts/questionTypeAvailability.ts tests/aiQuestionTypeRegistry.test.ts
git commit -m "feat(ai): classify question type availability"
```

---

### Task 2: Define contract interfaces and canonical difficulty compatibility

**Files:**
- Create: `src/services/ai/question-contracts/questionContract.types.ts`
- Create: `src/services/ai/question-contracts/questionContract.shared.ts`
- Create: `src/services/ai/schemas/generatedQuizV3Normalizer.ts`
- Create: `tests/generatedQuizV3Normalizer.test.ts`

**Interfaces:**

```ts
export interface QuestionContractSlot {
  slotId: string;
  ordinal: number;
  type: AiSelectableQuestionType;
  difficulty: 1 | 2 | 3;
  objective: string;
  subject?: SupportedSkillSubject;
  skillCode?: string;
  subskillCode?: string;
  imagePolicy: 'forbidden' | 'optional' | 'required';
}

export interface GeneratedQuestionCommonV3 {
  slotId: string;
  difficulty: 1 | 2 | 3;
  explanation: string;
  subject?: SupportedSkillSubject;
  skillCode?: string;
  subskillCode?: string;
}

export type GeneratedQuestionV3 = GeneratedQuestionCommonV3 & {
  type: AiSelectableQuestionType;
} & Record<string, unknown>;

export interface GeneratedQuizV3 {
  promptVersion: 'ai-blueprint-v3';
  blueprintVersion: 3;
  title: string;
  detectedCategory?: string;
  detectedLesson?: string;
  suggestedTags?: string[];
  questions: GeneratedQuestionV3[];
}

export interface AiQuestionTypeContract<TQuestion> {
  type: AiSelectableQuestionType;
  label: string;
  shortLabel: string;
  availability: 'aiSelectable';
  requiresPrimaryImage: boolean;
  schema: z.ZodType<TQuestion>;
  promptFragment(context: QuestionContractContext): string;
  validateSemantics(question: TQuestion, slot: QuestionContractSlot): QuestionContractIssue[];
  validFixture: TQuestion;
}

export function normalizeGeneratedQuizV3Compatibility(
  raw: unknown,
  options: { allowV2DifficultyAlias: boolean; expectedPromptVersion: 'ai-blueprint-v3' },
): unknown;
```

- [ ] **Step 1: Write compatibility tests**

```ts
it('maps difficultyLevel to difficulty and removes the alias', () => {
  const normalized = normalizeGeneratedQuizV3Compatibility({
    title: 'Đề',
    questions: [{ slotId: 'slot-1', type: 'MCQ', difficultyLevel: 2 }],
  }, { allowV2DifficultyAlias: true, expectedPromptVersion: 'ai-blueprint-v3' }) as any;
  expect(normalized.questions[0].difficulty).toBe(2);
  expect(normalized.questions[0].difficultyLevel).toBeUndefined();
});

it('does not infer missing slotId from array index', () => {
  const normalized = normalizeGeneratedQuizV3Compatibility({
    title: 'Đề', questions: [{ type: 'MCQ', difficulty: 2 }],
  }, { allowV2DifficultyAlias: true, expectedPromptVersion: 'ai-blueprint-v3' }) as any;
  expect(normalized.questions[0].slotId).toBeUndefined();
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx vitest run tests/generatedQuizV3Normalizer.test.ts
```

- [ ] **Step 3: Implement shared text helpers**

Include exact helpers:

```ts
export const normalizeComparableText = (value: string): string => value
  .normalize('NFC')
  .trim()
  .replace(/\s+/g, ' ')
  .toLocaleLowerCase('vi');

export const answerLetterIndex = (value: string): number => value.charCodeAt(0) - 65;
export const sequentialMarkers = (text: string): string[] => text.match(/\[(\d+)\]/g) ?? [];
```

Do not strip Vietnamese diacritics for exact spelling/word-scramble validation.

- [ ] **Step 4: Implement explicit compatibility aliases only**

The normalizer may:

- map `difficultyLevel` to `difficulty` when `difficulty` is absent;
- add root `promptVersion` and `blueprintVersion` from execution context;
- preserve missing `slotId` as missing so schema/audit can fail.

It may not invent item content, category IDs, answers, slots or types.

- [ ] **Step 5: Verify and commit**

```bash
npx vitest run tests/generatedQuizV3Normalizer.test.ts
```

```bash
git add src/services/ai/question-contracts/questionContract.types.ts src/services/ai/question-contracts/questionContract.shared.ts src/services/ai/schemas/generatedQuizV3Normalizer.ts tests/generatedQuizV3Normalizer.test.ts
git commit -m "feat(ai): define v3 question contract primitives"
```

---

## Phase 2 — Implement all 13 question contracts

### Task 3: Implement choice contracts

**Files:**
- Create: `src/services/ai/question-contracts/choiceQuestionContracts.ts`
- Create: `tests/aiQuestionContracts.choice.test.ts`
- Create fixtures: `tests/fixtures/ai-question-contracts/mcq.valid.json`, `true-false.valid.json`, `multiple-select.valid.json`

**Produces:** `MCQ_CONTRACT`, `TRUE_FALSE_CONTRACT`, `MULTIPLE_SELECT_CONTRACT`.

- [ ] **Step 1: Write schema and semantic tests**

```ts
it('rejects an MCQ option that already contains an answer prefix', () => {
  const result = MCQ_CONTRACT.schema.safeParse({
    ...MCQ_CONTRACT.validFixture,
    options: ['A. 2', '3', '4', '5'],
  });
  expect(result.success).toBe(false);
});

it('requires at least one true and one false statement', () => {
  const issues = TRUE_FALSE_CONTRACT.validateSemantics({
    ...TRUE_FALSE_CONTRACT.validFixture,
    items: TRUE_FALSE_CONTRACT.validFixture.items.map(item => ({ ...item, isCorrect: true })),
  }, {
    slotId: 'slot-1',
    ordinal: 1,
    type: QuestionType.TRUE_FALSE,
    difficulty: 2,
    objective: 'Đánh giá mệnh đề',
    imagePolicy: 'optional',
  });
  expect(issues.some(issue => issue.code === 'TRUE_FALSE_BALANCE_REQUIRED')).toBe(true);
});

it('requires two or three unique multiple-select answers', () => {
  expect(MULTIPLE_SELECT_CONTRACT.schema.safeParse({
    ...MULTIPLE_SELECT_CONTRACT.validFixture,
    correctAnswers: ['A'],
  }).success).toBe(false);
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx vitest run tests/aiQuestionContracts.choice.test.ts
```

- [ ] **Step 3: Implement exact V3 constraints**

- MCQ: exactly 4 options, one `A-D` answer, no prefixed option labels, unique options.
- TRUE_FALSE: 2–4 items; schema validates shape; semantic validator enforces mixed true/false and non-duplicate statements.
- MULTIPLE_SELECT: exactly 4 options, 2–3 unique `A-D` answers, prompt contains “chọn tất cả”.

Every prompt fragment must include one valid JSON example with `slotId`, `difficulty`, `explanation`, and no `difficultyLevel`.

- [ ] **Step 4: Verify fixtures and commit**

```bash
npx vitest run tests/aiQuestionContracts.choice.test.ts
```

```bash
git add src/services/ai/question-contracts/choiceQuestionContracts.ts tests/aiQuestionContracts.choice.test.ts tests/fixtures/ai-question-contracts/mcq.valid.json tests/fixtures/ai-question-contracts/true-false.valid.json tests/fixtures/ai-question-contracts/multiple-select.valid.json
git commit -m "feat(ai): add choice question contracts"
```

---

### Task 4: Implement completion contracts

**Files:**
- Create: `src/services/ai/question-contracts/completionQuestionContracts.ts`
- Create: `tests/aiQuestionContracts.completion.test.ts`
- Create fixtures: `short-answer.valid.json`, `drag-drop.valid.json`, `dropdown.valid.json`

**Produces:** `SHORT_ANSWER_CONTRACT`, `DRAG_DROP_CONTRACT`, `DROPDOWN_CONTRACT`.

- [ ] **Step 1: Write marker and answer tests**

```ts
it('allows a meaningful short answer longer than four characters', () => {
  expect(SHORT_ANSWER_CONTRACT.schema.safeParse({
    ...SHORT_ANSWER_CONTRACT.validFixture,
    correctAnswer: 'Hà Nội',
  }).success).toBe(true);
});

it('rejects non-sequential drag-drop markers', () => {
  const issues = DRAG_DROP_CONTRACT.validateSemantics({
    ...DRAG_DROP_CONTRACT.validFixture,
    text: 'Điền [1] rồi [3].',
    blanks: ['một', 'ba'],
  }, {
    slotId: 'slot-1',
    ordinal: 1,
    type: QuestionType.DRAG_DROP,
    difficulty: 2,
    objective: 'Điền từ thích hợp',
    imagePolicy: 'optional',
  });
  expect(issues.some(issue => issue.code === 'DRAG_DROP_MARKERS_INVALID')).toBe(true);
});

it('requires dropdown ids to match text markers', () => {
  const issues = DROPDOWN_CONTRACT.validateSemantics({
    ...DROPDOWN_CONTRACT.validFixture,
    text: 'Thủ đô là [1].',
    blanks: [{ id: '2', options: ['Hà Nội', 'Huế'], correctAnswer: 'Hà Nội' }],
  }, {
    slotId: 'slot-1',
    ordinal: 1,
    type: QuestionType.DROPDOWN,
    difficulty: 2,
    objective: 'Chọn từ thích hợp',
    imagePolicy: 'optional',
  });
  expect(issues.some(issue => issue.code === 'DROPDOWN_MARKER_ID_MISMATCH')).toBe(true);
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx vitest run tests/aiQuestionContracts.completion.test.ts
```

- [ ] **Step 3: Implement exact constraints**

- SHORT_ANSWER: non-empty, max 120 chars, reject ambiguous alternatives separated by ` hoặc ` or multiple slash-delimited answers.
- DRAG_DROP: sequential numeric markers, marker count equals blanks, distractors unique and disjoint from answers.
- DROPDOWN: sequential markers; `blank.id` equals marker number; 2–5 unique options; answer exists in options.

- [ ] **Step 4: Verify and commit**

```bash
npx vitest run tests/aiQuestionContracts.completion.test.ts
```

```bash
git add src/services/ai/question-contracts/completionQuestionContracts.ts tests/aiQuestionContracts.completion.test.ts tests/fixtures/ai-question-contracts/short-answer.valid.json tests/fixtures/ai-question-contracts/drag-drop.valid.json tests/fixtures/ai-question-contracts/dropdown.valid.json
git commit -m "feat(ai): add completion question contracts"
```

---

### Task 5: Implement interaction contracts

**Files:**
- Create: `src/services/ai/question-contracts/interactionQuestionContracts.ts`
- Create: `tests/aiQuestionContracts.interaction.test.ts`
- Create fixtures: `matching.valid.json`, `ordering.valid.json`, `categorization.valid.json`

**Produces:** `MATCHING_CONTRACT`, `ORDERING_CONTRACT`, `CATEGORIZATION_CONTRACT`.

- [ ] **Step 1: Write cross-field tests**

```ts
it('rejects duplicate matching sides', () => {
  expect(MATCHING_CONTRACT.schema.safeParse({
    ...MATCHING_CONTRACT.validFixture,
    pairs: [
      { left: '1 + 1', right: '2' },
      { left: '1 + 1', right: '3' },
      { left: '2 + 2', right: '4' },
    ],
  }).success).toBe(false);
});

it('requires ordering to use a full zero-based permutation', () => {
  expect(ORDERING_CONTRACT.schema.safeParse({
    ...ORDERING_CONTRACT.validFixture,
    correctOrder: [0, 0, 2],
  }).success).toBe(false);
});

it('requires every category to receive at least one item', () => {
  const question = {
    ...CATEGORIZATION_CONTRACT.validFixture,
    categories: [{ id: 'chan', name: 'Số chẵn' }, { id: 'le', name: 'Số lẻ' }],
    items: [
      { id: 'i-1', content: '2', categoryId: 'chan' },
      { id: 'i-2', content: '4', categoryId: 'chan' },
      { id: 'i-3', content: '6', categoryId: 'chan' },
      { id: 'i-4', content: '8', categoryId: 'chan' },
    ],
  };
  const issues = CATEGORIZATION_CONTRACT.validateSemantics(question, {
    slotId: 'slot-1',
    ordinal: 1,
    type: QuestionType.CATEGORIZATION,
    difficulty: 2,
    objective: 'Phân loại số',
    imagePolicy: 'optional',
  });
  expect(issues.some(issue => issue.code === 'CATEGORIZATION_EMPTY_GROUP')).toBe(true);
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx vitest run tests/aiQuestionContracts.interaction.test.ts
```

- [ ] **Step 3: Implement exact constraints**

- MATCHING: 3–5 unique one-to-one pairs.
- ORDERING: 3–8 non-empty unique items; `correctOrder` only number indexes `0..n-1`.
- CATEGORIZATION: 2–4 categories, 4–10 items, unique IDs, valid references, every category used.

- [ ] **Step 4: Verify and commit**

```bash
npx vitest run tests/aiQuestionContracts.interaction.test.ts
```

```bash
git add src/services/ai/question-contracts/interactionQuestionContracts.ts tests/aiQuestionContracts.interaction.test.ts tests/fixtures/ai-question-contracts/matching.valid.json tests/fixtures/ai-question-contracts/ordering.valid.json tests/fixtures/ai-question-contracts/categorization.valid.json
git commit -m "feat(ai): add interaction question contracts"
```

---

### Task 6: Implement language contracts

**Files:**
- Create: `src/services/ai/question-contracts/languageQuestionContracts.ts`
- Create: `tests/aiQuestionContracts.language.test.ts`
- Create fixtures: `underline.valid.json`, `word-scramble.valid.json`, `riddle.valid.json`

**Produces:** `UNDERLINE_CONTRACT`, `WORD_SCRAMBLE_CONTRACT`, `RIDDLE_CONTRACT`.

- [ ] **Step 1: Write Vietnamese-specific tests**

```ts
it('maps unique target words to indexes instead of trusting AI indexes', () => {
  const normalized = normalizeUnderlineTargets({
    sentence: 'Bạn Lan chăm chỉ học bài.',
    targetWords: ['chăm', 'chỉ'],
  });
  expect(normalized.words).toEqual(['Bạn', 'Lan', 'chăm', 'chỉ', 'học', 'bài.']);
  expect(normalized.correctWordIndexes).toEqual([2, 3]);
});

it('rejects an ambiguous repeated underline target', () => {
  expect(() => normalizeUnderlineTargets({
    sentence: 'Hoa hái hoa.',
    targetWords: ['hoa'],
  })).toThrow('Từ mục tiêu xuất hiện nhiều lần');
});

it('preserves Vietnamese diacritics when validating word scramble', () => {
  const issues = WORD_SCRAMBLE_CONTRACT.validateSemantics({
    ...WORD_SCRAMBLE_CONTRACT.validFixture,
    letters: ['h', 'o', 'a'],
    correctWord: 'hòa',
  }, {
    slotId: 'slot-1',
    ordinal: 1,
    type: QuestionType.WORD_SCRAMBLE,
    difficulty: 2,
    objective: 'Ghép chữ thành từ',
    imagePolicy: 'optional',
  });
  expect(issues.some(issue => issue.code === 'WORD_SCRAMBLE_LETTERS_MISMATCH')).toBe(true);
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx vitest run tests/aiQuestionContracts.language.test.ts
```

- [ ] **Step 3: Implement exact constraints**

- UNDERLINE AI output uses `targetWords`; normalizer creates `words` and `correctWordIndexes` with the same tokenization utility used by renderer/editor.
- WORD_SCRAMBLE compares NFC-normalized character multisets, preserving dấu and `đ`.
- RIDDLE has 2–6 lines, one answer, safe primary-school language and no unsupported source claims.

- [ ] **Step 4: Verify and commit**

```bash
npx vitest run tests/aiQuestionContracts.language.test.ts
```

```bash
git add src/services/ai/question-contracts/languageQuestionContracts.ts tests/aiQuestionContracts.language.test.ts tests/fixtures/ai-question-contracts/underline.valid.json tests/fixtures/ai-question-contracts/word-scramble.valid.json tests/fixtures/ai-question-contracts/riddle.valid.json
git commit -m "feat(ai): add Vietnamese language question contracts"
```

---

### Task 7: Implement the image contract and assemble the registry

**Files:**
- Create: `src/services/ai/question-contracts/imageQuestionContract.ts`
- Create: `src/services/ai/question-contracts/questionContractRegistry.ts`
- Modify: `src/components/teacher/QuizCreator/QuestionTypeSelector.tsx`
- Create: `tests/aiQuestionContractRegistry.integration.test.ts`
- Create fixture: `tests/fixtures/ai-question-contracts/image-question.valid.json`

**Interfaces:**

```ts
export const AI_QUESTION_CONTRACTS: ReadonlyMap<AiSelectableQuestionType, AiQuestionTypeContract<any>>;
export const AI_QUESTION_TYPE_DESCRIPTORS: readonly Array<{
  type: AiSelectableQuestionType;
  label: string;
  shortLabel: string;
  emoji: string;
}>;
export const getAiQuestionContract: (type: QuestionType) => AiQuestionTypeContract<any>;
export const getSelectedContractPromptFragments: (
  types: readonly AiSelectableQuestionType[],
  context: QuestionContractContext,
) => string[];
```

- [ ] **Step 1: Write registry integration tests**

```ts
it('contains one complete contract for every AI-selectable type', () => {
  expect([...AI_QUESTION_CONTRACTS.keys()]).toEqual(AI_SELECTABLE_QUESTION_TYPES);
  for (const type of AI_SELECTABLE_QUESTION_TYPES) {
    const contract = getAiQuestionContract(type);
    expect(contract.schema.safeParse(contract.validFixture).success).toBe(true);
    expect(contract.promptFragment({
      classLevel: '4',
      intent: 'PRACTICE',
      sourceMode: 'TOPIC',
      hasImageLibrary: true,
    })).toContain(type);
  }
});

it('rejects manual-only and experimental types', () => {
  expect(() => getAiQuestionContract(QuestionType.ERROR_CORRECTION)).toThrow();
  expect(() => getAiQuestionContract(QuestionType.GEOMETRY)).toThrow();
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx vitest run tests/aiQuestionContractRegistry.integration.test.ts
```

- [ ] **Step 3: Implement `IMAGE_QUESTION` contract**

Require:

- `image` and `imageAlt`;
- exactly four options;
- one `A-D` answer;
- `slot.imagePolicy === 'required'`;
- final image must not start with `https://placehold.co/`.

- [ ] **Step 4: Assemble the immutable registry**

Build the map from the 13 imported contract constants. Assert duplicate type keys at module initialization in development/test.

- [ ] **Step 5: Migrate the AI selector**

Replace `QUESTION_TYPE_CONFIG` in `QuestionTypeSelector.tsx` with `AI_QUESTION_TYPE_DESCRIPTORS`. Preserve checkbox behavior, labels and selected state.

- [ ] **Step 6: Verify and commit**

```bash
npx vitest run tests/aiQuestionTypeRegistry.test.ts tests/aiQuestionContractRegistry.integration.test.ts tests/aiQuestionContracts.*.test.ts
```

```bash
git add src/services/ai/question-contracts/imageQuestionContract.ts src/services/ai/question-contracts/questionContractRegistry.ts src/components/teacher/QuizCreator/QuestionTypeSelector.tsx tests/aiQuestionContractRegistry.integration.test.ts tests/fixtures/ai-question-contracts/image-question.valid.json
git commit -m "feat(ai): assemble the thirteen-type contract registry"
```

---

### Checkpoint A: Contract registry complete

- [ ] Run all contract tests:

```bash
npx vitest run \
  tests/aiQuestionTypeRegistry.test.ts \
  tests/generatedQuizV3Normalizer.test.ts \
  tests/aiQuestionContracts.choice.test.ts \
  tests/aiQuestionContracts.completion.test.ts \
  tests/aiQuestionContracts.interaction.test.ts \
  tests/aiQuestionContracts.language.test.ts \
  tests/aiQuestionContractRegistry.integration.test.ts
```

Expected: PASS.

- [ ] Run TypeScript:

```bash
npx tsc --noEmit
```

Expected: exit code `0`.

- [ ] Human review: confirm exact 13-type scope and that `ERROR_CORRECTION`/`GEOMETRY` remain outside AI.

---

## Phase 3 — Build deterministic per-question blueprints

### Task 8: Add `QuizBlueprintV3` and deterministic slot generation

**Files:**
- Modify: `src/features/quiz-generator/domain/quizBlueprint.ts`
- Create: `tests/quizBlueprintV3.test.ts`
- Create: `tests/helpers/aiBlueprintV3Fixtures.ts`
- Modify: `tests/quizBlueprint.test.ts` to preserve V2 coverage.

**Interfaces:**

```ts
export interface QuestionBlueprintSlot extends QuestionContractSlot {
  slotId: `slot-${number}`;
  sourceRefs?: string[];
}

export interface QuizBlueprintV3 {
  version: 3;
  intent: QuizIntent;
  sourceMode: QuizSourceMode;
  topic: string;
  classLevel: string;
  totalQuestions: number;
  slots: QuestionBlueprintSlot[];
}

export function buildQuestionBlueprintSlots(input: {
  totalQuestions: number;
  typeAllocations: QuestionTypeAllocation[];
  difficultyLevels: DifficultyLevels;
  objective: string;
  subject?: SupportedSkillSubject;
  skillCode?: string;
  sourceRefs?: string[];
}): QuestionBlueprintSlot[];

export function validateQuizBlueprintV3(blueprint: QuizBlueprintV3): string[];
```

- [ ] **Step 1: Write deterministic slot tests**

```ts
const inputForTenQuestions = {
  totalQuestions: 10,
  typeAllocations: [
    { type: QuestionType.MCQ, count: 4 },
    { type: QuestionType.TRUE_FALSE, count: 2 },
    { type: QuestionType.SHORT_ANSWER, count: 2 },
    { type: QuestionType.MATCHING, count: 2 },
  ],
  difficultyLevels: { level1: 3, level2: 5, level3: 2 },
  objective: 'Phân số lớp 4',
};

const countBy = <T extends string | number>(values: T[]): Record<string, number> => values.reduce(
  (result, value) => ({ ...result, [String(value)]: (result[String(value)] ?? 0) + 1 }),
  {} as Record<string, number>,
);

it('creates one unique slot for each question', () => {
  const slots = buildQuestionBlueprintSlots(inputForTenQuestions);
  expect(slots).toHaveLength(10);
  expect(slots.map(slot => slot.slotId)).toEqual([
    'slot-1', 'slot-2', 'slot-3', 'slot-4', 'slot-5',
    'slot-6', 'slot-7', 'slot-8', 'slot-9', 'slot-10',
  ]);
  expect(new Set(slots.map(slot => slot.slotId)).size).toBe(10);
});

it('matches exact type and difficulty totals', () => {
  const slots = buildQuestionBlueprintSlots(inputForTenQuestions);
  expect(countBy(slots.map(slot => slot.type))).toEqual({
    MCQ: 4,
    TRUE_FALSE: 2,
    SHORT_ANSWER: 2,
    MATCHING: 2,
  });
  expect(countBy(slots.map(slot => slot.difficulty))).toEqual({ 1: 3, 2: 5, 3: 2 });
});

it('always requires an image for image-question slots', () => {
  const slots = buildQuestionBlueprintSlots({
    totalQuestions: 1,
    typeAllocations: [{ type: QuestionType.IMAGE_QUESTION, count: 1 }],
    difficultyLevels: { level1: 1, level2: 0, level3: 0 },
    objective: 'Nhận biết hình vuông',
  });
  expect(slots[0].imagePolicy).toBe('required');
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx vitest run tests/quizBlueprintV3.test.ts
```

- [ ] **Step 3: Implement weighted round-robin within difficulty bands**

Algorithm:

1. Expand difficulties as `[1 × level1, 2 × level2, 3 × level3]`.
2. For each difficulty band, pick the type with the highest remaining ratio `remaining / configuredCount`, tie-breaking by original allocation order.
3. Decrement remaining count and continue until all slots are assigned.
4. Throw when totals do not match or a non-AI type appears.

This is deterministic and avoids a long contiguous block of one type.

- [ ] **Step 4: Validate all invariants**

`validateQuizBlueprintV3` checks slot count, unique IDs, ordinal sequence, type coverage, difficulty range and required image policy.

- [ ] **Step 5: Add reusable V3 test fixtures**

Create `tests/helpers/aiBlueprintV3Fixtures.ts`:

```ts
export const makeBlueprintV3Fixture = (
  overrides: Partial<QuizBlueprintV3> = {},
): QuizBlueprintV3 => {
  const slots = buildQuestionBlueprintSlots({
    totalQuestions: 4,
    typeAllocations: [
      { type: QuestionType.MCQ, count: 2 },
      { type: QuestionType.MATCHING, count: 1 },
      { type: QuestionType.SHORT_ANSWER, count: 1 },
    ],
    difficultyLevels: { level1: 1, level2: 2, level3: 1 },
    objective: 'Phân số lớp 4',
    subject: 'math',
    skillCode: 'phan_so',
  });
  return {
    version: 3,
    intent: 'PRACTICE',
    sourceMode: 'TOPIC',
    topic: 'Phân số',
    classLevel: '4',
    totalQuestions: slots.length,
    slots,
    ...overrides,
  };
};

export const makeGeneratedQuizV3Fixture = (
  blueprint: QuizBlueprintV3 = makeBlueprintV3Fixture(),
): GeneratedQuizV3 => ({
  promptVersion: 'ai-blueprint-v3',
  blueprintVersion: 3,
  title: 'Đề fixture V3',
  questions: blueprint.slots.map((slot) => ({
    ...getAiQuestionContract(slot.type).validFixture,
    slotId: slot.slotId,
    type: slot.type,
    difficulty: slot.difficulty,
    explanation: 'Lời giải fixture hợp lệ.',
    subject: slot.subject,
    skillCode: slot.skillCode,
    subskillCode: slot.subskillCode,
  })) as GeneratedQuestionV3[],
});
```

- [ ] **Step 6: Verify and commit**

```bash
npx vitest run tests/quizBlueprint.test.ts tests/quizBlueprintV3.test.ts
```

```bash
git add src/features/quiz-generator/domain/quizBlueprint.ts tests/quizBlueprint.test.ts tests/quizBlueprintV3.test.ts tests/helpers/aiBlueprintV3Fixtures.ts
git commit -m "feat(ai): build deterministic per-question blueprint slots"
```

---

### Task 9: Build V3 requests from the existing V2 form and add the feature flag

**Files:**
- Modify: `src/features/quiz-generator/domain/buildQuizGenerationRequest.ts`
- Modify: `src/services/geminiService.ts` types only; pipeline integration is Task 16.
- Modify: `src/config/featureFlags.ts`
- Modify: `.env.example`
- Create: `tests/buildQuizGenerationRequestV3.test.ts`

**Interfaces:**

```ts
export interface QuizGenerationOptions {
  // existing V2 fields remain during rollout
  blueprint?: QuizBlueprint;
  blueprintV3?: QuizBlueprintV3;
  promptVersion?: 'ai-blueprint-v3';
}

export const isAiBlueprintV3Enabled = (): boolean => resolveFeatureFlag(
  import.meta.env.VITE_FEATURE_AI_BLUEPRINT_V3,
  false,
);
```

- [ ] **Step 1: Write request adapter tests**

```ts
it('builds V3 slots from the existing type and difficulty form values', () => {
  const options = buildQuizGenerationOptions(input, { enableBlueprintV3: true });
  expect(options.promptVersion).toBe('ai-blueprint-v3');
  expect(options.blueprintV3?.slots).toHaveLength(input.questionCount);
  expect(options.blueprint).toBeDefined();
});

it('keeps V2-only output when the V3 flag is false', () => {
  const options = buildQuizGenerationOptions(input, { enableBlueprintV3: false });
  expect(options.blueprint).toBeDefined();
  expect(options.blueprintV3).toBeUndefined();
  expect(options.promptVersion).toBeUndefined();
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx vitest run tests/buildQuizGenerationRequestV3.test.ts
```

- [ ] **Step 3: Implement the adapter**

- Reuse validated V2 allocations and difficulty counts.
- Build V3 with `topic`, `classLevel`, selected OCR page markers as `sourceRefs` when available.
- Set objective to explicit skill label when `subject/skillCode` exists; otherwise use trimmed topic/title.
- Never infer a skill not present in request metadata.

- [ ] **Step 4: Add the flag**

`.env.example`:

```env
VITE_FEATURE_AI_BLUEPRINT_V3=false
```

- [ ] **Step 5: Verify and commit**

```bash
npx vitest run tests/buildQuizGenerationRequestV3.test.ts tests/quizCreationDomain.test.ts
```

```bash
git add src/features/quiz-generator/domain/buildQuizGenerationRequest.ts src/services/geminiService.ts src/config/featureFlags.ts .env.example tests/buildQuizGenerationRequestV3.test.ts
git commit -m "feat(ai): add v3 blueprint request adapter"
```

---

### Task 10: Show a non-editable V3 slot summary in the existing blueprint UI

**Files:**
- Modify: `src/features/quiz-generator/components/QuestionBlueprintSection.tsx`
- Modify: `src/features/quiz-generator/hooks/useQuizFormState.ts`
- Modify: `src/features/quiz-generator/hooks/useCreateQuizLogic.ts`
- Modify: `tests/QuestionBlueprintSection.test.tsx`

**Interfaces:**

```ts
export interface BlueprintSlotSummary {
  slotCount: number;
  typeCount: number;
  difficultyCounts: Record<1 | 2 | 3, number>;
}
```

- [ ] **Step 1: Extend component tests**

```tsx
it('shows the generated slot summary without exposing per-slot editing', () => {
  render(<Harness enableV3 />);
  expect(screen.getByText('10 slot đã sẵn sàng')).toBeInTheDocument();
  expect(screen.getByText('4 dạng câu')).toBeInTheDocument();
  expect(screen.queryByLabelText('Sửa slot-1')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx vitest run tests/QuestionBlueprintSection.test.tsx
```

- [ ] **Step 3: Connect derived slots**

Compute slots with the pure builder whenever allocations, difficulty, topic or source refs change. Do not store duplicated slot arrays in localStorage.

- [ ] **Step 4: Preserve the public hook contract**

Only add these keys when needed by `CreateTab`:

```ts
aiBlueprintV3Enabled: boolean;
questionBlueprintV3: QuizBlueprintV3 | null;
```

Update `tests/useCreateQuizLogic.contract.test.tsx` in Task 16 when pipeline wiring is complete, avoiding temporary contract breakage in this task by keeping internal derivation inside form state if possible.

- [ ] **Step 5: Verify and commit**

```bash
npx vitest run tests/QuestionBlueprintSection.test.tsx tests/quizBlueprintV3.test.ts
```

```bash
git add src/features/quiz-generator/components/QuestionBlueprintSection.tsx src/features/quiz-generator/hooks/useQuizFormState.ts src/features/quiz-generator/hooks/useCreateQuizLogic.ts tests/QuestionBlueprintSection.test.tsx
git commit -m "feat(ai): preview v3 blueprint slot readiness"
```

---

### Checkpoint B: Blueprint V3 foundation

```bash
npx vitest run tests/quizBlueprint.test.ts tests/quizBlueprintV3.test.ts tests/buildQuizGenerationRequestV3.test.ts tests/QuestionBlueprintSection.test.tsx
npx tsc --noEmit
npm run build
```

Expected: all commands exit `0`. V2 behavior remains available with V3 flag false.

---

## Phase 4 — Replace the monolithic prompt with selected contracts

### Task 11: Build a capability-aware V3 system prompt

**Files:**
- Create: `src/services/ai/prompts/systemPromptBuilder.ts`
- Modify: `src/services/ai/providers/openaiProvider.ts`
- Modify: `src/services/ai/providers/geminiProvider.ts`
- Modify: `src/services/ai/providers/perplexityProvider.ts`
- Create: `tests/systemPromptBuilder.test.ts`

**Interfaces:**

```ts
export interface AiProviderCapabilities {
  provider: AIProvider;
  supportsRetrievalContext: boolean;
  supportsImages: boolean;
}

export function buildGeneratorSystemPrompt(
  capabilities: AiProviderCapabilities,
  promptVersion: 'ai-blueprint-v3',
): string;
```

Provider methods gain an optional final argument:

```ts
systemInstruction?: string;
```

- [ ] **Step 1: Write system prompt tests**

```ts
it('requires JSON only and forbids visible reasoning', () => {
  const prompt = buildGeneratorSystemPrompt(geminiCapabilities, 'ai-blueprint-v3');
  expect(prompt).toContain('Chỉ trả về một JSON object hợp lệ');
  expect(prompt).toContain('Không trả về thought_process');
});

it('does not tell a non-retrieval provider to search the internet', () => {
  const prompt = buildGeneratorSystemPrompt(openAiCapabilities, 'ai-blueprint-v3');
  expect(prompt).not.toMatch(/tìm kiếm trên internet|violympic|vndoc/i);
});

it('uses supplied retrieval context without claiming independent browsing', () => {
  const prompt = buildGeneratorSystemPrompt(perplexityCapabilities, 'ai-blueprint-v3');
  expect(prompt).toContain('Chỉ sử dụng ngữ cảnh truy xuất được cung cấp');
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx vitest run tests/systemPromptBuilder.test.ts
```

- [ ] **Step 3: Implement the concise core prompt**

The V3 system prompt must contain only:

- primary-school Vietnamese role;
- JSON-only output;
- no visible reasoning;
- no unsupported source claims;
- safety and age appropriateness;
- obey immutable slot fields.

Keep `SYSTEM_INSTRUCTION` in `src/config/constants.ts` unchanged for V2 fallback during this task.

- [ ] **Step 4: Add provider override without breaking V2 calls**

Use:

```ts
const messages = [
  { role: 'system', content: systemInstruction ?? SYSTEM_INSTRUCTION },
  { role: 'user', content: userContent },
];
```

- [ ] **Step 5: Verify and commit**

```bash
npx vitest run tests/systemPromptBuilder.test.ts tests/quizGenerationPipeline.test.ts
```

```bash
git add src/services/ai/prompts/systemPromptBuilder.ts src/services/ai/providers/openaiProvider.ts src/services/ai/providers/geminiProvider.ts src/services/ai/providers/perplexityProvider.ts tests/systemPromptBuilder.test.ts
git commit -m "feat(ai): add capability-aware v3 system prompt"
```

---

### Task 12: Build exact slot and selected-contract prompt sections

**Files:**
- Create: `src/services/ai/prompts/slotPromptBuilder.ts`
- Modify: `src/services/ai/prompts/quizPromptBuilder.ts`
- Create: `tests/quizPromptBuilderV3.test.ts`
- Modify: `tests/quizPromptBuilder.test.ts` only to keep V2 expectations explicit.

**Interfaces:**

```ts
export function buildSlotTable(slots: readonly QuestionBlueprintSlot[]): string;
export function buildSelectedTypeContractSection(
  slots: readonly QuestionBlueprintSlot[],
  context: QuestionContractContext,
): string;

export function buildPromptV3(input: {
  topic: string;
  classLevel: string;
  content: string;
  options: QuizGenerationOptions & { blueprintV3: QuizBlueprintV3 };
}): string;
```

- [ ] **Step 1: Write prompt isolation tests**

```ts
const makePromptInput = (blueprintV3: QuizBlueprintV3) => ({
  topic: blueprintV3.topic,
  classLevel: blueprintV3.classLevel,
  content: '',
  options: {
    title: 'Đề V3',
    questionCount: blueprintV3.totalQuestions,
    questionTypes: [...new Set(blueprintV3.slots.map(slot => slot.type))],
    difficultyLevels: {
      level1: blueprintV3.slots.filter(slot => slot.difficulty === 1).length,
      level2: blueprintV3.slots.filter(slot => slot.difficulty === 2).length,
      level3: blueprintV3.slots.filter(slot => slot.difficulty === 3).length,
    },
    promptVersion: 'ai-blueprint-v3' as const,
    blueprintV3,
  },
});

const v3Input = makePromptInput(makeBlueprintV3Fixture());
const mcqAndMatchingSlots = buildQuestionBlueprintSlots({
  totalQuestions: 2,
  typeAllocations: [
    { type: QuestionType.MCQ, count: 1 },
    { type: QuestionType.MATCHING, count: 1 },
  ],
  difficultyLevels: { level1: 0, level2: 2, level3: 0 },
  objective: 'Phân số',
});
const mcqAndMatchingInput = makePromptInput(makeBlueprintV3Fixture({
  totalQuestions: 2,
  slots: mcqAndMatchingSlots,
}));

it('prints every slot exactly once', () => {
  const prompt = buildPromptV3(v3Input);
  for (const slot of v3Input.options.blueprintV3.slots) {
    expect(prompt.match(new RegExp(`"slotId":"${slot.slotId}"`, 'g'))).toHaveLength(1);
  }
});

it('includes only contracts used by selected slots', () => {
  const prompt = buildPromptV3(mcqAndMatchingInput);
  expect(prompt).toContain('[CONTRACT: MCQ]');
  expect(prompt).toContain('[CONTRACT: MATCHING]');
  expect(prompt).not.toContain('[CONTRACT: RIDDLE]');
  expect(prompt).not.toContain('[CONTRACT: DROPDOWN]');
});

it('uses canonical difficulty and no legacy alias', () => {
  const prompt = buildPromptV3(v3Input);
  expect(prompt).toContain('"difficulty":');
  expect(prompt).not.toContain('difficultyLevel');
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx vitest run tests/quizPromptBuilderV3.test.ts
```

- [ ] **Step 3: Implement the six fixed sections**

Order:

```text
[GENERATION CONTEXT]
[PEDAGOGICAL PROFILE]
[EXACT SLOT TABLE]
[SELECTED TYPE CONTRACTS]
[OUTPUT CONTRACT]
[SOURCE CONTENT]
```

Use `JSON.stringify` on a compact slot projection to avoid hand-built invalid JSON.

- [ ] **Step 4: Protect immutable fields from `customPrompt`**

Add explicit priority:

```text
Yêu cầu riêng của giáo viên chỉ điều chỉnh nội dung học tập.
Không được thay slotId, type, difficulty, schema, số câu hoặc policy an toàn.
```

- [ ] **Step 5: Keep V2 fallback**

`buildPrompt()` dispatches to V3 only when `options.promptVersion === 'ai-blueprint-v3' && options.blueprintV3`; otherwise it executes current V2 prompt code.

- [ ] **Step 6: Verify and commit**

```bash
npx vitest run tests/quizPromptBuilder.test.ts tests/quizPromptBuilderV3.test.ts tests/aiQuestionContractRegistry.integration.test.ts
```

```bash
git add src/services/ai/prompts/slotPromptBuilder.ts src/services/ai/prompts/quizPromptBuilder.ts tests/quizPromptBuilder.test.ts tests/quizPromptBuilderV3.test.ts
git commit -m "feat(ai): generate prompts from exact slots and selected contracts"
```

---

### Task 13: Harden the reviewer prompt around immutable slots

**Files:**
- Create: `src/services/ai/prompts/reviewerPromptBuilder.ts`
- Modify: `src/config/constants.ts` to mark the old reviewer as V2-only; do not delete it.
- Create: `tests/reviewerPromptBuilder.test.ts`

**Interfaces:**

```ts
export function buildReviewerSystemPromptV3(): string;
export function buildReviewerUserPromptV3(input: {
  blueprint: QuizBlueprintV3;
  quiz: GeneratedQuizV3;
}): string;
```

- [ ] **Step 1: Write immutable-field tests**

```ts
it('forbids changing slot identity and structure', () => {
  const prompt = buildReviewerSystemPromptV3();
  expect(prompt).toContain('Không được đổi slotId');
  expect(prompt).toContain('Không được đổi type');
  expect(prompt).toContain('Không được đổi difficulty');
  expect(prompt).toContain('Chỉ trả về JSON');
  expect(prompt).not.toContain('thought_process');
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx vitest run tests/reviewerPromptBuilder.test.ts
```

- [ ] **Step 3: Implement the reviewer prompt**

Reviewer checks content correctness, spelling, math, LaTeX and age suitability. It receives only the blueprint projection and current quiz. It may not add/remove questions or types.

- [ ] **Step 4: Verify and commit**

```bash
npx vitest run tests/reviewerPromptBuilder.test.ts
```

```bash
git add src/services/ai/prompts/reviewerPromptBuilder.ts src/config/constants.ts tests/reviewerPromptBuilder.test.ts
git commit -m "feat(ai): constrain v3 reviewer to immutable slots"
```

---

### Checkpoint C: Prompt architecture

```bash
npx vitest run tests/systemPromptBuilder.test.ts tests/quizPromptBuilder.test.ts tests/quizPromptBuilderV3.test.ts tests/reviewerPromptBuilder.test.ts
npx tsc --noEmit
```

Expected: PASS. Manually inspect one Toán, one Tiếng Việt and one 13-type prompt fixture; no unselected contract or mojibake may appear.

---

## Phase 5 — Parse, audit and repair by slot

### Task 14: Build the V3 generated schema from the registry

**Files:**
- Modify: `src/services/ai/schemas/quizGenerationSchema.ts`
- Modify: `src/services/ai/question-contracts/questionContractRegistry.ts`
- Create: `tests/quizGenerationSchemaV3.test.ts`
- Preserve: `tests/quizGenerationSchema.test.ts` for V2 fallback.

**Interfaces:**

```ts
export const GeneratedQuestionV3Schema: z.ZodType<GeneratedQuestionV3>;
export const GeneratedQuizV3Schema: z.ZodType<GeneratedQuizV3>;
export function parseGeneratedQuizV3(raw: unknown): GeneratedQuizV3;
```

Root requires:

```ts
{
  promptVersion: z.literal('ai-blueprint-v3'),
  blueprintVersion: z.literal(3),
  title: NonEmptyText,
  questions: z.array(GeneratedQuestionV3Schema).min(1).max(40),
}
```

- [ ] **Step 1: Write full 13-type schema tests**

```ts
it('parses a quiz containing one valid question of every AI type', () => {
  const quiz = {
    promptVersion: 'ai-blueprint-v3',
    blueprintVersion: 3,
    title: 'Đề 13 dạng',
    questions: AI_SELECTABLE_QUESTION_TYPES.map((type, index) => ({
      ...getAiQuestionContract(type).validFixture,
      slotId: `slot-${index + 1}`,
      difficulty: ((index % 3) + 1) as 1 | 2 | 3,
    })),
  };
  expect(parseGeneratedQuizV3(quiz).questions).toHaveLength(13);
});

it('rejects duplicate or missing slot ids at schema root', () => {
  const quiz = {
    promptVersion: 'ai-blueprint-v3' as const,
    blueprintVersion: 3 as const,
    title: 'Đề lỗi slot',
    questions: [
      { ...getAiQuestionContract(QuestionType.MCQ).validFixture, slotId: 'slot-1', difficulty: 1 },
      { ...getAiQuestionContract(QuestionType.MATCHING).validFixture, slotId: 'slot-1', difficulty: 2 },
    ],
  };
  expect(() => parseGeneratedQuizV3(quiz)).toThrow();
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx vitest run tests/quizGenerationSchemaV3.test.ts
```

- [ ] **Step 3: Compose the union from registry schemas**

Export a typed array of the 13 contract schemas from the registry and use it in `z.discriminatedUnion('type', ...)`. Common V3 fields must be present in every contract schema.

- [ ] **Step 4: Apply semantic validators after schema parse**

Provide:

```ts
export function validateGeneratedQuestionSemantics(
  question: GeneratedQuestionV3,
  slot: QuestionBlueprintSlot,
): QuestionContractIssue[];
```

This calls the matching contract; it does not switch over type elsewhere.

- [ ] **Step 5: Verify and commit**

```bash
npx vitest run tests/quizGenerationSchema.test.ts tests/quizGenerationSchemaV3.test.ts tests/aiQuestionContracts.*.test.ts
```

```bash
git add src/services/ai/schemas/quizGenerationSchema.ts src/services/ai/question-contracts/questionContractRegistry.ts tests/quizGenerationSchemaV3.test.ts
git commit -m "feat(ai): validate v3 generated quizzes from the registry"
```

---

### Task 15: Audit exact blueprint compliance by `slotId`

**Files:**
- Modify: `src/services/ai/quizAudit.ts`
- Create: `tests/quizSlotAudit.test.ts`
- Modify: `tests/quizAudit.test.ts` only to retain V2 behavior.

**Interfaces:**

```ts
export type QuizSlotAuditCode =
  | 'ROOT_VERSION_MISMATCH'
  | 'MISSING_SLOT'
  | 'DUPLICATE_SLOT'
  | 'UNEXPECTED_SLOT'
  | 'SLOT_TYPE_MISMATCH'
  | 'SLOT_DIFFICULTY_MISMATCH'
  | 'SLOT_SKILL_MISMATCH'
  | 'QUESTION_SCHEMA_INVALID'
  | 'QUESTION_SEMANTIC_INVALID'
  | 'DUPLICATE_QUESTION_CONTENT'
  | 'MATH_FORMAT_INVALID'
  | 'MISSING_EXPLANATION';

export interface QuizSlotAuditIssue {
  code: QuizSlotAuditCode;
  slotIds: string[];
  path?: Array<string | number>;
  message: string;
  repairable: boolean;
}

export function auditGeneratedQuizV3(
  quiz: GeneratedQuizV3,
  blueprint: QuizBlueprintV3,
): QuizSlotAuditIssue[];
```

- [ ] **Step 1: Write slot mismatch tests**

```ts
const blueprint = makeBlueprintV3Fixture();
const validQuiz = makeGeneratedQuizV3Fixture(blueprint);
const quizWithSlotProblems: GeneratedQuizV3 = {
  ...validQuiz,
  questions: [
    validQuiz.questions[0],
    { ...validQuiz.questions[0] },
    { ...validQuiz.questions[1], slotId: 'slot-999' },
    ...validQuiz.questions.slice(2),
  ],
};
const quizWithSwappedSlots: GeneratedQuizV3 = {
  ...validQuiz,
  questions: validQuiz.questions.map((question, index) => {
    if (index === 0) return { ...question, slotId: blueprint.slots[2].slotId };
    if (index === 2) return { ...question, slotId: blueprint.slots[0].slotId };
    return question;
  }),
};

it('reports missing, duplicate and unexpected slots independently', () => {
  const issues = auditGeneratedQuizV3(quizWithSlotProblems, blueprint);
  expect(issues.map(issue => issue.code)).toEqual(expect.arrayContaining([
    'MISSING_SLOT', 'DUPLICATE_SLOT', 'UNEXPECTED_SLOT',
  ]));
});

it('does not accept the correct total when slot identity is wrong', () => {
  expect(quizWithSwappedSlots.questions).toHaveLength(blueprint.totalQuestions);
  const issues = auditGeneratedQuizV3(quizWithSwappedSlots, blueprint);
  expect(issues.some(issue => issue.code === 'SLOT_TYPE_MISMATCH')).toBe(true);
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx vitest run tests/quizSlotAudit.test.ts
```

- [ ] **Step 3: Implement map-based audit**

Build:

```ts
const expectedBySlotId = new Map(blueprint.slots.map(slot => [slot.slotId, slot]));
const actualBySlotId = groupBy(quiz.questions, question => question.slotId);
```

Audit identity before content. Only after a slot has exactly one question run type, difficulty, skill, contract, math and duplicate-content checks.

- [ ] **Step 4: Preserve safe duplicate detection**

Continue the dependency-free similarity algorithm. Issues identify the later slot, not an array index.

- [ ] **Step 5: Verify and commit**

```bash
npx vitest run tests/quizAudit.test.ts tests/quizSlotAudit.test.ts tests/quizGenerationSchemaV3.test.ts
```

```bash
git add src/services/ai/quizAudit.ts tests/quizAudit.test.ts tests/quizSlotAudit.test.ts
git commit -m "feat(ai): audit generated quizzes by blueprint slot"
```

---

### Task 16: Repair only invalid slots and regenerate one slot with the same contract

**Files:**
- Modify: `src/services/ai/quizRepair.ts`
- Create: `src/services/ai/prompts/questionRegenerationPrompt.ts`
- Create: `tests/quizSlotRepair.test.ts`
- Create: `tests/questionRegenerationPrompt.test.ts`

**Interfaces:**

```ts
export interface QuizSlotRepairPlan {
  slotIds: string[];
  requestedCount: number;
}

export function createQuizSlotRepairPlan(issues: QuizSlotAuditIssue[]): QuizSlotRepairPlan;
export function buildQuizSlotRepairPrompt(input: {
  blueprint: QuizBlueprintV3;
  quiz: GeneratedQuizV3;
  issues: QuizSlotAuditIssue[];
}): string;
export function mergeRepairedSlots(
  original: GeneratedQuizV3,
  repaired: GeneratedQuizV3,
  plan: QuizSlotRepairPlan,
): GeneratedQuizV3;

export function buildQuestionRegenerationPrompt(input: {
  slot: QuestionBlueprintSlot;
  currentQuestion: GeneratedQuestionV3;
  otherQuestionSummaries: Array<{ slotId: string; normalizedPrompt: string }>;
  teacherInstruction?: string;
}): string;
```

- [ ] **Step 1: Write slot repair tests**

```ts
const makeIssue = (
  code: QuizSlotAuditCode,
  slotIds: string[],
): QuizSlotAuditIssue => ({
  code,
  slotIds,
  message: `${code}: ${slotIds.join(', ')}`,
  repairable: true,
});

const blueprint = makeBlueprintV3Fixture();
const original = makeGeneratedQuizV3Fixture(blueprint);
const replacementSlot = blueprint.slots.find(slot => slot.slotId === 'slot-3')!;
const repaired: GeneratedQuizV3 = {
  ...original,
  title: 'Phần sửa',
  questions: [{
    ...getAiQuestionContract(replacementSlot.type).validFixture,
    slotId: replacementSlot.slotId,
    type: replacementSlot.type,
    difficulty: replacementSlot.difficulty,
    explanation: 'Lời giải thay thế hợp lệ.',
  }] as GeneratedQuestionV3[],
};

it('requests only the exact failing slot ids', () => {
  const plan = createQuizSlotRepairPlan([
    makeIssue('SLOT_TYPE_MISMATCH', ['slot-3']),
    makeIssue('MISSING_SLOT', ['slot-7']),
  ]);
  expect(plan).toEqual({ slotIds: ['slot-3', 'slot-7'], requestedCount: 2 });
});

it('merges by slot id and preserves every valid object reference', () => {
  const merged = mergeRepairedSlots(original, repaired, { slotIds: ['slot-3'], requestedCount: 1 });
  expect(merged.questions.find(q => q.slotId === 'slot-1')).toBe(
    original.questions.find(q => q.slotId === 'slot-1'),
  );
  expect(merged.questions.find(q => q.slotId === 'slot-3')?.type).toBe(
    blueprint.slots.find(s => s.slotId === 'slot-3')?.type,
  );
});
```

- [ ] **Step 2: Write regeneration immutability tests**

```ts
it('locks the original slot type and difficulty', () => {
  const slot: QuestionBlueprintSlot = {
    slotId: 'slot-4',
    ordinal: 4,
    type: QuestionType.MATCHING,
    difficulty: 2,
    objective: 'Nối phân số với cách đọc',
    imagePolicy: 'optional',
  };
  const prompt = buildQuestionRegenerationPrompt({
    slot,
    currentQuestion: {
      ...getAiQuestionContract(slot.type).validFixture,
      slotId: slot.slotId,
      type: slot.type,
      difficulty: slot.difficulty,
      explanation: 'Lời giải hiện tại.',
    } as GeneratedQuestionV3,
    otherQuestionSummaries: [{ slotId: 'slot-1', normalizedPrompt: 'so sánh hai phân số' }],
    teacherInstruction: 'Đổi ngữ cảnh nhưng giữ nguyên kỹ năng.',
  });
  expect(prompt).toContain('"slotId":"slot-4"');
  expect(prompt).toContain('"type":"MATCHING"');
  expect(prompt).toContain('"difficulty":2');
  expect(prompt).toContain('Không được đổi ba trường trên');
});
```

- [ ] **Step 3: Run and confirm RED**

```bash
npx vitest run tests/quizSlotRepair.test.ts tests/questionRegenerationPrompt.test.ts
```

- [ ] **Step 4: Implement repair prompt with selected contracts only**

The prompt includes:

- exact failing slot projections;
- only their type contract fragments;
- issue codes/messages;
- normalized summaries of valid questions to avoid duplicates;
- output root with only the requested questions.

Do not include the full valid quiz JSON.

- [ ] **Step 5: Implement immutable merge**

Reject repaired output when:

- a requested slot is missing;
- an unrequested slot is returned;
- a slot is duplicated;
- type or difficulty differs from blueprint.

- [ ] **Step 6: Verify and commit**

```bash
npx vitest run tests/quizRepair.test.ts tests/quizSlotRepair.test.ts tests/questionRegenerationPrompt.test.ts
```

```bash
git add src/services/ai/quizRepair.ts src/services/ai/prompts/questionRegenerationPrompt.ts tests/quizSlotRepair.test.ts tests/questionRegenerationPrompt.test.ts
git commit -m "feat(ai): repair and regenerate exact blueprint slots"
```

---

### Task 17: Integrate V3 generation, repair, reviewer and domain mapping

**Files:**
- Create: `src/services/ai/quizDomainAdapter.ts`
- Modify: `src/services/geminiService.ts`
- Modify: `src/features/quiz-generator/hooks/useQuizGeneration.ts`
- Modify: `tests/quizGenerationPipeline.test.ts`
- Create: `tests/quizGenerationPipelineV3.test.ts`

**Interfaces:**

```ts
export function mapGeneratedQuizV3ToDomain(
  quiz: GeneratedQuizV3,
): { title: string; questions: Question[]; detectedCategory?: string; detectedLesson?: string; suggestedTags?: string[] };
```

Pipeline:

```ts
const normalized = normalizeGeneratedQuizV3Compatibility(raw, compatibilityOptions);
const parsed = parseGeneratedQuizV3(normalized);
let issues = auditGeneratedQuizV3(parsed, blueprintV3);

if (issues.length > 0) {
  const repairedRaw = await callStage('REPAIR', buildQuizSlotRepairPrompt(...));
  parsed = mergeRepairedSlots(parsed, parseGeneratedQuizV3(normalize(repairedRaw)), plan);
  issues = auditGeneratedQuizV3(parsed, blueprintV3);
}
if (issues.length > 0) throw new QuizGenerationValidationError(issues);

const reviewed = await optionalReview(parsed);
const final = auditGeneratedQuizV3(reviewed, blueprintV3).length === 0 ? reviewed : parsed;
return mapGeneratedQuizV3ToDomain(final);
```

- [ ] **Step 1: Write V3 pipeline tests**

```ts
const blueprint = makeBlueprintV3Fixture();
const validQuiz = makeGeneratedQuizV3Fixture(blueprint);
const slot3 = blueprint.slots.find(slot => slot.slotId === 'slot-3')!;
const wrongType = slot3.type === QuestionType.MCQ
  ? QuestionType.MATCHING
  : QuestionType.MCQ;
const quizWithOneWrongSlot: GeneratedQuizV3 = {
  ...validQuiz,
  questions: validQuiz.questions.map((question) => question.slotId !== slot3.slotId
    ? question
    : ({
      ...getAiQuestionContract(wrongType).validFixture,
      slotId: slot3.slotId,
      type: wrongType,
      difficulty: slot3.difficulty,
      explanation: 'Câu cố ý sai type.',
    } as GeneratedQuestionV3)),
};
const quizWithChangedSlotType: GeneratedQuizV3 = {
  ...validQuiz,
  questions: validQuiz.questions.map((question, index) => index === 0
    ? ({ ...question, type: wrongType } as GeneratedQuestionV3)
    : question),
};
const validQuizWithSkill: GeneratedQuizV3 = {
  ...validQuiz,
  questions: validQuiz.questions.map((question, index) => index === 0
    ? { ...question, difficulty: 2, subject: 'math', skillCode: 'phan_so' }
    : question),
};

const options: QuizGenerationOptions = {
  title: 'Đề V3',
  questionCount: blueprint.totalQuestions,
  questionTypes: [...new Set(blueprint.slots.map(slot => slot.type))],
  difficultyLevels: {
    level1: blueprint.slots.filter(slot => slot.difficulty === 1).length,
    level2: blueprint.slots.filter(slot => slot.difficulty === 2).length,
    level3: blueprint.slots.filter(slot => slot.difficulty === 3).length,
  },
  promptVersion: 'ai-blueprint-v3',
  blueprintV3: blueprint,
};

const generateV3 = async (
  draft: GeneratedQuizV3,
  reviewerOutput: GeneratedQuizV3 = validQuiz,
) => {
  mocks.generateWithOpenAIResilient.mockResolvedValue(draft);
  mocks.requestWorkerAiText.mockImplementation(async (_body, requestOptions) => {
    const stage = requestOptions?.action?.stage;
    if (stage === 'REPAIR') {
      return JSON.stringify({
        ...validQuiz,
        title: 'Phần sửa',
        questions: [validQuiz.questions.find(question => question.slotId === slot3.slotId)],
      });
    }
    if (stage === 'REVIEW') return JSON.stringify(reviewerOutput);
    throw new Error(`Unexpected stage ${String(stage)}`);
  });
  return generateQuiz(
    blueprint.topic,
    blueprint.classLevel,
    '',
    undefined,
    options,
    undefined,
    'openai',
    undefined,
    {
      action: { actionId: 'ai-v3-1234567890abcdef', workflow: 'QUIZ_CREATE' },
      stage: 'GENERATE',
    },
  );
};

it('repairs one wrong slot and preserves all valid slots', async () => {
  const result = await generateV3(quizWithOneWrongSlot);
  const repairCalls = mocks.requestWorkerAiText.mock.calls.filter(
    call => call[1]?.action?.stage === 'REPAIR',
  );
  expect(repairCalls).toHaveLength(1);
  expect(repairCalls[0][0].messages[1].content).toContain('slot-3');
  expect(result.questions).toHaveLength(blueprint.slots.length);
});

it('ignores a reviewer that changes an immutable field', async () => {
  const result = await generateV3(validQuiz, quizWithChangedSlotType);
  expect(result.questions[0].type).toBe(validQuiz.questions[0].type);
});

it('strips slot metadata and keeps skill metadata in the domain result', async () => {
  const result = await generateV3(validQuizWithSkill, validQuizWithSkill);
  expect((result.questions[0] as any).slotId).toBeUndefined();
  expect(result.questions[0].difficulty).toBe(2);
  expect(result.questions[0].skillCode).toBe('phan_so');
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx vitest run tests/quizGenerationPipelineV3.test.ts
```

- [ ] **Step 3: Implement domain mapping**

- Assign existing/generated `id` behavior.
- Map `difficulty` directly.
- Strip `slotId`, `promptVersion`, `blueprintVersion`, `targetWords` and other transient fields.
- For UNDERLINE, persist normalized `words` and `correctWordIndexes`.
- Preserve `subject`, `skillCode`, `subskillCode`.

- [ ] **Step 4: Dispatch V2/V3 in `generateQuiz`**

V3 condition:

```ts
const useV3 = options?.promptVersion === 'ai-blueprint-v3' && options.blueprintV3;
```

Pass `buildGeneratorSystemPrompt(...)` to provider only for V3. V2 provider behavior remains unchanged.

- [ ] **Step 5: Integrate single-question regeneration**

`handleRegenerateSingle` reconstructs the original slot from the current question contract and sends a new `QUESTION_REGENERATE` action. It does not run automatic REPAIR or REVIEW stages, but the returned question still passes V3 schema/audit for its one slot before replacing the current question.

- [ ] **Step 6: Update public hook contract test**

Add `aiBlueprintV3Enabled` and `questionBlueprintV3` only if they are returned publicly. Preserve all existing keys.

- [ ] **Step 7: Verify and commit**

```bash
npx vitest run tests/quizGenerationPipeline.test.ts tests/quizGenerationPipelineV3.test.ts tests/quizGenerationWorkflow.test.tsx tests/useCreateQuizLogic.contract.test.tsx
```

```bash
git add src/services/ai/quizDomainAdapter.ts src/services/geminiService.ts src/features/quiz-generator/hooks/useQuizGeneration.ts tests/quizGenerationPipeline.test.ts tests/quizGenerationPipelineV3.test.ts tests/useCreateQuizLogic.contract.test.tsx
git commit -m "feat(ai): integrate v3 slot validation and domain mapping"
```

---

### Checkpoint D: End-to-end V3 quality engine

```bash
npx vitest run \
  tests/quizGenerationSchemaV3.test.ts \
  tests/quizSlotAudit.test.ts \
  tests/quizSlotRepair.test.ts \
  tests/questionRegenerationPrompt.test.ts \
  tests/quizGenerationPipelineV3.test.ts \
  tests/quizGenerationWorkflow.test.tsx
npm run test:run
npx tsc --noEmit
npm run build
```

Expected: all commands exit `0`. Generate mocked fixtures for Toán and Tiếng Việt; every visible question must match one slot.

---

## Phase 6 — Compatibility, observability and rollout

### Task 18: Align saved quiz validation with supported authoring types

**Files:**
- Modify: `schemas/quiz.schema.ts`
- Modify: `tests/schemas.test.ts`
- Create: `tests/questionSchemaCoverage.test.ts`

**Acceptance:** Saved schema supports the 13 AI types plus `ERROR_CORRECTION`; `GEOMETRY` remains explicitly excluded and documented.

- [ ] **Step 1: Write coverage tests**

```ts
it('validates every AI contract after domain mapping', () => {
  for (const [index, type] of AI_SELECTABLE_QUESTION_TYPES.entries()) {
    const generatedQuiz = {
      promptVersion: 'ai-blueprint-v3' as const,
      blueprintVersion: 3 as const,
      title: `Fixture ${type}`,
      questions: [{
        ...getAiQuestionContract(type).validFixture,
        slotId: `slot-${index + 1}`,
        difficulty: 2 as const,
      }],
    };
    const domainQuestion = mapGeneratedQuizV3ToDomain(generatedQuiz).questions[0];
    expect(validateQuestion(domainQuestion).success, type).toBe(true);
  }
});

it('supports manual-only error correction', () => {
  const question = {
    id: 'error-1',
    type: QuestionType.ERROR_CORRECTION,
    question: 'Tìm và sửa từ viết sai.',
    passage: 'Bạn Lan rất ngoãn.',
    wrongWord: 'ngoãn',
    correctWord: 'ngoan',
    difficulty: 1,
  };
  expect(validateQuestion(question).success).toBe(true);
});

it('documents geometry as outside the saved schema rollout', () => {
  const question = {
    id: 'geometry-1',
    type: QuestionType.GEOMETRY,
    question: 'Quan sát hình.',
    geometryData: { kind: 'square' },
    difficulty: 1,
  };
  expect(validateQuestion(question).success).toBe(false);
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx vitest run tests/schemas.test.ts tests/questionSchemaCoverage.test.ts
```

- [ ] **Step 3: Add missing schemas**

Add `CATEGORIZATION`, `WORD_SCRAMBLE`, `RIDDLE`, `ERROR_CORRECTION` and ensure all existing 13 AI types use `difficulty?: 1|2|3`. Translate remaining user-facing validation messages to Vietnamese.

- [ ] **Step 4: Verify and commit**

```bash
npx vitest run tests/schemas.test.ts tests/questionSchemaCoverage.test.ts tests/quizGenerationSchemaV3.test.ts
```

```bash
git add schemas/quiz.schema.ts tests/schemas.test.ts tests/questionSchemaCoverage.test.ts
git commit -m "fix(schema): align saved questions with supported contracts"
```

---

### Task 19: Add safe V3 diagnostics metadata at the Worker boundary

**Pre-change requirement:** Before modifying `workers/src/routes/aiProxy.ts`, run the gitNexus API route impact report and record affected consumers/middleware in the task notes.

**Files:**
- Modify: `src/services/ai/aiAction.ts`
- Modify: `src/services/ai/workerAiClient.ts`
- Modify: `workers/src/services/aiRequestPolicy.ts`
- Modify: `workers/src/routes/aiProxy.ts`
- Modify: `tests/aiProxy.worker.test.ts`

**Wire metadata:**

```ts
interface AiRequestDiagnostics {
  promptVersion?: 'ai-blueprint-v3';
  blueprintVersion?: 3;
  slotCount?: number;
}
```

- [ ] **Step 1: Write metadata safety tests**

```ts
it('accepts safe v3 diagnostics fields', async () => {
  const response = await callAiProxy({
    _meta: {
      actionId,
      workflow: 'QUIZ_CREATE',
      stage: 'GENERATE',
      promptVersion: 'ai-blueprint-v3',
      blueprintVersion: 3,
      slotCount: 13,
    },
  });
  expect(response.status).toBe(200);
});

it('drops unknown diagnostic fields and never logs prompt content', async () => {
  await callAiProxy({ _meta: { ...validMeta, prompt: 'SECRET CONTENT' } });
  expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('SECRET CONTENT'));
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx vitest run tests/aiProxy.worker.test.ts
```

- [ ] **Step 3: Extend metadata parsing without changing workflow rules**

Validate:

- `promptVersion` only `ai-blueprint-v3`;
- `blueprintVersion` only `3`;
- `slotCount` integer `1..40`;
- fields optional for V2.

Log structured event fields only: action hash/id per current policy, workflow, stage, versions, slot count, duration and status code.

- [ ] **Step 4: Verify and commit**

```bash
npx vitest run tests/aiProxy.worker.test.ts src/services/ai/__tests__/workerAiClient.test.ts
```

```bash
git add src/services/ai/aiAction.ts src/services/ai/workerAiClient.ts workers/src/services/aiRequestPolicy.ts workers/src/routes/aiProxy.ts tests/aiProxy.worker.test.ts
git commit -m "feat(ai): add safe v3 generation diagnostics"
```

---

### Task 20: Add Cypress coverage for all 13 types and rollback

**Files:**
- Create: `cypress/e2e/ai-question-blueprint-v3.cy.ts`
- Create: `cypress/fixtures/ai-blueprint-v3-13-types.json`
- Modify: `tests/manualQuizTelemetry.test.ts` — thêm coverage cho flag V3.

- [ ] **Step 1: Add feature flag tests**

Assert V3 false by default and true for `1`, `true`, `yes`, `on`, `enabled`.

- [ ] **Step 2: Build the 13-type fixture**

Fixture contains:

- root `promptVersion: ai-blueprint-v3`;
- root `blueprintVersion: 3`;
- 13 unique slots;
- one valid question for each registry type;
- difficulty distribution totaling 13.

- [ ] **Step 3: Add Cypress happy path**

```ts
cy.contains('13 slot đã sẵn sàng').should('be.visible');
cy.intercept('POST', '**/api/ai/chat', (req) => {
  const stage = req.body?._meta?.stage;
  if (stage === 'GENERATE') {
    req.reply({ fixture: 'ai-blueprint-v3-13-types.json' });
    return;
  }
  if (stage === 'REPAIR') {
    req.reply({ statusCode: 200, body: { promptVersion: 'ai-blueprint-v3', blueprintVersion: 3, title: 'Không cần sửa', questions: [] } });
    return;
  }
  req.reply({ fixture: 'ai-blueprint-v3-13-types.json' });
});
cy.contains('Tạo đề').click();
cy.contains('13 câu').should('be.visible');
cy.contains('Lưu đề').should('be.enabled');
```

Verify representative renderers:

- MCQ options;
- true/false statements;
- drag-drop markers;
- matching pairs;
- categorization groups;
- underline selection;
- image question;
- riddle content.

- [ ] **Step 4: Add repair and regeneration paths**

Mock GENERATE with `slot-6` wrong type, REPAIR with the correct slot, then assert final result has one `slot-6` domain question of expected type. Mock single regeneration and assert a new action ID is sent with workflow `QUESTION_REGENERATE`.

- [ ] **Step 5: Add rollback test**

With V2 true and V3 false, assert the request/output uses V2 prompt/schema path and existing V2 UI remains available.

- [ ] **Step 6: Run and commit**

```bash
npx cypress run --spec cypress/e2e/ai-question-blueprint-v3.cy.ts
```

```bash
git add cypress/e2e/ai-question-blueprint-v3.cy.ts cypress/fixtures/ai-blueprint-v3-13-types.json src/config/featureFlags.ts tests/manualQuizTelemetry.test.ts
git commit -m "test(ai): cover all v3 question contracts end to end"
```

---

### Task 21: Write rollout, rollback and final verification documentation

**Files:**
- Create: `docs/runbooks/ai-question-blueprint-v3-rollout.md`
- Modify: `docs/runbooks/ai-quiz-generation-v2-rollout.md` with a link to the V3 extension.
- Modify: `.env.example` only if the flag line was not already committed in Task 9.

- [ ] **Step 1: Document deployment order**

Exact order:

1. Keep `VITE_FEATURE_AI_BLUEPRINT_V3=false`.
2. Deploy Worker metadata compatibility first only if Task 19 changed Worker.
3. Deploy frontend with V3 flag false.
4. Smoke test V2 topic, PDF OCR and single regeneration.
5. Enable V3 on preview/staging.
6. Test Toán, Tiếng Việt and the 13-type fixture.
7. Pilot with 5–10 teachers for one school day.
8. Expand to 25%, monitor at least 30 minutes, then 100% after no P0/P1.
9. Roll back by setting V3 false; keep V2 enabled.

- [ ] **Step 2: Document stop conditions**

Immediate rollback when:

- any visible quiz has missing/duplicate/unexpected slot;
- type/difficulty changes after repair/reviewer;
- single regeneration changes contract;
- quota is double-counted or bypassed;
- prompt/OCR/content appears in logs;
- saved quiz validation rejects a generated valid type;
- 5xx/timeout materially exceeds V2 baseline.

- [ ] **Step 3: Run complete verification**

```bash
npx vitest run \
  tests/aiQuestionTypeRegistry.test.ts \
  tests/generatedQuizV3Normalizer.test.ts \
  tests/aiQuestionContracts.choice.test.ts \
  tests/aiQuestionContracts.completion.test.ts \
  tests/aiQuestionContracts.interaction.test.ts \
  tests/aiQuestionContracts.language.test.ts \
  tests/aiQuestionContractRegistry.integration.test.ts \
  tests/quizBlueprintV3.test.ts \
  tests/buildQuizGenerationRequestV3.test.ts \
  tests/systemPromptBuilder.test.ts \
  tests/quizPromptBuilderV3.test.ts \
  tests/reviewerPromptBuilder.test.ts \
  tests/quizGenerationSchemaV3.test.ts \
  tests/quizSlotAudit.test.ts \
  tests/quizSlotRepair.test.ts \
  tests/questionRegenerationPrompt.test.ts \
  tests/quizGenerationPipelineV3.test.ts \
  tests/questionSchemaCoverage.test.ts
npm run test:run
npx tsc --noEmit
npm run build
npx cypress run --spec cypress/e2e/ai-question-blueprint-v3.cy.ts
npm run security:check
```

Expected: every command exits `0`.

- [ ] **Step 4: Run diff review**

```bash
git diff --check
git status --short
```

Run Local Coding `review_diff`; resolve all P1/P2 findings and document accepted P3 findings.

- [ ] **Step 5: Commit documentation**

```bash
git add docs/runbooks/ai-question-blueprint-v3-rollout.md docs/runbooks/ai-quiz-generation-v2-rollout.md
git commit -m "docs(ai): add v3 blueprint rollout runbook"
```

---

## Final Acceptance Criteria

- [ ] Every enum type is classified exactly once.
- [ ] Exactly 13 AI-selectable types have complete contracts.
- [ ] The AI selector consumes the registry rather than its own array.
- [ ] Every contract has schema, prompt fragment, semantic validator and valid fixture.
- [ ] `QuizBlueprintV3` has one unique slot per requested question.
- [ ] Slot type/difficulty totals exactly match teacher configuration.
- [ ] AI output uses `slotId`, `type`, `difficulty` and V3 root versions.
- [ ] `difficultyLevel` is normalized only as a V2 compatibility alias.
- [ ] Prompt includes only selected type contracts.
- [ ] V3 system prompt does not request chain-of-thought or unsupported browsing.
- [ ] Audit rejects missing, duplicate, unexpected and structurally mismatched slots.
- [ ] Repair runs at most once and replaces only requested slot IDs.
- [ ] Reviewer output changing immutable fields is ignored.
- [ ] Single-question regeneration preserves type/difficulty/skill and counts one successful AI action.
- [ ] Domain output has no transient slot/version metadata.
- [ ] Saved schema validates all 13 AI types plus manual `ERROR_CORRECTION`.
- [ ] V3 flag false returns to V2 without losing quota/OCR/progress/cancel.
- [ ] No database migration or scoring change is introduced.
- [ ] Full tests, TypeScript, build, Cypress and security check pass.

## Dependency Order

```text
Task 1 type classification
  └─ Task 2 shared contract primitives
       ├─ Task 3 choice contracts
       ├─ Task 4 completion contracts
       ├─ Task 5 interaction contracts
       ├─ Task 6 language contracts
       └─ Task 7 image + registry

Task 7 registry
  └─ Task 8 slot blueprint
       └─ Task 9 request adapter + flag
            └─ Task 10 UI summary

Task 7 + Task 8
  ├─ Task 11 system prompt
  ├─ Task 12 slot/type prompt
  └─ Task 13 reviewer prompt

Tasks 7–13
  └─ Task 14 V3 schema
       └─ Task 15 slot audit
            └─ Task 16 slot repair/regeneration
                 └─ Task 17 pipeline/domain integration

Task 17
  ├─ Task 18 saved schema compatibility
  ├─ Task 19 safe diagnostics
  └─ Task 20 Cypress
       └─ Task 21 rollout/final verification
```

## Parallelization

- Tasks 3–6 are safe to parallelize after Task 2; each owns a separate contract module and test file.
- Task 11 and Task 13 may run in parallel after interfaces from Tasks 7–9 are frozen.
- Task 18 and Task 19 may run in parallel after Task 17.
- Tasks 8, 9, 12, 14, 15, 16 and 17 are sequential because they share the blueprint/output contract.
- Task 20 starts only when the integrated V3 pipeline is stable.

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Registry becomes another duplicated catalog | High | UI AI selector, prompt and generated schema all import the registry; coverage test forbids drift |
| Slot builder cannot satisfy type/difficulty cross-product | High | Deterministic weighted round-robin with invariant tests for arbitrary totals 1–40 |
| V3 schema rejects usable V2 output | Medium | Explicit `difficultyLevel` alias and independent V3 feature flag; never infer slot IDs |
| Repair changes valid questions | High | Merge by requested `slotId`, preserve valid object references, re-audit full result |
| Reviewer changes structure | High | Immutable reviewer prompt plus deterministic post-review audit; ignore invalid reviewer output |
| UNDERLINE indexes drift from renderer tokenization | High | Shared tokenizer utility and AI returns target words, not indexes |
| Vietnamese word scramble loses dấu | Medium | NFC normalization and exact character multiset comparison |
| IMAGE_QUESTION returns placeholder image | Medium | Contract requires image/imageAlt and final semantic check rejects placeholder URL |
| Prompt size grows with 13 contracts | Medium | Include only selected contract fragments; compact slot table; prompt size tests |
| V3 affects V2 production unexpectedly | High | Independent flag, dispatch by prompt version, V2 tests retained and rollback to V2 |
| Safe diagnostics accidentally log content | High | Allow-list metadata only; Worker tests assert prompt/OCR fields are not logged |

## Execution Handoff

Plan complete for implementation on `feat/ai-quiz-generation-v2`.

Recommended execution mode:

1. **Subagent-Driven:** one fresh agent per task, with review after each task and human checkpoints A–D.
2. **Inline Execution:** use `executing-plans`, execute sequentially in batches and stop at each checkpoint.
