# Phase 04: Integration (Load Practice Quizzes)
Status: ⬜ Pending
Dependencies: Phase 03

## Objective
Connect the Frontend UI selection (Subject + Topic) to the `TakeQuizUI` component so the student can actually perform the practice test and receive results.

## Requirements
### Functional
- [ ] Clicking a 'Topic' calls the Backend API to generate a virtual 10-question quiz.
- [ ] Pass the virtual quiz into `TakeQuizUI` component.
- [ ] The `TakeQuizUI` should function normally (submit answers, show ResultScreen).
- [ ] Save the result with a special flag `isPractice = 1` or associate it with the "Practice" assignment. (Decide if we track Practice scores per student).

## Implementation Steps
1. [ ] Create a wrapper or modify `StartPractice()` logic to fetch the virtual quiz from the backend.
2. [ ] Add `isPractice` flag or logic into `TakeQuizUI` / `quizStore` to differentiate normal assignments from practice runs.
3. [ ] Hide the "Hạn nộp" (deadline) and teacher references from the `TakeQuizUI` if it's a practice test.

## Files to Create/Modify
- `src/stores/quizStore.ts` - Manage virtual practice quiz state
- `src/components/student/TakeQuizUI/index.tsx` - Handle practice mode logic

## Test Criteria
- [ ] A student completes a 10-question practice topic successfully.
- [ ] The ResultScreen is displayed with points/coins at the end of the practice.

---
Next Phase: (Optional) Phase 05 Teacher Tagging UI
