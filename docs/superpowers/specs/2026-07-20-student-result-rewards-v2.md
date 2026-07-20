# Student Result and Rewards V2

## Goal

Create one trustworthy post-submission flow for students: the saved result is the single source of truth, rewards are calculated and claimed by the Worker exactly once, the completion dialog is encouraging without overstating performance, and study recommendations use only answered-but-incorrect questions.

## Release strategy

Deliver the approved option B in three independently testable stages.

1. Normalize scoring and rewards.
2. Redesign the completion dialog and result page.
3. Make the study plan conditional and lazy-loaded.

## Locked contracts

- `StudentResult.score` remains a 0–10 value with one decimal place.
- Accuracy is a separate 0–100 percentage derived from `correctCount / totalQuestions`.
- Correct, incorrect, and skipped are distinct states.
- Existing answer-validation rules and local overrides for `ORDERING`, `UNDERLINE`, and `ERROR_CORRECTION` remain intact.
- The saved result and its graded answer snapshots are the canonical source for result UI, reports, rewards, and recommendations.
- The frontend must not choose its own EXP or coin amounts for quiz completion.
- A reward claim is idempotent by student, activity type, and activity ID.
- Existing generic `/api/game-state` behavior remains for legacy callers during this release, but quiz completion and Dr Owl stop using it directly.

## Canonical result model

Create a shared result-summary utility that reads the graded answer snapshots first and produces:

```ts
type AnswerOutcome = 'correct' | 'incorrect' | 'skipped';

interface StudentResultSummary {
  correct: number;
  incorrect: number;
  skipped: number;
  total: number;
  score10: number;
  accuracyPercent: number;
}
```

All student result components receive the normalized `StudentResult`. They must not recount directly from raw `validationDetails`.

## Reward policy

Quiz-completion rewards are server-owned and derived from the saved result:

- Base completion: 10 EXP.
- Accuracy: 5 EXP for each completed 10% band, capped at 50 EXP.
- Score at least 8.0: 10 bonus EXP.
- Perfect score: 20 additional EXP.
- Coins by score band: under 5 = 0, 5–6.9 = 10, 7–8.9 = 15, 9–9.9 = 20, 10 = 30.
- Total quiz reward therefore stays within 90 EXP and 30 coins.

Rewards are stored in `reward_receipts` with a unique key on `(username, activity_type, activity_id)`. Repeated claims return the existing receipt and do not mutate game state again.

The Dr Owl bonus is disabled from the result flow in this release. It may only be re-enabled through a dedicated server-owned, idempotent claim keyed by the saved result and practice set.

## Completion dialog

The dialog appears after the result is saved, even when the student answered zero questions correctly.

Headline:

> Chúc mừng em đã hoàn thành bài tập!

The dialog shows:

- saved score as `/10`;
- correct answers as `x/y`;
- awarded EXP and coins;
- current level progress;
- level-up state when applicable;
- primary action `Xem kết quả`;
- secondary action `Về trang chủ`.

Use a calm white/off-white surface, thin borders, sky-blue primary action, and no gradient-heavy game card. Confetti is brief and subtle for normal completion. Full fireworks are allowed only for a perfect score or level-up. Respect reduced-motion preferences.

## Result page

Replace the current two-tab structure with:

1. `Kết quả` — default.
2. `Xem lại bài` — all, incorrect, and skipped filters.
3. `Kế hoạch ôn tập` — shown when at least one answered question is incorrect.

The result page contains one compact result header and one next-step card. It removes duplicate banners and duplicate progress visualizations.

For low evidence such as 30 skipped out of 35, the copy must state completion facts rather than diagnose weakness. The primary action should direct the student to unfinished questions or another attempt when allowed.

Time formatting:

- under 60 seconds: seconds;
- otherwise minutes and seconds;
- invalid values: `Chưa xác định`.

## Study plan

- Do not call AI on initial result-page render.
- Call AI only when the student opens `Kế hoạch ôn tập` or explicitly requests a recommendation.
- Send score as `x/10` and accuracy as `y%`.
- Use answered-but-incorrect questions only.
- Skipped questions appear in review and completion guidance, not weakness analysis.
- When evidence is too small, label the recommendation as directional rather than definitive.
- Remove references to a nonexistent `Chi tiết` tab.

## Error handling

- Saving a result remains blocking: a failed save prevents the completion state.
- Reward claim failure must not hide the saved result. The dialog shows `Phần thưởng đang được đồng bộ` and exposes retry.
- A repeated reward request returns the previous reward payload with `alreadyClaimed: true`.
- AI errors remain local to the study-plan panel and expose retry.

## Accessibility and responsive behavior

- Dialog uses `role="dialog"`, `aria-modal="true"`, initial focus, Escape handling, and focus return.
- All tabs and filters are native buttons with visible focus.
- Status is never conveyed by color alone.
- Layout must work at 320px, 768px, 1024px, and 1440px.

## Verification

- Unit tests for summary, reward policy, score formatting, skipped filtering, and time formatting.
- Worker tests for ownership, missing result, duplicate claim, and exact reward values.
- Component tests for dialog copy, reward retry, tab availability, and lazy AI loading.
- Existing full Vitest suite, production build, security scan, staged review, and GitNexus change detection must pass before merge.
