# Learning Adventure Dashboard — Task Checklist

Reference spec: `docs/specs/2026-07-18-learning-adventure-student-dashboard.md`

Detailed plan: `docs/superpowers/plans/2026-07-18-learning-adventure-dashboard.md`

## Foundation

- [x] Task 1 — Presentation contracts and pure helpers
  - [x] GitNexus staged change review completed; low risk
  - [x] RED test observed
  - [x] GREEN test observed
  - [x] Commit created: `afc2726`

- [x] Task 2 — Dashboard state primitives
  - [x] Assignment skeleton
  - [x] Hero/progress skeletons
  - [x] Compact empty state
  - [x] Local section error + retry
  - [x] Tests pass
  - [x] Commit created: `b80a535`

## Learning Priority

- [x] Task 3 — Accessible header/account menu
  - [x] All existing actions preserved
  - [x] Click and keyboard menu
  - [x] Escape closes menu
  - [x] No live-exam pulse
  - [x] 44px targets
  - [x] Commit created: `d86eb30`

- [x] Task 4 — Hero and assigned work
  - [x] One `h1`
  - [x] Light hero, no dark gradient
  - [x] Assigned work directly after hero
  - [x] Empty-work CTA only scrolls to practice library; no automatic subject selection
  - [x] Section skeleton/error/retry/empty states
  - [x] Existing ordering and pagination preserved
  - [x] Commit created: `dfe7dd6`

- [x] Checkpoint A implementation checks completed (tests, DOM order, contracts); visual viewport review deferred to Task 9

## Progress and Rewards

- [x] Task 5 — Daily progress and weekly quests
  - [x] Accessible progressbars
  - [x] Local loading/error/retry
  - [x] Weekly empty copy approved
  - [x] Processing/completed/disabled states
  - [x] No width animation
  - [x] Commit created: `701fba3`

- [x] Task 6 — Reward sidebar and badge gallery
  - [x] Chest states
  - [x] Weekly rhythm semantics
  - [x] Badge empty guidance
  - [x] Gift Shop flag preserved
  - [x] BadgeGallery close label and reduced motion
  - [x] Commit created: `ded63ba`

- [x] Task 7 — Practice grid and homework alignment
  - [x] Subject cards are native buttons
  - [x] 1/2/3–4 responsive columns
  - [x] Homework card has one explicit CTA
  - [x] Homework skeleton/error/empty states
  - [x] Commit created: `f3465a6`

- [x] Checkpoint B implementation checks completed (column ownership, DOM priority, preserved secondary flows)

## Composition and Quality

- [x] Task 8 — Responsive shell and accessibility
  - [x] Desktop grid exactly `minmax(0, 2fr) minmax(300px, 1fr)`
  - [x] Max width 1280px
  - [x] Mobile DOM order correct
  - [x] Reduced motion scoped to dashboard
  - [x] Avatar dialog semantics and Escape
  - [x] Full tests pass: 371/371
  - [x] Frontend production bundle passes with `npx vite build`
  - [x] Commit created: `715faa1`

- [ ] Task 9 — Responsive regression and final gate
  - [x] Authenticated responsive Cypress spec created and successfully compiled/launched
  - [ ] 375 × 812 checked — blocked by missing Cypress `studentUsername`/`studentPassword`
  - [ ] 768 × 1024 checked — blocked by missing Cypress `studentUsername`/`studentPassword`
  - [ ] 1024 × 768 checked — blocked by missing Cypress `studentUsername`/`studentPassword`
  - [ ] 1440 × 900 checked — blocked by missing Cypress `studentUsername`/`studentPassword`
  - [ ] No horizontal overflow — assertion exists; authenticated execution blocked
  - [ ] Keyboard-only flow checked — account menu assertion exists; authenticated execution blocked
  - [ ] Touch/mouse flow checked — authenticated execution blocked
  - [x] Accessibility semantics covered by component/integration tests
  - [ ] Browser accessibility tree checked — authenticated execution blocked
  - [ ] Console errors checked — assertion exists; authenticated execution blocked
  - [ ] `prefers-reduced-motion` browser emulation checked — assertion exists; authenticated execution blocked
  - [ ] Impeccable detect = 0 — blocked because no Impeccable command or connected tool is available
  - [x] GitNexus compare against `main` reviewed: low risk, 25 changed symbols, 0 affected execution flows
  - [x] Final Task 9 commit created

## Final Approval

- [x] No API, Worker, schema, dependency or business-rule change detected
- [x] Existing early-return, live exam, assignment, homework and modal flows preserved in code/tests
- [ ] All Phase 1 acceptance criteria have evidence — browser viewport and Impeccable evidence remain blocked
- [ ] Ready for merge review — pending authenticated Cypress and Impeccable quality gate
