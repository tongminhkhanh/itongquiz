---
name: routes
description: "Skill for the Routes area of itongquiz1. 40 symbols across 15 files."
---

# Routes

40 symbols | 15 files | Cohesion: 85%

## When to Use

- Working with code in `workers/`
- Understanding how jsonResponse, errorResponse, mapPetData work
- Modifying routes-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `workers/src/routes/legacy.ts` | handleLegacyAction, handleCreateQuiz, handleUpdateQuiz, handleAddStudent, handleResetPassword (+7) |
| `workers/src/utils/helpers.ts` | mapPetData, parseBody, mapQuestionForSave, mapAssignment, mapAssignments (+2) |
| `workers/src/utils/response.ts` | jsonResponse, errorResponse, generateId, hashPassword, generateRandomPassword |
| `workers/src/index.ts` | fetch, addCors, handleLegacyGasRequest |
| `workers/src/routes/aiTutor.ts` | buildPrompt, handleAiTutorRoutes |
| `workers/src/middleware/cors.ts` | corsHeaders, handleCors |
| `workers/src/routes/teachers.ts` | handleTeacherRoutes |
| `workers/src/routes/results.ts` | handleResultRoutes |
| `workers/src/routes/quizzes.ts` | handleQuizRoutes |
| `workers/src/routes/practice.ts` | handlePracticeRoutes |

## Entry Points

Start here when exploring this area:

- **`jsonResponse`** (Function) — `workers/src/utils/response.ts:2`
- **`errorResponse`** (Function) — `workers/src/utils/response.ts:14`
- **`mapPetData`** (Function) — `workers/src/utils/helpers.ts:108`
- **`parseBody`** (Function) — `workers/src/utils/helpers.ts:265`
- **`handleTeacherRoutes`** (Function) — `workers/src/routes/teachers.ts:11`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `jsonResponse` | Function | `workers/src/utils/response.ts` | 2 |
| `errorResponse` | Function | `workers/src/utils/response.ts` | 14 |
| `mapPetData` | Function | `workers/src/utils/helpers.ts` | 108 |
| `parseBody` | Function | `workers/src/utils/helpers.ts` | 265 |
| `handleTeacherRoutes` | Function | `workers/src/routes/teachers.ts` | 11 |
| `handleResultRoutes` | Function | `workers/src/routes/results.ts` | 9 |
| `handleQuizRoutes` | Function | `workers/src/routes/quizzes.ts` | 11 |
| `handlePracticeRoutes` | Function | `workers/src/routes/practice.ts` | 3 |
| `handleGamificationRoutes` | Function | `workers/src/routes/gamification.ts` | 6 |
| `handleAnnouncementRoutes` | Function | `workers/src/routes/announcements.ts` | 8 |
| `handleAiTutorRoutes` | Function | `workers/src/routes/aiTutor.ts` | 48 |
| `handleAiProxy` | Function | `workers/src/routes/aiProxy.ts` | 13 |
| `corsHeaders` | Function | `workers/src/middleware/cors.ts` | 17 |
| `handleCors` | Function | `workers/src/middleware/cors.ts` | 30 |
| `verifyToken` | Function | `workers/src/middleware/auth.ts` | 5 |
| `mapQuestionForSave` | Function | `workers/src/utils/helpers.ts` | 7 |
| `mapAssignment` | Function | `workers/src/utils/helpers.ts` | 87 |
| `mapAssignments` | Function | `workers/src/utils/helpers.ts` | 96 |
| `handleValidateAnswers` | Function | `workers/src/utils/helpers.ts` | 136 |
| `handleLegacyAction` | Function | `workers/src/routes/legacy.ts` | 4 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Fetch → MapQuestionForSave` | cross_community | 5 |
| `Fetch → HandleValidateAnswers` | cross_community | 4 |
| `Fetch → HandleAddStudent` | cross_community | 4 |

## How to Explore

1. `gitnexus_context({name: "jsonResponse"})` — see callers and callees
2. `gitnexus_query({query: "routes"})` — find related execution flows
3. Read key files listed above for implementation details
