# Refactor Priorities 1–5

Date: 2026-07-18

## 1. Student Dashboard

Target: `src/components/HomePage/StudentDashboardUI.tsx` — about 1,078 lines.

Problem: session orchestration, assignments, practice catalog, attendance, rewards, quests, modal state, navigation, and rendering are mixed.

Proposed split:

```text
src/features/student-dashboard/
├── hooks/useStudentDashboardSession.ts
├── hooks/useStudentAssignments.ts
├── hooks/useStudentPracticeCatalog.ts
├── hooks/useStudentAttendance.ts
├── hooks/useStudentRewards.ts
├── components/StudentDashboardContent.tsx
├── components/StudentDashboardModals.tsx
└── StudentDashboardUI.tsx
```

Exit: orchestration under about 250 lines; focused tests for assignments, practice, attendance, and rewards.

## 2. Live Exam Vertical Slice

Targets:

- `workers/src/routes/liveExam.ts` — about 930 lines.
- `workers/src/services/liveExamService.ts` — about 897 lines.

Split commands, queries, participant operations, lifecycle, scoring, and read models under `workers/src/features/live-exam/`.

Exit: stable endpoints and response shapes, centralized authorization, table-driven lifecycle tests, route/service files under about 300 lines.

## 3. Game Loop Route

Target: `workers/src/routes/gameLoop.ts` — about 1,134 lines.

Split wallet, daily missions, weekly quests, rewards, achievements, and dashboard aggregation into domain modules.

Exit: idempotent reward claims, duplicate-claim tests, read aggregation separated from writes, thin route dispatcher.

## 4. Student Result Detail Modal

Target: `src/components/teacher/ResultsView/StudentDetailModal.tsx` — about 914 lines.

Split result overview, weakness analysis, smart assignment preview, certificate actions, and modal orchestration.

Exit: no duplicate API calls when reopening, independent smart-assignment/certificate tests, modal contains layout and coordination only.

## 5. Classroom Route

Target: `workers/src/routes/classroom.ts` — about 880 lines.

Split class routes, student routes, assignment routes, roster queries, authorization, and contracts.

Exit: stable API paths/fields, explicit ownership tests, student login isolated from classroom CRUD.
