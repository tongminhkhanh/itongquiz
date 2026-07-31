# Quiz Player Calm Focus Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the standard Quiz and Live Exam player with the approved Calm Focus minimalist interface while preserving the current ten-questions-per-page flow and all answer/submission behavior.

**Architecture:** Keep `StudentView` and `LiveExamQuiz` as orchestration containers and concentrate the visual contract in the existing shared quiz-player components. Add one shared selectable-answer atom so every answer type gets the same neutral, emerald-selected, keyboard-visible, reduced-motion-safe behavior. No store, hook, API, answer shape, pagination rule, or submission contract changes.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, `lucide-react`, Vitest, React Testing Library, Playwright, GitNexus.

## Global Constraints

- Preserve `QUESTIONS_PER_PAGE = 10`, answer payloads, autosave, timeout, submit confirmation, and live-exam synchronization.
- Never reveal whether an answer is correct while the student is taking the quiz. “Sai” is a response label, not a red/error state.
- Use borderless or transparent-border surfaces, soft shadows, spacing, and background contrast instead of hard dividing lines.
- Use a pale sky-to-teal prompt focal surface and an elevated timer capsule. Under 60 seconds, the timer changes to coral without flashing or pulsing.
- Every interactive control remains at least 44 px, has a visible `focus-visible` ring, and supports `motion-reduce`.
- Desktop keeps the sticky navigation sidebar. Mobile uses a horizontally scrollable row of question chips above the question list.
- Run GitNexus `impact` before editing each existing component symbol. Stop and warn the user before edits if any result is HIGH or CRITICAL.
- Run GitNexus `detect_changes({ scope: "compare", base_ref: "main" })` before the implementation commit.

---

## Task 1: Establish the shared answer-surface contract

**Files:**

- Create: `src/features/quiz-player/components/QuestionRenderer/atoms/SelectableChoice.tsx`
- Create: `tests/quizSelectableChoice.test.tsx`
- Modify: `src/features/quiz-player/components/QuestionRenderer/renderers/MCQRenderer.tsx`
- Modify: `src/features/quiz-player/components/QuestionRenderer/renderers/MultipleSelectRenderer.tsx`
- Modify: `src/features/quiz-player/components/QuestionRenderer/renderers/TrueFalseRenderer.tsx`
- Modify: `src/features/quiz-player/components/QuestionRenderer/renderers/ImageQuestionRenderer.tsx`
- Modify: `src/features/quiz-player/components/QuestionRenderer/renderers/UnderlineRenderer.tsx`
- Modify: `tests/quizAnswerStateColors.test.tsx`

- [ ] **Step 1: Run exact GitNexus impact checks**

Run upstream impact for `MCQRenderer`, `MultipleSelectRenderer`, `TrueFalseRenderer`, `ImageQuestionRenderer`, and `UnderlineRenderer`, each disambiguated by file path or UID. Record direct callers, affected processes, and risk in the implementation notes.

- [ ] **Step 2: Write the failing shared-atom test**

Create `tests/quizSelectableChoice.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SelectableChoice from '../src/features/quiz-player/components/QuestionRenderer/atoms/SelectableChoice';

describe('SelectableChoice', () => {
  it('exposes a calm selected state and calls the supplied handler', () => {
    const onClick = vi.fn();
    render(
      <SelectableChoice selected onClick={onClick}>
        Đáp án B
      </SelectableChoice>,
    );

    const choice = screen.getByRole('button', { name: 'Đáp án B' });
    expect(choice).toHaveAttribute('aria-pressed', 'true');
    expect(choice).toHaveClass('bg-emerald-50', 'text-emerald-950', 'shadow-sm');
    expect(choice).toHaveClass('active:scale-[0.985]', 'motion-reduce:transform-none');

    fireEvent.click(choice);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('keeps an unselected choice neutral and keyboard visible', () => {
    render(<SelectableChoice selected={false}>Đáp án A</SelectableChoice>);

    expect(screen.getByRole('button', { name: 'Đáp án A' })).toHaveClass(
      'border-transparent',
      'bg-white',
      'focus-visible:ring-2',
      'focus-visible:ring-sky-500',
    );
  });
});
```

- [ ] **Step 3: Confirm the new test fails**

Run:

```powershell
npm run test:run -- tests/quizSelectableChoice.test.tsx
```

Expected: FAIL because `SelectableChoice.tsx` does not exist.

- [ ] **Step 4: Implement the shared answer atom**

Create `src/features/quiz-player/components/QuestionRenderer/atoms/SelectableChoice.tsx`:

```tsx
import React from 'react';

interface SelectableChoiceProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> {
  selected: boolean;
}

const SelectableChoice: React.FC<SelectableChoiceProps> = ({
  selected,
  className = '',
  children,
  type = 'button',
  ...props
}) => (
  <button
    {...props}
    type={type}
    aria-pressed={selected}
    className={[
      'group min-h-11 border border-transparent bg-white text-slate-700 shadow-sm',
      'transition-[transform,background-color,color,box-shadow] duration-150',
      'hover:bg-sky-50/70 hover:shadow-md active:scale-[0.985]',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2',
      'motion-reduce:transform-none motion-reduce:transition-none',
      selected ? 'bg-emerald-50 text-emerald-950 shadow-sm ring-1 ring-inset ring-emerald-300' : '',
      className,
    ].join(' ')}
  >
    {children}
  </button>
);

export default SelectableChoice;
```

- [ ] **Step 5: Refactor all selectable renderers onto the atom**

Replace their answer `<button>` roots with `SelectableChoice`, pass `selected={isSelected}`, retain every existing `onClick`, `disabled`, accessible name, content layout, and answer transformation. Use `rounded-2xl` for full-width text/image options and `rounded-xl` for compact underline/true-false controls.

For `TrueFalseRenderer`, both “Đúng” and “Sai” use the emerald selected state. Remove the red selected classes from “Sai” so selection does not imply correctness.

For visible indicators, use `Check` from `lucide-react` when selected and keep the option letter/label when unselected:

```tsx
import { Check } from 'lucide-react';

<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600 group-aria-pressed:bg-emerald-500 group-aria-pressed:text-white">
  {isSelected ? <Check className="h-4 w-4" aria-hidden="true" /> : optionLabel}
</span>
```

- [ ] **Step 6: Update the existing renderer regression assertions**

In `tests/quizAnswerStateColors.test.tsx`:

- Assert selected choices have `bg-emerald-50`, `ring-emerald-300`, and `aria-pressed="true"`.
- Assert unselected choices have `border-transparent` and `bg-white`.
- Change the true/false test to assert both selected values use emerald, and neither selection uses `bg-red-50`.
- Assert all five selectable answer types include `active:scale-[0.985]` and `motion-reduce:transform-none`.

- [ ] **Step 7: Run focused tests**

Run:

```powershell
npm run test:run -- tests/quizSelectableChoice.test.tsx tests/quizAnswerStateColors.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit the answer-surface task**

```powershell
git add src/features/quiz-player/components/QuestionRenderer/atoms/SelectableChoice.tsx src/features/quiz-player/components/QuestionRenderer/renderers/MCQRenderer.tsx src/features/quiz-player/components/QuestionRenderer/renderers/MultipleSelectRenderer.tsx src/features/quiz-player/components/QuestionRenderer/renderers/TrueFalseRenderer.tsx src/features/quiz-player/components/QuestionRenderer/renderers/ImageQuestionRenderer.tsx src/features/quiz-player/components/QuestionRenderer/renderers/UnderlineRenderer.tsx tests/quizSelectableChoice.test.tsx tests/quizAnswerStateColors.test.tsx
git commit -m "feat(quiz): unify calm answer interactions"
```

---

## Task 2: Create the header, timer, navigation, and pagination focal hierarchy

**Files:**

- Modify: `src/features/quiz-player/components/QuizHeader.tsx`
- Modify: `src/features/quiz-player/components/QuizNavigation.tsx`
- Modify: `src/features/quiz-player/components/QuizPagination.tsx`
- Create: `tests/quizPlayerChrome.test.tsx`
- Modify: `tests/quizPageNavigation.test.tsx`
- Modify: `tests/quizAnswerStateColors.test.tsx`

- [ ] **Step 1: Run exact GitNexus impact checks**

Run upstream impact for `QuizHeader`, `QuizNavigation`, and `QuizPagination`, disambiguated by UID. Do not edit until all results are reviewed.

- [ ] **Step 2: Write failing chrome tests**

Create `tests/quizPlayerChrome.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import QuizHeader from '../src/features/quiz-player/components/QuizHeader';
import QuizPagination from '../src/features/quiz-player/components/QuizPagination';

describe('quiz player chrome', () => {
  it('renders an elevated timer focal point without an alert animation', () => {
    render(
      <QuizHeader
        title="Bài kiểm tra Toán"
        timeLeft={59}
        totalQuestions={20}
        answeredCount={5}
        isPractice={false}
        studentName="An"
      />,
    );

    const timer = screen.getByLabelText('Thời gian còn lại 0:59');
    expect(timer).toHaveClass('bg-rose-50', 'text-rose-600', 'shadow-sm');
    expect(timer).not.toHaveClass('animate-pulse');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '5');
  });

  it('uses lucide-labelled actions for paging and submission', () => {
    const { rerender } = render(
      <QuizPagination
        currentPage={1}
        totalPages={2}
        onPageChange={vi.fn()}
        onSubmit={vi.fn()}
        isSubmitting={false}
      />,
    );

    expect(screen.getAllByRole('button', { name: 'Câu tiếp theo' })).toHaveLength(2);

    rerender(
      <QuizPagination
        currentPage={2}
        totalPages={2}
        onPageChange={vi.fn()}
        onSubmit={vi.fn()}
        isSubmitting={false}
      />,
    );

    expect(screen.getByRole('button', { name: 'Nộp bài' }).querySelector('svg')).toBeTruthy();
  });
});
```

- [ ] **Step 3: Confirm the new tests fail**

Run:

```powershell
npm run test:run -- tests/quizPlayerChrome.test.tsx
```

Expected: FAIL on the new timer capsule and icon assertions.

- [ ] **Step 4: Redesign `QuizHeader`**

- Import `Timer` and `CircleCheckBig` from `lucide-react`.
- Replace the hard bottom border with `bg-white/90 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur`.
- Keep the title/student/answered count semantics.
- Put the timer in a `rounded-2xl` capsule with `shadow-sm`; use sky at normal time and rose/coral under 60 seconds.
- Keep `aria-label`, monospace digits, and progressbar semantics.
- Give the progress track a pale sky background and a sky-to-teal fill:

```tsx
<div
  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-teal-400 transition-[width] duration-300 motion-reduce:transition-none"
  style={{ width: `${progressPercentage}%` }}
/>
```

- [ ] **Step 5: Add responsive modes to `QuizNavigation`**

Extend the private prop interface:

```tsx
interface QuizNavigationProps {
  questions: Question[];
  isQuestionAnswered: (question: Question) => boolean;
  activeQuestionId: string | null;
  QUESTIONS_PER_PAGE: number;
  onPageChange: QuizPageChangeHandler;
  variant?: 'sidebar' | 'mobile';
}
```

Behavior is identical in both variants. The default remains `sidebar`. Apply:

- `sidebar`: sticky borderless white surface, soft shadow, five-column grid, legend visible.
- `mobile`: horizontal `overflow-x-auto` row, `snap-x`, compact 44 px chips, legend hidden, no sticky card.
- Answered chip: emerald fill; active chip: sky ring; unanswered chip: slate-100 background. Preserve `aria-current="step"` and question-number labels.
- Import `ListChecks` for the sidebar heading.

- [ ] **Step 6: Redesign `QuizPagination`**

- Import `ChevronLeft`, `ChevronRight`, and `Send`.
- Remove the hard top divider.
- Use borderless neutral secondary controls and a sky primary action with soft shadow.
- Keep all current labels, disabled rules, callbacks, status announcement, and minimum target sizes.
- Icons are decorative (`aria-hidden="true"`), so accessible names remain unchanged.

- [ ] **Step 7: Update navigation tests**

In `tests/quizPageNavigation.test.tsx`, keep all existing behavior assertions and add:

```tsx
it('renders the mobile navigation as a horizontal chip list', () => {
  render(
    <QuizNavigation
      questions={questions}
      isQuestionAnswered={() => false}
      activeQuestionId="q-1"
      QUESTIONS_PER_PAGE={QUESTIONS_PER_PAGE}
      onPageChange={vi.fn()}
      variant="mobile"
    />,
  );

  expect(screen.getByRole('navigation', { name: 'Điều hướng câu hỏi' })).toHaveClass(
    'overflow-x-auto',
  );
  expect(screen.getByRole('button', { name: 'Đi đến câu 1' })).toHaveAttribute(
    'aria-current',
    'step',
  );
});
```

Wrap each navigation variant in `<nav aria-label="Điều hướng câu hỏi">`.

- [ ] **Step 8: Run focused tests**

Run:

```powershell
npm run test:run -- tests/quizPlayerChrome.test.tsx tests/quizPageNavigation.test.tsx tests/quizAnswerStateColors.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit the shared chrome task**

```powershell
git add src/features/quiz-player/components/QuizHeader.tsx src/features/quiz-player/components/QuizNavigation.tsx src/features/quiz-player/components/QuizPagination.tsx tests/quizPlayerChrome.test.tsx tests/quizPageNavigation.test.tsx tests/quizAnswerStateColors.test.tsx
git commit -m "feat(quiz): refine calm player navigation"
```

---

## Task 3: Make the question prompt the main visual focal point

**Files:**

- Modify: `src/features/quiz-player/components/QuestionRenderer/index.tsx`
- Create: `tests/questionRendererCalmFocus.test.tsx`

- [ ] **Step 1: Run exact GitNexus impact**

Run upstream impact for `QuestionRenderer` by UID and review direct callers/processes before editing.

- [ ] **Step 2: Write the failing renderer-shell test**

Create `tests/questionRendererCalmFocus.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Question } from '../src/types';
import QuestionRenderer from '../src/features/quiz-player/components/QuestionRenderer';

vi.mock('../src/features/quiz-player/components/QuestionRenderer/atoms/MathSpan', () => ({
  default: ({ content }: { content: string }) => <span>{content}</span>,
}));

const question = {
  id: 'q-1',
  type: 'MULTIPLE_CHOICE',
  text: 'Hai cộng hai bằng bao nhiêu?',
  options: ['A. 3', 'B. 4'],
} as unknown as Question;

describe('QuestionRenderer Calm Focus shell', () => {
  it('places the prompt on the focal gradient and removes hard card borders', () => {
    render(
      <QuestionRenderer
        question={question}
        index={0}
        answers={{}}
        onAnswerChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId('question-card')).toHaveClass('border-transparent', 'shadow-sm');
    expect(screen.getByTestId('question-prompt')).toHaveClass(
      'bg-gradient-to-br',
      'from-sky-50',
      'to-teal-50',
    );
    expect(screen.getByText('Câu 1')).toBeVisible();
  });
});
```

- [ ] **Step 3: Confirm the test fails**

Run:

```powershell
npm run test:run -- tests/questionRendererCalmFocus.test.tsx
```

Expected: FAIL because the test IDs and Calm Focus classes are absent.

- [ ] **Step 4: Refine the shared question shell**

In `QuestionRenderer`:

- Keep the type-to-renderer mapping unchanged.
- Replace the bordered card with `rounded-3xl border border-transparent bg-white shadow-sm`.
- Put question number/type metadata and prompt content into a generous `rounded-2xl bg-gradient-to-br from-sky-50 via-white to-teal-50` focal surface.
- Remove the hard prompt/body divider.
- Keep the renderer body below with spacing (`p-5 sm:p-7`) and no additional frame.
- Add `data-testid="question-card"` and `data-testid="question-prompt"` only to stabilize the visual contract test.

- [ ] **Step 5: Run question and answer tests**

Run:

```powershell
npm run test:run -- tests/questionRendererCalmFocus.test.tsx tests/quizAnswerStateColors.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit the question focal task**

```powershell
git add src/features/quiz-player/components/QuestionRenderer/index.tsx tests/questionRendererCalmFocus.test.tsx
git commit -m "feat(quiz): emphasize question focal surface"
```

---

## Task 4: Integrate the responsive Calm Focus layout in both quiz flows

**Files:**

- Create: `src/features/quiz-player/components/QuizPlayerLayout.tsx`
- Modify: `src/components/StudentView.tsx`
- Modify: `src/components/LiveExam/LiveExamQuiz.tsx`
- Modify: `tests/LiveExamQuiz.pagination.test.tsx`
- Create: `tests/quizPlayerResponsiveLayout.test.tsx`

- [ ] **Step 1: Run exact GitNexus impact checks**

Run upstream impact for `StudentView` and `LiveExamQuiz` using their Function UIDs. Current indexed baseline is LOW; `LiveExamQuiz` has one direct caller. Re-check because prior tasks may have changed the graph.

- [ ] **Step 2: Write the failing responsive integration test**

Create `tests/quizPlayerResponsiveLayout.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import QuizPlayerLayout from '../src/features/quiz-player/components/QuizPlayerLayout';

describe('QuizPlayerLayout', () => {
  it('provides mobile and desktop navigation regions around the question stream', () => {
    render(
      <QuizPlayerLayout
        mobileNavigation={<nav aria-label="Điều hướng câu hỏi">Mobile</nav>}
        sidebarNavigation={<nav aria-label="Điều hướng câu hỏi">Desktop</nav>}
      >
        <section>Câu hỏi đang làm</section>
      </QuizPlayerLayout>,
    );

    expect(screen.getAllByRole('navigation', { name: 'Điều hướng câu hỏi' })).toHaveLength(2);
    expect(screen.getByTestId('quiz-mobile-navigation')).toHaveClass('lg:hidden');
    expect(screen.getByTestId('quiz-sidebar-navigation')).toHaveClass('hidden', 'lg:block');
    expect(screen.getByTestId('quiz-player-main')).toHaveClass('bg-slate-50');
    expect(screen.getByText('Câu hỏi đang làm')).toBeVisible();
  });
});
```

In `tests/LiveExamQuiz.pagination.test.tsx`, add an assertion that its rendered quiz contains `quiz-player-main`. This proves the live flow is wired to the shared layout without duplicating all responsive-class assertions.

- [ ] **Step 3: Confirm the integration tests fail**

Run:

```powershell
npm run test:run -- tests/quizPlayerResponsiveLayout.test.tsx tests/LiveExamQuiz.pagination.test.tsx
```

Expected: FAIL because `QuizPlayerLayout.tsx` and the Calm Focus shell are absent.

- [ ] **Step 4: Implement the shared responsive layout**

Create `src/features/quiz-player/components/QuizPlayerLayout.tsx`:

```tsx
import React from 'react';

interface QuizPlayerLayoutProps {
  mobileNavigation: React.ReactNode;
  sidebarNavigation: React.ReactNode;
  children: React.ReactNode;
}

const QuizPlayerLayout: React.FC<QuizPlayerLayoutProps> = ({
  mobileNavigation,
  sidebarNavigation,
  children,
}) => (
  <main data-testid="quiz-player-main" className="min-h-screen bg-slate-50">
    <div className="mx-auto max-w-[1180px] px-4 py-5 sm:px-5 sm:py-7 lg:px-8">
      <div data-testid="quiz-mobile-navigation" className="mb-5 lg:hidden">
        {mobileNavigation}
      </div>
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <section className="min-w-0 space-y-5">{children}</section>
        <aside data-testid="quiz-sidebar-navigation" className="hidden lg:block">
          {sidebarNavigation}
        </aside>
      </div>
    </div>
  </main>
);

export default QuizPlayerLayout;
```

- [ ] **Step 5: Update `StudentView` layout only**

Within the active quiz render branch:

- Use a neutral `bg-slate-50` page canvas.
- Keep `QuizHeader` at the top.
- Wrap the question stream and `QuizPagination` in `QuizPlayerLayout`.
- Pass `QuizNavigation variant="mobile"` as `mobileNavigation`.
- Pass `QuizNavigation variant="sidebar"` as `sidebarNavigation`.

Do not touch authentication, question derivation, answer state, timer effects, page hook usage, or submission code.

- [ ] **Step 6: Mirror the layout in `LiveExamQuiz`**

Apply the same canvas, widths, mobile navigation, sidebar navigation, and spacing. Preserve live session status, disconnect/reconnect behavior, teacher controls, forced submission, and existing pagination.

- [ ] **Step 7: Run both integration suites**

Run:

```powershell
npm run test:run -- tests/quizPlayerResponsiveLayout.test.tsx tests/LiveExamQuiz.pagination.test.tsx tests/quizPageNavigation.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit the responsive integration**

```powershell
git add src/features/quiz-player/components/QuizPlayerLayout.tsx src/components/StudentView.tsx src/components/LiveExam/LiveExamQuiz.tsx tests/quizPlayerResponsiveLayout.test.tsx tests/LiveExamQuiz.pagination.test.tsx
git commit -m "feat(quiz): integrate responsive calm layout"
```

---

## Task 5: Regression, visual, accessibility, and production verification

**Files:**

- Modify only if verification finds a scoped defect in the files above.

- [ ] **Step 1: Run the focused quiz-player suite**

```powershell
npm run test:run -- tests/quizSelectableChoice.test.tsx tests/quizAnswerStateColors.test.tsx tests/quizPlayerChrome.test.tsx tests/questionRendererCalmFocus.test.tsx tests/quizPageNavigation.test.tsx tests/quizPlayerResponsiveLayout.test.tsx tests/LiveExamQuiz.pagination.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 2: Run type checking and production build**

```powershell
npm run typecheck
npm run build
```

Expected: both commands exit 0.

- [ ] **Step 3: Run browser verification**

Start the app with the project’s normal development command and verify both the standard quiz and live exam at desktop (1440×900) and mobile (390×844):

- Header remains stable while scrolling.
- Prompt gradient and timer are the strongest visual focal points.
- Ten questions remain on each page.
- Mobile question chips scroll horizontally and navigate to the exact question.
- Desktop sidebar remains sticky and navigates to the exact question.
- Every selectable renderer saves the same answer value as before.
- Clicking an answer gives the subtle press scale and no layout jump.
- Keyboard focus is visible on answers, chips, pagination, and submit.
- Reduced-motion mode removes transform/transition motion.
- Timer under 60 seconds is coral and never flashes.
- “Sai” selection is emerald, not an error/correctness reveal.
- Submit and timeout behavior still work in both flows.
- Console contains no new errors or warnings.

- [ ] **Step 4: Run full regression tests**

```powershell
npm run test:run
```

Expected: full suite PASS. If an unrelated pre-existing failure exists, record the exact failing test and prove the focused suites, typecheck, and build still pass.

- [ ] **Step 5: Review the final diff and GitNexus scope**

```powershell
git diff --check
git status --short
```

Then run:

```text
detect_changes({ scope: "compare", base_ref: "main", repo: "C:\\itongquiz1\\itongquiz1" })
```

Expected scope: shared quiz-player chrome/question renderers plus `StudentView`, `LiveExamQuiz`, and their tests. No Worker, API, store, hook, or answer-contract flow should be reported.

- [ ] **Step 6: Create the final implementation commit if verification required follow-up edits**

```powershell
git add -u
git commit -m "test(quiz): verify calm focus redesign"
```

- [ ] **Step 7: Push and deploy only after user-approved execution completes**

Push `main` to `origin/main`, deploy production to the Vercel project `itongquiz1`, confirm deployment state `READY`, then repeat the browser smoke test on the production URL. Do not deploy to any other Vercel project.
