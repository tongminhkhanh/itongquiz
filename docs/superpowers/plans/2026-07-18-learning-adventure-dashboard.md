# Learning Adventure Student Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the logged-in student dashboard into the approved Learning Adventure experience while preserving every current API, store, business rule, and secondary flow.

**Architecture:** Keep `StudentDashboardUI.tsx` as the orchestration container for stores, fetch effects, derived data, handlers, routing branches, and modal state. Extract only typed presentation components into `src/components/HomePage/student-dashboard/`, then compose them in a mobile-first page shell where assigned work precedes gamification. Use Vitest + Testing Library for behavior and semantics, Cypress/manual browser checks for responsive layout, and incremental commits after each vertical slice.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4 utilities, Framer Motion 12, Lucide React, Zustand, Vitest 4, Testing Library, Cypress 15.

## Global Constraints

- Do not change any API endpoint, payload, response shape, database schema, Worker route, reward rule, assignment rule, attendance rule, or live-exam flow.
- Keep data fetching and business handlers in `StudentDashboardUI.tsx` during Phase 1.
- Assigned work must appear before all gamification content on mobile.
- When no ready assigned work exists, the hero CTA only scrolls to the practice library; it must not select a subject automatically.
- Main desktop grid must use `minmax(0, 2fr) minmax(300px, 1fr)` and content width must not exceed 1280px.
- Loading must use section-shaped skeletons, not isolated spinners for dashboard content.
- Errors remain local to the affected section and expose a `Thử lại` action when a retry function exists.
- Interactive cards use native `button` or `a`; never use clickable `div` for new or migrated dashboard actions.
- Tap targets are at least 44 × 44px; focus rings are clearly visible.
- Use exactly one `h1`; sections use `h2`; card titles use `h3`.
- Do not use continuous pulse animations for attendance or live exam actions.
- Motion duration stays in the 180–240ms range and respects `prefers-reduced-motion: reduce`.
- Do not animate progress width. Use `scaleX` or no transition.
- Disabled buttons remain legible and do not rely only on opacity.
- No new dependency without explicit approval.
- Run GitNexus impact before editing an existing symbol and `detect_changes()` before every implementation commit.
- Follow TDD: write a failing test, confirm the expected failure, implement the smallest change, then rerun.

---

## File Structure

```text
src/components/HomePage/
  StudentDashboardUI.tsx                  # container/orchestration only
  student-dashboard/
    dashboard.types.ts                    # presentation-only prop contracts
    dashboard.utils.ts                    # pure UI derivation helpers
    DashboardStates.tsx                   # skeleton, empty and section error primitives
    StudentDashboardHeader.tsx            # responsive navigation and account menu
    StudentDashboardHero.tsx              # greeting, primary CTA and attendance action
    AssignedWorkSection.tsx               # assignment list, pagination and states
    LearningProgressPanel.tsx              # daily missions summary/detail
    WeeklyQuestsPanel.tsx                  # weekly quest list and claim states
    RewardSidebar.tsx                     # chest, weekly rhythm, achievements
    SubjectPracticeGrid.tsx                # semantic subject action cards
    index.ts                               # local barrel export

tests/
  StudentDashboardUI.test.tsx             # integration order and preserved flows
  studentDashboardComponents.test.tsx     # component behavior and semantics
  studentDashboardUtils.test.ts            # pure helper tests

cypress/e2e/
  student-dashboard-responsive.cy.ts      # authenticated responsive and overflow checks
```

`StudentHomeworkSection`, `StudentHomeworkCard`, `NotificationBell`, `BadgeGallery`, `AvatarSelectorModal`, and live exam components remain in their current folders. Modify them only where a Phase 1 acceptance criterion cannot be satisfied from the new dashboard components.

---

### Task 1: Lock Presentation Contracts and Pure UI Derivations

**Files:**
- Create: `src/components/HomePage/student-dashboard/dashboard.types.ts`
- Create: `src/components/HomePage/student-dashboard/dashboard.utils.ts`
- Create: `tests/studentDashboardUtils.test.ts`

**Interfaces:**
- Consumes: `Quiz`, `Assignment`, `GameLoopMission`, `GameLoopDashboard`, and current subject category data.
- Produces:

```ts
export type AssignedQuiz = Quiz & { _assignmentData?: Assignment };
export type AssignmentVisualState = 'ready' | 'completed' | 'closed';

export interface SubjectCardViewModel {
  id: string;
  title: string;
  description: string;
  icon: string;
  total: number;
  accentClass: string;
  surfaceClass: string;
}

export function getAssignmentVisualState(quiz: AssignedQuiz): AssignmentVisualState;
export function getAssignmentActionLabel(state: AssignmentVisualState): string;
export function getMissionProgressPercent(mission: GameLoopMission): number;
export function getWeeklyProgressPercent(completedDays: number, targetDays: number): number;
```

- [ ] **Step 1: Write failing helper tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  getAssignmentActionLabel,
  getAssignmentVisualState,
  getMissionProgressPercent,
  getWeeklyProgressPercent,
} from '../src/components/HomePage/student-dashboard/dashboard.utils';

const quiz = (attemptCount: number, maxAttempts: number, status: 'OPEN' | 'CLOSED') => ({
  id: 'quiz-1',
  title: 'Bài Toán',
  questions: [],
  timeLimit: 20,
  _assignmentData: {
    id: 'assignment-1',
    quizId: 'quiz-1',
    classId: 'class-1',
    deadline: '2099-01-01T00:00:00.000Z',
    maxAttempts,
    attemptCount,
    status,
    createdAt: '2026-07-18T00:00:00.000Z',
  },
} as any);

describe('student dashboard UI helpers', () => {
  it('maps assignment states without changing assignment rules', () => {
    expect(getAssignmentVisualState(quiz(0, 1, 'OPEN'))).toBe('ready');
    expect(getAssignmentVisualState(quiz(1, 1, 'OPEN'))).toBe('completed');
    expect(getAssignmentVisualState(quiz(0, 1, 'CLOSED'))).toBe('closed');
  });

  it('returns student-facing CTA labels', () => {
    expect(getAssignmentActionLabel('ready')).toBe('Làm bài ngay');
    expect(getAssignmentActionLabel('completed')).toBe('Xem kết quả');
    expect(getAssignmentActionLabel('closed')).toBe('Đã đóng');
  });

  it('clamps progress values', () => {
    expect(getMissionProgressPercent({ target: 10, progress: 12 } as any)).toBe(100);
    expect(getWeeklyProgressPercent(2, 5)).toBe(40);
    expect(getWeeklyProgressPercent(1, 0)).toBe(0);
  });
});
```

- [ ] **Step 2: Verify RED**

Run: `npm run test:run -- tests/studentDashboardUtils.test.ts`

Expected: FAIL because `student-dashboard/dashboard.utils` does not exist.

- [ ] **Step 3: Implement exact pure helpers**

Use existing completion and closure behavior. `completed` takes precedence over `closed`, matching the current assignment card rendering. Clamp percentages to `[0, 100]` and return `0` for invalid targets.

- [ ] **Step 4: Verify GREEN**

Run: `npm run test:run -- tests/studentDashboardUtils.test.ts`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/HomePage/student-dashboard/dashboard.types.ts \
  src/components/HomePage/student-dashboard/dashboard.utils.ts \
  tests/studentDashboardUtils.test.ts
git commit -m "test(ui): define student dashboard presentation contracts"
```

---

### Task 2: Add Shared Loading, Empty, and Section Error Primitives

**Files:**
- Create: `src/components/HomePage/student-dashboard/DashboardStates.tsx`
- Create: `tests/studentDashboardComponents.test.tsx`
- Create: `src/components/HomePage/student-dashboard/index.ts`

**Interfaces:**
- Produces:

```ts
export function HeroSkeleton(): JSX.Element;
export function AssignedWorkSkeleton({ count = 3 }: { count?: number }): JSX.Element;
export function ProgressSkeleton(): JSX.Element;
export function DashboardEmptyState(props: {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}): JSX.Element;
export function DashboardSectionError(props: {
  message: string;
  onRetry?: () => void;
}): JSX.Element;
```

- [ ] **Step 1: Write failing state-component tests**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  AssignedWorkSkeleton,
  DashboardEmptyState,
  DashboardSectionError,
} from '../src/components/HomePage/student-dashboard';

describe('dashboard state primitives', () => {
  it('renders three assignment-shaped skeleton cards by default', () => {
    render(<AssignedWorkSkeleton />);
    expect(screen.getAllByTestId('assigned-work-skeleton')).toHaveLength(3);
    expect(screen.getByLabelText('Đang tải bài cần làm')).toHaveAttribute('aria-busy', 'true');
  });

  it('renders a compact empty state', () => {
    render(<DashboardEmptyState title="Em đã hoàn thành tất cả nhiệm vụ hiện tại." description="Em có thể luyện thêm một môn học." />);
    expect(screen.getByRole('status')).toHaveTextContent('Em đã hoàn thành tất cả nhiệm vụ hiện tại.');
  });

  it('calls retry from a local section error', () => {
    const retry = vi.fn();
    render(<DashboardSectionError message="Chưa tải được dữ liệu." onRetry={retry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Verify RED**

Run: `npm run test:run -- tests/studentDashboardComponents.test.tsx`

Expected: FAIL because the exported components do not exist.

- [ ] **Step 3: Implement primitives**

Use neutral slate surfaces, small illustrations/icons, `role="status"`, `aria-busy`, and no full-page spinner. Skeletons may use `animate-pulse` because loading is temporary, but must be disabled by the reduced-motion rules added in Task 8.

- [ ] **Step 4: Verify GREEN**

Run: `npm run test:run -- tests/studentDashboardComponents.test.tsx`

Expected: all state primitive tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/HomePage/student-dashboard/DashboardStates.tsx \
  src/components/HomePage/student-dashboard/index.ts \
  tests/studentDashboardComponents.test.tsx
git commit -m "feat(ui): add dashboard data state primitives"
```

---

### Task 3: Build Accessible Header and Account Menu

**Files:**
- Create: `src/components/HomePage/student-dashboard/StudentDashboardHeader.tsx`
- Modify: `src/components/HomePage/student-dashboard/dashboard.types.ts`
- Modify: `tests/studentDashboardComponents.test.tsx`
- Modify: `src/components/HomePage/StudentDashboardUI.tsx`

**Interfaces:**

```ts
export interface StudentDashboardHeaderProps {
  studentName: string;
  className?: string;
  avatarUrl: string;
  level: number;
  coins: number;
  activeSection: 'dashboard' | 'achievements';
  giftShopEnabled: boolean;
  studentId: string;
  onSelectSection: (section: 'dashboard' | 'achievements') => void;
  onOpenGiftShop: () => void;
  onOpenLiveExam: () => void;
  onOpenAvatar: () => void;
  onOpenChangePassword: () => void;
  onLogout: () => void;
}
```

- [ ] **Step 1: Run GitNexus impact**

Run impact for `StudentDashboardUI` upstream and report the result before editing. Expected risk should be low because the component is rendered from `HomePage`; do not proceed on HIGH/CRITICAL without reporting.

- [ ] **Step 2: Add failing header tests**

Test these behaviors:

```tsx
it('opens and closes the account menu by click and Escape', () => {
  renderHeader();
  const trigger = screen.getByRole('button', { name: /Mở menu tài khoản/i });
  fireEvent.click(trigger);
  expect(screen.getByRole('menu', { name: 'Tài khoản học sinh' })).toBeVisible();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('menu', { name: 'Tài khoản học sinh' })).not.toBeInTheDocument();
});

it('exposes all header actions as native buttons with 44px targets', () => {
  renderHeader();
  expect(screen.getByRole('button', { name: /Thi trực tiếp/i }).className).toContain('min-h-11');
  expect(screen.getByRole('button', { name: /Mở menu tài khoản/i })).toHaveAttribute('aria-expanded', 'false');
});
```

- [ ] **Step 3: Verify RED**

Run: `npm run test:run -- tests/studentDashboardComponents.test.tsx`

Expected: FAIL because `StudentDashboardHeader` is not exported.

- [ ] **Step 4: Implement header and replace inline navbar**

Use local `isAccountMenuOpen` state in the header. The avatar trigger is a button. Clicking the avatar opens the menu; “Đổi avatar” calls `onOpenAvatar`. `Escape` closes the menu. Remove `group-hover` dropdown behavior and remove `animate-pulse` from live exam. Keep notification and all current actions.

- [ ] **Step 5: Verify GREEN and integration**

Run:

```bash
npm run test:run -- tests/studentDashboardComponents.test.tsx
npm run test:run
```

Expected: component tests and full suite pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/HomePage/student-dashboard/StudentDashboardHeader.tsx \
  src/components/HomePage/student-dashboard/dashboard.types.ts \
  src/components/HomePage/StudentDashboardUI.tsx \
  tests/studentDashboardComponents.test.tsx
git commit -m "feat(ui): add accessible student dashboard header"
```

---

### Task 4: Build Light Hero and Prioritized Assigned Work Slice

**Files:**
- Create: `src/components/HomePage/student-dashboard/StudentDashboardHero.tsx`
- Create: `src/components/HomePage/student-dashboard/AssignedWorkSection.tsx`
- Modify: `src/components/HomePage/student-dashboard/dashboard.types.ts`
- Modify: `src/components/HomePage/StudentDashboardUI.tsx`
- Modify: `tests/studentDashboardComponents.test.tsx`

**Interfaces:**

```ts
export interface StudentDashboardHeroProps {
  firstName: string;
  hasReadyAssignment: boolean;
  attendanceClaimed: boolean;
  attendanceLabel: string;
  attendanceAvailable: boolean;
  onPrimaryAction: () => void;
  onAttendance: () => void;
}

export interface AssignedWorkSectionProps {
  quizzes: AssignedQuiz[];
  isLoading: boolean;
  errorMessage?: string | null;
  page: number;
  totalPages: number;
  onRetry: () => void;
  onPageChange: (page: number) => void;
  onStartQuiz: (quiz: AssignedQuiz) => void;
}
```

- [ ] **Step 1: Add failing tests**

Test that:

- hero has the page’s only intended `h1`;
- hero primary CTA is `Làm bài được giao` when ready work exists and `Luyện tập ngay` otherwise;
- when no ready work exists, the hero CTA scrolls to the practice library without invoking subject selection;
- attendance is a secondary native button with no `animate-pulse`;
- assignment loading renders three skeleton cards;
- the exact empty copy is `Em đã hoàn thành tất cả nhiệm vụ hiện tại.`;
- completed cards say `Xem kết quả`, closed cards say `Đã đóng`, ready cards say `Làm bài ngay`;
- ready card action calls `onStartQuiz`, while closed does not.

- [ ] **Step 2: Verify RED**

Run: `npm run test:run -- tests/studentDashboardComponents.test.tsx`

Expected: FAIL because hero and assignment components are missing.

- [ ] **Step 3: Implement presentation components**

Use a light blue/slate hero surface without dark gradient. Add a stable `id="assigned-work"` to the assigned-work section and a stable `id="practice-library"` to the subject practice section. The hero primary action scrolls to assigned work when a ready assignment exists; otherwise it scrolls to `practice-library` and does not invoke subject selection. Preserve existing pagination and assignment ordering from the container.

- [ ] **Step 4: Add retry state in container without changing store contracts**

Extract the existing assignment fetch body into a local `fetchAssignments` callback in `StudentDashboardUI.tsx`, store a friendly local assignment error string, call it from `useEffect`, and pass it to `AssignedWorkSection`. Do not modify `useAssignmentStore` or API methods.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
npm run test:run -- tests/studentDashboardComponents.test.tsx
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/HomePage/student-dashboard/StudentDashboardHero.tsx \
  src/components/HomePage/student-dashboard/AssignedWorkSection.tsx \
  src/components/HomePage/student-dashboard/dashboard.types.ts \
  src/components/HomePage/StudentDashboardUI.tsx \
  tests/studentDashboardComponents.test.tsx
git commit -m "feat(ui): prioritize assigned work on student dashboard"
```

### Checkpoint A: Learning Priority

- [ ] `npm run test:run` passes.
- [ ] Header, hero, and assigned work render with all existing actions.
- [ ] Assigned work is immediately after hero in DOM order.
- [ ] No API/store contract changed.
- [ ] Review the first viewport screenshots at 375px and 1440px before continuing.

---

### Task 5: Extract Daily Progress and Weekly Quest Panels

**Files:**
- Create: `src/components/HomePage/student-dashboard/LearningProgressPanel.tsx`
- Create: `src/components/HomePage/student-dashboard/WeeklyQuestsPanel.tsx`
- Modify: `src/components/HomePage/student-dashboard/dashboard.types.ts`
- Modify: `src/components/HomePage/StudentDashboardUI.tsx`
- Modify: `tests/studentDashboardComponents.test.tsx`

**Interfaces:**

```ts
export interface LearningProgressPanelProps {
  dashboard: GameLoopDashboard | null;
  isLoading: boolean;
  errorMessage?: string | null;
  expanded: boolean;
  claimingMissionId?: GameLoopMission['id'] | null;
  onToggle: () => void;
  onRetry: () => void;
  onClaimMission: (missionId: GameLoopMission['id']) => void;
}

export interface WeeklyQuestViewModel {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  completed: boolean;
  claimed: boolean;
  reward: { coins: number; exp: number; items: string[]; itemCount: number };
}

export interface WeeklyQuestsPanelProps {
  quests: WeeklyQuestViewModel[];
  isLoading: boolean;
  errorMessage?: string | null;
  claimingQuestId?: string | null;
  onRetry: () => void;
  onClaim: (questId: string) => void;
}
```

- [ ] **Step 1: Write failing panel tests**

Verify:

- progress summary exposes `aria-expanded`;
- each mission progressbar has accessible name, min, max, current value;
- skeleton is shown only inside the panel;
- error shows local retry;
- empty weekly copy is exactly `Nhiệm vụ mới sẽ sớm xuất hiện.`;
- claim button has `Đang nhận...`, `Đã nhận`, `Nhận ngay`, and `Chưa xong` states;
- progress fill uses `scaleX(...)` and does not include a width transition class.

- [ ] **Step 2: Verify RED**

Run: `npm run test:run -- tests/studentDashboardComponents.test.tsx`

Expected: FAIL because both panels are missing.

- [ ] **Step 3: Implement panels and retry callbacks**

Move only JSX into the new components. Keep `loadDashboard`, `claimMission`, `callApi('get_weekly_quests')`, and `callApi('claim_weekly_quest')` in the container. Extract a stable local `fetchWeeklyQuests` callback so retry uses the same logic as initial load.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
npm run test:run -- tests/studentDashboardComponents.test.tsx
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/HomePage/student-dashboard/LearningProgressPanel.tsx \
  src/components/HomePage/student-dashboard/WeeklyQuestsPanel.tsx \
  src/components/HomePage/student-dashboard/dashboard.types.ts \
  src/components/HomePage/StudentDashboardUI.tsx \
  tests/studentDashboardComponents.test.tsx
git commit -m "feat(ui): extract accessible learning progress panels"
```

---

### Task 6: Extract Reward Sidebar and Achievement Summary

**Files:**
- Create: `src/components/HomePage/student-dashboard/RewardSidebar.tsx`
- Modify: `src/components/HomePage/student-dashboard/dashboard.types.ts`
- Modify: `src/components/HomePage/StudentDashboardUI.tsx`
- Modify: `tests/studentDashboardComponents.test.tsx`
- Modify: `src/components/gamification/BadgeGallery.tsx`

**Interfaces:**

```ts
export interface RewardSidebarProps {
  dashboard: GameLoopDashboard | null;
  giftShopEnabled: boolean;
  isProcessing: boolean;
  onOpenChest: () => void;
  onOpenGiftShop: () => void;
  onOpenBadges: () => void;
}
```

- [ ] **Step 1: Run GitNexus impact for `BadgeGallery`**

Report upstream dependents before editing. Only visual/accessibility behavior may change.

- [ ] **Step 2: Add failing tests**

Verify:

- chest button communicates locked, available, processing, and claimed states with text;
- weekly rhythm has a named progressbar;
- no badges shows a compact instruction to complete the first assignment;
- gift shop CTA is absent when the flag is false;
- BadgeGallery close control has an accessible label;
- BadgeGallery progress uses `scaleX`, not animated width;
- modal animation duration is within 180–240ms.

- [ ] **Step 3: Verify RED**

Run: `npm run test:run -- tests/studentDashboardComponents.test.tsx`

Expected: FAIL on missing sidebar and current gallery behavior.

- [ ] **Step 4: Implement sidebar and minimal gallery alignment**

Move chest, weekly rhythm, achievement summary, collection, hint token, and streak shield JSX into `RewardSidebar`. In `BadgeGallery`, keep all achievement data logic unchanged; only add labels, lighter header treatment, reduced motion-compatible transitions, and transform-based progress.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
npm run test:run -- tests/studentDashboardComponents.test.tsx
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/HomePage/student-dashboard/RewardSidebar.tsx \
  src/components/HomePage/student-dashboard/dashboard.types.ts \
  src/components/HomePage/StudentDashboardUI.tsx \
  src/components/gamification/BadgeGallery.tsx \
  tests/studentDashboardComponents.test.tsx
git commit -m "feat(ui): add restrained student reward sidebar"
```

---

### Task 7: Build Semantic Practice Grid and Align Homework Cards

**Files:**
- Create: `src/components/HomePage/student-dashboard/SubjectPracticeGrid.tsx`
- Modify: `src/components/HomePage/StudentDashboardUI.tsx`
- Modify: `src/features/homework/components/StudentHomeworkSection.tsx`
- Modify: `src/features/homework/components/StudentHomeworkCard.tsx`
- Modify: `tests/studentDashboardComponents.test.tsx`

**Interfaces:**

```ts
export interface SubjectPracticeGridProps {
  subjects: SubjectCardViewModel[];
  onSelectSubject: (subjectId: string) => void;
}
```

- [ ] **Step 1: Run GitNexus impact for `StudentHomeworkSection` and `StudentHomeworkCard`**

Report risk before editing.

- [ ] **Step 2: Add failing tests**

Verify:

- subject cards are native buttons;
- subject grid has one column by default, two at `sm`, three at `lg`, four at wide screens when space permits;
- subject empty state explains that no practice subjects are available;
- homework cards expose one native primary action and do not nest a button inside a clickable `div`;
- homework local error retains `Thử lại`;
- homework loading uses skeletons instead of a spinner.

- [ ] **Step 3: Verify RED**

Run: `npm run test:run -- tests/studentDashboardComponents.test.tsx`

Expected: FAIL on missing practice grid and current homework card semantics.

- [ ] **Step 4: Implement semantic cards**

`SubjectPracticeGrid` renders each subject as one `button type="button"`; use flat pastel surfaces and a small accent, not full-card gradients. Refactor `StudentHomeworkCard` root to `article` and make the footer CTA the single action button. Do not make the whole article clickable. Preserve `onSelectAssignment` behavior through the CTA.

- [ ] **Step 5: Align homework loading and empty states**

Use shared dashboard state primitives in `StudentHomeworkSection`. Keep store calls, error value, and `loadData` unchanged.

- [ ] **Step 6: Verify GREEN**

Run:

```bash
npm run test:run -- tests/studentDashboardComponents.test.tsx
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/HomePage/student-dashboard/SubjectPracticeGrid.tsx \
  src/components/HomePage/StudentDashboardUI.tsx \
  src/features/homework/components/StudentHomeworkSection.tsx \
  src/features/homework/components/StudentHomeworkCard.tsx \
  tests/studentDashboardComponents.test.tsx
git commit -m "feat(ui): add semantic practice and homework cards"
```

### Checkpoint B: Complete Content Architecture

- [ ] `npm run test:run` passes.
- [ ] Desktop main column contains assigned work, homework, weekly quests, and practice.
- [ ] Desktop sidebar contains daily progress, chest, rhythm, and achievements.
- [ ] Mobile DOM order puts assigned work before every gamification section.
- [ ] No existing modal, live exam branch, achievement route, or subject route was removed.

---

### Task 8: Compose Responsive Shell, Reduced Motion, and Modal Accessibility

**Files:**
- Modify: `src/components/HomePage/StudentDashboardUI.tsx`
- Modify: `styles.css`
- Modify: `src/components/common/AvatarSelectorModal.tsx`
- Modify: `tests/StudentDashboardUI.test.tsx`
- Modify: `tests/studentDashboardComponents.test.tsx`

**Interfaces:**
- No new data interfaces. This task composes Tasks 3–7 and adds global dashboard-specific interaction rules.

- [ ] **Step 1: Add failing integration tests**

Mock stores and render `StudentDashboardUI`. Verify:

```tsx
const headings = screen.getAllByRole('heading');
expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
expect(screen.getByRole('heading', { name: 'Nhiệm vụ của em', level: 2 })).toBeTruthy();

const assigned = screen.getByRole('region', { name: 'Nhiệm vụ của em' });
const progress = screen.getByRole('region', { name: 'Tiến độ học tập' });
expect(assigned.compareDocumentPosition(progress) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
```

Also verify the main container includes `max-w-[1280px]`, the desktop grid class includes `minmax(0,2fr)` and `minmax(300px,1fr)`, and all extracted regions render.

- [ ] **Step 2: Add failing reduced-motion and modal tests**

Verify `AvatarSelectorModal` close button has `aria-label="Đóng hộp chọn avatar"`; modal has `role="dialog"`, `aria-modal="true"`, and closes on Escape. Verify dashboard interactive classes use `motion-safe:`/`motion-reduce:` variants or global reduced-motion CSS.

- [ ] **Step 3: Verify RED**

Run:

```bash
npm run test:run -- tests/StudentDashboardUI.test.tsx
npm run test:run -- tests/studentDashboardComponents.test.tsx
```

Expected: FAIL until final shell and modal accessibility are implemented.

- [ ] **Step 4: Compose final dashboard layout**

In `StudentDashboardUI.tsx`:

```text
CurrentAnnouncementBanner
StudentDashboardHeader
main max 1280
  StudentDashboardHero
  desktop grid 2fr / min 300px 1fr
    main column: AssignedWorkSection, StudentHomeworkSection, WeeklyQuestsPanel, SubjectPracticeGrid
    side column: LearningProgressPanel, RewardSidebar
modals and preserved secondary flows
StudentFloatingSidebar
```

Keep `StudentAchievementsPage` as the alternate active section. Preserve all early returns for waiting, live exam, submitted, results, and selected subject.

- [ ] **Step 5: Add dashboard motion rules**

Append scoped rules to `styles.css`:

```css
@media (prefers-reduced-motion: reduce) {
  .student-dashboard *,
  .student-dashboard *::before,
  .student-dashboard *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Use `.student-dashboard` on the page root. Do not alter animation behavior outside this scope.

- [ ] **Step 6: Implement AvatarSelectorModal semantics**

Add dialog semantics, an accessible close label, Escape listener, and `motion-reduce`-compatible motion. Do not change avatar API calls or save timing.

- [ ] **Step 7: Verify GREEN**

Run:

```bash
npm run test:run -- tests/StudentDashboardUI.test.tsx tests/studentDashboardComponents.test.tsx
npm run test:run
npm run build
```

Expected: tests pass and production build exits 0.

- [ ] **Step 8: Commit**

```bash
git add src/components/HomePage/StudentDashboardUI.tsx \
  src/components/common/AvatarSelectorModal.tsx \
  styles.css \
  tests/StudentDashboardUI.test.tsx \
  tests/studentDashboardComponents.test.tsx
git commit -m "feat(ui): compose responsive Learning Adventure dashboard"
```

---

### Task 9: Add Authenticated Responsive Regression Coverage and Final Quality Gate

**Files:**
- Create: `cypress/e2e/student-dashboard-responsive.cy.ts`
- Modify: `docs/specs/2026-07-18-learning-adventure-student-dashboard.md` only to mark verified decisions or record an approved implementation deviation.
- Modify: `tasks/todo.md`

**Interfaces:**
- Uses the project’s existing student login route and fixture/test account available in the implementation environment.
- Produces repeatable viewport and overflow checks.

- [ ] **Step 1: Add responsive Cypress spec**

Cover viewports:

```ts
const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];
```

At every viewport:

- authenticate as a student using existing test credentials/environment values;
- assert `documentElement.scrollWidth <= clientWidth + 1`;
- assert hero, assigned work, homework, progress, rewards, and practice headings are visible;
- at 375px, assert assigned work appears above progress using element offsets;
- assert no button has a bounding box smaller than 44px in both dimensions for primary dashboard controls;
- assert the account menu opens by click and closes with Escape;
- assert there is no element with `animate-pulse` on attendance or live exam controls.

- [ ] **Step 2: Run Cypress test**

Run: `npm run cypress:run -- --spec cypress/e2e/student-dashboard-responsive.cy.ts`

Expected: PASS in an environment with the test student credentials/backend available. If authentication data is unavailable locally, record the exact blocker and run the same checks manually in the browser against the configured environment; do not mark the checkbox complete without evidence.

- [ ] **Step 3: Run full verification**

```bash
npm run test:run
npm run build
npm run cypress:run -- --spec cypress/e2e/student-dashboard-responsive.cy.ts
```

Then perform:

- keyboard-only navigation;
- accessibility tree inspection for headings, menus, dialogs, and progressbars;
- reduced-motion emulation;
- console error check;
- visual review at all four viewports;
- Impeccable detect for the student dashboard, requiring `0` findings. If no executable Impeccable command is available in the environment, use the connected Impeccable tool; do not substitute a self-assertion.

- [ ] **Step 4: Run GitNexus change detection**

Run `detect_changes({ scope: "compare", base_ref: "main", worktree: <worktree path> })`. Review every affected symbol and process. Any API/Worker/store behavior change is a scope violation and must be reverted.

- [ ] **Step 5: Final commit**

```bash
git add cypress/e2e/student-dashboard-responsive.cy.ts \
  docs/specs/2026-07-18-learning-adventure-student-dashboard.md \
  tasks/todo.md
git commit -m "test(ui): verify Learning Adventure dashboard quality gates"
```

### Checkpoint C: Phase 1 Complete

- [ ] All automated tests pass.
- [ ] Production build succeeds.
- [ ] Responsive Cypress checks pass at 375, 768, 1024, and 1440 widths.
- [ ] No horizontal overflow.
- [ ] Mouse, touch, and keyboard flows work.
- [ ] One `h1`, section `h2`s, card `h3`s.
- [ ] Progressbars have accessible values and names.
- [ ] No continuous distracting animation.
- [ ] Reduced motion is honored.
- [ ] No dark dashboard gradient remains.
- [ ] Impeccable detect reports 0.
- [ ] GitNexus confirms no API/Worker/business-flow changes.

---

## Dependency Order

```text
Task 1 contracts/helpers
  └─ Task 2 state primitives
      ├─ Task 3 header
      └─ Task 4 hero + assigned work
          └─ Checkpoint A
              ├─ Task 5 progress + weekly quests
              ├─ Task 6 reward sidebar
              └─ Task 7 practice + homework
                  └─ Checkpoint B
                      └─ Task 8 final shell + motion + modal accessibility
                          └─ Task 9 responsive verification
```

Tasks 5 and 6 may be implemented in parallel after Task 4 because they share only the presentation contracts. Task 7 can also be parallelized if its implementer does not edit `StudentDashboardUI.tsx` until the integration merge; otherwise execute sequentially to avoid conflicts.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `StudentDashboardUI.tsx` mixes many independent flows | High | Keep all orchestration and early-return branches in place; extract JSX only; use integration tests before and after each slice. |
| Header/account menu changes could hide existing actions | High | Enumerate every current action in props and test each native button. |
| Assignment completion/closed behavior can regress | High | Centralize only visual derivation in pure helpers and lock behavior with tests. |
| Multiple stores loading independently can cause page flicker | Medium | Render section skeletons and preserve existing data while refreshes occur. |
| Homework card currently nests interactive controls in a clickable card | Medium | Convert root to `article` and keep one explicit CTA button. |
| Framer Motion can ignore reduced-motion preferences | Medium | Use scoped reduced-motion CSS plus short component transitions. |
| Authenticated Cypress environment may be unavailable | Medium | Use environment-backed test credentials; document blockers and perform equivalent browser verification before completion. |
| Existing global CSS contains strong gradients and animations | Low | Scope all new styles under `.student-dashboard`; do not refactor unrelated global styles. |

## Definition of Done

Implementation is complete only when every Phase 1 acceptance criterion in `docs/specs/2026-07-18-learning-adventure-student-dashboard.md` is backed by test output, browser evidence, or an explicit tool result. Passing unit tests alone is insufficient for responsive, keyboard, motion, and visual-quality claims.
