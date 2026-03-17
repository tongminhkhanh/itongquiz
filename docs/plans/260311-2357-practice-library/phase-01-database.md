# Phase 01: Setup Database (Tags & Indexes)
Status: ⬜ Pending
Dependencies: None

## Objective
Update the `questions` or `quizzes` table in D1 if necessary to ensure it supports robust topic indexing/tagging.

## Requirements
### Functional
- [ ] Determine how to store tags (e.g. JSON array in `questions` table or a `tags` TEXT column)
- [ ] Write a migration script if we need a new column `tags` TEXT
- [ ] Ensure queries can quickly find `LIKE '%#hashtag%'`

## Implementation Steps
1. [ ] Check current `questions` schema in D1
2. [ ] If missing, create migration `add_tags_to_questions.sql`
3. [ ] Apply migration locally and to production

## Files to Create/Modify
- `workers/src/db/schema.sql` - Record the schema change
- `workers/migrations/*` - Add the migration file

## Test Criteria
- [ ] We can manually add a `#Math` tag to a question in the database and run a SELECT LIKE query.

---
Next Phase: Phase 02 Backend API
