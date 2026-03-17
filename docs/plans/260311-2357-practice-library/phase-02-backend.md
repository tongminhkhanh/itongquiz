# Phase 02: Backend API (Fetch Random by Topic)
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Create an API endpoint that fetches N random questions matching a specific topic (tag) and dynamically generates a virtual Quiz object for the student to practice.

## Requirements
### Functional
- [ ] Support querying: GET `/api/practice?subject=Toán&topic=#Phép_Nhân`
- [ ] Support querying available topics: GET `/api/practice/topics` (Returns distinct tags available in DB)
- [ ] Generate a virtual `quiz` object payload containing `LIMIT 15` questions.

## Implementation Steps
1. [ ] Add `practice.ts` to workers routes
2. [ ] Implement endpoint to discover topics: scan `tags` column, split by space/comma, ignore empty, return unique list
3. [ ] Implement endpoint to fetch random questions (`ORDER BY RANDOM() LIMIT 10`) matching the requested tag
4. [ ] Format the response to exactly match the payload expected by `TakeQuizUI`

## Files to Create/Modify
- `workers/src/routes/practice.ts` - New API handler
- `workers/src/index.ts` - Mount the new route
- `src/services/practiceService.ts` - Frontend API client

## Test Criteria
- [ ] The API successfully returns 10 random questions associated with a given tag.
- [ ] The API correctly lists available topics.

---
Next Phase: Phase 03 Frontend UI
