# Dev Ready: Assignment Prefill, Weakness Card Tests, Smart Preview Scoring

## Summary
Tai lieu nay chot thiet ke dev-ready cho 3 muc tiep theo:

1. `state contract` cho `useTeacherDashboardUIStore`
2. `test cases` cho `WeaknessSummaryCard`
3. `API contract + scoring spec` moi cho `smart-preview`

Tai lieu nay tap trung vao implementation handoff cho 3 muc da duoc chot, khong lap lai toan bo noi dung cua `weakness-profile-dev-ready.md`.

## Current Context
- `TeacherDashboard` dang quan ly tab bang local state `activeTab`: `src/components/TeacherDashboard/index.tsx`
- `AssignmentTab` dang dung local form state cho `quizId`, `classId`, `studentId`, `deadline`, `maxAttempts`: `src/components/TeacherDashboard/AssignmentTab.tsx`
- `StudentDetailModal` da co `smart preview`, nhung hien dang co kha nang confirm giao bai ngay trong modal: `src/components/teacher/ResultsView/StudentDetailModal.tsx`
- `WeaknessSummaryCard` da ton tai o student-side va dang goi `fetchWeaknessProfile(resultId)`: `src/components/student/ResultScreen/WeaknessSummaryCard.tsx`
- `smart-preview` hien da co route va service, nhung rule recommendation moi dung `subject + skillCode + tags`: `workers/src/services/smartAssignment.ts`

## Assumptions
- `AssignmentTab` se la noi duy nhat de giao vien xem, chinh, va xac nhan assignment draft.
- `StudentDetailModal` chi la diem khoi phat smart preview, khong phai noi confirm cuoi.
- `WeaknessSummaryCard` se duoc test bang `Vitest + RTL`, khong them Storybook.
- `difficulty` o level cau hoi la du lieu duoc phep dung de tinh heuristic cho quiz recommendation.
- `subskill` coverage chua day du, nen recommendation phai fallback mem ve `skillCode`.

## Explicit Non-Goals
- Khong thiet ke lai toan bo `AssignmentTab`
- Khong dua AI vao recommendation logic
- Khong tao precomputed recommendation index trong milestone nay
- Khong test animation, framer-motion internals, hoac mock node existence

## Decision Log
- Chon `useTeacherDashboardUIStore` rieng thay vi prop drilling hoac nhét UI state vao `useClassroomStore`
- Chon `Vitest + RTL + mock states` cho `WeaknessSummaryCard`
- Chon `weighted heuristic scoring` cho `smart-preview`
- Chon `subskill > skill > tags`, voi `difficulty` la soft signal

---

## 1. State Contract

### Goal
Noi `smart preview` sang dung luong prefill cua `AssignmentTab` ma khong:
- prop drilling qua nhieu layer
- lam ban `useClassroomStore`
- mat quyen xac nhan cuoi cua giao vien

### Proposed Store
Tao store moi:

- File de xuat: `src/stores/useTeacherDashboardUIStore.ts`

### State Shape
```ts
export type TeacherDashboardTab =
  | 'overview'
  | 'results'
  | 'manage'
  | 'create'
  | 'ioe'
  | 'ioe-manage'
  | 'ioe-results'
  | 'announcements'
  | 'classes'
  | 'assignments'
  | 'teachers'
  | 'gift-shop'
  | 'homework';

export type AssignmentComposerSource = 'manual' | 'smart-preview';

export type AssignmentComposerDraft = {
  source: AssignmentComposerSource;
  sourceResultId?: string;
  studentName?: string;
  className?: string;
  classId: string;
  studentId?: string;
  quizId: string;
  deadline: string;
  maxAttempts: number;
  weaknessSummary?: {
    skillCode: string;
    skillLabel: string;
    subskillCode?: string;
    subskillLabel?: string;
    status: 'weak' | 'needs_practice' | 'stable';
    accuracy: number;
    coveragePercent: number;
    targetDifficulty?: 1 | 2 | 3;
  };
  recommendedQuizzes?: Array<{
    quizId: string;
    title: string;
    matchReason: string;
    confidence: number;
    totalScore?: number;
  }>;
  warnings?: Array<{
    code: string;
    message: string;
  }>;
  createdAt: string;
};

type TeacherDashboardUIState = {
  activeTab: TeacherDashboardTab;
  assignmentComposerDraft: AssignmentComposerDraft | null;
  setActiveTab: (tab: TeacherDashboardTab) => void;
  openAssignmentComposerWithDraft: (draft: AssignmentComposerDraft) => void;
  clearAssignmentComposerDraft: () => void;
};
```

### Responsibilities
#### `TeacherDashboard`
- Doc `activeTab` tu UI store
- Dung `setActiveTab()` thay cho local `useState`

#### `StudentDetailModal`
- Goi `smart-preview`
- Khi giao vien bam `Dung trong AssignmentTab`:
  - build `AssignmentComposerDraft`
  - goi `openAssignmentComposerWithDraft(draft)`

#### `AssignmentTab`
- Khi mount hoac khi draft thay doi:
  - hydrate form state tu `assignmentComposerDraft`
- Hien banner:
  - hoc sinh nao
  - skill nao dang yeu
  - quiz nao dang duoc goi y
- Cho phep giao vien doi:
  - quiz
  - deadline
  - maxAttempts
  - student scope neu can
- Sau khi giao bai thanh cong:
  - `clearAssignmentComposerDraft()`

### Lifecycle
1. Giao vien mo `StudentDetailModal`
2. Bam `Giao bai on loi cho em nay`
3. Frontend goi `POST /api/assignments/smart-preview`
4. Nhan preview response
5. Bam `Dung trong AssignmentTab`
6. UI store:
   - set `assignmentComposerDraft`
   - set `activeTab = 'assignments'`
7. `AssignmentTab` hydrate form
8. Giao vien chinh sua neu can
9. Giao vien bam `Giao bai`
10. Goi `POST /api/assignments`
11. Clear draft

### AssignmentTab Hydration Rules
- Draft chi hydrate 1 lan cho moi draft moi
- Neu giao vien da sua form tay, khong tu dong de draft moi de len ma khong co action ro rang
- Neu draft co `recommendedQuizzes`, form van dung dropdown quiz hien co, nhung sap xep quiz de xuat len tren

### UX Requirements
- Banner prefilling hien trong `AssignmentTab`
- Banner copy de xuat:
  - `Da nap goi y tu ket qua cua Lan`
  - `Ky nang uu tien: Phan so`
  - `Quiz de xuat da duoc dien san, thay co co the chinh lai truoc khi giao`
- Co nut:
  - `Bo goi y`
  - `Dung goi y khac` neu co nhieu recommended quiz

### Error/Fallback Rules
- Neu draft khong hop le:
  - form quay ve manual mode
- Neu class cua draft chua co trong store:
  - `AssignmentTab` tu fetch students cho class do
- Neu quiz trong draft khong con ton tai:
  - hien warning
  - clear `selectedQuizId`
  - giu lai weakness context

### Acceptance Criteria
- Tu `StudentDetailModal` co the mo dung tab `assignments`
- Form `AssignmentTab` duoc prefill dung
- Giao vien van la nguoi xac nhan cuoi
- Manual assignment flow cu van hoat dong binh thuong

---

## 2. Test Cases

### Goal
Bao phu day du hanh vi UI cua `WeaknessSummaryCard` bang `Vitest + RTL`, khong test mock behavior.

### Test Philosophy
- Mock duy nhat service boundary: `fetchWeaknessProfile`
- Render component that
- Assert UI text, state, button behavior
- Khong assert vao implementation details cua `useEffect`
- Khong assert vao mock placeholder node

### File Layout
- File test de xuat: `tests/WeaknessSummaryCard.test.tsx`
- File fixture de xuat: `tests/fixtures/weaknessProfile.fixtures.ts`

### Required Mocks
```ts
vi.mock('../src/services/weaknessProfileService', () => ({
  fetchWeaknessProfile: vi.fn(),
}));
```

Mock callback props:
- `onOpenDrOwl`
- `onOpenRecommendations`

### Fixture Builders
```ts
makeWeaknessProfileSuccess()
makeWeaknessProfileWeak()
makeWeaknessProfileNeedsPracticeOnly()
makeWeaknessProfileLowCoverage()
makeWeaknessProfileEmpty()
```

### Test Matrix

#### Case 1: Loading state
Input:
- `fetchWeaknessProfile` pending

Expect:
- Hien title `Con can luyen them`
- Hien skeleton
- Khong hien error

#### Case 2: Success with `weak` skills
Input:
- Profile co 2-3 skills `weak`

Expect:
- Hien top skill labels
- Hien badge `Can uu tien`
- Hien accuracy
- Hien button primary

#### Case 3: Success with only `needs_practice`
Input:
- Khong co `weak`, chi co `needs_practice`

Expect:
- Hien badge `Can luyen them`
- Hien hint dung theo skill copy

#### Case 4: Low coverage warning
Input:
- `coveragePercent < 70`
hoac
- `unclassifiedQuestionCount > 0`

Expect:
- Hien warning mem
- Van hien danh sach skill neu co

#### Case 5: Empty success state
Input:
- Khong co skill `weak` hoac `needs_practice`

Expect:
- Hien copy tich cuc
- Hien CTA `Xem goi y hoc`

#### Case 6: Error state
Input:
- `fetchWeaknessProfile` reject

Expect:
- Hien thong diep loi
- Hien CTA fallback

#### Case 7: CTA opens DrOwl
Input:
- `scorePct < 50`
- `wrongQuestionIds.length >= 2`

Action:
- Click button primary

Expect:
- `onOpenDrOwl` duoc goi 1 lan
- `onOpenRecommendations` khong duoc goi

#### Case 8: CTA opens Recommendations
Input:
- `scorePct >= 50`
hoac
- `wrongQuestionIds.length < 2`

Action:
- Click button primary

Expect:
- `onOpenRecommendations` duoc goi 1 lan

#### Case 9: Unknown skill fallback
Input:
- skill code khong ton tai trong `SKILL_COPY`

Expect:
- Dung `skillLabel` tu API
- Van hien button va hint fallback

#### Case 10: Top-3 limit
Input:
- Tra ve hon 3 skills phu hop

Expect:
- Chi render 3 card

### Suggested Test Names
```ts
it('renders loading skeleton while weakness profile is pending')
it('renders top weak skills with priority badge')
it('renders needs-practice skills when no weak skill exists')
it('shows low coverage warning when profile coverage is weak')
it('renders positive empty state when no focus skill exists')
it('renders fallback error state when profile request fails')
it('opens DrOwl for low-score students with multiple wrong answers')
it('opens recommendations for non-emergency cases')
it('falls back to API skill label when local copy is missing')
it('renders at most three focus skills')
```

### Anti-Patterns To Avoid
- Khong test `fetchWeaknessProfile` da duoc goi bao nhieu lan la logic chinh
- Khong assert vao class name dong
- Khong tao test-only prop hoac test-only branch trong production component
- Khong test “mock card xuat hien” thay vi text va CTA that

### Acceptance Criteria
- Bao phu du `loading`, `success`, `empty`, `low-coverage`, `error`
- Bao phu ca 2 CTA path
- Bao phu fallback label behavior
- Test khong phu thuoc implementation detail mong manh

---

## 3. API Contract + Scoring Spec

### Goal
Nang recommendation quality cho `smart-preview` bang:
- `subskill`
- `difficulty`
- explanation data de giao vien hieu vi sao quiz duoc goi y

### Endpoint
```http
POST /api/assignments/smart-preview
```

### Request Contract
```json
{
  "resultId": "123",
  "teacherUsername": "teacher_001",
  "strategy": "top_weak_skill",
  "preferredQuizId": "quiz-123",
  "deadlinePreset": "7d",
  "maxAttempts": 1
}
```

### Request Rules
- `resultId`: bat buoc
- `teacherUsername`: bat buoc
- `strategy`: MVP chi chap nhan `top_weak_skill`
- `preferredQuizId`: tuy chon, neu quiz nay van duoc score hop le thi day len dau
- `deadlinePreset`: `3d | 7d | 14d | custom`
- `maxAttempts`: integer >= 1

### Recommendation Inputs
Nguon du lieu chinh:
- result context
- weakness profile
- question metadata
- candidate quiz metadata

Signals:
- `subject`
- `skillCode`
- `subskillCode`
- `status`
- `accuracy`
- `difficulty`
- `tags`
- `timeLimit`
- `questionCount`

### Target Difficulty Rule
```ts
function getTargetDifficulty(input: {
  status: 'weak' | 'needs_practice' | 'stable';
  accuracy: number;
}): 1 | 2 | 3 {
  if (input.status === 'weak' && input.accuracy < 40) return 1;
  if (input.status === 'weak' && input.accuracy < 60) return 2;
  if (input.status === 'needs_practice' && input.accuracy >= 60) return 2;
  return 2;
}
```

### Quiz Candidate Aggregation
Moi quiz candidate can aggregate:
- `subjectMatchCount`
- `skillMatchCount`
- `subskillMatchCount`
- `tagMatchCount`
- `avgDifficulty`
- `questionCount`
- `timeLimit`
- `metadataCoveragePercent`

### Weighted Scoring Formula
```ts
totalScore =
  subskillScore +
  skillScore +
  subjectScore +
  tagScore +
  difficultyScore +
  coverageBonus -
  timePenalty -
  lengthPenalty;
```

### Score Components
```ts
subskillScore =
  hasExactSubskillMatch ? 50 : 0;

skillScore =
  hasExactSkillMatch ? 30 : 0;

subjectScore =
  hasSubjectMatch ? 10 : 0;

tagScore =
  matchedOnlyViaTags ? 8 : 0;

difficultyScore =
  avgDifficulty == null ? 0 :
  avgDifficulty === targetDifficulty ? 12 :
  Math.abs(avgDifficulty - targetDifficulty) === 1 ? 6 :
  -8;

coverageBonus =
  metadataCoveragePercent >= 80 ? 4 :
  metadataCoveragePercent >= 50 ? 2 :
  0;

timePenalty =
  timeLimit > 20 ? 6 : 0;

lengthPenalty =
  questionCount > 20 ? 4 : 0;
```

### Ranking Order
Sort theo:
1. `totalScore desc`
2. `subskillMatchCount desc`
3. `skillMatchCount desc`
4. `difficultyDistance asc`
5. `questionCount asc`
6. `timeLimit asc`

### Fallback Logic
- Neu `topSkill.subskillCode` khong co:
  - bo qua `subskillScore`
- Neu candidate quiz thieu `difficulty`:
  - `difficultyScore = 0`
- Neu quiz khong co explicit metadata nhung map duoc qua tags:
  - van giu lai, nhung score thap hon
- Neu khong quiz nao duoc exact match:
  - cho phep tags fallback
- Neu van khong co candidate:
  - tra `NO_RECOMMENDED_QUIZ`

### Response Contract
```ts
type SmartAssignmentPreviewResponse = {
  status: 'success' | 'error';
  data?: {
    student: {
      id: string;
      fullName: string;
      classId: string;
      className: string;
    };
    weaknessSummary: {
      resultId: string;
      coveragePercent: number;
      basedOnResultIds: string[];
      topSkill: {
        subject: string;
        subjectLabel: string;
        skillCode: string;
        skillLabel: string;
        subskillCode?: string;
        subskillLabel?: string;
        status: 'weak' | 'needs_practice' | 'stable';
        accuracy: number;
        attempted: number;
        wrong: number;
        targetDifficulty: 1 | 2 | 3;
      };
    };
    recommendedQuizzes: Array<{
      quizId: string;
      title: string;
      matchReason: string;
      questionCount: number;
      timeLimit: number;
      confidence: number;
      matchBreakdown: {
        subjectMatched: boolean;
        skillMatched: boolean;
        subskillMatched: boolean;
        matchedViaTags: boolean;
        avgDifficulty?: number;
        targetDifficulty: 1 | 2 | 3;
        difficultyDistance?: number;
        totalScore: number;
      };
    }>;
    assignmentDraft: {
      quizId: string;
      classId: string;
      studentId?: string;
      deadline: string;
      maxAttempts: number;
    };
    warnings: Array<{
      code: string;
      message: string;
    }>;
  };
  code?: 'STUDENT_NOT_FOUND' | 'AMBIGUOUS_STUDENT_MATCH' | 'NO_RECOMMENDED_QUIZ';
  message?: string;
};
```

### `matchReason` Rule
Server sinh `matchReason` gon de UI dung truc tiep:
- `Khop subskill phan_so.so_sanh`
- `Khop skill phan_so`
- `Khop tags cua skill phan_so`

### `confidence` Rule
Khong dung AI confidence. Dung heuristic:
```ts
confidence =
  totalScore >= 90 ? 0.95 :
  totalScore >= 70 ? 0.88 :
  totalScore >= 50 ? 0.78 :
  0.65;
```

### Error Contract
#### `STUDENT_NOT_FOUND`
```json
{
  "status": "error",
  "code": "STUDENT_NOT_FOUND",
  "message": "Khong tim thay hoc sinh tu result hien tai."
}
```

#### `AMBIGUOUS_STUDENT_MATCH`
```json
{
  "status": "error",
  "code": "AMBIGUOUS_STUDENT_MATCH",
  "message": "Co nhieu hoc sinh trung ten trong cung ngu canh lop.",
  "data": {
    "candidates": [
      {
        "id": "s-001",
        "fullName": "Nguyen Van A",
        "classId": "c-001",
        "className": "2A"
      }
    ]
  }
}
```

#### `NO_RECOMMENDED_QUIZ`
```json
{
  "status": "error",
  "code": "NO_RECOMMENDED_QUIZ",
  "message": "Chua tim thay quiz phu hop voi skill hien tai."
}
```

### Backend Responsibilities
#### Route
- validate request
- call service
- return stable contract

#### Service
- resolve result context
- resolve student
- load weakness profile
- pick top weak skill
- compute `targetDifficulty`
- aggregate candidate quizzes
- score + rank
- build response

### Frontend Consumption Rules
- `StudentDetailModal` chi dung `recommendedQuizzes[0]` cho quick preview card
- `AssignmentTab` dung full `recommendedQuizzes` de prefill dropdown
- Neu co `warnings`, hien banner mem
- Neu `matchBreakdown.totalScore` thap, van cho teacher chon tay quiz khac

### Acceptance Criteria
- `smart-preview` tra ve `subskillCode` neu co
- `smart-preview` tra ve `targetDifficulty`
- `recommendedQuizzes` co `matchBreakdown`
- Rule gợi ý khong chi dua vao `skillCode/tags`
- Contract moi van giu backward compatibility o muc hop ly cho frontend hien tai

---

## Final Recommendation
Thu tu implementation nen la:

1. Tao `useTeacherDashboardUIStore`
2. Refactor `TeacherDashboard`, `StudentDetailModal`, `AssignmentTab` theo store moi
3. Viet `WeaknessSummaryCard.test.tsx`
4. Nang `smart-preview` scoring va response contract
5. Cap nhat UI prefill banner trong `AssignmentTab`

## Handoff Note
Neu buoc tiep theo la implementation, doi dev nen tach thanh 3 PR logic:

1. `teacher-dashboard-ui-store + assignment prefill`
2. `weakness-summary-card tests`
3. `smart-preview scoring upgrade`
