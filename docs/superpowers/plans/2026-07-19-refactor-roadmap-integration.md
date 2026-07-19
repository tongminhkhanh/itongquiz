# Refactor Roadmap Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Use `using-git-worktrees` before execution, `git-workflow-and-versioning` for every merge/commit, `code-review-and-quality` before the reconciliation commit, and `verification-before-completion` before push. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate all 16 isolated refactor branches into one reviewable branch while preserving current behavior, keeping `main` untouched, and proving the combined tree passes every existing quality gate.

**Architecture:** Create a dedicated worktree and branch from the audited `origin/main` commit `086d913`. Merge branch groups in dependency order with explicit merge commits, verify each group, merge Legacy Google Sheets Removal last, and resolve its two known conflicts through one controlled reconciliation merge commit. Push only the integration branch; do not merge to `main` and do not deploy.

**Tech Stack:** Git worktrees, Git merge commits, React 19, TypeScript 5.8, Vite 6, Vitest 4, Cloudflare Workers, Wrangler, Zustand.

- **Execution index:** `tasks/refactor-roadmap-integration-plan.md`
- **Tracking checklist:** `tasks/refactor-roadmap-integration-todo.md`

## Global Constraints

- `main` and `origin/main` must both still resolve to `086d913` before execution. If either SHA changed, stop and repeat the integration audit before merging.
- Work only in `C:\itongquiz1\itongquiz1\.worktrees\integration-refactor-roadmap-20260719` on branch `integration/refactor-roadmap-20260719`.
- Never merge directly into `main` during this plan.
- Never deploy frontend, Worker, queues, D1 migrations, or production assets during this plan.
- Never force-push.
- Preserve all 16 branch histories with `--no-ff` merge commits.
- Do not squash, rebase, rewrite, or amend the source refactor branches.
- Do not change API routes, response contracts, database schemas, authentication policy, class isolation, store contracts, or user-visible behavior.
- Merge Legacy Google Sheets Removal last.
- The only expected merge conflicts are:
  - `src/components/TeacherDashboard/ResultsTab.tsx`
  - `src/components/TeacherDashboard/index.tsx`
- If any other conflict appears, run `git merge --abort`, stop, and re-audit from the new repository state.
- Restore `public/sitemap.xml` after every production build so generated sitemap changes are not included.
- Do not commit `dist/`, reports, `node_modules/`, environment files, or Wrangler temporary files.
- A failed checkpoint blocks the next phase. Fix only integration-induced issues; do not perform unrelated cleanup.
- Update `.brain/chat-session-current.md` after the integration branch is pushed, but keep it local-only if it remains ignored.

---

## Locked Branch Inputs

| Order | Branch | Expected remote SHA |
|---:|---|---|
| 1 | `origin/refactor/game-loop-split-20260719` | `431fd6e` |
| 2 | `origin/refactor/classroom-split-20260719` | `8c657b2` |
| 3 | `origin/refactor/certificate-routes-20260719` | `1cc6289` |
| 4 | `origin/refactor/phieu-routes-20260719` | `1730f97` |
| 5 | `origin/refactor/gift-shop-route-20260719` | `ec1c816` |
| 6 | `origin/refactor/worksheet-export-20260719` | `70de7c5` |
| 7 | `origin/refactor/gift-shop-service-20260719` | `12a5e9c` |
| 8 | `origin/refactor/student-detail-modal-20260719` | `5a7bb3c` |
| 9 | `origin/refactor/results-tab-20260719` | `01ff1f3` |
| 10 | `origin/refactor/assignment-tab-20260719` | `e63110b` |
| 11 | `origin/refactor/certificate-batch-modal-20260719` | `283cdab` |
| 12 | `origin/refactor/gift-shop-tab-20260719` | `60348dd` |
| 13 | `origin/refactor/quiz-preview-20260719` | `ef7b240` |
| 14 | `origin/refactor/teacher-dashboard-shell-20260719` | `fa5c6bf` |
| 15 | `origin/refactor/app-shell-routing-20260719` | `ad3ea39` |
| 16 | `origin/refactor/legacy-google-sheet-removal-20260719` | `7f5f667` |

---

## Files Manually Modified During Reconciliation

Only these files may receive manual source/test edits during the integration:

```text
src/components/TeacherDashboard/ResultsTab.tsx
src/components/TeacherDashboard/index.tsx
src/components/TeacherDashboard/results-tab/useQuestionAnalysis.ts
src/components/TeacherDashboard/results-tab/useResultOverrides.ts
src/components/TeacherDashboard/teacher-dashboard-shell/useTeacherDashboardBootstrap.ts
tests/ResultsTab.test.tsx
tests/TeacherDashboardShell.test.tsx
```

Responsibilities after reconciliation:

- `ResultsTab.tsx`: preserve the compatibility barrel to `./results-tab`.
- `TeacherDashboard/index.tsx`: preserve the compatibility barrel to `./teacher-dashboard-shell`.
- Results hooks: import answer-fetching functions from `services/results/resultAnswersService`.
- Dashboard bootstrap: load fresh teacher data without browser-side answer stripping.
- Tests: mock the new result service and remove the obsolete answer-stripping expectations.

---

### Task 1: Create and Verify the Isolated Integration Workspace

**Files:**
- No source files.
- Worktree: `C:\itongquiz1\itongquiz1\.worktrees\integration-refactor-roadmap-20260719`
- Branch: `integration/refactor-roadmap-20260719`

**Acceptance criteria:**
- [ ] Root `main` is clean and equals `origin/main` at `086d913`.
- [ ] `.worktrees` is ignored.
- [ ] Every locked branch resolves to its expected SHA.
- [ ] The new integration worktree starts clean.

- [ ] **Step 1: Refresh remote refs and verify the base**

Run from `C:\itongquiz1\itongquiz1`:

```powershell
git fetch --prune origin
git status --short --branch
git rev-parse --short main
git rev-parse --short origin/main
git check-ignore .worktrees
```

Expected:

```text
## main...origin/main
086d913
086d913
.worktrees
```

If either SHA is not `086d913`, stop before creating the integration branch.

- [ ] **Step 2: Verify every source branch SHA**

```powershell
$expected = [ordered]@{
  'origin/refactor/game-loop-split-20260719' = '431fd6e'
  'origin/refactor/classroom-split-20260719' = '8c657b2'
  'origin/refactor/certificate-routes-20260719' = '1cc6289'
  'origin/refactor/phieu-routes-20260719' = '1730f97'
  'origin/refactor/gift-shop-route-20260719' = 'ec1c816'
  'origin/refactor/worksheet-export-20260719' = '70de7c5'
  'origin/refactor/gift-shop-service-20260719' = '12a5e9c'
  'origin/refactor/student-detail-modal-20260719' = '5a7bb3c'
  'origin/refactor/results-tab-20260719' = '01ff1f3'
  'origin/refactor/assignment-tab-20260719' = 'e63110b'
  'origin/refactor/certificate-batch-modal-20260719' = '283cdab'
  'origin/refactor/gift-shop-tab-20260719' = '60348dd'
  'origin/refactor/quiz-preview-20260719' = 'ef7b240'
  'origin/refactor/teacher-dashboard-shell-20260719' = 'fa5c6bf'
  'origin/refactor/app-shell-routing-20260719' = 'ad3ea39'
  'origin/refactor/legacy-google-sheet-removal-20260719' = '7f5f667'
}

foreach ($entry in $expected.GetEnumerator()) {
  $actual = git rev-parse --short $entry.Key
  if ($actual -ne $entry.Value) {
    throw "$($entry.Key) expected $($entry.Value), got $actual"
  }
  Write-Host "OK $($entry.Key) $actual"
}
```

Expected: 16 `OK` lines and exit code `0`.

- [ ] **Step 3: Create the isolated worktree and checkpoint**

```powershell
git worktree add `
  -b integration/refactor-roadmap-20260719 `
  C:\itongquiz1\itongquiz1\.worktrees\integration-refactor-roadmap-20260719 `
  origin/main

Set-Location C:\itongquiz1\itongquiz1\.worktrees\integration-refactor-roadmap-20260719
git commit --allow-empty -m "chore: checkpoint before roadmap integration"
git status --short --branch
```

Expected: clean branch, one commit ahead of `origin/main`.

- [ ] **Step 4: Install worktree-local dependencies**

```powershell
npm ci
npm ci --prefix workers
```

Expected: both commands exit `0`; no tracked files change.

- [ ] **Step 5: Verify the baseline**

```powershell
npm run test:run
npm run build
git restore -- public/sitemap.xml
npx tsc --noEmit
Push-Location workers
npx tsc --noEmit
Pop-Location
git status --short
```

Expected: baseline tests/build/typechecks pass and `git status --short` prints nothing.

---

### Task 2: Merge Backend and Domain Branches

**Dependencies:** Task 1.

**Branches:** Game Loop, Classroom, Certificate Routes, Phiếu Routes, Backend Gift Shop Routes.

**Acceptance criteria:**
- [ ] All five merges complete without conflicts.
- [ ] Each branch has its own merge commit.
- [ ] Backend/domain targeted tests and Worker TypeScript pass.

- [ ] **Step 1: Merge each backend/domain branch in locked order**

```powershell
git merge --no-ff origin/refactor/game-loop-split-20260719 `
  -m "merge: integrate game loop refactor"
git merge --no-ff origin/refactor/classroom-split-20260719 `
  -m "merge: integrate classroom refactor"
git merge --no-ff origin/refactor/certificate-routes-20260719 `
  -m "merge: integrate certificate route refactor"
git merge --no-ff origin/refactor/phieu-routes-20260719 `
  -m "merge: integrate phieu route refactor"
git merge --no-ff origin/refactor/gift-shop-route-20260719 `
  -m "merge: integrate gift shop route refactor"
```

Expected: five successful merges and no conflict markers.

- [ ] **Step 2: Run backend/domain targeted tests**

```powershell
npm run test:run -- `
  tests/gameLoop.worker.test.ts `
  tests/gameLoopActivity.test.ts `
  tests/gameLoopDomain.test.ts `
  tests/classroomRoutes.worker.test.ts `
  tests/classroomValidation.test.ts `
  tests/certificates.worker.test.ts `
  tests/phieuRouteContracts.worker.test.ts `
  tests/phieuSecurity.worker.test.ts `
  tests/giftShopRoutes.worker.test.ts
```

Expected: all selected test files pass.

- [ ] **Step 3: Verify Worker compilation and repository cleanliness**

```powershell
Push-Location workers
npx tsc --noEmit
Pop-Location
git diff --check origin/main...HEAD
git status --short
```

Expected: Worker TypeScript exits `0`; no uncommitted changes.

### Checkpoint A: Backend Foundation

- [ ] Five merge commits are visible in `git log --first-parent --oneline origin/main..HEAD`.
- [ ] No merge conflict occurred.
- [ ] Targeted Worker tests pass.
- [ ] Worker TypeScript passes.

---

### Task 3: Merge Service and Export Branches

**Dependencies:** Task 2.

**Branches:** Worksheet Export, Frontend Gift Shop Service.

**Acceptance criteria:**
- [ ] Both branches merge without conflicts.
- [ ] Worksheet and Gift Shop service contracts remain green.
- [ ] Frontend TypeScript passes.

- [ ] **Step 1: Merge the service branches**

```powershell
git merge --no-ff origin/refactor/worksheet-export-20260719 `
  -m "merge: integrate worksheet export refactor"
git merge --no-ff origin/refactor/gift-shop-service-20260719 `
  -m "merge: integrate gift shop service refactor"
```

- [ ] **Step 2: Run service contract tests**

```powershell
npm run test:run -- `
  tests/worksheetExportService.test.ts `
  tests/giftShop.service.contract.test.ts `
  tests/giftShop.service.test.ts
npx tsc --noEmit
git status --short
```

Expected: selected tests and frontend TypeScript pass; worktree remains clean.

---

### Task 4: Merge Leaf UI Refactor Branches

**Dependencies:** Task 3.

**Branches:** Student Detail Modal, Results Tab, Assignment Tab, Certificate Batch Modal, Gift Shop Tab, Quiz Preview.

**Acceptance criteria:**
- [ ] Six UI branches merge without conflicts.
- [ ] Compatibility import paths remain stable.
- [ ] UI characterization suites pass.

- [ ] **Step 1: Merge all leaf UI branches in order**

```powershell
git merge --no-ff origin/refactor/student-detail-modal-20260719 `
  -m "merge: integrate student detail modal refactor"
git merge --no-ff origin/refactor/results-tab-20260719 `
  -m "merge: integrate results tab refactor"
git merge --no-ff origin/refactor/assignment-tab-20260719 `
  -m "merge: integrate assignment tab refactor"
git merge --no-ff origin/refactor/certificate-batch-modal-20260719 `
  -m "merge: integrate certificate batch modal refactor"
git merge --no-ff origin/refactor/gift-shop-tab-20260719 `
  -m "merge: integrate gift shop tab refactor"
git merge --no-ff origin/refactor/quiz-preview-20260719 `
  -m "merge: integrate quiz preview refactor"
```

Expected: all merges exit `0` with no conflict.

- [ ] **Step 2: Run leaf UI characterization tests**

```powershell
npm run test:run -- `
  tests/studentDetailModal.test.tsx `
  tests/studentDetailModels.test.ts `
  tests/ResultsTab.test.tsx `
  tests/AssignmentTabShell.test.tsx `
  tests/assignmentPrefill.integration.test.tsx `
  tests/CertificateBatchCreateModal.test.tsx `
  tests/GiftShopTab.test.tsx `
  tests/QuizPreview.test.tsx
npx tsc --noEmit
git status --short
```

Expected: all selected tests pass and the worktree is clean.

### Checkpoint B: Leaf UI Modules

- [ ] `ResultsTab.tsx`, `AssignmentTab.tsx`, `GiftShopTab.tsx`, and `QuizPreview.tsx` remain compatibility barrels.
- [ ] No source path or public prop contract changed.
- [ ] All selected UI suites pass.

---

### Task 5: Merge Shell Branches

**Dependencies:** Task 4.

**Branches:** Teacher Dashboard Shell, App Shell Routing.

**Acceptance criteria:**
- [ ] Both shell branches merge without conflicts.
- [ ] Dashboard and root-route contracts pass.
- [ ] Frontend build succeeds before Legacy removal is introduced.

- [ ] **Step 1: Merge the shell branches**

```powershell
git merge --no-ff origin/refactor/teacher-dashboard-shell-20260719 `
  -m "merge: integrate teacher dashboard shell refactor"
git merge --no-ff origin/refactor/app-shell-routing-20260719 `
  -m "merge: integrate app shell routing refactor"
```

- [ ] **Step 2: Run shell contract tests**

```powershell
npm run test:run -- `
  tests/TeacherDashboardShell.test.tsx `
  tests/AppShell.test.tsx `
  tests/systemManagementUi.test.tsx
npm run build
git restore -- public/sitemap.xml
npx tsc --noEmit
git status --short
```

Expected: shell tests, build, and frontend TypeScript pass.

---

### Task 6: Verify the Combined 15-Branch Baseline

**Dependencies:** Task 5.

**Acceptance criteria:**
- [ ] The tree contains every branch except Legacy Google Sheets Removal.
- [ ] Full tests match the audited baseline: 95 test files and 552 tests pass.
- [ ] Build, both TypeScript projects, security checks, and both dry-runs pass.

- [ ] **Step 1: Run the complete 15-branch gate**

```powershell
npm run test:run
npm run build
git restore -- public/sitemap.xml
npx tsc --noEmit
Push-Location workers
npx tsc --noEmit
Pop-Location
npm run security:check
npx wrangler deploy --dry-run
Push-Location workers
npx wrangler deploy --config wrangler.toml --dry-run
Pop-Location
```

Expected audited result:

```text
95 test files passed
552 tests passed
production dependency audit: critical=0 high=0 moderate=0 low=0
both Wrangler dry-runs exit 0
```

- [ ] **Step 2: Verify the integration history and clean tree**

```powershell
git diff --check origin/main...HEAD
git status --short --branch
git log --first-parent --oneline origin/main..HEAD
```

Expected: clean worktree, checkpoint plus 15 merge commits.

If this checkpoint fails, do not merge Legacy.

---

### Task 7: Merge Legacy Google Sheets Removal with Controlled Reconciliation

**Dependencies:** Task 6.

**Expected conflicts:** exactly two compatibility files.

**Acceptance criteria:**
- [ ] Only the two audited files conflict.
- [ ] Both compatibility barrels are preserved.
- [ ] No production source imports `googleSheetService` or calls `setStripAnswersEnabled`.
- [ ] Reconciliation tests pass: 5 test files, 20 tests.
- [ ] The Legacy merge and reconciliation are recorded in one dedicated merge commit.

- [ ] **Step 1: Start the Legacy merge without committing**

```powershell
git merge --no-ff --no-commit origin/refactor/legacy-google-sheet-removal-20260719
```

Expected: exit code `1` with conflicts only in:

```text
src/components/TeacherDashboard/ResultsTab.tsx
src/components/TeacherDashboard/index.tsx
```

Confirm before resolving:

```powershell
$conflicts = @(git diff --name-only --diff-filter=U)
$expectedConflicts = @(
  'src/components/TeacherDashboard/ResultsTab.tsx',
  'src/components/TeacherDashboard/index.tsx'
)

if (Compare-Object $conflicts $expectedConflicts) {
  git merge --abort
  throw "Unexpected conflict set: $($conflicts -join ', ')"
}
```

- [ ] **Step 2: Preserve the two refactor compatibility barrels**

```powershell
git checkout --ours -- `
  src/components/TeacherDashboard/ResultsTab.tsx `
  src/components/TeacherDashboard/index.tsx
```

The final contents must be exactly:

```ts
// src/components/TeacherDashboard/ResultsTab.tsx
export { default } from './results-tab';
```

```ts
// src/components/TeacherDashboard/index.tsx
export { default } from './teacher-dashboard-shell';
```

- [ ] **Step 3: Move Results hooks to the new result-answer service**

Modify `src/components/TeacherDashboard/results-tab/useQuestionAnalysis.ts`:

```ts
import { fetchResultAnswersBulk } from '../../../services/results/resultAnswersService';
```

Replace the obsolete import:

```ts
import { fetchResultAnswersBulk } from '../../../services/googleSheetService';
```

Modify `src/components/TeacherDashboard/results-tab/useResultOverrides.ts`:

```ts
import { fetchResultAnswers } from '../../../services/results/resultAnswersService';
```

Replace the obsolete import:

```ts
import { fetchResultAnswers } from '../../../services/googleSheetService';
```

Do not alter hook behavior, effect dependencies, error handling, or response mapping.

- [ ] **Step 4: Remove answer-stripping controls from dashboard bootstrap**

Modify `src/components/TeacherDashboard/teacher-dashboard-shell/useTeacherDashboardBootstrap.ts` so its imports begin as:

```ts
import { useCallback, useEffect, useState } from 'react';
import { useQuizStore } from '../../../../stores/quizStore';
import { cacheService } from '../../../services/CacheService';
import { checkAndWarnJWTExpiry } from '../../../utils/jwtInterceptor';
import type { ResultsLoadState } from './types';
```

The effect must be:

```ts
useEffect(() => {
  cacheService.invalidatePrefix('quizzes:');
  quizStore.loadQuizzes();
  void loadTeacherResults();
  checkAndWarnJWTExpiry();
  const expiryCheckInterval = setInterval(checkAndWarnJWTExpiry, 5 * 60 * 1000);
  return () => {
    clearInterval(expiryCheckInterval);
  };
}, [loadTeacherResults]);
```

Remove all imports and calls to `setStripAnswersEnabled`.

- [ ] **Step 5: Update Results Tab test mocking**

In `tests/ResultsTab.test.tsx`, replace:

```ts
vi.mock('../src/services/googleSheetService', () => ({
  fetchResultAnswers: mocks.fetchResultAnswers,
  fetchResultAnswersBulk: mocks.fetchResultAnswersBulk,
}));
```

with:

```ts
vi.mock('../src/services/results/resultAnswersService', () => ({
  fetchResultAnswers: mocks.fetchResultAnswers,
  fetchResultAnswersBulk: mocks.fetchResultAnswersBulk,
}));
```

No test assertions or fixtures should otherwise change.

- [ ] **Step 6: Remove obsolete dashboard test expectations**

In `tests/TeacherDashboardShell.test.tsx`:

1. Remove this property from the hoisted mock object:

```ts
setStripAnswersEnabled: vi.fn(),
```

2. Remove this entire mock:

```ts
vi.mock('../src/services/googleSheetService', () => ({
  setStripAnswersEnabled: mocks.setStripAnswersEnabled,
}));
```

3. Remove this reset line:

```ts
mocks.setStripAnswersEnabled.mockReset();
```

4. Rename the bootstrap test to:

```ts
it('bootstraps teacher data and schedules JWT checks', async () => {
```

5. Keep `const view = render(<TeacherDashboard />);`, the load assertions, cache assertion, JWT assertion, and `view.unmount()`.

6. Remove these obsolete assertions:

```ts
expect(mocks.setStripAnswersEnabled).toHaveBeenCalledWith(false);
expect(mocks.setStripAnswersEnabled).toHaveBeenLastCalledWith(true);
```

- [ ] **Step 7: Verify no obsolete runtime dependency remains**

```powershell
git add -A
git diff --cached --check
git diff --name-only --diff-filter=U
git grep -n -E "googleSheetService|setStripAnswersEnabled" -- src stores tests
```

Expected:

- `git diff --name-only --diff-filter=U` prints nothing.
- The grep only finds the strings inside `tests/googleSheetServiceRemoval.test.ts`.
- No production source file contains either legacy identifier.

- [ ] **Step 8: Run reconciliation tests before committing**

```powershell
npm run test:run -- `
  tests/googleSheetServiceRemoval.test.ts `
  tests/resultAnswersService.test.ts `
  tests/quizSerializer.test.ts `
  tests/ResultsTab.test.tsx `
  tests/TeacherDashboardShell.test.tsx
npx tsc --noEmit
```

Expected: 5 test files and 20 tests pass; frontend TypeScript exits `0`.

- [ ] **Step 9: Review and create the reconciliation merge commit**

Run the connected review tool before committing:

```text
local_coding.review_diff(staged=true)
```

Expected: `PASS`, no P1/P2/P3 findings.

Then commit while `MERGE_HEAD` is still present:

```powershell
git commit -m "fix(integration): reconcile legacy result services"
```

This commit is the dedicated Legacy merge/reconciliation commit. Do not create a separate broken mechanical merge commit.

---

### Task 8: Run the Final 16-Branch Quality Gate

**Dependencies:** Task 7.

**Acceptance criteria:**
- [ ] Full tests match the audited final baseline: 98 test files and 558 tests pass.
- [ ] Frontend and Worker TypeScript pass.
- [ ] Production build passes.
- [ ] Security scan and dependency audit report zero findings.
- [ ] Frontend and Worker Wrangler dry-runs pass.
- [ ] No generated or temporary file remains tracked or modified.

- [ ] **Step 1: Run all final gates**

```powershell
npm run test:run
npm run build
git restore -- public/sitemap.xml
npx tsc --noEmit
Push-Location workers
npx tsc --noEmit
Pop-Location
npm run security:check
npx wrangler deploy --dry-run
Push-Location workers
npx wrangler deploy --config wrangler.toml --dry-run
Pop-Location
```

Expected audited result:

```text
98 test files passed
558 tests passed
production dependency audit: critical=0 high=0 moderate=0 low=0
frontend Wrangler dry-run exits 0
Worker Wrangler dry-run exits 0
```

- [ ] **Step 2: Verify source and Git invariants**

```powershell
git grep -n -E "googleSheetService|setStripAnswersEnabled" -- src stores tests
git diff --check origin/main...HEAD
git status --short --branch
git log --first-parent --oneline origin/main..HEAD
git diff --stat origin/main...HEAD
```

Expected:

- Legacy identifiers appear only in the removal test.
- No whitespace errors.
- Clean worktree.
- Checkpoint, 15 ordinary merge commits, and one Legacy reconciliation merge commit are visible.

- [ ] **Step 3: Run GitNexus compare review**

Use:

```text
gitNexus.detect_changes({
  scope: "compare",
  base_ref: "origin/main",
  worktree: "C:\\itongquiz1\\itongquiz1\\.worktrees\\integration-refactor-roadmap-20260719"
})
```

Review every affected process. Any newly detected API, Worker, auth, or database contract change not already covered by the source branches is a blocker.

### Checkpoint C: Integration Ready for Remote Review

- [ ] All automated quality gates pass.
- [ ] GitNexus review has no unexplained high-risk impact.
- [ ] Worktree is clean.
- [ ] `main` remains at `086d913` and untouched.
- [ ] No deployment command has been executed.

---

### Task 9: Push Only the Integration Branch and Record State

**Dependencies:** Task 8.

**Acceptance criteria:**
- [ ] Only `integration/refactor-roadmap-20260719` is pushed.
- [ ] Remote SHA matches local HEAD.
- [ ] `main` remains unchanged.
- [ ] Session recovery notes identify the integration branch and explicitly say merge/deploy have not occurred.

- [ ] **Step 1: Push the integration branch**

```powershell
git push -u origin integration/refactor-roadmap-20260719
$local = git rev-parse HEAD
$remote = git rev-parse origin/integration/refactor-roadmap-20260719
if ($local -ne $remote) {
  throw "Remote integration SHA does not match local HEAD"
}
Write-Host "Integration branch verified at $local"
```

- [ ] **Step 2: Verify root main remains untouched**

Run from `C:\itongquiz1\itongquiz1`:

```powershell
git status --short --branch
git rev-parse --short main
git rev-parse --short origin/main
```

Expected:

```text
## main...origin/main
086d913
086d913
```

- [ ] **Step 3: Update session recovery notes**

Update `.brain/chat-session-current.md` with:

```markdown
- Integration branch: `integration/refactor-roadmap-20260719`.
- Remote SHA: `<verified full SHA>`.
- 16 refactor branches integrated in audited order.
- Legacy reconciliation completed through the dedicated merge commit.
- Final result: 98 test files/558 tests, build, frontend/Worker TypeScript, security, dependency audit, and both Wrangler dry-runs passed.
- `main` remains unchanged at `086d913`.
- No production deploy performed.
- Next action requires explicit approval: merge integration branch into `main` or create/review a PR.
```

Do not commit `.brain/chat-session-current.md` if it is ignored/local-only.

---

## Dependency Order

```text
Task 1: isolated workspace + frozen input verification
  └─ Task 2: backend/domain merges
      └─ Checkpoint A
          └─ Task 3: service/export merges
              └─ Task 4: leaf UI merges
                  └─ Checkpoint B
                      └─ Task 5: shell merges
                          └─ Task 6: full 15-branch gate
                              └─ Task 7: Legacy merge + reconciliation
                                  └─ Task 8: final 16-branch gate
                                      └─ Checkpoint C
                                          └─ Task 9: push integration branch only
```

All tasks are sequential because every phase extends the same integration branch and later verification depends on the exact tree produced earlier.

---

## Failure and Rollback Rules

| Failure | Required action |
|---|---|
| `origin/main` is no longer `086d913` | Stop; repeat the conflict and combined-tree audit against the new base. |
| A source branch SHA differs | Stop; inspect branch changes and repeat pairwise conflict analysis. |
| Unexpected merge conflict | `git merge --abort`; do not resolve ad hoc. |
| Targeted tests fail after one merge group | Identify the first failing merge using first-parent history; revert or reset to the preceding verified merge commit. |
| Legacy reconciliation tests fail | Keep the merge uncommitted; fix only the seven authorized files or run `git merge --abort`. |
| Final full gate fails | Do not push. Compare with the passing 15-branch and reconciliation checkpoints to isolate the regression. |
| Remote push is rejected | Fetch and inspect; never force-push. |
| Accidental generated file modification | Restore it before commit with `git restore -- <path>`. |

For an already committed merge that must be removed without rewriting shared history:

```powershell
git revert -m 1 <merge-commit-sha>
```

Before the integration branch is pushed, resetting to the last verified local merge commit is acceptable. After push, prefer revert commits and never rewrite history.

---

## Definition of Done

The integration work is complete only when:

- all locked refs and the base SHA were verified before merging;
- all 16 branches are represented in first-parent history;
- only the two audited conflicts occurred;
- Legacy reconciliation is limited to the seven authorized files;
- 98 test files and 558 tests pass;
- production build, frontend TypeScript, Worker TypeScript, security scan, dependency audit, and both Wrangler dry-runs pass;
- GitNexus reports no unexplained high-risk change;
- the integration branch is pushed and remote SHA verified;
- `main` remains clean and unchanged at `086d913`;
- no production deployment occurred.
