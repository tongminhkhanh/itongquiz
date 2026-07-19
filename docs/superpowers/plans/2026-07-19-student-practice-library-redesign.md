# Student Practice Library Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the student dashboard practice library and subject detail flow so the cards are visually clear, zero-content subjects cannot mislead students, counts and topics come from one canonical data source, and navigation works through stable URLs.

**Architecture:** Keep the existing `get_practice_topics` and `get_practice_quiz` API contracts, but move subject metadata and topic matching into one typed catalog model used by both the dashboard and subject page. Replace Material Symbols string icons with Lucide icons, expose local loading/error/retry state through a shared hook, and route subject selection through `/student/practice/:subjectId` while preserving the current quiz-store start flow.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, React Router, Lucide React, Zustand, Vitest, Testing Library, Cypress.

## Global Constraints

- Work from a clean isolated worktree created from `origin/main`; do not implement directly in the backup workspace or on a dirty branch.
- Follow TDD: add a focused failing test, verify the failure, implement the smallest passing change, and rerun the focused test.
- Commit after each file is completed. Intermediate red commits are allowed only inside the isolated feature branch; do not merge until the full quality gate is green.
- Do not add a dependency, API action, Worker, D1 migration, schema change, feature flag, or new business rule.
- Preserve `get_practice_topics`, `get_practice_quiz`, `quizStore.selectQuiz()`, and `quizStore.setView('student')` behavior.
- The dashboard hero CTA continues to scroll to the practice library; it must not auto-select a subject.
- Subjects with no matched topic/question data must not expose a start action.
- Use Lucide icons only for this flow; do not depend on Material Symbols ligature strings.
- Dashboard practice cards: 1 column on mobile, 2 on tablet, and at most 3 inside the desktop main column.
- Use a white card surface with a small pastel icon accent; do not restore full-card gradients.
- All actionable cards must be native `button` or router navigation controls with at least a 44 × 44px target and visible focus styling.
- Errors stay local to the practice section or subject page and display child-friendly copy plus `Thử lại` when retry is possible.
- Respect `prefers-reduced-motion`; do not add pulse loops, long staggered entrances, or width animations.
- Validate at 375 × 812, 768 × 1024, 1024 × 768, and 1440 × 900.
- Production completion requires focused tests, the full Vitest suite, frontend production build, authenticated Cypress when credentials are available, and a clean git diff review.

---

## Approved Product Decisions

1. Implement P0 and P1 together; do not ship an icon-only cosmetic patch as the final result.
2. Use `get_practice_topics` as the canonical catalog source for dashboard counts and subject detail topics.
3. Show two groups on the dashboard:
   - **Môn đang có:** actionable cards with topic count and question count.
   - **Sắp có:** compact non-actionable items labeled `Đang chuẩn bị`.
4. Display precise metadata such as `8 chuyên đề · 126 câu hỏi`; retire the ambiguous `30 bài tập` label for this section.
5. Use canonical subject id `tu-nhien-xa-hoi`; keep `tn-xh` only as a topic alias, never as a route or config key.
6. Add stable routes in the form `/student/practice/:subjectId`; refresh and browser Back must preserve expected navigation.
7. The subject detail page uses the same catalog model, calm white surfaces, local skeleton/error/empty states, and native topic buttons.
8. P2 personalization (`Tiếp tục môn vừa học`, recommendations, per-subject mastery) remains outside this implementation.

---

## Target File Map

### New files

- `src/features/student-dashboard/model/practiceCatalogModel.ts`
  - Normalizes topic tags, maps them to canonical subjects, calculates topic/question totals, and creates dashboard card view models.
- `src/features/student-dashboard/hooks/usePracticeTopics.ts`
  - Owns topic loading, local error copy, retry, and stale-request protection for both dashboard and subject detail views.
- `src/components/student/PracticeLibrary/PracticeSubjectHeader.tsx`
  - Accessible, non-gradient subject page header and breadcrumb/back action.
- `src/components/student/PracticeLibrary/PracticeTopicGrid.tsx`
  - Search-result/empty/error-aware topic grid using native buttons.
- `src/components/student/PracticeLibrary/PracticeLibraryStates.tsx`
  - Subject-page skeleton, empty state, search-empty state, and local error state.
- `tests/studentPracticeCatalogModel.test.ts`
  - Pure model tests for alias matching, canonical ids, grouping, ordering, and counts.
- `tests/usePracticeTopics.test.tsx`
  - Hook tests for success, error, retry, and stale request behavior.
- `tests/studentPracticeRouting.test.tsx`
  - Memory-router coverage for subject selection, direct URL entry, invalid subject, refresh-equivalent render, and back navigation.
- `tests/studentPracticeLibrary.test.tsx`
  - Subject detail UI, search, topic start, local loading, error, and accessibility tests.

### Modified files

- `src/features/student-dashboard/model/dashboardConstants.ts`
  - Convert subject config to typed canonical metadata, Lucide icon keys, aliases, and accent tokens.
- `src/features/student-dashboard/model/practiceModel.ts`
  - Delegate to the canonical topic catalog model instead of counting `useQuizStore().quizzes` by category.
- `src/features/student-dashboard/model/index.ts`
  - Export the new catalog functions and types.
- `src/components/HomePage/student-dashboard/dashboard.types.ts`
  - Replace `icon: string`/`total` with typed icon/status/topic/question properties and add section state props.
- `src/features/student-dashboard/hooks/useStudentPracticeCatalog.ts`
  - Consume `usePracticeTopics`, build available/coming-soon groups, and navigate through React Router instead of local `selectedSubject` state.
- `src/components/HomePage/student-dashboard/SubjectPracticeGrid.tsx`
  - New visual hierarchy, responsive 1/2/3 grid, disabled coming-soon group, skeleton/error/retry states, and Lucide icons.
- `src/features/student-dashboard/components/StudentDashboardBody.tsx`
  - Pass catalog loading/error/retry and grouped subjects to the practice section.
- `src/components/HomePage/StudentDashboardUI.tsx`
  - Resolve optional `subjectId` route param and render the subject library without local subject state.
- `src/app/AppRoutes.tsx`
  - Route `/student/practice/:subjectId` through the same authenticated root flow used by `/` so quiz-store view switching still works.
- `src/components/student/PracticeLibrary/SubjectLibrary.tsx`
  - Convert to the new hook/model/components, remove gradient/material icon/spinner behavior, and keep topic-start logic local.
- `src/components/student/PracticeLibrary/TopicCard.tsx`
  - Convert `motion.div` click target to a native button API with disabled/loading state and reduced-motion-safe feedback.
- `src/services/practiceService.ts`
  - Stop converting topic API failures into an empty array; let the hook distinguish failure from empty data.
- `tests/studentDashboardComponents.test.tsx`
  - Update subject view model fixtures and lock new responsive/disabled/error semantics.
- `cypress/e2e/student-dashboard-responsive.cy.ts`
  - Add practice-library assertions for no ligature text, max three columns, coming-soon non-actions, and no overflow.
- `cypress/e2e/student-practice-library.cy.ts`
  - Add authenticated end-to-end subject navigation, direct route, search, start, browser Back, and viewport coverage.

---

## Canonical Interfaces

The following names and signatures are fixed for the implementation so tasks remain compatible.

```ts
export type PracticeSubjectId =
  | 'toan'
  | 'tieng-viet'
  | 'tu-nhien-xa-hoi'
  | 'tieng-anh'
  | 'tin-hoc';

export type PracticeSubjectIcon =
  | 'calculator'
  | 'book-open'
  | 'earth'
  | 'languages'
  | 'monitor';

export interface PracticeTopicSummary {
  name: string;
  count: number;
}

export interface PracticeSubjectDefinition {
  id: PracticeSubjectId;
  title: string;
  description: string;
  icon: PracticeSubjectIcon;
  aliases: readonly string[];
  accentClass: string;
  iconSurfaceClass: string;
  showOnHome: boolean;
}

export interface SubjectCardViewModel {
  id: PracticeSubjectId;
  title: string;
  description: string;
  icon: PracticeSubjectIcon;
  topicCount: number;
  questionCount: number;
  status: 'available' | 'coming-soon';
  accentClass: string;
  iconSurfaceClass: string;
}

export interface PracticeCatalog {
  topicsBySubject: Record<PracticeSubjectId, PracticeTopicSummary[]>;
  subjects: SubjectCardViewModel[];
  availableSubjects: SubjectCardViewModel[];
  comingSoonSubjects: SubjectCardViewModel[];
}

export interface PracticeTopicsState {
  topics: PracticeTopicSummary[];
  isLoading: boolean;
  errorMessage: string | null;
  retry: () => Promise<void>;
}
```

Fixed pure functions:

```ts
normalizePracticeTopic(value: string): string
matchesPracticeSubject(topicName: string, subjectId: PracticeSubjectId): boolean
getTopicsForSubject(topics: PracticeTopicSummary[], subjectId: PracticeSubjectId): PracticeTopicSummary[]
buildPracticeCatalog(topics: PracticeTopicSummary[]): PracticeCatalog
isPracticeSubjectId(value: string): value is PracticeSubjectId
```

---

### Task 1: Establish a clean execution branch and capture the baseline

**Files:**
- No product file changes.
- Read: `package.json`
- Read: `docs/specs/2026-07-18-learning-adventure-student-dashboard.md`
- Read: this plan.

**Interfaces:**
- Consumes: clean `origin/main`.
- Produces: isolated branch `feat/student-practice-library-redesign-20260719` and worktree `.worktrees/student-practice-library-redesign`.

- [ ] **Step 1: Verify the current repository is clean**

Run:

```bash
git status --short
git fetch origin
git rev-parse --abbrev-ref HEAD
git log --oneline -5
```

Expected:

```text
git status --short prints nothing
current branch and recent commits are recorded in the execution log
```

- [ ] **Step 2: Create the isolated worktree**

Run:

```bash
git worktree add .worktrees/student-practice-library-redesign \
  -b feat/student-practice-library-redesign-20260719 origin/main
```

Expected: a new clean worktree on `feat/student-practice-library-redesign-20260719`.

- [ ] **Step 3: Install and verify the baseline**

Run inside the worktree:

```bash
npm ci
npm run test:run -- tests/studentDashboardComponents.test.tsx
npx vite build
```

Expected:

```text
focused dashboard component tests PASS
Vite production bundle succeeds
```

Record any pre-existing warning without fixing unrelated debt.

---

### Task 2: Define canonical subject metadata and remove ligature icon strings

**Files:**
- Modify: `src/features/student-dashboard/model/dashboardConstants.ts`
- Modify: `src/components/HomePage/student-dashboard/dashboard.types.ts`
- Test: `tests/studentPracticeCatalogModel.test.ts`

**Interfaces:**
- Consumes: `PracticeSubjectId`, `PracticeSubjectIcon`, and subject definitions listed in this plan.
- Produces: `SUBJECT_CONFIG: Record<PracticeSubjectId, PracticeSubjectDefinition>` and `SUBJECT_ORDER`.

- [ ] **Step 1: Create the failing metadata test file**

Create `tests/studentPracticeCatalogModel.test.ts` with the initial assertions:

```ts
import { describe, expect, it } from 'vitest';
import { SUBJECT_CONFIG, SUBJECT_ORDER } from '../src/features/student-dashboard/model/dashboardConstants';

describe('practice subject metadata', () => {
  it('uses canonical subject ids and non-ligature icon keys', () => {
    expect(SUBJECT_ORDER).toEqual([
      'toan',
      'tieng-viet',
      'tu-nhien-xa-hoi',
      'tieng-anh',
      'tin-hoc',
    ]);
    expect(SUBJECT_CONFIG['tu-nhien-xa-hoi'].aliases).toContain('#tn_xh');
    expect(Object.values(SUBJECT_CONFIG).map(subject => subject.icon)).toEqual([
      'calculator',
      'book-open',
      'earth',
      'languages',
      'monitor',
    ]);
    expect(Object.values(SUBJECT_CONFIG).map(subject => subject.icon)).not.toContain('calculate');
  });
});
```

Run:

```bash
npm run test:run -- tests/studentPracticeCatalogModel.test.ts
```

Expected: FAIL because `SUBJECT_ORDER`, aliases, and typed icon keys do not exist.

Commit this single test file:

```bash
git add tests/studentPracticeCatalogModel.test.ts
git commit -m "test: define canonical practice subject metadata"
```

- [ ] **Step 2: Update dashboard view-model types**

In `dashboard.types.ts`, add the canonical types and replace the old card fields:

```ts
export type PracticeSubjectId =
  | 'toan'
  | 'tieng-viet'
  | 'tu-nhien-xa-hoi'
  | 'tieng-anh'
  | 'tin-hoc';

export type PracticeSubjectIcon =
  | 'calculator'
  | 'book-open'
  | 'earth'
  | 'languages'
  | 'monitor';

export interface PracticeTopicSummary {
  name: string;
  count: number;
}

export interface PracticeSubjectDefinition {
  id: PracticeSubjectId;
  title: string;
  description: string;
  icon: PracticeSubjectIcon;
  aliases: readonly string[];
  accentClass: string;
  iconSurfaceClass: string;
  showOnHome: boolean;
}

export interface SubjectCardViewModel {
  id: PracticeSubjectId;
  title: string;
  description: string;
  icon: PracticeSubjectIcon;
  topicCount: number;
  questionCount: number;
  status: 'available' | 'coming-soon';
  accentClass: string;
  iconSurfaceClass: string;
}
```

Temporarily keep `SubjectPracticeGridProps` unchanged until Task 6.

Run:

```bash
npm run test:run -- tests/studentPracticeCatalogModel.test.ts
```

Expected: metadata test still fails only on constants; TypeScript compilation reaches the test.

Commit the single type file:

```bash
git add src/components/HomePage/student-dashboard/dashboard.types.ts
git commit -m "refactor: type practice subject catalog"
```

- [ ] **Step 3: Replace string-ligature subject configuration**

Replace the subject portion of `dashboardConstants.ts` with:

```ts
import type {
  PracticeSubjectDefinition,
  PracticeSubjectId,
} from '@/src/components/HomePage/student-dashboard/dashboard.types';

export const SUBJECT_ORDER: readonly PracticeSubjectId[] = [
  'toan',
  'tieng-viet',
  'tu-nhien-xa-hoi',
  'tieng-anh',
  'tin-hoc',
];

export const SUBJECT_CONFIG: Record<PracticeSubjectId, PracticeSubjectDefinition> = {
  toan: {
    id: 'toan',
    title: 'Toán học',
    description: 'Rèn luyện tư duy và tính toán',
    icon: 'calculator',
    aliases: [
      '#toan', '#toán', '#phep_nhan', '#phan_so', '#hinh_hoc', '#gia_tri',
      '#biu_thức', '#quy_dong', '#rut_gon_phan_so', '#so_sanh_phan_so',
      '#lam_tron_so', '#hinh_binh_hanh', '#phep_chia', '#phep_cong', '#phep_tru',
    ],
    accentClass: 'text-blue-700',
    iconSurfaceClass: 'bg-blue-100',
    showOnHome: true,
  },
  'tieng-viet': {
    id: 'tieng-viet',
    title: 'Tiếng Việt',
    description: 'Vun đắp ngôn ngữ tiếng mẹ đẻ',
    icon: 'book-open',
    aliases: [
      '#tieng_viet', '#tiếng_việt', '#trạng_nguyên', '#vi_ngữ', '#chủ_ngữ',
      '#luyện_từ_và_câu', '#từ_đơn', '#từ_phức', '#ngu_phap', '#gia_dinh',
      '#tu_vung', '#tap_doc', '#chinh_ta',
    ],
    accentClass: 'text-amber-700',
    iconSurfaceClass: 'bg-amber-100',
    showOnHome: true,
  },
  'tu-nhien-xa-hoi': {
    id: 'tu-nhien-xa-hoi',
    title: 'Tự nhiên & Xã hội',
    description: 'Khám phá thế giới quanh em',
    icon: 'earth',
    aliases: [
      '#khoa_hoc', '#tu_nhien', '#xa_hoi', '#tn_xh', '#tự_nhiên_xã_hội',
      '#lịch_sử', '#địa_lý',
    ],
    accentClass: 'text-emerald-700',
    iconSurfaceClass: 'bg-emerald-100',
    showOnHome: true,
  },
  'tieng-anh': {
    id: 'tieng-anh',
    title: 'Tiếng Anh',
    description: 'Mở rộng giao tiếp quốc tế',
    icon: 'languages',
    aliases: ['#tieng_anh', '#anh_van', '#english', '#grammar', '#vocabulary'],
    accentClass: 'text-indigo-700',
    iconSurfaceClass: 'bg-indigo-100',
    showOnHome: true,
  },
  'tin-hoc': {
    id: 'tin-hoc',
    title: 'Tin học',
    description: 'Làm chủ công nghệ tương lai',
    icon: 'monitor',
    aliases: ['#tin_hoc', '#coding', '#scratch', '#may_tinh'],
    accentClass: 'text-slate-700',
    iconSurfaceClass: 'bg-slate-200',
    showOnHome: true,
  },
};
```

Remove `SUBJECT_CARD_STYLES` and the old gradient `color` property after verifying no remaining consumer needs them.

Run:

```bash
npm run test:run -- tests/studentPracticeCatalogModel.test.ts
```

Expected: PASS for the metadata test.

Commit the single constants file:

```bash
git add src/features/student-dashboard/model/dashboardConstants.ts
git commit -m "fix: unify practice subject ids and icons"
```

---

### Task 3: Build the canonical topic-to-subject catalog model

**Files:**
- Create: `src/features/student-dashboard/model/practiceCatalogModel.ts`
- Modify: `src/features/student-dashboard/model/practiceModel.ts`
- Modify: `src/features/student-dashboard/model/index.ts`
- Test: `tests/studentPracticeCatalogModel.test.ts`

**Interfaces:**
- Consumes: `SUBJECT_CONFIG`, `SUBJECT_ORDER`, and `PracticeTopicSummary[]`.
- Produces: the fixed pure functions and `PracticeCatalog` interface listed above.

- [ ] **Step 1: Extend model tests with exact mapping and count cases**

Append tests covering normalization, `tn-xh`, counts, and ordering:

```ts
import {
  buildPracticeCatalog,
  getTopicsForSubject,
  isPracticeSubjectId,
  matchesPracticeSubject,
  normalizePracticeTopic,
} from '../src/features/student-dashboard/model/practiceCatalogModel';

it('normalizes accents, spaces, hyphens, and repeated underscores', () => {
  expect(normalizePracticeTopic('  #Tự-Nhiên  Xã_Hội  ')).toBe('#tu_nhien_xa_hoi');
});

it('maps tn-xh aliases to the canonical tu-nhien-xa-hoi id', () => {
  expect(matchesPracticeSubject('#tn_xh_lop_4', 'tu-nhien-xa-hoi')).toBe(true);
  expect(matchesPracticeSubject('#tn_xh_lop_4', 'tieng-anh')).toBe(false);
});

it('builds available and coming-soon groups from topic data', () => {
  const catalog = buildPracticeCatalog([
    { name: '#phep_nhan', count: 40 },
    { name: '#phan_so', count: 25 },
    { name: '#tieng_viet', count: 12 },
    { name: '#coding', count: 8 },
  ]);

  expect(catalog.availableSubjects.map(subject => subject.id)).toEqual([
    'toan',
    'tieng-viet',
    'tin-hoc',
  ]);
  expect(catalog.comingSoonSubjects.map(subject => subject.id)).toEqual([
    'tu-nhien-xa-hoi',
    'tieng-anh',
  ]);
  expect(catalog.subjects[0]).toMatchObject({
    id: 'toan',
    topicCount: 2,
    questionCount: 65,
    status: 'available',
  });
});

it('validates only canonical route ids', () => {
  expect(isPracticeSubjectId('tu-nhien-xa-hoi')).toBe(true);
  expect(isPracticeSubjectId('tn-xh')).toBe(false);
  expect(isPracticeSubjectId('unknown')).toBe(false);
});
```

Run:

```bash
npm run test:run -- tests/studentPracticeCatalogModel.test.ts
```

Expected: FAIL because `practiceCatalogModel.ts` does not exist.

Commit the completed test file:

```bash
git add tests/studentPracticeCatalogModel.test.ts
git commit -m "test: cover practice catalog grouping"
```

- [ ] **Step 2: Implement the pure catalog model**

Create `practiceCatalogModel.ts`:

```ts
import type {
  PracticeSubjectId,
  PracticeTopicSummary,
  SubjectCardViewModel,
} from '@/src/components/HomePage/student-dashboard/dashboard.types';
import { SUBJECT_CONFIG, SUBJECT_ORDER } from './dashboardConstants';

export interface PracticeCatalog {
  topicsBySubject: Record<PracticeSubjectId, PracticeTopicSummary[]>;
  subjects: SubjectCardViewModel[];
  availableSubjects: SubjectCardViewModel[];
  comingSoonSubjects: SubjectCardViewModel[];
}

const stripVietnameseMarks = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

export const normalizePracticeTopic = (value: string): string => {
  const normalized = stripVietnameseMarks(value.trim().toLowerCase())
    .replace(/[^a-z0-9#]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized.startsWith('#') ? normalized : `#${normalized}`;
};

export const isPracticeSubjectId = (value: string): value is PracticeSubjectId =>
  SUBJECT_ORDER.includes(value as PracticeSubjectId);

export const matchesPracticeSubject = (
  topicName: string,
  subjectId: PracticeSubjectId,
): boolean => {
  const normalizedTopic = normalizePracticeTopic(topicName);
  const subject = SUBJECT_CONFIG[subjectId];
  const routeAlias = `#${subjectId.replace(/-/g, '_')}`;
  return [routeAlias, ...subject.aliases]
    .map(normalizePracticeTopic)
    .some(alias => normalizedTopic.includes(alias));
};

export const getTopicsForSubject = (
  topics: PracticeTopicSummary[],
  subjectId: PracticeSubjectId,
): PracticeTopicSummary[] =>
  topics
    .filter(topic => matchesPracticeSubject(topic.name, subjectId))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'vi'));

export const buildPracticeCatalog = (topics: PracticeTopicSummary[]): PracticeCatalog => {
  const topicsBySubject = Object.fromEntries(
    SUBJECT_ORDER.map(subjectId => [subjectId, getTopicsForSubject(topics, subjectId)]),
  ) as Record<PracticeSubjectId, PracticeTopicSummary[]>;

  const subjects = SUBJECT_ORDER
    .map(subjectId => {
      const definition = SUBJECT_CONFIG[subjectId];
      const subjectTopics = topicsBySubject[subjectId];
      const questionCount = subjectTopics.reduce((sum, topic) => sum + topic.count, 0);
      return {
        id: definition.id,
        title: definition.title,
        description: definition.description,
        icon: definition.icon,
        topicCount: subjectTopics.length,
        questionCount,
        status: questionCount > 0 ? 'available' : 'coming-soon',
        accentClass: definition.accentClass,
        iconSurfaceClass: definition.iconSurfaceClass,
      } satisfies SubjectCardViewModel;
    })
    .filter(subject => SUBJECT_CONFIG[subject.id].showOnHome);

  return {
    topicsBySubject,
    subjects,
    availableSubjects: subjects.filter(subject => subject.status === 'available'),
    comingSoonSubjects: subjects.filter(subject => subject.status === 'coming-soon'),
  };
};
```

Run:

```bash
npm run test:run -- tests/studentPracticeCatalogModel.test.ts
```

Expected: PASS.

Commit the single model file:

```bash
git add src/features/student-dashboard/model/practiceCatalogModel.ts
git commit -m "feat: build canonical practice catalog"
```

- [ ] **Step 3: Redirect the legacy practice model to the canonical builder**

Replace `practiceModel.ts` exports so callers no longer count quiz categories:

```ts
export {
  buildPracticeCatalog,
  getTopicsForSubject,
  isPracticeSubjectId,
  matchesPracticeSubject,
  normalizePracticeTopic,
} from './practiceCatalogModel';
```

Run:

```bash
npm run test:run -- tests/studentPracticeCatalogModel.test.ts tests/studentDashboardComponents.test.tsx
```

Expected: catalog tests PASS; dashboard component tests may fail only because fixtures still use the retired card shape, which Task 6 will update.

Commit the single file:

```bash
git add src/features/student-dashboard/model/practiceModel.ts
git commit -m "refactor: retire quiz-category practice counts"
```

- [ ] **Step 4: Export the new model contract**

Update `src/features/student-dashboard/model/index.ts`:

```ts
export * from './assignmentModel';
export * from './attendanceQuestions';
export * from './attendanceRewards';
export * from './attendanceTypes';
export * from './dashboardConstants';
export * from './practiceCatalogModel';
export * from './rewardModel';
```

Run:

```bash
npm run test:run -- tests/studentPracticeCatalogModel.test.ts
```

Expected: PASS.

Commit the single export file:

```bash
git add src/features/student-dashboard/model/index.ts
git commit -m "refactor: export practice catalog model"
```

---

### Task 4: Preserve API errors and add shared topic loading state

**Files:**
- Modify: `src/services/practiceService.ts`
- Create: `src/features/student-dashboard/hooks/usePracticeTopics.ts`
- Test: `tests/practiceService.test.ts`
- Test: `tests/usePracticeTopics.test.tsx`

**Interfaces:**
- Consumes: `practiceService.getTopics(): Promise<PracticeTopicSummary[]>`.
- Produces: `usePracticeTopics(): PracticeTopicsState`.

- [ ] **Step 1: Lock service error behavior with a failing test**

Create `tests/practiceService.test.ts` and mock `callApi`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { practiceService } from '../src/services/practiceService';
import { callApi } from '../src/services/apiAdapter';

vi.mock('../src/services/apiAdapter', () => ({ callApi: vi.fn() }));

const callApiMock = vi.mocked(callApi);

describe('practiceService', () => {
  beforeEach(() => callApiMock.mockReset());

  it('returns topic data from the practice API', async () => {
    callApiMock.mockResolvedValue({ topics: [{ name: '#toan', count: 5 }] });
    await expect(practiceService.getTopics()).resolves.toEqual([
      { name: '#toan', count: 5 },
    ]);
  });

  it('rejects topic API failures instead of converting them to empty data', async () => {
    callApiMock.mockRejectedValue(new Error('network down'));
    await expect(practiceService.getTopics()).rejects.toThrow('network down');
  });
});
```

Run:

```bash
npm run test:run -- tests/practiceService.test.ts
```

Expected: second test FAIL because the current service returns `[]`.

Commit the single test file:

```bash
git add tests/practiceService.test.ts
git commit -m "test: distinguish practice API errors"
```

- [ ] **Step 2: Make the service preserve failures**

Change `getTopics` to:

```ts
getTopics: async (): Promise<{ name: string; count: number }[]> => {
  const response = await callApi<{ topics: { name: string; count: number }[] }>(
    'get_practice_topics',
  );
  return response.topics || [];
},
```

Keep `getPracticeQuiz` behavior unchanged in this task.

Run:

```bash
npm run test:run -- tests/practiceService.test.ts
```

Expected: PASS.

Commit the single service file:

```bash
git add src/services/practiceService.ts
git commit -m "fix: preserve practice topic load errors"
```

- [ ] **Step 3: Write failing hook tests for success, retry, and stale requests**

Create `tests/usePracticeTopics.test.tsx` with a small harness and mocked service. Required assertions:

```ts
expect(screen.getByLabelText('Đang tải thư viện luyện tập')).toHaveAttribute('aria-busy', 'true');
expect(await screen.findByText('#toan:5')).toBeVisible();
expect(await screen.findByText('Chưa tải được thư viện luyện tập.')).toBeVisible();
fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
expect(practiceService.getTopics).toHaveBeenCalledTimes(2);
```

Add a deferred-promise test proving an older request cannot overwrite a newer retry result.

Run:

```bash
npm run test:run -- tests/usePracticeTopics.test.tsx
```

Expected: FAIL because the hook does not exist.

Commit the single test file:

```bash
git add tests/usePracticeTopics.test.tsx
git commit -m "test: define shared practice topic loading"
```

- [ ] **Step 4: Implement `usePracticeTopics`**

Create `src/features/student-dashboard/hooks/usePracticeTopics.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { practiceService } from '@/src/services/practiceService';
import type { PracticeTopicSummary } from '@/src/components/HomePage/student-dashboard/dashboard.types';

export const usePracticeTopics = () => {
  const [topics, setTopics] = useState<PracticeTopicSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const retry = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const nextTopics = await practiceService.getTopics();
      if (requestId === requestIdRef.current) setTopics(nextTopics);
    } catch {
      if (requestId === requestIdRef.current) {
        setErrorMessage('Chưa tải được thư viện luyện tập.');
      }
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void retry();
    return () => {
      requestIdRef.current += 1;
    };
  }, [retry]);

  return { topics, isLoading, errorMessage, retry };
};

export type PracticeTopicsController = ReturnType<typeof usePracticeTopics>;
```

Run:

```bash
npm run test:run -- tests/usePracticeTopics.test.tsx tests/practiceService.test.ts
```

Expected: PASS.

Commit the single hook file:

```bash
git add src/features/student-dashboard/hooks/usePracticeTopics.ts
git commit -m "feat: add shared practice topic loader"
```

---

### Task 5: Move dashboard catalog state and selection to the router

**Files:**
- Modify: `src/features/student-dashboard/hooks/useStudentPracticeCatalog.ts`
- Modify: `src/app/AppRoutes.tsx`
- Modify: `src/components/HomePage/StudentDashboardUI.tsx`
- Test: `tests/studentPracticeRouting.test.tsx`

**Interfaces:**
- Consumes: `usePracticeTopics()`, `buildPracticeCatalog()`, `/student/practice/:subjectId`.
- Produces: `availableSubjects`, `comingSoonSubjects`, `isLoading`, `errorMessage`, `retry`, `selectSubject(id)`, and `closeSubject()`.

- [ ] **Step 1: Write routing tests before modifying route code**

Create `tests/studentPracticeRouting.test.tsx` using `MemoryRouter`, mocked student session, and mocked topic service. Cover:

```ts
it('navigates an available subject to its stable route', async () => {
  // Render dashboard at `/`, click the Toán học button.
  // Assert a route probe displays `/student/practice/toan`.
});

it('renders a direct canonical subject route after a refresh-equivalent mount', async () => {
  // Initial entry is `/student/practice/tieng-viet`.
  // Assert the subject heading is `Tiếng Việt`.
});

it('returns invalid and non-canonical ids to the dashboard', async () => {
  // Initial entry `/student/practice/tn-xh`.
  // Assert child-friendly invalid subject state and a dashboard back action.
});

it('uses browser-style back navigation without local selectedSubject state', async () => {
  // Navigate from dashboard to Toán, click `Trở về thư viện`.
  // Assert dashboard practice heading is visible again.
});
```

Run:

```bash
npm run test:run -- tests/studentPracticeRouting.test.tsx
```

Expected: FAIL because the route and navigation behavior do not exist.

Commit the single test file:

```bash
git add tests/studentPracticeRouting.test.tsx
git commit -m "test: define student practice routing"
```

- [ ] **Step 2: Replace local subject state in the catalog hook**

Update `useStudentPracticeCatalog.ts`:

```ts
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PracticeSubjectId } from '@/src/components/HomePage/student-dashboard/dashboard.types';
import { buildPracticeCatalog } from '../model';
import { usePracticeTopics } from './usePracticeTopics';

export const useStudentPracticeCatalog = () => {
  const navigate = useNavigate();
  const topicState = usePracticeTopics();
  const catalog = useMemo(
    () => buildPracticeCatalog(topicState.topics),
    [topicState.topics],
  );

  return {
    ...catalog,
    isLoading: topicState.isLoading,
    errorMessage: topicState.errorMessage,
    retry: topicState.retry,
    selectSubject: (subjectId: PracticeSubjectId) => {
      const subject = catalog.availableSubjects.find(item => item.id === subjectId);
      if (subject) navigate(`/student/practice/${subject.id}`);
    },
    closeSubject: () => navigate('/'),
  };
};
```

Remove `useQuizStore`, `selectedSubject`, and `useState` from this hook.

Run:

```bash
npm run test:run -- tests/studentPracticeRouting.test.tsx tests/studentPracticeCatalogModel.test.ts
```

Expected: route test still fails only because route rendering is not wired; model tests PASS.

Commit the single hook file:

```bash
git add src/features/student-dashboard/hooks/useStudentPracticeCatalog.ts
git commit -m "refactor: route practice subject selection"
```

- [ ] **Step 3: Add the stable practice route through the existing root flow**

In `AppRoutes.tsx`, render the same `RootView` for the root and practice paths:

```tsx
<Route path="/" element={<RootView giftShopEnabled={giftShopEnabled} />} />
<Route
  path="/student/practice/:subjectId"
  element={<RootView giftShopEnabled={giftShopEnabled} />}
/>
```

Do not create a parallel quiz-player shell; routing through `RootView` is required so `quizStore.setView('student')` continues to take precedence after starting practice.

Run:

```bash
npm run test:run -- tests/studentPracticeRouting.test.tsx
```

Expected: direct route reaches the student dashboard shell but subject rendering still fails until Step 4.

Commit the single route file:

```bash
git add src/app/AppRoutes.tsx
git commit -m "feat: add student practice subject route"
```

- [ ] **Step 4: Resolve the route param in `StudentDashboardUI`**

Update `StudentDashboardUI.tsx`:

```tsx
import { useParams } from 'react-router-dom';
import { isPracticeSubjectId } from '../../features/student-dashboard/model';

const StudentDashboardUI = () => {
  const { subjectId } = useParams<{ subjectId?: string }>();
  const controller = useStudentDashboardController();
  // existing controller destructuring remains

  if (liveExam.shouldRenderScreen) return <StudentLiveExamScreen controller={liveExam} />;
  if (!studentSession) return null;
  if (subjectId) {
    return (
      <SubjectLibrary
        subjectId={subjectId}
        isValidSubject={isPracticeSubjectId(subjectId)}
        onBack={practice.closeSubject}
      />
    );
  }

  // existing dashboard content and modals
};
```

`SubjectLibrary` temporarily accepts `subjectId: string` and `isValidSubject: boolean`; Task 8 completes its invalid state.

Run:

```bash
npm run test:run -- tests/studentPracticeRouting.test.tsx
```

Expected: navigation and direct canonical route tests PASS; invalid-state visual details may remain pending until Task 8 but must not return a blank page.

Commit the single dashboard shell file:

```bash
git add src/components/HomePage/StudentDashboardUI.tsx
git commit -m "feat: render practice subjects from route params"
```

---

### Task 6: Redesign the dashboard practice section

**Files:**
- Modify: `src/components/HomePage/student-dashboard/dashboard.types.ts`
- Modify: `src/components/HomePage/student-dashboard/SubjectPracticeGrid.tsx`
- Modify: `src/features/student-dashboard/components/StudentDashboardBody.tsx`
- Modify: `tests/studentDashboardComponents.test.tsx`

**Interfaces:**
- Consumes: grouped subject arrays and section loading/error/retry state from Task 5.
- Produces: accessible 1/2/3-column available grid and compact coming-soon group.

- [ ] **Step 1: Update dashboard component tests to the approved view model**

Replace practice fixtures with:

```ts
const practiceSubjects = [
  {
    id: 'toan',
    title: 'Toán học',
    description: 'Rèn luyện tư duy và tính toán',
    icon: 'calculator',
    topicCount: 8,
    questionCount: 126,
    status: 'available',
    accentClass: 'text-blue-700',
    iconSurfaceClass: 'bg-blue-100',
  },
  {
    id: 'tieng-viet',
    title: 'Tiếng Việt',
    description: 'Vun đắp ngôn ngữ tiếng mẹ đẻ',
    icon: 'book-open',
    topicCount: 4,
    questionCount: 62,
    status: 'available',
    accentClass: 'text-amber-700',
    iconSurfaceClass: 'bg-amber-100',
  },
] as const;

const comingSoonSubjects = [
  {
    id: 'tieng-anh',
    title: 'Tiếng Anh',
    description: 'Mở rộng giao tiếp quốc tế',
    icon: 'languages',
    topicCount: 0,
    questionCount: 0,
    status: 'coming-soon',
    accentClass: 'text-indigo-700',
    iconSurfaceClass: 'bg-indigo-100',
  },
] as const;
```

Add exact assertions:

```ts
expect(grid.className).toContain('grid-cols-1');
expect(grid.className).toContain('sm:grid-cols-2');
expect(grid.className).toContain('lg:grid-cols-3');
expect(grid.className).not.toContain('2xl:grid-cols-4');
expect(screen.getByText('8 chuyên đề · 126 câu hỏi')).toBeVisible();
expect(screen.getByText('Đang chuẩn bị')).toBeVisible();
expect(screen.queryByRole('button', { name: /Tiếng Anh/i })).not.toBeInTheDocument();
expect(screen.queryByText('calculate')).not.toBeInTheDocument();
```

Add loading, local error/retry, and empty-data assertions.

Run:

```bash
npm run test:run -- tests/studentDashboardComponents.test.tsx
```

Expected: FAIL against the old props and four-column grid.

Commit the single test file:

```bash
git add tests/studentDashboardComponents.test.tsx
git commit -m "test: define redesigned practice library cards"
```

- [ ] **Step 2: Expand `SubjectPracticeGridProps`**

Update only the props portion of `dashboard.types.ts`; `PracticeSubjectDefinition` and `PracticeTopicSummary` were already introduced in Task 2:

```ts
export interface SubjectPracticeGridProps {
  availableSubjects: SubjectCardViewModel[];
  comingSoonSubjects: SubjectCardViewModel[];
  isLoading: boolean;
  errorMessage?: string | null;
  onRetry: () => void;
  onSelectSubject: (subjectId: PracticeSubjectId) => void;
}
```

Run:

```bash
npm run test:run -- tests/studentPracticeCatalogModel.test.ts tests/studentDashboardComponents.test.tsx
```

Expected: model tests PASS; component tests fail only on implementation/usage.

Commit the single type file:

```bash
git add src/components/HomePage/student-dashboard/dashboard.types.ts
git commit -m "refactor: expose practice section states"
```

- [ ] **Step 3: Implement the new `SubjectPracticeGrid`**

Use a local Lucide map and a local skeleton that has the same 1/2/3-column geometry as the real cards:

```tsx
const SUBJECT_ICONS = {
  calculator: Calculator,
  'book-open': BookOpen,
  earth: Earth,
  languages: Languages,
  monitor: Monitor,
} satisfies Record<PracticeSubjectIcon, LucideIcon>;

const PracticeCardSkeletons = () => (
  <div
    aria-label="Đang tải thư viện luyện tập"
    aria-busy="true"
    className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
  >
    {Array.from({ length: 3 }, (_, index) => (
      <div
        key={index}
        data-testid="practice-card-skeleton"
        className="min-h-40 animate-pulse rounded-3xl border border-slate-200 bg-white p-5 motion-reduce:animate-none"
      >
        <div className="h-12 w-12 rounded-2xl bg-slate-200" />
        <div className="mt-4 h-5 w-28 rounded bg-slate-200" />
        <div className="mt-3 h-4 w-full rounded bg-slate-100" />
        <div className="mt-2 h-4 w-3/4 rounded bg-slate-100" />
      </div>
    ))}
  </div>
);
```

Render the complete section as follows:

```tsx
<section id="practice-library" aria-labelledby="practice-library-title" className="scroll-mt-24">
  <div className="mb-5 flex items-center gap-3">
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
      <Rocket className="h-5 w-5" aria-hidden="true" />
    </div>
    <div>
      <h2 id="practice-library-title" className="text-2xl font-black text-slate-900">
        Thư viện luyện tập
      </h2>
      <p className="mt-1 text-sm font-medium text-slate-600">
        Chọn một môn đang có để luyện theo chuyên đề phù hợp.
      </p>
    </div>
  </div>

  {isLoading ? <PracticeCardSkeletons /> : null}

  {!isLoading && errorMessage ? (
    <DashboardSectionError message={errorMessage} onRetry={onRetry} />
  ) : null}

  {!isLoading && !errorMessage ? (
    <div className="space-y-6">
      {availableSubjects.length > 0 ? (
        <div>
          <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">
            Môn đang có
          </h3>
          <div
            data-testid="subject-practice-grid"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {availableSubjects.map(subject => {
              const Icon = SUBJECT_ICONS[subject.icon];
              return (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => onSelectSubject(subject.id)}
                  className="group flex min-h-40 w-full flex-col rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
                >
                  <span className="flex w-full items-start justify-between gap-3">
                    <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${subject.iconSurfaceClass} ${subject.accentClass}`}>
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                      {subject.topicCount} chuyên đề
                    </span>
                  </span>
                  <span className="mt-4 text-lg font-black text-slate-900">{subject.title}</span>
                  <span className="mt-1 flex-1 text-sm font-medium leading-6 text-slate-600">
                    {subject.description}
                  </span>
                  <span className="mt-4 flex w-full items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm">
                    <span className="font-semibold text-slate-600">
                      {subject.topicCount} chuyên đề · {subject.questionCount} câu hỏi
                    </span>
                    <span className="inline-flex min-h-11 items-center gap-1 font-black text-teal-700">
                      Luyện ngay <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : comingSoonSubjects.length === 0 ? (
        <DashboardEmptyState
          title="Hiện chưa có môn luyện tập nào dành cho em."
          description="Các môn có chuyên đề luyện tập sẽ xuất hiện tại đây."
        />
      ) : null}

      {comingSoonSubjects.length > 0 ? (
        <div aria-labelledby="coming-soon-subjects-title">
          <h3 id="coming-soon-subjects-title" className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">
            Sắp có
          </h3>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {comingSoonSubjects.map(subject => {
              const Icon = SUBJECT_ICONS[subject.icon];
              return (
                <li key={subject.id} className="flex min-h-16 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${subject.iconSurfaceClass} ${subject.accentClass}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 font-bold text-slate-800">{subject.title}</span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600">
                    Đang chuẩn bị
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  ) : null}
</section>
```

Coming-soon subjects are list items rather than disabled buttons, so they cannot be mistaken for available actions.

Run:

```bash
npm run test:run -- tests/studentDashboardComponents.test.tsx
```

Expected: component tests fail only until Task 6 Step 4 passes the new props.

Commit the single component file:

```bash
git add src/components/HomePage/student-dashboard/SubjectPracticeGrid.tsx
git commit -m "feat: redesign student practice subject cards"
```

- [ ] **Step 4: Pass catalog state from `StudentDashboardBody`**

Replace the current call with:

```tsx
<SubjectPracticeGrid
  availableSubjects={practice.availableSubjects}
  comingSoonSubjects={practice.comingSoonSubjects}
  isLoading={practice.isLoading}
  errorMessage={practice.errorMessage}
  onRetry={() => void practice.retry()}
  onSelectSubject={practice.selectSubject}
/>
```

Run:

```bash
npm run test:run -- tests/studentDashboardComponents.test.tsx tests/studentPracticeRouting.test.tsx
```

Expected: PASS.

Commit the single body file:

```bash
git add src/features/student-dashboard/components/StudentDashboardBody.tsx
git commit -m "refactor: connect practice catalog section state"
```

---

### Task 7: Make topic cards native, local-loading, and reduced-motion safe

**Files:**
- Modify: `src/components/student/PracticeLibrary/TopicCard.tsx`
- Test: `tests/studentPracticeLibrary.test.tsx`

**Interfaces:**
- Consumes: `topic`, `count`, `isStarting`, and `onClick(topic)`.
- Produces: a native `motion.button` with `disabled`, `aria-busy`, and explicit `Luyện 10 câu` copy.

- [ ] **Step 1: Create topic-card behavior tests**

Create `tests/studentPracticeLibrary.test.tsx` with a focused `TopicCard` suite:

```ts
it('renders a native topic button with precise available-question copy', () => {
  render(<TopicCard topic="#phep_nhan" count={32} isStarting={false} onClick={vi.fn()} />);
  const button = screen.getByRole('button', { name: /Phép nhân.*32 câu có sẵn.*Luyện 10 câu/i });
  expect(button).toHaveAttribute('type', 'button');
  expect(button).not.toBeDisabled();
});

it('disables only the topic being prepared', () => {
  render(<TopicCard topic="#phep_nhan" count={32} isStarting onClick={vi.fn()} />);
  expect(screen.getByRole('button', { name: /Đang chuẩn bị/i })).toBeDisabled();
  expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
});

it('starts practice from keyboard-native button activation', () => {
  const onClick = vi.fn();
  render(<TopicCard topic="#phep_nhan" count={32} isStarting={false} onClick={onClick} />);
  fireEvent.click(screen.getByRole('button'));
  expect(onClick).toHaveBeenCalledWith('#phep_nhan');
});
```

Run:

```bash
npm run test:run -- tests/studentPracticeLibrary.test.tsx
```

Expected: FAIL because the current component is a clickable `motion.div` and lacks `isStarting`.

Commit the single test file:

```bash
git add tests/studentPracticeLibrary.test.tsx
git commit -m "test: define accessible practice topic cards"
```

- [ ] **Step 2: Convert `TopicCard` to a native button**

Update the props:

```ts
interface TopicCardProps {
  topic: string;
  count: number;
  isStarting: boolean;
  onClick: (topic: string) => void;
}
```

Render `motion.button` with:

```tsx
<motion.button
  type="button"
  whileHover={isStarting ? undefined : { y: -2 }}
  whileTap={isStarting ? undefined : { scale: 0.99 }}
  transition={{ duration: 0.2 }}
  onClick={() => onClick(topic)}
  disabled={isStarting}
  aria-busy={isStarting}
  className="group flex min-h-44 w-full flex-col rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:border-slate-200 disabled:bg-slate-50 motion-reduce:transform-none motion-reduce:transition-none"
>
  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Chuyên đề</span>
  <span className="mt-3 text-xl font-black text-slate-900">{formattedTopic}</span>
  <span className="mt-2 text-sm font-semibold text-slate-600">{count} câu có sẵn</span>
  <span className="mt-auto inline-flex min-h-11 items-center gap-2 pt-5 text-sm font-black text-teal-700">
    {isStarting ? 'Đang chuẩn bị...' : 'Luyện 10 câu'}
    {!isStarting ? <Play className="h-4 w-4" aria-hidden="true" /> : null}
  </span>
</motion.button>
```

Remove deterministic HSL colors, decorative circles, click handlers on generic elements, and per-item stagger delay.

Run:

```bash
npm run test:run -- tests/studentPracticeLibrary.test.tsx
```

Expected: topic-card tests PASS.

Commit the single component file:

```bash
git add src/components/student/PracticeLibrary/TopicCard.tsx
git commit -m "fix: make practice topics accessible buttons"
```

---

### Task 8: Split and redesign the subject detail page

**Files:**
- Create: `src/components/student/PracticeLibrary/PracticeSubjectHeader.tsx`
- Create: `src/components/student/PracticeLibrary/PracticeLibraryStates.tsx`
- Create: `src/components/student/PracticeLibrary/PracticeTopicGrid.tsx`
- Modify: `src/components/student/PracticeLibrary/SubjectLibrary.tsx`
- Test: `tests/studentPracticeLibrary.test.tsx`

**Interfaces:**
- Consumes: canonical subject config, `usePracticeTopics`, `getTopicsForSubject`, `TopicCard`, and existing quiz store methods.
- Produces: complete subject page with invalid, loading, error, data-empty, search-empty, and local-start states.

- [ ] **Step 1: Extend subject-page tests**

Add suites with mocked `practiceService` and MemoryRouter:

```ts
it('renders a calm canonical subject header without Material Symbols text', async () => {
  renderSubjectLibrary('toan');
  expect(await screen.findByRole('heading', { level: 1, name: 'Toán học' })).toBeVisible();
  expect(screen.queryByText('calculate')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Trở về thư viện' })).toHaveClass('min-h-11');
});

it('shows topic and question totals from the same filtered topic data', async () => {
  renderSubjectLibrary('toan', [
    { name: '#phep_nhan', count: 30 },
    { name: '#phan_so', count: 20 },
  ]);
  expect(await screen.findByText('2 chuyên đề · 50 câu hỏi')).toBeVisible();
});

it('distinguishes API error, subject empty, and search empty states', async () => {
  // API rejection => `Chưa tải được thư viện luyện tập.` + `Thử lại`.
  // Empty resolved topics => `Môn này đang được chuẩn bị.`
  // Existing topics + unmatched query => `Không tìm thấy chuyên đề phù hợp.`
});

it('keeps the grid visible and marks only the selected topic as starting', async () => {
  // Click Phép nhân; assert it is disabled/aria-busy.
  // Assert another topic remains visible and enabled.
});

it('selects the virtual quiz and preserves the existing student view flow', async () => {
  // Mock getPracticeQuiz result.
  // Assert quizStore.selectQuiz(result) and setView('student').
});

it('renders an invalid subject state instead of a blank page', () => {
  renderSubjectLibrary('tn-xh', [], false);
  expect(screen.getByRole('heading', { name: 'Không tìm thấy môn học' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Trở về thư viện' })).toBeVisible();
});
```

Run:

```bash
npm run test:run -- tests/studentPracticeLibrary.test.tsx
```

Expected: FAIL against the current monolithic subject page.

Commit the completed test file:

```bash
git add tests/studentPracticeLibrary.test.tsx
git commit -m "test: define redesigned practice subject page"
```

- [ ] **Step 2: Create the subject header component**

`PracticeSubjectHeader.tsx` accepts:

```ts
interface PracticeSubjectHeaderProps {
  subject: PracticeSubjectDefinition;
  topicCount: number;
  questionCount: number;
  onBack: () => void;
}
```

It renders a white sticky header/breadcrumb with a Lucide icon selected from the same icon map, `h1`, and `N chuyên đề · N câu hỏi`. It must not use gradient classes or Material Symbol spans.

Run:

```bash
npm run test:run -- tests/studentPracticeLibrary.test.tsx -t "canonical subject header"
```

Expected: targeted header test PASS once wired with a temporary direct render or after Step 5; component compilation succeeds now.

Commit the single new file:

```bash
git add src/components/student/PracticeLibrary/PracticeSubjectHeader.tsx
git commit -m "feat: add practice subject header"
```

- [ ] **Step 3: Create explicit subject-page states**

`PracticeLibraryStates.tsx` exports:

```ts
export const PracticeTopicSkeletons = ({ count = 6 }: { count?: number }) => JSX.Element;
export const PracticeSubjectEmptyState = () => JSX.Element;
export const PracticeSearchEmptyState = ({ query }: { query: string }) => JSX.Element;
export const PracticeLibraryError = ({ onRetry }: { onRetry: () => void }) => JSX.Element;
export const InvalidPracticeSubject = ({ onBack }: { onBack: () => void }) => JSX.Element;
```

Required copy:

```text
Loading aria-label: Đang tải chuyên đề luyện tập
API error: Chưa tải được thư viện luyện tập.
Empty subject: Môn này đang được chuẩn bị.
Search empty: Không tìm thấy chuyên đề phù hợp.
Invalid route: Không tìm thấy môn học
```

Run:

```bash
npm run test:run -- tests/studentPracticeLibrary.test.tsx -t "distinguishes|invalid"
```

Expected: state tests compile and pass once wired in Step 5.

Commit the single states file:

```bash
git add src/components/student/PracticeLibrary/PracticeLibraryStates.tsx
git commit -m "feat: add practice library data states"
```

- [ ] **Step 4: Create the topic grid component**

`PracticeTopicGrid.tsx` accepts:

```ts
interface PracticeTopicGridProps {
  topics: PracticeTopicSummary[];
  searchQuery: string;
  startingTopic: string | null;
  onStartTopic: (topic: string) => void;
}
```

Filter normalized display names inside this component. Render:

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {filteredTopics.map(topic => (
    <TopicCard
      key={topic.name}
      topic={topic.name}
      count={topic.count}
      isStarting={startingTopic === topic.name}
      onClick={onStartTopic}
    />
  ))}
</div>
```

At zero filtered results with non-empty source topics, render `PracticeSearchEmptyState`.

Run:

```bash
npm run test:run -- tests/studentPracticeLibrary.test.tsx -t "search|selected topic"
```

Expected: targeted tests pass once Step 5 wires the component.

Commit the single grid file:

```bash
git add src/components/student/PracticeLibrary/PracticeTopicGrid.tsx
git commit -m "feat: add responsive practice topic grid"
```

- [ ] **Step 5: Rewrite `SubjectLibrary` as the page orchestrator**

Required state:

```ts
const topicState = usePracticeTopics();
const [searchQuery, setSearchQuery] = useState('');
const [startingTopic, setStartingTopic] = useState<string | null>(null);
const subject = isValidSubject ? SUBJECT_CONFIG[subjectId as PracticeSubjectId] : null;
const topics = subject ? getTopicsForSubject(topicState.topics, subject.id) : [];
const questionCount = topics.reduce((sum, topic) => sum + topic.count, 0);
```

Required start flow:

```ts
const handleStartPractice = async (topic: string) => {
  if (startingTopic) return;
  setStartingTopic(topic);
  try {
    const virtualQuiz = await practiceService.getPracticeQuiz(topic, 10);
    if (!virtualQuiz) {
      toast.error('Không thể tải bài luyện tập. Vui lòng thử lại.');
      return;
    }
    quizStore.selectQuiz(virtualQuiz);
    quizStore.setView('student');
  } finally {
    setStartingTopic(null);
  }
};
```

Page order:

```text
PracticeSubjectHeader
Intro copy + labeled search input
Local skeleton OR local error OR subject empty OR PracticeTopicGrid
```

Search input requirements:

```tsx
<label htmlFor="practice-topic-search" className="sr-only">Tìm chuyên đề</label>
<input
  id="practice-topic-search"
  type="search"
  value={searchQuery}
  onChange={event => setSearchQuery(event.target.value)}
  placeholder="Tìm chuyên đề, ví dụ: phép nhân"
  className="min-h-11 w-full rounded-2xl border border-slate-300 bg-white pl-11 pr-4 text-base text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
/>
```

Remove the old local topic-fetch effect, subject mapping object, gradient header, Material Symbol span, global spinner/pulse, four-column grid, and whole-page `isLoading` reuse during topic start.

Run:

```bash
npm run test:run -- tests/studentPracticeLibrary.test.tsx tests/studentPracticeRouting.test.tsx
```

Expected: PASS.

Commit the single orchestrator file:

```bash
git add src/components/student/PracticeLibrary/SubjectLibrary.tsx
git commit -m "feat: redesign practice subject library"
```

---

### Task 9: Add responsive and end-to-end regression coverage

**Files:**
- Modify: `cypress/e2e/student-dashboard-responsive.cy.ts`
- Create: `cypress/e2e/student-practice-library.cy.ts`

**Interfaces:**
- Consumes: authenticated student test credentials and production-like API data.
- Produces: browser evidence for dashboard cards, stable routes, Back behavior, topic search/start, responsive layout, and absence of ligature text.

- [ ] **Step 1: Extend dashboard responsive assertions**

For each existing viewport, assert:

```js
cy.get('#practice-library').should('be.visible');
cy.get('#practice-library').should('not.contain.text', 'calculate');
cy.get('#practice-library').should('not.contain.text', 'menu_book');
cy.get('#practice-library').should('not.contain.text', 'public');
cy.get('#practice-library').should('not.contain.text', 'language');
cy.get('#practice-library').should('not.contain.text', 'computer');
cy.get('[data-testid="subject-practice-grid"]').then($grid => {
  const columns = getComputedStyle($grid[0]).gridTemplateColumns.split(' ').length;
  expect(columns).to.be.at.most(3);
});
cy.contains('Đang chuẩn bị').parents('button').should('not.exist');
```

Run with credentials:

```bash
npm run cypress:run -- \
  --spec cypress/e2e/student-dashboard-responsive.cy.ts \
  --env studentUsername="$CYPRESS_STUDENT_USERNAME",studentPassword="$CYPRESS_STUDENT_PASSWORD"
```

Expected: all existing viewport cases plus new practice assertions PASS. Without credentials, record the credential gate exactly and do not claim browser verification.

Commit the single Cypress file:

```bash
git add cypress/e2e/student-dashboard-responsive.cy.ts
git commit -m "test: cover practice cards responsively"
```

- [ ] **Step 2: Add practice subject route flow coverage**

Create `student-practice-library.cy.ts` with these cases:

1. Login as test student and scroll to `#practice-library`.
2. Click the first available subject and assert URL matches `/student/practice/<canonical-id>`.
3. Reload and assert the same subject `h1` remains.
4. Use browser Back or `Trở về thư viện` and assert the dashboard practice section returns.
5. Visit `/student/practice/toan` directly after login and assert no blank page.
6. Search a known topic and assert unmatched cards disappear.
7. Search a nonsense phrase and assert `Không tìm thấy chuyên đề phù hợp.`.
8. Clear search and start a topic; assert only its button becomes `aria-busy=true` before the quiz player appears.
9. Run at 375, 768, 1024, and 1440 widths and assert no horizontal overflow.
10. Capture console errors and fail on uncaught application errors.

Run:

```bash
npm run cypress:run -- \
  --spec cypress/e2e/student-practice-library.cy.ts \
  --env studentUsername="$CYPRESS_STUDENT_USERNAME",studentPassword="$CYPRESS_STUDENT_PASSWORD"
```

Expected: all route and interaction cases PASS with real authenticated data.

Commit the single new Cypress file:

```bash
git add cypress/e2e/student-practice-library.cy.ts
git commit -m "test: add practice library end-to-end flow"
```

---

### Task 10: Run impact review, full verification, and prepare merge evidence

**Files:**
- No new product scope.
- Update this plan checklist only when execution evidence exists.

**Interfaces:**
- Consumes: completed Tasks 1–9.
- Produces: reviewable branch with green automated gates and documented blockers only where credentials/tools are genuinely unavailable.

- [ ] **Step 1: Run focused tests**

```bash
npm run test:run -- \
  tests/studentPracticeCatalogModel.test.ts \
  tests/practiceService.test.ts \
  tests/usePracticeTopics.test.tsx \
  tests/studentDashboardComponents.test.tsx \
  tests/studentPracticeRouting.test.tsx \
  tests/studentPracticeLibrary.test.tsx
```

Expected: all focused tests PASS.

- [ ] **Step 2: Run the full Vitest suite**

```bash
npm run test:run
```

Expected: all test files and tests PASS; record exact totals.

- [ ] **Step 3: Build the frontend bundle**

```bash
npx vite build
```

Expected: production frontend bundle succeeds. Record existing bundle warnings separately; do not expand this task into unrelated bundle refactoring.

- [ ] **Step 4: Run the root build when deployment environment variables are available**

```bash
npm run build
```

Expected: succeeds when one of `SITEMAP_API_URL`, `WORKERS_API_URL`, or `VITE_WORKERS_API_URL` is configured. If the known sitemap variable gate blocks the command, report it verbatim and retain the successful `npx vite build` evidence.

- [ ] **Step 5: Run authenticated Cypress**

```bash
npm run cypress:run -- \
  --spec cypress/e2e/student-dashboard-responsive.cy.ts,cypress/e2e/student-practice-library.cy.ts \
  --env studentUsername="$CYPRESS_STUDENT_USERNAME",studentPassword="$CYPRESS_STUDENT_PASSWORD"
```

Expected: all four viewport and interaction cases PASS. If credentials are unavailable, the final report must state that browser verification remains blocked; unit tests do not substitute for it.

- [ ] **Step 6: Review the change surface**

Run:

```bash
git status --short
git diff --check
git diff origin/main...HEAD --stat
git diff origin/main...HEAD -- \
  src/features/student-dashboard \
  src/components/HomePage/student-dashboard \
  src/components/student/PracticeLibrary \
  src/services/practiceService.ts \
  src/app/AppRoutes.tsx \
  tests \
  cypress/e2e
```

Review for:

```text
no Material Symbols strings in the practice flow
no available action for zero-data subjects
no duplicate tn-xh config key
no quizStore category counting for dashboard practice cards
no generic clickable div topic cards
no full-card gradients or four-column practice grid
no swallowed topic API error
no unrelated product changes
```

Expected: clean diff with only planned files.

- [ ] **Step 7: Run code review and GitNexus impact analysis before merge**

Use the connected code-review and GitNexus tools on `origin/main...HEAD`. Expected impact:

```text
frontend-only practice catalog, routing, and presentation changes
no API route, Worker, schema, D1, auth, scoring, reward, or assignment behavior change
```

Resolve every P1/P2 finding before merge; record accepted P3 findings with rationale.

- [ ] **Step 8: Confirm commit discipline**

```bash
git log --oneline origin/main..HEAD
git status --short
```

Expected:

```text
each completed file has its own scoped commit
working tree is clean
no secret, credential, generated artifact, screenshot dump, or unrelated file is committed
```

---

## Acceptance Matrix

| Requirement | Implemented by | Verified by |
|---|---|---|
| No `calculate/menu_book/public/language/computer` ligature text | Tasks 2, 6, 8 | Component tests + Cypress |
| Canonical `tu-nhien-xa-hoi` id | Tasks 2–3 | Catalog model tests |
| Single topic API source for dashboard and detail | Tasks 3–5, 8 | Model/service/hook tests |
| Precise topic/question counts | Tasks 3, 6, 8 | Model + component tests |
| Zero-data subject is not actionable | Tasks 5–6 | Component + Cypress tests |
| `Môn đang có` and `Sắp có` separation | Task 6 | Dashboard component tests |
| Desktop maximum three cards per row | Task 6 | Component class assertion + Cypress computed style |
| Stable route and refresh behavior | Task 5 | Routing tests + Cypress |
| Browser Back/return behavior | Task 5 | Routing tests + Cypress |
| Native accessible topic buttons | Task 7 | Topic component tests |
| Local start loading only | Tasks 7–8 | Subject library tests + Cypress |
| API error differs from empty/search-empty | Tasks 4, 8 | Hook + subject library tests |
| No gradient/spinner/pulse old subject page | Task 8 | Component/Cypress visual assertions |
| Reduced-motion-safe feedback | Tasks 6–8 | Class/behavior tests + browser emulation |
| No API/schema/dependency/business rule change | All tasks | Diff review + GitNexus |
| Responsive at four approved viewports | Tasks 6, 9 | Cypress |
| Full suite/build green | Task 10 | Vitest + Vite build logs |

---

## Rollback Boundaries

Each implementation file is committed separately, so rollback can stop at these boundaries:

1. **Catalog model rollback:** revert Tasks 2–4; dashboard returns to quiz-category counts and old icons.
2. **Router rollback:** revert Task 5; restore local subject state only if product explicitly rejects stable URLs.
3. **Dashboard visual rollback:** revert Task 6 without reverting the canonical catalog model.
4. **Subject page rollback:** revert Tasks 7–8 while retaining dashboard improvements.
5. **Test-only rollback is not allowed when it would remove coverage for retained product behavior.**

No deployment should proceed with a partially reverted type/model contract. After any rollback, rerun the focused tests and `npx vite build`.

---

## Execution Recommendation

Use **subagent-driven development** in the isolated worktree, one task at a time, with two review gates after each task:

1. Spec/acceptance review.
2. Code quality and regression review.

Because the user requires file-by-file commits, each file is completed and committed before moving to the next file. Do not squash these commits during implementation; preserve them until final merge review so individual UI, data, routing, and test changes remain easy to inspect and revert.
