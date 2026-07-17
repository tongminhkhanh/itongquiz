# Teacher Dashboard Overview Redesign

## Goal

Redesign the teacher overview page into a calm, professional education dashboard while preserving all existing stores, filtering rules, navigation tabs, and API behavior.

## Design direction

- Visual tone: calm professional, light application shell with one dark navy welcome surface.
- Primary color: blue 600 for actions and active data.
- Background: slate 50; surfaces: white; borders: slate 200.
- Radius hierarchy: 12px controls, 16px cards, 20px hero.
- Shadows: subtle only; hierarchy comes from spacing, borders, and contrast.
- Icons: Lucide only, 20–24px, one icon family throughout.
- Motion: color and shadow transitions only; reduced-motion users receive no transform animation.

## Page structure

1. Welcome hero
   - Greeting, date, role/class scope.
   - Primary actions: create quiz and view results.
   - Live summaries: submissions today, pass rate, participating students.
2. Quick actions
   - Six compact actions leading directly to existing dashboard tabs.
3. Metrics
   - Managed quizzes, average score, submissions, participating students.
   - Every metric includes a factual helper line; no fabricated trends.
4. Learning performance
   - Score distribution rendered as an accessible lightweight bar chart.
   - Pass-rate ring and supporting statistics.
5. Recent submissions
   - Today-only submissions, newest first, with score state and timestamp.
6. Recent quizzes
   - Latest quizzes, class, question count, duration, and creation date.
   - Actions lead to existing create/manage tabs.

## Component boundaries

- `DashboardHero`: welcome context and primary actions.
- `QuickActionGrid`: tab navigation actions.
- `MetricGrid`: compact KPI cards and loading state.
- `PerformancePanel`: score distribution, pass rate, and empty/loading states.
- `RecentSubmissionsPanel`: today’s activity list.
- `RecentQuizzesPanel`: recent quiz list and management navigation.
- `OverviewTab`: data selection, class filtering, sorting, and composition only.

## Responsive behavior

- 375px: single-column hero, actions, panels; recent quizzes become cards.
- 768px: two-column quick actions and metrics; recent quizzes remain compact cards.
- 1024px: hero summary moves beside greeting; dashboard remains one main column because of sidebar; recent quizzes remain cards to avoid a cramped table.
- 1440px: performance panel spans two columns and activity panel occupies one column; recent quizzes switch to the full table.

## Accessibility

- One page-level heading.
- Native buttons for every action.
- Visible focus rings.
- `aria-current` and existing sidebar semantics remain unchanged.
- Chart has an explicit accessible label and text values.
- Loading, empty, and error states are announced with meaningful copy.
- Color is never the only score-status indicator.

## Verification

- TypeScript check.
- Focused overview tests.
- Full Vitest suite.
- Production Vite/Vercel build.
- Manual DOM and layout verification at 375, 768, 1024, and 1440px when browser tooling is available.
