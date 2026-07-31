# Quiz Player Calm Focus Redesign

**Date:** 2026-07-31
**Status:** Approved
**Applies to:** Standard quiz player and Live Exam

## Goal

Redesign the current exam-taking interface with a calm, minimalist visual system that reduces hard borders and decorative noise while making the question prompt and countdown timer the two clear focal points.

The redesign must preserve the existing exam behavior, including ten questions per page, answer state, pagination, countdown, automatic submission, result submission, and Live Exam activity tracking.

## Approved Visual Direction

The selected direction is **Calm Focus**.

- Use a soft neutral page background, white content surfaces, restrained sky/teal accents, and emerald selection states.
- Replace hard card borders with spacing, subtle background contrast, and soft shadows.
- Present the question prompt in a pale sky-to-teal surface at the top of each question card.
- Present the countdown as a compact elevated capsule with a Lucide timer icon.
- When fewer than 60 seconds remain, change the timer to a calm coral warning state without flashing or shaking.
- Keep the desktop question navigator as a compact sidebar.
- On mobile, use a horizontally scrollable strip of question-number chips instead of hiding navigation completely.

## Layout and Component Boundaries

The shared quiz-player components are the source of truth for both standard quizzes and Live Exam:

- `QuizHeader` owns the title, student/context copy, progress bar, and timer treatment.
- `QuizNavigation` owns desktop navigation and a new compact mobile presentation.
- `QuestionRenderer` owns the shared question card and prompt hierarchy.
- `QuizPagination` owns previous, next, and submit actions.
- Choice-based renderers own answer-button states while following the same visual contract.

`StudentView` and `LiveExamQuiz` only align their outer shell, content width, spacing, and navigation placement. Their state management, timer sources, submission logic, activity tracking, and API behavior remain unchanged.

The page continues to render up to ten questions per page. The redesign creates a focal prompt inside each question card rather than switching to a single-question flow.

## Interaction Design

- Use Lucide icons consistently: `Timer`, `Check`, `ChevronLeft`, `ChevronRight`, `Send`, and `ListChecks`.
- Answer buttons have no hard default border. They use a soft neutral surface and a subtle hover lift.
- Pressing an answer applies a short `scale(0.985)` response before settling into the selected state.
- Selected answers use an emerald-tinted surface and a check icon.
- Selection styling must never reveal correctness before submission.
- Navigation and submit buttons use the same restrained motion and surface hierarchy.
- Users with `prefers-reduced-motion` receive no scale or movement animation.

The same answer-state contract applies to MCQ, true/false, multiple-select, image-choice, and underline-choice renderers. Drag/drop and text-entry question types retain their existing behavior and receive only compatible surface/spacing refinements.

## Accessibility

- Preserve `aria-pressed`, `aria-current`, progress semantics, live status text, and existing keyboard behavior.
- Keep a visible focus ring even where default borders are removed.
- Maintain a minimum interactive target of 44 by 44 CSS pixels.
- Timer urgency must not depend on animation and must retain readable contrast.
- Icons are decorative when adjacent text already communicates the action; otherwise they receive an accessible label through the button.
- Mobile layouts must not create horizontal page overflow.

## Error and Edge States

- Practice mode replaces the countdown capsule with a subdued practice label.
- Empty Live Exam loading and submission errors keep their existing behavior, with surfaces updated to the Calm Focus system.
- Disabled pagination and submit actions remain visibly disabled without reducing text contrast below accessible levels.
- Long quiz titles truncate without pushing the timer off-screen.
- Long prompts, mathematical content, and question images must continue to wrap and size correctly.

## Verification

Automated verification covers:

- timer normal, urgent, and practice states;
- answer unselected, pressed, selected, keyboard-focus, and reduced-motion states;
- previous, next, and submit controls with Lucide icons;
- standard quiz and Live Exam pagination behavior;
- desktop sidebar and mobile question-strip navigation;
- representative choice renderers without correctness disclosure.

Run targeted component tests, typecheck, and the production build. Then use Playwright at desktop and mobile widths to verify hierarchy, overflow, focus visibility, answer interaction, timer urgency, pagination, and absence of console errors.

## Out of Scope

- Changing the number of questions per page.
- Changing quiz state, answer formats, scoring, timer calculations, submission, autosubmit, or Live Exam tracking.
- Redesigning access-code, student-information, result, reward, or teacher authoring screens.
- Adding a new animation library or design-system dependency.
