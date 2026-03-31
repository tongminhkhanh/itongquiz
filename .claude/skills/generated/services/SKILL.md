---
name: services
description: "Skill for the Services area of itongquiz1. 172 symbols across 30 files."
---

# Services

172 symbols | 30 files | Cohesion: 97%

## When to Use

- Working with code in `src/`
- Understanding how prepareQuizForSave, saveQuizToSheet, saveResultToSheet work
- Modifying services-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/services/geminiService.ts` | buildPrompt, parseAndRepairJSON, extractAIContent, generateWithPerplexity, generateWithGemini (+8) |
| `src/services/ioeSheetService.ts` | fixReorderQuestion, getCachedQuizzes, getStaleCachedQuizzes, setCachedQuizzes, revalidateInBackground (+8) |
| `backups/20260211_pre_virtual_classroom/src/services/ioeSheetService.ts` | fixReorderQuestion, getCachedQuizzes, getStaleCachedQuizzes, setCachedQuizzes, revalidateInBackground (+8) |
| `src/services/googleSheetService.ts` | callGasApi, escapeSheetValue, prepareQuizForSave, saveQuizToSheet, saveResultToSheet (+7) |
| `backups/20260211_pre_virtual_classroom/src/services/geminiService.ts` | buildPrompt, parseAndRepairJSON, generateWithPerplexity, generateWithGemini, generateWithOpenAI (+7) |
| `backups/20260211_pre_virtual_classroom/src/services/googleSheetService.ts` | callGasApi, escapeSheetValue, prepareQuizForSave, saveQuizToSheet, saveResultToSheet (+6) |
| `src/services/pdfExportService.ts` | exportResultToPDF, checkNewPage, splitText, checkAnswer, getQuestionTypeLabel (+4) |
| `backups/20260211_pre_virtual_classroom/src/services/pdfExportService.ts` | exportResultToPDF, checkNewPage, splitText, checkAnswer, getQuestionTypeLabel (+4) |
| `src/services/classroomService.ts` | callGasApi, deleteClass, deleteStudent, deleteAssignment, updateAssignmentDeadline (+3) |
| `src/services/CacheService.ts` | invalidatePrefix, constructor, checkLocalStorageAvailability, loadFromLocalStorage, isExpired (+2) |

## Entry Points

Start here when exploring this area:

- **`prepareQuizForSave`** (Function) — `src/services/googleSheetService.ts:447`
- **`saveQuizToSheet`** (Function) — `src/services/googleSheetService.ts:520`
- **`saveResultToSheet`** (Function) — `src/services/googleSheetService.ts:530`
- **`deleteResultFromSheet`** (Function) — `src/services/googleSheetService.ts:544`
- **`deleteQuizFromSheet`** (Function) — `src/services/googleSheetService.ts:553`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `prepareQuizForSave` | Function | `src/services/googleSheetService.ts` | 447 |
| `saveQuizToSheet` | Function | `src/services/googleSheetService.ts` | 520 |
| `saveResultToSheet` | Function | `src/services/googleSheetService.ts` | 530 |
| `deleteResultFromSheet` | Function | `src/services/googleSheetService.ts` | 544 |
| `deleteQuizFromSheet` | Function | `src/services/googleSheetService.ts` | 553 |
| `updateQuizInSheet` | Function | `src/services/googleSheetService.ts` | 562 |
| `generateQuiz` | Function | `src/services/geminiService.ts` | 1031 |
| `extractTextFromPdf` | Function | `src/services/geminiService.ts` | 1155 |
| `exportResultToPDF` | Function | `src/services/pdfExportService.ts` | 14 |
| `checkNewPage` | Function | `src/services/pdfExportService.ts` | 29 |
| `splitText` | Function | `src/services/pdfExportService.ts` | 37 |
| `exportResultToPDF` | Function | `backups/20260211_pre_virtual_classroom/src/services/pdfExportService.ts` | 14 |
| `checkNewPage` | Function | `backups/20260211_pre_virtual_classroom/src/services/pdfExportService.ts` | 29 |
| `splitText` | Function | `backups/20260211_pre_virtual_classroom/src/services/pdfExportService.ts` | 37 |
| `saveQuizToSheet` | Function | `backups/20260211_pre_virtual_classroom/src/services/googleSheetService.ts` | 436 |
| `saveResultToSheet` | Function | `backups/20260211_pre_virtual_classroom/src/services/googleSheetService.ts` | 446 |
| `deleteQuizFromSheet` | Function | `backups/20260211_pre_virtual_classroom/src/services/googleSheetService.ts` | 460 |
| `updateQuizInSheet` | Function | `backups/20260211_pre_virtual_classroom/src/services/googleSheetService.ts` | 469 |
| `generateQuiz` | Function | `backups/20260211_pre_virtual_classroom/src/services/geminiService.ts` | 1032 |
| `extractTextFromPdf` | Function | `backups/20260211_pre_virtual_classroom/src/services/geminiService.ts` | 1137 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Wsrelay | 2 calls |

## How to Explore

1. `gitnexus_context({name: "prepareQuizForSave"})` — see callers and callees
2. `gitnexus_query({query: "services"})` — find related execution flows
3. Read key files listed above for implementation details
