# Phase 03: Frontend UI (Subject & Topic Explorer)
Status: ⬜ Pending
Dependencies: Phase 02

## Objective
Create the navigation and UI layer for the Practice Library inside the Student Dashboard. 

## Requirements
### Functional
- [ ] Dashboard shows 'Thư viện luyện tập' with subject cards (Toán, Tiếng Việt, Tiếng Anh...).
- [ ] Clicking a subject expands or navigates to a `SubjectLibrary` view showing available auto-discovered topics (e.g., `#Phép_Nhân`, `#Phép_Cộng`).
- [ ] Show loading state while fetching topics.
- [ ] Nice-to-have: Show a random icon or color for each topic based on the string hash.

## Implementation Steps
1. [ ] Update `src/components/HomePage/StudentDashboardUI.tsx` to make the Subject cards clickable.
2. [ ] Create a modal or new route for `TopicExplorer`.
3. [ ] Fetch topics using the `practiceService.ts`.
4. [ ] Render topic cards. When clicked, it passes the tag to the TakeQuizUI launcher.

## Files to Create/Modify
- `src/components/student/PracticeLibrary/SubjectLibrary.tsx` (New)
- `src/components/HomePage/StudentDashboardUI.tsx`
- `src/components/student/PracticeLibrary/TopicCard.tsx` (New)

## Test Criteria
- [ ] A student can browse subjects.
- [ ] A student sees the auto-generated topics and can click one to start practice.

---
Next Phase: Phase 04 Integration
