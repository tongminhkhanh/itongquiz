# Student Detail Modal Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans with TDD and frontend-ui-engineering review.

**Goal:** Split `StudentDetailModal.tsx` into focused models, hooks, and presentation panels while preserving props, behavior, layout, and accessibility.

**Architecture:** Keep `StudentDetailModal` as the public coordinator. Move answer/weakness calculations to pure models, remote/effect logic to hooks, and review/analytics/header JSX to focused components; preserve existing Tailwind classes and copy.

**Tech Stack:** React, TypeScript, Zustand, Vitest, Testing Library, html2canvas.

## Locked contracts

- Preserve `StudentDetailModalProps`, named/default exports, and existing import path.
- Preserve answer snapshots, legacy answer format, persisted correctness, skipped-answer behavior, filtering, navigation, and empty states.
- Preserve review/analytics tabs, weakness loading/error/coverage behavior, Smart Assignment draft flow, AI analysis, and PNG export.
- Preserve responsive classes, visible copy, button semantics, close label, and embedded/fullscreen wrappers.
- Do not redesign the UI or change service request payloads.

## Intended boundaries

```text
student-detail/models/{questionModel,weaknessModel,smartAssignmentDraft}.ts
student-detail/hooks/{useQuestionReviewState,useWeaknessProfile}.ts
student-detail/hooks/{useSmartAssignmentPreview,useAiInsight,useResultImageExport}.ts
student-detail/components/{StudentDetailHeader,QuestionPalette,QuestionDetailPanel}.tsx
student-detail/components/{CompetencyPanel,WeaknessPanel,SmartAssignmentPanel}.tsx
student-detail/components/{AnalyticsPanel}.tsx
StudentDetailModal.tsx
```

## Task 1: Characterize the public UI

- [ ] Verify header/result/question rendering and close callback.
- [ ] Verify correct/wrong filters and selected question navigation.
- [ ] Verify analytics tab renders radar/AI panels and loads weakness data.
- [ ] Keep the existing assignment-prefill integration suite green.
- [ ] Commit this plan and green characterization tests.

## Task 2: Extract pure models

- [ ] Extract answer normalization, display question construction, skipped detection, type labels, and counts.
- [ ] Extract focus-skill sorting, coverage warning, and status labels.
- [ ] Extract Smart Assignment draft construction.
- [ ] Add direct model tests and keep behavior byte-for-byte compatible where observable.

## Task 3: Extract hooks

- [ ] Extract question filter/selection state.
- [ ] Extract weakness load/reset state and cancellation behavior.
- [ ] Extract Smart Assignment preview/form/draft actions without changing API payloads.
- [ ] Extract AI insight and PNG export handlers.

## Task 4: Extract presentation components

- [ ] Extract header, palette, and question detail while preserving DOM order/classes.
- [ ] Split analytics into competency, weakness, Smart Assignment, and AI panels.
- [ ] Keep presentation components mostly below 120 lines and the modal coordinator below 150 lines.

## Task 5: Verify and commit

- [ ] Run modal/model/assignment-prefill tests, TypeScript, full tests, build, and security check.
- [ ] Run staged review, accessibility-oriented source review, and GitNexus change detection.
- [ ] Commit the completed target:

```bash
git commit -m "refactor(results): split student detail modal responsibilities"
```
