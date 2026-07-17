# Learning Adventure Dashboard — Task Checklist

Reference spec: `docs/specs/2026-07-18-learning-adventure-student-dashboard.md`

Detailed plan: `docs/superpowers/plans/2026-07-18-learning-adventure-dashboard.md`

## Foundation

- [ ] Task 1 — Presentation contracts and pure helpers
  - [ ] GitNexus impact if an existing symbol is edited
  - [ ] RED test observed
  - [ ] GREEN test observed
  - [ ] Commit created

- [ ] Task 2 — Dashboard state primitives
  - [ ] Assignment skeleton
  - [ ] Hero/progress skeletons
  - [ ] Compact empty state
  - [ ] Local section error + retry
  - [ ] Tests pass
  - [ ] Commit created

## Learning Priority

- [ ] Task 3 — Accessible header/account menu
  - [ ] All existing actions preserved
  - [ ] Click and keyboard menu
  - [ ] Escape closes menu
  - [ ] No live-exam pulse
  - [ ] 44px targets
  - [ ] Commit created

- [ ] Task 4 — Hero and assigned work
  - [ ] One `h1`
  - [ ] Light hero, no dark gradient
  - [ ] Assigned work directly after hero
  - [ ] Empty-work CTA only scrolls to practice library; no automatic subject selection
  - [ ] Section skeleton/error/retry/empty states
  - [ ] Existing ordering and pagination preserved
  - [ ] Commit created

- [ ] Checkpoint A approved

## Progress and Rewards

- [ ] Task 5 — Daily progress and weekly quests
  - [ ] Accessible progressbars
  - [ ] Local loading/error/retry
  - [ ] Weekly empty copy approved
  - [ ] Processing/completed/disabled states
  - [ ] No width animation
  - [ ] Commit created

- [ ] Task 6 — Reward sidebar and badge gallery
  - [ ] Chest states
  - [ ] Weekly rhythm semantics
  - [ ] Badge empty guidance
  - [ ] Gift Shop flag preserved
  - [ ] BadgeGallery close label and reduced motion
  - [ ] Commit created

- [ ] Task 7 — Practice grid and homework alignment
  - [ ] Subject cards are native buttons
  - [ ] 1/2/3–4 responsive columns
  - [ ] Homework card has one explicit CTA
  - [ ] Homework skeleton/error/empty states
  - [ ] Commit created

- [ ] Checkpoint B approved

## Composition and Quality

- [ ] Task 8 — Responsive shell and accessibility
  - [ ] Desktop grid exactly `minmax(0, 2fr) minmax(300px, 1fr)`
  - [ ] Max width 1280px
  - [ ] Mobile DOM order correct
  - [ ] Reduced motion scoped to dashboard
  - [ ] Avatar dialog semantics and Escape
  - [ ] Full tests pass
  - [ ] Build passes
  - [ ] Commit created

- [ ] Task 9 — Responsive regression and final gate
  - [ ] 375 × 812 checked
  - [ ] 768 × 1024 checked
  - [ ] 1024 × 768 checked
  - [ ] 1440 × 900 checked
  - [ ] No horizontal overflow
  - [ ] Keyboard-only flow checked
  - [ ] Touch/mouse flow checked
  - [ ] Accessibility tree checked
  - [ ] Console errors checked
  - [ ] `prefers-reduced-motion` checked
  - [ ] Impeccable detect = 0
  - [ ] GitNexus detect_changes reviewed
  - [ ] Final commit created

## Final Approval

- [ ] No API or business logic change
- [ ] No existing function lost
- [ ] All Phase 1 acceptance criteria have evidence
- [ ] Ready for merge review
