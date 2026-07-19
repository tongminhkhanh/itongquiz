# Refactor Roadmap Integration Checklist

## Phase 1 — Preflight and Worktree

- [ ] Fetch remote refs.
- [ ] Confirm clean `main` and `origin/main` at `086d913`.
- [ ] Confirm all 16 remote branch SHAs match the locked table.
- [ ] Create worktree `.worktrees/integration-refactor-roadmap-20260719`.
- [ ] Create branch `integration/refactor-roadmap-20260719`.
- [ ] Create empty checkpoint commit.
- [ ] Install root and Worker dependencies.
- [ ] Run baseline tests, build, and both TypeScript checks.

## Phase 2 — Backend and Services

- [ ] Merge Game Loop.
- [ ] Merge Classroom.
- [ ] Merge Certificate Routes.
- [ ] Merge Phiếu Routes.
- [ ] Merge Backend Gift Shop Routes.
- [ ] Run backend/domain targeted tests.
- [ ] Run Worker TypeScript.
- [ ] Merge Worksheet Export.
- [ ] Merge Frontend Gift Shop Service.
- [ ] Run service contract tests.
- [ ] Run frontend TypeScript.

## Phase 3 — UI and Shells

- [ ] Merge Student Detail Modal.
- [ ] Merge Results Tab.
- [ ] Merge Assignment Tab.
- [ ] Merge Certificate Batch Modal.
- [ ] Merge Gift Shop Tab.
- [ ] Merge Quiz Preview.
- [ ] Run leaf UI characterization tests.
- [ ] Merge Teacher Dashboard Shell.
- [ ] Merge App Shell Routing.
- [ ] Run shell tests and production build.

## 15-Branch Checkpoint

- [ ] Full suite passes: expected 95 test files/552 tests.
- [ ] Production build passes.
- [ ] Frontend TypeScript passes.
- [ ] Worker TypeScript passes.
- [ ] Security scan passes.
- [ ] Production dependency audit reports zero findings.
- [ ] Frontend Wrangler dry-run passes.
- [ ] Worker Wrangler dry-run passes.
- [ ] Worktree is clean.

## Phase 4 — Legacy Reconciliation

- [ ] Start Legacy merge with `--no-commit`.
- [ ] Confirm only `ResultsTab.tsx` and `TeacherDashboard/index.tsx` conflict.
- [ ] Preserve both refactor compatibility barrels.
- [ ] Move Results hooks to `resultAnswersService`.
- [ ] Remove `setStripAnswersEnabled` from dashboard bootstrap.
- [ ] Update Results service mock.
- [ ] Remove obsolete dashboard answer-stripping mocks/assertions.
- [ ] Confirm no unresolved conflicts.
- [ ] Confirm legacy identifiers remain only in the removal test.
- [ ] Run 5 reconciliation test files/20 tests.
- [ ] Run frontend TypeScript.
- [ ] Run staged review and require `PASS`.
- [ ] Create the dedicated Legacy reconciliation merge commit.

## Final 16-Branch Gate

- [ ] Full suite passes: expected 98 test files/558 tests.
- [ ] Production build passes and sitemap is restored.
- [ ] Frontend TypeScript passes.
- [ ] Worker TypeScript passes.
- [ ] Security scan passes.
- [ ] Production dependency audit reports zero findings.
- [ ] Frontend Wrangler dry-run passes.
- [ ] Worker Wrangler dry-run passes.
- [ ] GitNexus compare review has no unexplained high-risk impact.
- [ ] Git diff has no whitespace errors.
- [ ] Worktree is clean.

## Push and Handoff

- [ ] Push only `integration/refactor-roadmap-20260719`.
- [ ] Verify remote SHA equals local HEAD.
- [ ] Confirm root `main` remains clean at `086d913`.
- [ ] Update `.brain/chat-session-current.md`.
- [ ] Record explicitly: no merge to `main`, no deployment.
