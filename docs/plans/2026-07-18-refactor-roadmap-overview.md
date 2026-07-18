# Refactor Roadmap Overview

Date: 2026-07-18

## Context

The dedicated IOE feature has been removed from the active application. Historical rows with the archived category remain in D1 for retention, while frontend loading, persisted cache hydration, navigation, sitemap generation, and quiz selection exclude that category.

The old recommendation to refactor `workers/src/routes/legacy.ts` is obsolete because that file no longer exists.

## Delivery Rules

- Deliver each priority in a separate pull request unless two files form one inseparable vertical slice.
- Add characterization tests before moving behavior.
- Preserve component props and HTTP response contracts during the first refactor pass.
- Do not combine feature work, visual redesign, schema migrations, or dependency upgrades with structural refactors.
- Keep orchestration files near 250 lines where practical and avoid replacement files larger than 400 lines.
- Run GitNexus impact analysis before shared-symbol or route changes and detect changed flows before commit.
- Require full tests, frontend and Worker type checks, security scan, production build, and deployment dry-runs.

## Recommended Order

1. Student dashboard.
2. Live-exam route and service.
3. Game-loop route.
4. Student result detail modal.
5. Classroom route.
6. Worksheet export.
7. Certificates route.
8. Result-sheet route.
9. Teacher results tab.
10. Quiz data gateway.
11. Smaller orchestration files.

Detailed scopes:

- Priorities 1–5: `2026-07-18-refactor-priorities-1-5.md`
- Priorities 6–10 and secondary backlog: `2026-07-18-refactor-priorities-6-10.md`

## Definition of Done

- Characterization tests exist before structural changes.
- No intentional feature or visual behavior change.
- No HTTP contract or database schema change unless documented as a separate migration.
- No new circular dependency.
- No new client-side secret or unsafe HTML path.
- Full verification and deployment checks pass.
- PR description includes before/after line counts, blast radius, affected flows, and rollback method.
