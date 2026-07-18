# Refactor Priorities 6–10

Date: 2026-07-18

## 6. Worksheet Export

Target: `src/services/worksheetExportService.ts` — about 871 lines.

Split worksheet model, layout, question renderers, math renderer, media resolver, and export adapters.

Exit: visually equivalent representative exports, unit-tested pure layout functions, heavy libraries remain dynamically loaded.

## 7. Certificates Route

Target: `workers/src/routes/certificates.ts` — about 822 lines.

Separate template administration, single-certificate operations, batch operations, protected/public reads, and queue submission. Preserve queue and rendering contracts.

## 8. Result Sheet Route

Target: `workers/src/routes/phieu.ts` — about 740 lines.

Separate public-link resolution, protected teacher operations, batch generation, result mapping, and rendering responses. Preserve public URLs and ownership checks.

## 9. Teacher Results Tab

Target: `src/components/TeacherDashboard/ResultsTab.tsx` — about 721 lines.

Extract filtering/pagination, summary metrics, question analysis, export actions, and result navigation. Keep visible UI unchanged during the first pass.

## 10. Quiz Data Gateway

Target: `src/services/googleSheetService.ts` — about 683 lines.

Split quiz mapping, question mapping, save payload preparation, result mapping, and API orchestration. Rename the legacy service only after callers use a neutral gateway interface.

## Secondary Backlog

1. `src/components/TeacherDashboard/index.tsx` — extract tab registry and dashboard effects.
2. `src/components/TeacherDashboard/AssignmentTab.tsx` — separate draft hydration, form state, submit workflow, and recommendations.
3. `src/features/certificates/BatchCreateModal.tsx` — split selection, validation, progress, and summary.
4. `src/services/giftShop.service.ts` plus `workers/src/routes/giftShop.ts` — align frontend/backend boundaries.
5. `App.tsx` — extract URL entry resolution and root-view routing after feature modules stabilize.
6. `src/components/TeacherDashboard/QuizPreview.tsx` — split toolbar, question list, add-question modal, and editor orchestration.
