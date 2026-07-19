# Classroom Route Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans with TDD, review, and verification checkpoints.

**Goal:** Split `workers/src/routes/classroom.ts` into focused login, class, student, and assignment modules without changing contracts.

**Architecture:** Keep `handleClassroomRoutes(request, env, path, method)` and the validation exports stable. Dispatch public student login before JWT verification, then pass an authenticated context to small endpoint handlers; leave the original file as a barrel.

**Tech Stack:** TypeScript, Cloudflare Workers, D1, Vitest, Wrangler.

## Locked contracts

- `POST /api/student-login` remains public and sets the JWT cookie on success.
- Every other route still uses `verifyJWTMiddleware` before dispatch.
- Admin, teacher ownership, student self-access, archive, password, and assignment-attempt rules remain unchanged.
- Permanent class deletion remains disabled with status 405.
- Request/response shapes, validation copy, SQL behavior, and D1 schema remain unchanged.
- Existing exports `normalizeStudentInput`, `validateStudentInput`, and `handleClassroomRoutes` remain available from `workers/src/routes/classroom.ts`.

## Intended boundaries

```text
workers/src/classroom/{types,validation,repositories,authorization}.ts
workers/src/routes/classroom/studentLoginRoute.ts
workers/src/routes/classroom/class*.ts
workers/src/routes/classroom/student*.ts
workers/src/routes/classroom/assignment*.ts
workers/src/routes/classroom/index.ts
workers/src/routes/classroom.ts
```

## Task 1: Characterize route boundaries

- [ ] Verify login validation occurs without JWT middleware.
- [ ] Verify protected routes return JWT failure before route fallback.
- [ ] Verify student roster responses hide parent phone and creation time.
- [ ] Verify class permanent deletion stays 405.
- [ ] Verify password and avatar changes stay self-only.
- [ ] Verify assignment start rejects another class/student and keeps attempt checks.
- [ ] Verify unknown authenticated routes remain 404.
- [ ] Run Classroom and Smart Assignment tests, Worker typecheck, then commit tests and this plan.

## Task 2: Extract shared domain and authorization

- [ ] Move student normalization/validation to `validation.ts`.
- [ ] Move class/student/assignment lookup helpers to repositories.
- [ ] Move class ownership and teacher requirement helpers to `authorization.ts`.
- [ ] Keep dependency direction validation/repositories → authorization → routes.

## Task 3: Extract routes

- [ ] Extract public login before authenticated dispatch.
- [ ] Split class list/create/reassign/archive/delete handlers.
- [ ] Split student list/create/batch/archive/password/avatar handlers.
- [ ] Split assignment read, preview, create, delete, deadline, status, and start handlers.
- [ ] Keep each runtime module mostly below 120 lines and dispatcher below 100 lines.
- [ ] Replace the original file with a barrel without changing `workers/src/index.ts`.

## Task 4: Verify and commit

- [ ] Run targeted Classroom/Smart Assignment tests and Worker typecheck.
- [ ] Run full tests, frontend typecheck, build, security check, and Wrangler dry-run.
- [ ] Run staged review and GitNexus change detection.
- [ ] Commit the completed target:

```bash
git commit -m "refactor(classroom): split login roster and assignment routes"
```
