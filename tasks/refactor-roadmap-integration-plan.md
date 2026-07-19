# Implementation Plan: Refactor Roadmap Integration

## Canonical Plan

The complete executable plan is:

`docs/superpowers/plans/2026-07-19-refactor-roadmap-integration.md`

## Overview

Integrate 16 audited refactor branches into `integration/refactor-roadmap-20260719`, preserve merge history, reconcile Legacy Google Sheets Removal last, run all quality gates, and push only the integration branch.

## Architecture Decisions

- Freeze execution to `origin/main` SHA `086d913`; any base movement requires a new audit.
- Use a dedicated ignored worktree and never switch or modify root `main`.
- Use `--no-ff` merges to keep every isolated branch visible and reversible.
- Merge dependency groups sequentially and verify after each group.
- Merge Legacy last because it deletes `googleSheetService` while Results Tab and Teacher Dashboard Shell introduce new modules that still reference it.
- Resolve the two known conflicts by preserving compatibility barrels and apply reconciliation before creating the Legacy merge commit.
- Push the integration branch only; merge to `main` and production deployment remain separate approvals.

## Phases

### Phase 1: Preflight and Isolation

- Verify base and all 16 remote SHAs.
- Create `integration/refactor-roadmap-20260719` in a new worktree.
- Install dependencies and prove a clean baseline.

### Phase 2: Backend and Services

- Merge Game Loop, Classroom, Certificate Routes, Phiếu Routes, and Backend Gift Shop Routes.
- Merge Worksheet Export and Frontend Gift Shop Service.
- Run targeted contracts and TypeScript checkpoints.

### Phase 3: UI and Shells

- Merge Student Detail Modal, Results Tab, Assignment Tab, Certificate Batch Modal, Gift Shop Tab, and Quiz Preview.
- Merge Teacher Dashboard Shell and App Shell Routing.
- Run the audited 15-branch gate.

### Phase 4: Legacy Reconciliation

- Merge Legacy Google Sheets Removal with `--no-commit`.
- Accept only the two known conflicts.
- Preserve the Results and Dashboard compatibility barrels.
- Move Results hooks to `resultAnswersService`.
- Remove answer-stripping controls and obsolete test expectations.
- Run 20 reconciliation tests and staged review.
- Create one dedicated reconciliation merge commit.

### Phase 5: Final Verification and Push

- Run the full 16-branch quality gate.
- Confirm 98 test files/558 tests, build, both TypeScript checks, security, dependency audit, and both Wrangler dry-runs.
- Run GitNexus compare review.
- Push only the integration branch and verify its remote SHA.
- Record that `main` is unchanged and production was not deployed.

## Checkpoints

- **Checkpoint A:** Backend/domain targeted suites and Worker TypeScript pass.
- **Checkpoint B:** Leaf UI characterization suites and frontend TypeScript pass.
- **15-branch checkpoint:** 95 test files/552 tests plus all technical gates pass.
- **Reconciliation checkpoint:** 5 files/20 tests pass and staged review is `PASS`.
- **Final checkpoint:** 98 test files/558 tests plus all technical gates pass.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Base or source branch moved after audit | High | Lock SHAs and stop on mismatch. |
| Hidden semantic conflict from service deletion | High | Merge Legacy last and apply the exact seven-file reconciliation. |
| Unexpected conflict | High | Abort immediately; never improvise a resolution. |
| Large combined change obscures regressions | High | Verify after each dependency group and compare first-parent merge history. |
| Generated sitemap pollutes commits | Medium | Restore `public/sitemap.xml` after every build. |
| Missing Worker dependencies in a new worktree | Medium | Run `npm ci --prefix workers` before tests. |
| Accidental production action | High | Use only Wrangler `--dry-run`; deployment remains out of scope. |

## Completion Boundary

This plan stops after pushing `integration/refactor-roadmap-20260719`. Merging into `main`, creating a production release, deploying, smoke testing production, and monitoring production require a separate explicit instruction.
