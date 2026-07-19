# Game Loop Route Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans task-by-task with TDD, review, and verification checkpoints.

**Goal:** Split `workers/src/routes/gameLoop.ts` into focused domain, persistence, and route modules without changing observable behavior.

**Architecture:** Keep `handleGameLoopRoutes(request, env, path, method)` as the only public entry. Extract pure helpers, then repositories/services, then endpoint handlers; leave the original file as a barrel.

**Tech Stack:** TypeScript, Cloudflare Workers, D1, Vitest, Wrangler.

## Locked contracts

- Table bootstrap remains before route-level JWT verification.
- Only JWT users with role `student` may continue.
- The JWT username remains the only identity used for reads and writes.
- Route/method pairs remain dashboard GET, track-quiz POST, claim-mission POST, claim-chest POST, weekly-quests GET, and claim-weekly-quest POST.
- Unknown paths or unsupported methods keep the existing 404 response.
- D1 schema, SQL semantics, reward probabilities, thresholds, copy, and response keys do not change.

## Intended boundaries

```text
workers/src/gameLoop/{types,constants,dateKeys,json}.ts
workers/src/gameLoop/{tableBootstrap,profileRepository,dailyProgressRepository}.ts
workers/src/gameLoop/{weeklyQuestService,missionService,rewardService}.ts
workers/src/gameLoop/{achievementService,dashboardService}.ts
workers/src/routes/gameLoop/{auth,dashboardRoute,trackQuizRoute}.ts
workers/src/routes/gameLoop/{claimMissionRoute,claimChestRoute,weeklyQuestRoutes}.ts
workers/src/routes/gameLoop/index.ts
workers/src/routes/gameLoop.ts
```

## Task 1: Characterize dispatch and authorization

- [ ] Add a D1 fixture that records SQL and returns stable profile/progress rows.
- [ ] Verify bootstrap before JWT failure, teacher 403, dashboard keys, validation messages, weekly quest shape, and fallback 404.
- [ ] Run `npm run test:run -- tests/gameLoop.worker.test.ts` and Worker typecheck.
- [ ] Commit the green plan and characterization tests.

## Task 2: Extract pure modules

- [ ] Move row types, constants, Bangkok/ISO week helpers, JSON parsing, category normalization, mission mapping, and chest selection.
- [ ] Add direct tests for date boundaries, category aliases, mission states, and deterministic chest branches.
- [ ] Keep modules mostly below 120 lines and run targeted tests/typecheck after every slice.

## Task 3: Extract persistence and services

- [ ] Move table creation without changing SQL or call order.
- [ ] Split profile, daily progress, weekly progress, mission, reward, achievement, and dashboard responsibilities.
- [ ] Keep dependency direction pure modules → repositories → services → routes.
- [ ] Preserve current quirks, including weekly updates that do not create missing progress rows.

## Task 4: Extract route handlers

- [ ] Create one handler per endpoint responsibility.
- [ ] Centralize JWT student authorization without changing status/message behavior.
- [ ] Keep the dispatcher below 100 lines.
- [ ] Replace `workers/src/routes/gameLoop.ts` with `export * from './gameLoop/index';` and leave `workers/src/index.ts` unchanged.

## Task 5: Verify and commit

- [ ] Run Game Loop tests, Worker typecheck, full tests, production build, security check, and Wrangler dry-run.
- [ ] Confirm runtime modules are mostly below 120 lines.
- [ ] Run staged review and GitNexus change detection.
- [ ] Commit the completed target:

```bash
git commit -m "refactor(game-loop): split missions rewards and route handlers"
```
