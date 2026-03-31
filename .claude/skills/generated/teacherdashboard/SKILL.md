---
name: teacherdashboard
description: "Skill for the TeacherDashboard area of itongquiz1. 116 symbols across 26 files."
---

# TeacherDashboard

116 symbols | 26 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how generateSmartDistractors, searchIoeQuestions, searchIoeQuestions work
- Modifying teacherdashboard-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/components/TeacherDashboard/QuizPreview.tsx` | fixReorderQuestion, insertTags, QuizPreview, applyFormat, supportsDistractors (+8) |
| `backups/20260211_pre_virtual_classroom/src/components/TeacherDashboard/QuizPreview.tsx` | fixReorderQuestion, insertTags, QuizPreview, applyFormat, supportsDistractors (+8) |
| `src/components/TeacherDashboard/PdfTab.tsx` | PdfTab, toggleQuestionType, generateAccessCode, handleDeleteQuestion, handleEditQuestion (+3) |
| `backups/20260211_pre_virtual_classroom/src/components/TeacherDashboard/PdfTab.tsx` | PdfTab, toggleQuestionType, generateAccessCode, handleDeleteQuestion, handleEditQuestion (+3) |
| `src/components/TeacherDashboard/IoeTab.tsx` | IoeTab, getQuestionHistory, saveToHistory, generateIoePrompt, handleGenerate |
| `backups/20260211_pre_virtual_classroom/src/components/TeacherDashboard/IoeTab.tsx` | IoeTab, getQuestionHistory, saveToHistory, generateIoePrompt, handleGenerate |
| `src/components/TeacherDashboard/TeacherManagementTab.tsx` | TeacherManagementTab, handleEdit, handleDelete, togglePassword, roleLabel |
| `src/components/TeacherDashboard/IoeManageTab.tsx` | IoeManageTab, loadQuizzes, handleDelete, handleCopyLink, handleOpenEdit |
| `backups/20260211_pre_virtual_classroom/src/components/TeacherDashboard/IoeManageTab.tsx` | IoeManageTab, loadQuizzes, handleDelete, handleCopyLink, handleOpenEdit |
| `src/components/TeacherDashboard/CreateTab.tsx` | CreateTab, generateRandomCode, handleGenerate, Section, toggleSection |

## Entry Points

Start here when exploring this area:

- **`generateSmartDistractors`** (Function) — `src/services/smartDistractorService.ts:91`
- **`searchIoeQuestions`** (Function) — `src/services/ioeSearchService.ts:43`
- **`searchIoeQuestions`** (Function) — `backups/20260211_pre_virtual_classroom/src/services/ioeSearchService.ts:43`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `generateSmartDistractors` | Function | `src/services/smartDistractorService.ts` | 91 |
| `searchIoeQuestions` | Function | `src/services/ioeSearchService.ts` | 43 |
| `searchIoeQuestions` | Function | `backups/20260211_pre_virtual_classroom/src/services/ioeSearchService.ts` | 43 |
| `callLLM` | Function | `src/services/smartDistractorService.ts` | 16 |
| `parseJSONResponse` | Function | `src/services/smartDistractorService.ts` | 39 |
| `fixReorderQuestion` | Function | `src/components/TeacherDashboard/QuizPreview.tsx` | 12 |
| `insertTags` | Function | `src/components/TeacherDashboard/QuizPreview.tsx` | 27 |
| `QuizPreview` | Function | `src/components/TeacherDashboard/QuizPreview.tsx` | 77 |
| `applyFormat` | Function | `src/components/TeacherDashboard/QuizPreview.tsx` | 132 |
| `supportsDistractors` | Function | `src/components/TeacherDashboard/QuizPreview.tsx` | 176 |
| `handleGenerateDistractors` | Function | `src/components/TeacherDashboard/QuizPreview.tsx` | 181 |
| `handleDeleteQuestion` | Function | `src/components/TeacherDashboard/QuizPreview.tsx` | 262 |
| `handleEditQuestion` | Function | `src/components/TeacherDashboard/QuizPreview.tsx` | 269 |
| `handleSaveEditedQuestion` | Function | `src/components/TeacherDashboard/QuizPreview.tsx` | 381 |
| `handleCloseEditModal` | Function | `src/components/TeacherDashboard/QuizPreview.tsx` | 514 |
| `handleOpenAddModal` | Function | `src/components/TeacherDashboard/QuizPreview.tsx` | 543 |
| `handleAddQuestion` | Function | `src/components/TeacherDashboard/QuizPreview.tsx` | 625 |
| `getTypeLabel` | Function | `src/components/TeacherDashboard/QuizPreview.tsx` | 805 |
| `fixReorderQuestion` | Function | `backups/20260211_pre_virtual_classroom/src/components/TeacherDashboard/QuizPreview.tsx` | 12 |
| `insertTags` | Function | `backups/20260211_pre_virtual_classroom/src/components/TeacherDashboard/QuizPreview.tsx` | 27 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Services | 1 calls |

## How to Explore

1. `gitnexus_context({name: "generateSmartDistractors"})` — see callers and callees
2. `gitnexus_query({query: "teacherdashboard"})` — find related execution flows
3. Read key files listed above for implementation details
