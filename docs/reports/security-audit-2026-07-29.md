# iTongQuiz security audit — 2026-07-29

## Executive summary

This audit was performed locally on branch `codex/security-audit-hardening` at base commit
`d12685e`. Source code was not uploaded to an external scanning service.

The review covered Cloudflare Worker route handlers, D1 query construction, authorization
boundaries, secret handling, dependency advisories, malicious-input regression tests, and a
production frontend build/smoke test.

Five exploitable authorization/integrity issues and one sensitive logging issue were confirmed
with failing tests before remediation. All added regression tests now pass.

## Scope and method

- Reviewed 44 Worker route files and 520 D1 `prepare()` call sites.
- Examined dynamic SQL builders and confirmed that user-controlled values are passed through D1
  bindings. Dynamic clauses, placeholder lists, and patch columns come from fixed server-side
  allowlists.
- Ran the repository secret scanner across 1,979 tracked/unignored files.
- Ran `npm audit --audit-level=high` and a production dependency audit.
- Used malicious values including SQL metacharacters, cross-student result IDs, unassigned private
  quiz IDs, arbitrary AI Tutor question IDs, forged correctness values, and a simulated upstream
  response containing a bearer secret.
- Ran Vitest, TypeScript checks, production build, Worker dry-run, asset budget, and Playwright
  smoke checks in headless Brave.

## Confirmed findings and remediation

### SEC-01 — Private quiz question IDOR (High, fixed)

An authenticated student could request `/api/questions?quizId=<private quiz>` for an arbitrary quiz
and receive sanitized question content even when the quiz was neither public nor assigned to that
student.

The route now requires a quiz to be public or linked to an assignment for the student's current
class/student ID. The student question catalog applies the same scope.

### SEC-02 — Quiz catalog information disclosure (High, fixed)

`GET /api/quizzes` returned all quiz records without role scoping.

The catalog is now scoped as follows:

- anonymous: public quizzes only;
- student: public or assigned quizzes;
- teacher: quizzes owned by the teacher, including the unique legacy owner-name mapping;
- admin: all quizzes.

### SEC-03 — Same-name student result IDOR (High, fixed)

Result authorization compared normalized student and class names. Two active students with the
same name in the same class could satisfy this check and read each other's answer data.

Result access now uses the canonical `student_id`. Legacy rows without an ID are accepted only when
the name/class pair resolves to exactly one active student. Result list queries use the same
canonical/unique-legacy rule.

### SEC-04 — AI Tutor private question IDOR (High, fixed)

Any authenticated user could submit arbitrary `quizId` and `wrongQuestionIds` values and cause the
Worker to load question content and correct answers into an AI prompt.

The endpoint now validates bounded, unique identifiers and enforces:

- admin access;
- teacher ownership of the quiz;
- student ownership of a submitted result for that quiz where every requested question is recorded
  as incorrect.

Malformed legacy results do not grant access.

### SEC-05 — Client-forged quiz score (High, fixed)

Student result submission trusted the browser-provided `isCorrect`, score, and correct count. A
student could call `POST /api/results` directly and award themselves a perfect score.

For student submissions, the Worker now extracts raw selected answers, reloads canonical questions
from D1, grades them server-side, overwrites every `isCorrect` value, and derives score/count totals
from the server result. Teacher/admin submissions remain trusted administrative writes.

### SEC-06 — Upstream secret/body written to logs (Medium, fixed)

AI Tutor and Help RAG logged the complete response body when the upstream AI service returned an
error. A reflective upstream or proxy response could place bearer tokens or sensitive content in
Worker logs.

Both routes now log only the upstream HTTP status. AI Tutor parse/shape failures no longer return or
log raw model output.

## SQL injection and secret review

No exploitable SQL injection was confirmed. A representative payload
`quiz-a' OR 1=1 --` remained absent from the SQL string and appeared only in D1 bindings.

Dynamic query construction was limited to:

- fixed WHERE clauses selected by server-side role/filter branches;
- `?` placeholder lists whose values are bound separately;
- fixed CTE fragments;
- fixed patch-column maps.

No committed high-confidence API keys, bearer tokens, private keys, or passwords were found.
Environment secret names are present as expected; values are provisioned outside source control.

## Verification results

- Targeted security regression tests: pass.
- Full Vitest suite: 283 files, 1,398 tests passed.
- Root TypeScript check: pass.
- Worker TypeScript check: pass.
- Secret scan: pass, 1,979 files checked.
- `npm audit --audit-level=high`: 0 vulnerabilities.
- Production frontend build and eight-page prerender: pass.
- Worker `wrangler deploy --dry-run`: pass.
- Login asset budget: pass, 151,987 bytes across three logo files.
- Playwright/Brave smoke: `/`, `/about`, and `/contact` returned HTTP 200 with expected titles and
  primary headings.

The local browser sandbox denied external Google Fonts and production API requests with
`ERR_NETWORK_ACCESS_DENIED`; these were environmental network blocks rather than application
exceptions.

## Residual risk and follow-up

- Public quizzes that use the legacy `access_code` flow still require the client to receive the code
  so it can compare locally. Replacing this UX gate with a rate-limited server-side verification
  token is recommended as a separate contract migration. This is not an API key exposure, but the
  code should not be treated as a strong security control.
- This audit did not perform destructive fuzzing against production D1. Malicious-input validation
  was performed against local Worker handlers and fake D1 adapters.
- Production deployment should include authenticated smoke checks for admin, teacher, and student
  accounts after the Worker is released.
