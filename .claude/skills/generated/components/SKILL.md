---
name: components
description: "Skill for the Components area of itongquiz1. 60 symbols across 12 files."
---

# Components

60 symbols | 12 files | Cohesion: 98%

## When to Use

- Working with code in `src/`
- Understanding how explainAnswer, explainAnswer work
- Modifying components-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/components/StudentView.tsx` | StudentView, getInitialStep, generateUUID, shuffleArray, handleStart (+4) |
| `src/components/IoeStudentView.tsx` | fixReorderQuestion, IoeStudentView, formatTime, isQuestionAnswered, handleOrderingCardClick (+4) |
| `backups/20260211_pre_virtual_classroom/src/components/IoeStudentView.tsx` | fixReorderQuestion, IoeStudentView, formatTime, isQuestionAnswered, handleOrderingCardClick (+4) |
| `backups/20260211_pre_virtual_classroom/src/components/StudentView.tsx` | StudentView, generateUUID, handleSubmit, formatTime, isQuestionAnswered (+3) |
| `src/components/student/ResultScreen/components/AnswerCard.tsx` | AnswerCard, getStatusConfig, getQuestionText, getTypeLabel, formatStudentAnswer (+1) |
| `backups/20260211_pre_virtual_classroom/src/components/student/ResultScreen/components/AnswerCard.tsx` | AnswerCard, getStatusConfig, getQuestionText, getTypeLabel, formatStudentAnswer |
| `src/components/ExplanationModal.tsx` | ExplanationModal, fetchExplanation, handlePracticeAnswer, checkPracticeAnswer |
| `backups/20260211_pre_virtual_classroom/src/components/ExplanationModal.tsx` | ExplanationModal, fetchExplanation, handlePracticeAnswer, checkPracticeAnswer |
| `src/components/student/ResultScreen/components/ScoreBadge.tsx` | ScoreBadge, getBadgeConfig |
| `backups/20260211_pre_virtual_classroom/src/components/student/ResultScreen/components/ScoreBadge.tsx` | ScoreBadge, getBadgeConfig |

## Entry Points

Start here when exploring this area:

- **`explainAnswer`** (Function) — `src/services/aiTutorService.ts:63`
- **`explainAnswer`** (Function) — `backups/20260211_pre_virtual_classroom/src/services/aiTutorService.ts:81`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `explainAnswer` | Function | `src/services/aiTutorService.ts` | 63 |
| `explainAnswer` | Function | `backups/20260211_pre_virtual_classroom/src/services/aiTutorService.ts` | 81 |
| `StudentView` | Function | `src/components/StudentView.tsx` | 22 |
| `getInitialStep` | Function | `src/components/StudentView.tsx` | 33 |
| `generateUUID` | Function | `src/components/StudentView.tsx` | 76 |
| `shuffleArray` | Function | `src/components/StudentView.tsx` | 89 |
| `handleStart` | Function | `src/components/StudentView.tsx` | 152 |
| `shuffleWithinLevel` | Function | `src/components/StudentView.tsx` | 155 |
| `handleSubmit` | Function | `src/components/StudentView.tsx` | 459 |
| `formatTime` | Function | `src/components/StudentView.tsx` | 716 |
| `isQuestionAnswered` | Function | `src/components/StudentView.tsx` | 723 |
| `fixReorderQuestion` | Function | `src/components/IoeStudentView.tsx` | 26 |
| `IoeStudentView` | Function | `src/components/IoeStudentView.tsx` | 63 |
| `formatTime` | Function | `src/components/IoeStudentView.tsx` | 243 |
| `isQuestionAnswered` | Function | `src/components/IoeStudentView.tsx` | 257 |
| `handleOrderingCardClick` | Function | `src/components/IoeStudentView.tsx` | 272 |
| `handleTrueFalseClick` | Function | `src/components/IoeStudentView.tsx` | 657 |
| `fixReorderQuestion` | Function | `backups/20260211_pre_virtual_classroom/src/components/IoeStudentView.tsx` | 26 |
| `IoeStudentView` | Function | `backups/20260211_pre_virtual_classroom/src/components/IoeStudentView.tsx` | 63 |
| `formatTime` | Function | `backups/20260211_pre_virtual_classroom/src/components/IoeStudentView.tsx` | 232 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Services | 2 calls |

## How to Explore

1. `gitnexus_context({name: "explainAnswer"})` — see callers and callees
2. `gitnexus_query({query: "components"})` — find related execution flows
3. Read key files listed above for implementation details
