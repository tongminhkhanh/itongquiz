# Student Result and Rewards V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` task-by-task with `test-driven-development`, `incremental-implementation`, and review checkpoints. Steps use checkbox syntax for tracking.

**Goal:** Make the saved result the single source of truth, claim server-owned rewards exactly once, and replace the current post-quiz UI with an encouraging completion dialog, compact result review, and lazy study plan.

**Architecture:** Add pure frontend summary/reward presentation utilities, a D1 reward receipt plus a dedicated claim route, and focused result-page components. Preserve current quiz validation and legacy game-state routes while moving quiz completion and Dr Owl to idempotent server-owned claims.

**Tech Stack:** React 19, TypeScript 5.8, Zustand, Vite 6, Tailwind CSS 4 utilities, Cloudflare Workers, D1, Vitest, Testing Library.

## Global Constraints

- `StudentResult.score` is 0–10; percentage is always derived separately.
- Correct, incorrect, and skipped remain distinct.
- No production code is written before a failing test for its behavior.
- Existing validation overrides for `ORDERING`, `UNDERLINE`, and `ERROR_CORRECTION` remain unchanged.
- Quiz-completion reward amounts come only from the Worker.
- Reward claims are idempotent by username, activity type, and activity ID.
- AI does not load until the student opens the study plan.
- Do not deploy or merge until all stages pass the final quality gate.

---

### Task 1: Canonical result summary

**Files:**
- Create: `src/features/results/studentResultSummary.ts`
- Test: `tests/studentResultSummary.test.ts`
- Modify: `src/components/student/ResultScreen/index.tsx`
- Modify: `src/components/student/ResultScreen/tabs/OverviewTab.tsx`

**Interfaces:**
- Produces `isSkippedAnswer(value)`, `getStoredAnswerOutcome(result, questionId, fallbackAnswer)`, `buildStudentResultSummary(result, answers)`, and `formatResultDuration(seconds)`.
- Later tasks consume `StudentResultSummary` and the normalized result.

- [x] Write tests proving graded answer snapshots override stale `validationDetails`, skipped answers are not incorrect, score is `/10`, and durations under one minute use seconds.
- [x] Run `npm run test:run -- tests/studentResultSummary.test.ts`; expect failure because the module is missing.
- [x] Implement the minimal pure utility.
- [x] Pass `displayResult` to every result tab and remove OverviewTab recounting.
- [x] Run the targeted test and existing result tests.
- [x] Commit `fix(results): use one canonical student result summary`.

### Task 2: Server-owned reward policy and receipt schema

**Files:**
- Create: `workers/src/gamification/resultRewardPolicy.ts`
- Create: `workers/migrations/0031_add_reward_receipts.sql`
- Create: `workers/rollbacks/0031_drop_reward_receipts.sql`
- Test: `tests/resultRewardPolicy.test.ts`

**Interfaces:**
- Produces `calculateResultReward({ score, correctCount, totalQuestions }): { exp: number; coins: number }`.
- Receipt columns: `username`, `activity_type`, `activity_id`, `reward_exp`, `reward_coins`, `created_at` with a unique composite key.

- [x] Write policy tests for score bands 0, 4.9, 5, 7, 8, 9, and 10, plus empty quiz safety.
- [x] Run the test and verify RED.
- [x] Implement the pure policy and migration/rollback.
- [x] Run policy and migration-layout tests.
- [x] Commit `feat(rewards): add result reward policy and receipts`.

### Task 3: Idempotent result reward claim route

**Files:**
- Modify: `workers/src/routes/gamification.ts`
- Modify: `src/services/api/routes/gamification.ts`
- Modify: `src/services/gamificationService.ts`
- Modify: `src/stores/useGamificationStore.ts`
- Test: `tests/gamificationSecurity.worker.test.ts`
- Create: `tests/resultRewardClaim.worker.test.ts`

**Interfaces:**
- New route: `POST /api/game-state/result-reward`.
- Request: `{ resultId: string }`; identity comes from JWT.
- Response data includes `awardedExp`, `awardedCoins`, `alreadyClaimed`, `newLevel`, `newExp`, `newExpToNext`, `newCoins`, `leveledUp`, and `mood`.

- [x] Run GitNexus `api_impact` for `workers/src/routes/gamification.ts` before edits.
- [x] Write route tests for teacher denial, ownership denial, missing result, exact reward, and duplicate claim.
- [x] Run targeted tests and verify RED.
- [x] Implement the route, registry action `claim_result_reward`, service function, and store update.
- [x] Keep `/api/game-state` unchanged for legacy callers.
- [x] Run Worker tests and type/build checks.
- [x] Commit `feat(rewards): claim quiz rewards exactly once`.

### Task 4: Quiz submission uses saved result reward

**Files:**
- Modify: `src/features/quiz-player/hooks/useQuizPlayer.ts`
- Modify: `src/types/gamification.types.ts`
- Test: `tests/useQuizPlayerRewards.test.tsx`

**Interfaces:**
- `rewardData` includes reward status, score, correct count, total, EXP, coins, level progress, and retry state.
- The saved server `result.id` is passed to `claimResultReward`.

- [x] Write hook tests proving zero-correct completion still opens the dialog, reward claim waits for saved result ID, and claim failure preserves the result with retry state.
- [x] Run the test and verify RED.
- [x] Remove client reward formula and direct `updateGameState` call from quiz submission.
- [x] Claim the server reward and update local gamification state from the response.
- [x] Run targeted hook/component tests.
- [x] Commit `fix(quiz): derive completion rewards from saved results`.

### Task 5: Completion dialog redesign

**Files:**
- Rewrite: `src/components/gamification/RewardOverlay.tsx`
- Modify: `src/components/StudentView.tsx`
- Test: `tests/RewardOverlay.test.tsx`

**Interfaces:**
- Props include result summary, reward status, level progress, `onViewResult`, `onExit`, and `onRetryReward`.

- [x] Write component tests for the completion headline, `/10` score, EXP/coins, zero reward, retry state, level-up copy, and both actions.
- [x] Run and verify RED.
- [x] Implement an accessible calm dialog with reduced-motion support.
- [x] Use brief confetti only for normal completion; stronger celebration only for level-up/perfect score.
- [x] Run component tests and keyboard assertions.
- [x] Commit `feat(results): add encouraging completion dialog`.

### Task 6: Compact result and review experience

**Files:**
- Modify: `src/components/student/ResultScreen/index.tsx`
- Rewrite: `src/components/student/ResultScreen/tabs/OverviewTab.tsx`
- Create: `src/components/student/ResultScreen/tabs/ReviewTab.tsx`
- Create: `src/components/student/ResultScreen/ResultSummaryHeader.tsx`
- Test: `tests/StudentResultScreen.test.tsx`

**Interfaces:**
- Tabs: `result`, `review`, and conditional `study-plan`.
- Review filters: `all`, `incorrect`, `skipped`.

- [x] Write tests for tab labels, concise summary, 30-skipped guidance, review filters, and absence of duplicate progress bars.
- [x] Run and verify RED.
- [x] Implement the compact result header, one next-step card, and answer review.
- [x] Replace `Tổng quan` with `Kết quả`; remove the duplicate red/green/orange banners.
- [x] Run component and existing quiz navigation tests.
- [x] Commit `feat(results): add compact result and answer review`.

### Task 7: Conditional lazy study plan

**Files:**
- Modify: `src/components/student/ResultScreen/tabs/RecommendationsTab.tsx`
- Modify: `src/services/aiTutorService.ts`
- Modify: `src/components/student/ResultScreen/WeaknessSummaryCard.tsx`
- Modify: `src/components/student/ResultScreen/DrOwlModal.tsx`
- Test: `tests/StudentStudyPlan.test.tsx`
- Test: `tests/aiTutorResultContext.test.ts`

**Interfaces:**
- `extractWrongAnswers` returns only answered-but-incorrect entries.
- AI context sends `score10` and `accuracyPercent` separately.
- Recommendation fetch occurs only after the study-plan tab is opened.

- [x] Write tests proving skipped answers are excluded, score copy uses `/10`, no AI call occurs on result render, and nonexistent `Chi tiết` copy is removed.
- [x] Run and verify RED.
- [x] Implement lazy loading and conditional tab visibility.
- [x] Collapse duplicate weakness/Dr Owl actions into one next-step route.
- [x] Replace direct Dr Owl reward mutation with an idempotent claim or temporarily disable bonus reward until its dedicated receipt claim is available.
- [x] Run targeted tests.
- [x] Commit `feat(study-plan): load recommendations only when useful`.

### Task 8: Final verification and branch completion

**Files:**
- Update tests or docs only when verification exposes a real requirement gap.

- [x] Run `npm run test:run`.
- [x] Run `npm run build`.
- [x] Run changed-file security scan.
- [x] Run staged code review.
- [x] Run GitNexus `detect_changes` and inspect affected result/reward flows.
- [x] Verify git status contains no generated sitemap or temporary browser files.
- [x] Use the finishing-development-branch workflow and present merge/deploy choices.
