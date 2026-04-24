# Teacher Intervention Flow Dev-Ready

## Summary

Tai lieu nay chot thiet ke cho batch tiep theo cua `itongquiz`:

- tap trung vao `teacher-side intervention flow`
- khong mo them feature rong
- polish flow hien co:
  - `Weakness Profile`
  - `Smart Preview`
  - `AssignmentTab`
- uu tien `code sach`, de test, de mo rong sau nay

Muc tieu la bien flow:

`Weakness -> Smart Preview -> AssignmentTab -> Confirm Assignment`

thanh mot trai nghiem ro rang, nhanh, va dang tin cay hon cho giao vien.

## Current State

Nhung gi da co trong codebase:

- `StudentDetailModal` da tai `weakness profile`
- `StudentDetailModal` da goi `smart-preview`
- `StudentDetailModal` da co nut `Dung trong AssignmentTab`
- `useTeacherDashboardUIStore` da co `assignmentComposerDraft`
- `AssignmentTab` da hydrate draft
- `AssignmentTab` da hien `matchReason`, `confidence`, warning va cho teacher chinh tay

Nhung van de con lai:

- `AssignmentTab` dang vua dieu phoi state, vua render kha nhieu UI giai thich
- thong tin quyet dinh dang bi tan man:
  - weakness
  - match reason
  - confidence
  - warnings
  - target difficulty
- teacher nhin thay goi y, nhung UX chua dong goi thanh mot "quyet dinh giao bai" ro rang

## Goal

Teacher mo ket qua cua 1 hoc sinh, xem smart preview, day sang `AssignmentTab`, va hieu ngay:

- hoc sinh dang yeu ky nang nao
- vi sao de nay duoc goi y
- do tin cay cua goi y nay
- co can xem lai khong
- neu dong y thi giao bai ngay

## Non-Goals

Batch nay khong lam:

- student-side UX moi
- class-level dashboard moi
- refactor lon `smartAssignment` scoring
- metadata backfill phase 2
- route backend moi neu contract hien tai da du
- redesign toan bo `AssignmentTab`

## Assumptions

- `AssignmentTab` van la noi xac nhan assignment cuoi cung
- `StudentDetailModal` chi la diem khoi phat, khong tro thanh noi confirm cuoi
- response hien tai cua `smart-preview` va `weakness profile` da du cho batch polish nay
- co the them field additive vao `AssignmentComposerDraft` neu can, nhung uu tien tan dung shape hien co
- integration test hien co se tiep tuc la bai test chinh cho flow nay

## Chosen Approach

### Decision

Chon huong toi uu cho du an:

- tach mot component moi: `SmartAssignmentInsightCard`
- component nay la `presentation-only`
- tat ca normalize/mapping du lieu o lai trong `AssignmentTab`

### Why This Approach

Huong nay duoc chon vi:

- giam do phinh cua `AssignmentTab`
- khong over-engineer bang cach them hook/module moi qua som
- an toan voi flow hien co
- de test cac UI state rieng
- de mo rong sau nay neu can tach them logic

### Alternatives Considered

#### Alternative A: de tat ca trong `AssignmentTab`

Khong chon vi:

- file se tiep tuc phinh
- logic render va orchestration tron lan nhau
- kho test UI states tach biet

#### Alternative B: them hook `useSmartAssignmentInsight`

Chua chon luc nay vi:

- logic chua du phuc tap de can abstraction rieng
- de tao them lop trung gian som hon muc can thiet

#### Alternative C: tach thanh `AssignmentComposer` module lon

Khong chon vi:

- scope qua lon cho batch polish
- rui ro refactor cao
- cham vao nhieu hanh vi dang on dinh

## Design Overview

### Architecture Boundary

#### `StudentDetailModal`

Trach nhiem:

- tai `weakness profile`
- tai `smart preview`
- cho teacher chon de goi y
- handoff draft sang store

Khong lam:

- khong submit assignment
- khong giu logic xac dinh final intervention state
- khong render decision summary sau cung

#### `useTeacherDashboardUIStore`

Trach nhiem:

- giu `assignmentComposerDraft`
- chuyen active tab sang `assignments`

Khong lam:

- khong sinh derived UI model
- khong chua presentation state

#### `AssignmentTab`

Trach nhiem:

- hydrate draft vao form
- giu state form
- xac dinh draft dang o che do:
  - `smart-preview`
  - `manual`
  - `manual-adjusted`
- normalize du lieu de render insight
- submit assignment
- clear draft state khi can

#### `SmartAssignmentInsightCard`

Trach nhiem:

- nhan du lieu da duoc normalize
- render decision summary cho teacher
- hien warning va trust state
- khong chua fetch
- khong chua store
- khong tu suy dien tu nhieu data sources thap

## Proposed Files

### Existing files to update

- `src/components/TeacherDashboard/AssignmentTab.tsx`
- `src/stores/useTeacherDashboardUIStore.ts`
- `tests/assignmentPrefill.integration.test.tsx`

### New file

- `src/components/TeacherDashboard/SmartAssignmentInsightCard.tsx`

Neu can tach type nho cho de doc, co the them:

- `src/components/TeacherDashboard/smartAssignmentInsight.types.ts`

Nhung file type rieng nay la optional, chi them neu `AssignmentTab.tsx` bi nois qua muc.

## UI Contract

### Input Source of Truth

`AssignmentTab` phai dung cac nguon du lieu sau:

- `draft`
- `selectedRecommendedQuiz`
- `manualNotice`
- `draftWarnings`
- current form state:
  - `selectedQuizId`
  - `selectedClassId`
  - `selectedStudentId`
  - `deadline`
  - `maxAttempts`

### Derived UI Model

`AssignmentTab` se normalize thanh mot model de truyen vao `SmartAssignmentInsightCard`.

De xuat shape:

```ts
type InterventionDecisionState =
  | 'recommended'
  | 'review'
  | 'low-confidence'
  | 'manual-adjusted'
  | 'manual';

interface SmartAssignmentInsightViewModel {
  state: InterventionDecisionState;
  source: 'smart-preview' | 'manual';
  title: string;
  summary: string;
  skillLabel?: string;
  subskillLabel?: string;
  statusLabel?: string;
  accuracy?: number;
  targetDifficultyLabel?: string;
  matchReason?: string;
  confidencePercent?: number;
  className?: string;
  studentName?: string;
  quizTitle?: string;
  warningMessages: string[];
  manualNotice?: string | null;
}
```

Luu y:

- day la view model noi bo cua frontend
- khong can expose ra API
- co the khai bao trong `AssignmentTab.tsx` neu muon scope hep

## State Rules

### `recommended`

Dieu kien:

- `draft.source === 'smart-preview'`
- co `selectedRecommendedQuiz`
- khong co warning nghiem trong
- teacher chua thay doi cac field co y nghia lam mat tinh chat goi y

Y nghia:

- co the giao ngay

### `review`

Dieu kien:

- tu `smart-preview`
- co warning nhung khong den muc low confidence

Vi du:

- coverage chua cao
- mot vai warning tu backend

Y nghia:

- van co the giao, nhung UI phai goi y teacher xem lai

### `low-confidence`

Dieu kien de xep vao nhom nay:

- `confidence` thap hon nguong da chot tren frontend
- hoac `coveragePercent` thap
- hoac warning quan trong tu backend

Muc dich:

- teacher van thay duoc suggestion
- nhung copy va style phai cho thay day khong phai goi y "giao ngay"

De xuat nguong frontend:

- `confidence < 0.6` => `low-confidence`
- `coveragePercent < 60` => bat buoc show canh bao

Neu team muon giu nguong nay hoan toan data-driven ve sau, co the dua vao response backend sau. Batch nay cho phep frontend mapping toi thieu.

### `manual-adjusted`

Dieu kien:

- draft ban dau den tu `smart-preview`
- teacher da doi `quizId`
- hoac doi `studentId`
- hoac doi `classId`

Deadline va `maxAttempts` khong nhat thiet danh dau la manual-adjusted.

Ly do:

- doi deadline va so lan thu la expected customization
- doi quiz/class/student moi thuc su lam thay doi quyet dinh intervention

### `manual`

Dieu kien:

- khong co smart draft
- hoac draft da clear

## `SmartAssignmentInsightCard` Design

### Purpose

Dong goi thong tin quan trong thanh 1 card de teacher tra loi duoc 4 cau hoi:

- hoc sinh can can thiep ky nang nao
- de nao dang duoc de xuat
- vi sao de nay hop
- muc do tin cay den dau

### Required Props

```ts
type SmartAssignmentInsightCardProps = {
  model: SmartAssignmentInsightViewModel;
};
```

### Rendering Rules

Card phai render duoc cac khoi:

- heading theo state
- summary 1-2 dong
- weakness info:
  - skill
  - subskill
  - status
  - accuracy
  - target difficulty
- recommendation info:
  - quiz title
  - match reason
  - confidence
- warnings
- manual notice neu co

### Copy Direction

Copy phai:

- ngan
- quyet dinh-oriented
- khong qua hoc thuat
- uu tien "hanh dong tiep theo" hon "phan tich dai"

Vi du:

- `Nen giao ngay de bai nay de luyen ky nang Phan so.`
- `Goi y nay can xem lai vi do phu du lieu con thap.`
- `Ban da chinh de bai khac so voi goi y ban dau.`

## `AssignmentTab` Changes

### Keep

Giu nguyen:

- hydration tu `assignmentComposerDraft`
- form fields hien co
- submit flow
- clear draft flow

### Add

Them 1 buoc normalize du lieu trong `CreateAssignmentSection`:

```ts
const insightModel = buildSmartAssignmentInsightModel({
  draft,
  activeDraft,
  selectedRecommendedQuiz,
  draftWarnings,
  manualNotice,
  selectedQuizId,
  selectedClassId,
  selectedStudentId,
});
```

Roi render:

```tsx
{insightModel && <SmartAssignmentInsightCard model={insightModel} />}
```

### Normalization Rules

`AssignmentTab` phai:

- tim `selectedRecommendedQuiz`
- map `draft.weaknessSummary.status` thanh label
- format `confidence` thanh %
- map `targetDifficulty` thanh copy de doc duoc
- xac dinh `manual-adjusted`
- gop warning tu:
  - `draft.warnings`
  - low coverage
  - low confidence
  - manual override

### Clear Draft Rules

Khi clear draft:

- xoa `activeDraft`
- xoa warning list
- reset insight card
- form quay ve `manual`

Neu teacher clear draft nhung giu form values, card khong con duoc hien nhu smart recommendation nua.

## Store Changes

### Recommended Default

Khong mo rong `AssignmentComposerDraft` neu UI da du thong tin tu shape hien tai.

### Allowed Additive Changes

Chi them field neu thieu that:

- `interventionReason?: string`
- `coverageWarning?: string`

Nhung uu tien `khong them`.

Kien nghi batch nay:

- giu nguyen store shape
- de frontend derive tu:
  - `weaknessSummary`
  - `recommendedQuizzes`
  - `warnings`

## Data Flow

1. Teacher mo `StudentDetailModal`
2. Teacher chuyen sang tab `analytics`
3. Frontend tai `weakness profile`
4. Teacher bam tao `smart preview`
5. Frontend nhan:
   - weakness summary
   - recommended quizzes
   - warnings
6. Teacher bam `Dung trong AssignmentTab`
7. `useTeacherDashboardUIStore` luu `assignmentComposerDraft`
8. Active tab chuyen sang `assignments`
9. `AssignmentTab` hydrate form
10. `AssignmentTab` normalize du lieu thanh `SmartAssignmentInsightViewModel`
11. `SmartAssignmentInsightCard` render decision summary
12. Teacher:
   - giu nguyen goi y va giao bai
   - hoac chinh tay roi giao bai

## Edge Cases

### Case 1: co draft nhung khong tim thay `selectedRecommendedQuiz`

Xu ly:

- card van hien
- state chuyen sang `review`
- summary noi ro teacher can chon lai de bai

### Case 2: smart preview co warnings nhung van co quiz de xuat

Xu ly:

- card hien warning block
- state la `review`, khong la `recommended`

### Case 3: coverage thap

Xu ly:

- hien warning ro rang
- neu duoi nguong chot thi `low-confidence`

### Case 4: teacher doi `quizId`

Xu ly:

- card doi state thanh `manual-adjusted`
- summary cap nhat cho thay day khong con la de goc

### Case 5: draft bi clear

Xu ly:

- card bien mat
- form ve manual mode

### Case 6: draft source la `manual`

Xu ly:

- khong render smart insight card
- hoac render state `manual` neu team muon giu layout on dinh

Kien nghi:

- khong render card trong manual mode de UI gon hon

## Testing Strategy

### Integration Tests

Cap nhat `tests/assignmentPrefill.integration.test.tsx` de cover:

- handoff tu `StudentDetailModal` sang `AssignmentTab`
- form hydrate dung quiz/class/student/deadline/maxAttempts
- insight card hien:
  - skill
  - match reason
  - confidence
  - target difficulty neu co
- warning hien khi response co warnings
- teacher doi quiz => state `manual-adjusted`
- clear draft => mat smart insight card

### Component Tests

Neu tach component rieng, them test cho `SmartAssignmentInsightCard`:

- render `recommended`
- render `review`
- render `low-confidence`
- render `manual-adjusted`
- render warning list

Neu repo chua co pattern test component tai khu vuc nay, co the tri hoan test component va chi giu integration test. Tuy nhien voi huong code sach, test component la co loi.

## Acceptance Criteria

- `AssignmentTab` van hoat dong duoc voi manual flow cu
- smart draft duoc hydrate dung nhu truoc
- thong tin intervention khong con tan man nhieu cho
- teacher nhin 1 card la hieu:
  - skill nao dang duoc can thiep
  - quiz nao dang duoc de xuat
  - vi sao
  - co can xem lai khong
- doi `quizId` se duoc danh dau thanh `manual-adjusted`
- clear draft xoa dung context smart recommendation
- khong can them route backend moi cho batch nay

## Implementation Order

1. Tach va chot `SmartAssignmentInsightViewModel`
2. Them `SmartAssignmentInsightCard`
3. Them logic normalize du lieu trong `AssignmentTab`
4. Noi state `recommended/review/low-confidence/manual-adjusted`
5. Tich hop card vao `CreateAssignmentSection`
6. Cap nhat integration tests
7. Neu can, them component tests
8. Chay verify:
   - targeted tests
   - build

## Decision Log

### Decision 1

Chon polish flow teacher-side truoc.

Alternatives:

- mo class dashboard
- mo student-side practice flow

Ly do:

- tao gia tri user truc tiep nhat
- tan dung duoc nen tang da co

### Decision 2

`AssignmentTab` van la noi confirm cuoi.

Alternatives:

- confirm assignment ngay trong modal

Ly do:

- da duoc chot tu truoc trong product direction
- tranh duplicate flow

### Decision 3

Tach `SmartAssignmentInsightCard` presentation-only.

Alternatives:

- de toan bo trong `AssignmentTab`
- them hook abstraction moi

Ly do:

- sach hon
- test duoc
- khong over-engineer

### Decision 4

Normalize data o `AssignmentTab`, khong o component card.

Alternatives:

- de card tu suy dien state

Ly do:

- giu component thuan presentation
- business/UI mapping o orchestration layer hop ly hon

### Decision 5

Khong mo rong store neu chua that su can.

Alternatives:

- them them field vao `AssignmentComposerDraft`

Ly do:

- giam scope
- tranh lam store shape phinh khong can thiet

## Ready For Implementation When

- Team dong y state model:
  - `recommended`
  - `review`
  - `low-confidence`
  - `manual-adjusted`
- Team dong y card moi chi la presentation-only
- Team dong y batch nay khong doi backend contract lon

