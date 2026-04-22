# Weakness Profile Next Milestones Dev-Ready

## Goal
Tai lieu nay chot 3 phan viec tiep theo sau `V1 Weakness Profile`:

1. Checklist chay migration `workers/migrations/0013_add_question_skill_metadata.sql` vao D1 local/remote.
2. Spec UI/UX chi tiet cho `Con can luyen them` o student-side.
3. Spec API + data contract cho `Smart Assignment` MVP.

Tai lieu nay bam sat nen hien co cua du an:

- Worker schema va migration trong `workers/`
- Student result screen trong `src/components/student/ResultScreen/`
- Teacher assignment flow trong `src/components/TeacherDashboard/AssignmentTab.tsx`
- Weakness profile service va endpoint da co san

---

## 1. Migration Checklist Local/Remote

### 1.1 Muc tieu
- Them 3 cot moi vao bang `questions`:
  - `subject`
  - `skill_code`
  - `subskill_code`
- Dam bao local va remote cung schema.
- Co verify query ro rang de team khong bi lech local/remote.

### 1.2 Hien trang
- Migration can chay: `workers/migrations/0013_add_question_skill_metadata.sql`
- Worker scripts hien co o `workers/package.json`:
  - `db:migrate`
  - `db:migrate:local`
- Hai script nay dang chay `schema.sql` toan bo, khong phai migration rieng theo file.

### 1.3 Nguyen tac van hanh
- Khong dung `npm run db:migrate` de chay rieng `0013`.
- Chay truc tiep file migration `0013` bang `wrangler d1 execute --file=...`.
- Local truoc, remote sau.
- Verify schema ngay sau moi lan chay.
- Khong deploy code phu thuoc schema moi neu remote chua migrate xong.

### 1.4 Preflight Checklist
- [ ] Xac nhan dang o dung thu muc `workers`
- [ ] Xac nhan ten DB trong `wrangler.toml` la `itongquiz-db`
- [ ] Kiem tra local schema hien tai
- [ ] Kiem tra remote schema hien tai
- [ ] Xac nhan 3 cot moi chua ton tai truoc khi chay
- [ ] Chot nguoi chiu trach nhiem bam migrate remote
- [ ] Chot khung gio migrate remote de neu co loi con rollback theo cach van hanh

### 1.5 Lenh Kiem Tra Truoc Khi Chay
Chay local:

```powershell
cd workers
npx wrangler d1 execute itongquiz-db --command "PRAGMA table_info(questions);" --local
```

Chay remote:

```powershell
cd workers
npx wrangler d1 execute itongquiz-db --command "PRAGMA table_info(questions);" --remote
```

Neu muon kiem tra gon hon:

```powershell
cd workers
npx wrangler d1 execute itongquiz-db --command "SELECT name, type FROM pragma_table_info('questions') WHERE name IN ('subject','skill_code','subskill_code');" --local
npx wrangler d1 execute itongquiz-db --command "SELECT name, type FROM pragma_table_info('questions') WHERE name IN ('subject','skill_code','subskill_code');" --remote
```

### 1.6 Lenh Chay Migration
Local:

```powershell
cd workers
npx wrangler d1 execute itongquiz-db --file=migrations/0013_add_question_skill_metadata.sql --local
```

Remote:

```powershell
cd workers
npx wrangler d1 execute itongquiz-db --file=migrations/0013_add_question_skill_metadata.sql --remote
```

### 1.7 Lenh Verify Sau Khi Chay
Verify schema:

```powershell
cd workers
npx wrangler d1 execute itongquiz-db --command "SELECT name, type FROM pragma_table_info('questions') WHERE name IN ('subject','skill_code','subskill_code');" --local
npx wrangler d1 execute itongquiz-db --command "SELECT name, type FROM pragma_table_info('questions') WHERE name IN ('subject','skill_code','subskill_code');" --remote
```

Verify do phu du lieu metadata:

```powershell
cd workers
npx wrangler d1 execute itongquiz-db --command "SELECT COUNT(*) AS total_questions, SUM(CASE WHEN subject <> '' THEN 1 ELSE 0 END) AS subject_filled, SUM(CASE WHEN skill_code <> '' THEN 1 ELSE 0 END) AS skill_filled, SUM(CASE WHEN subskill_code <> '' THEN 1 ELSE 0 END) AS subskill_filled FROM questions;" --local
npx wrangler d1 execute itongquiz-db --command "SELECT COUNT(*) AS total_questions, SUM(CASE WHEN subject <> '' THEN 1 ELSE 0 END) AS subject_filled, SUM(CASE WHEN skill_code <> '' THEN 1 ELSE 0 END) AS skill_filled, SUM(CASE WHEN subskill_code <> '' THEN 1 ELSE 0 END) AS subskill_filled FROM questions;" --remote
```

### 1.8 Smoke Test Can Lam Sau Migration
- [ ] Tao hoac update 1 quiz co question chua `subject/skillCode/subskillCode`
- [ ] Fetch lai quiz qua frontend
- [ ] Xac nhan metadata moi khong bi roi khi edit/save
- [ ] Mo `StudentDetailModal` va kiem tra endpoint weakness profile van tra ve binh thuong

### 1.9 De xuat Them Script Trong workers/package.json
Khuyen nghi them 4 script de team van hanh de hon:

```json
{
  "db:migrate:0013:local": "wrangler d1 execute itongquiz-db --file=migrations/0013_add_question_skill_metadata.sql --local",
  "db:migrate:0013:remote": "wrangler d1 execute itongquiz-db --file=migrations/0013_add_question_skill_metadata.sql --remote",
  "db:verify:question-skills:local": "wrangler d1 execute itongquiz-db --command \"SELECT name, type FROM pragma_table_info('questions') WHERE name IN ('subject','skill_code','subskill_code');\" --local",
  "db:verify:question-skills:remote": "wrangler d1 execute itongquiz-db --command \"SELECT name, type FROM pragma_table_info('questions') WHERE name IN ('subject','skill_code','subskill_code');\" --remote"
}
```

### 1.10 Definition of Done
- [ ] Local co du 3 cot moi
- [ ] Remote co du 3 cot moi
- [ ] Do phu metadata doc duoc bang query verify
- [ ] Frontend fetch/edit/save khong lam roi metadata moi
- [ ] Weakness profile endpoint van tra ve dung sau migrate

---

## 2. Spec UI/UX: "Con can luyen them"

### 2.1 Muc tieu san pham
Ngay sau khi hoc sinh nop bai, he thong khong chi bao diem ma phai tra loi ro:

- Con dang yeu phan nao
- Con nen hoc tiep cai gi
- Con co the bam vao dau de luyen tiep ngay

### 2.2 Vi tri dat tren UI
Dat trong `src/components/student/ResultScreen/tabs/OverviewTab.tsx`.

Vi tri khuyen nghi:
- Sau `Teacher Comment Card`
- Truoc khối stats grid

Ly do:
- Day la noi hoc sinh thay dau tien
- Noi dung can "de hieu ngay", khong nen bi day xuong tab sau
- Giu `RecommendationsTab` cho phan AI dai hon, con `OverviewTab` la action-first

### 2.3 Nguon du lieu
Dung endpoint da co san:

- `GET /api/results/:id/weakness-profile`

Frontend goi qua:

- `src/services/weaknessProfileService.ts`

Khong phan tich lai o client.

### 2.4 Copy va ngon ngu hien thi
UI student-side khong duoc hien `skillCode` ky thuat.
Can co bang map rieng:

```ts
type StudentSkillCopy = {
  skillCode: string;
  title: string;
  shortHint: string;
  actionLabel: string;
}
```

Vi du:

- `phan_so`
  - `title`: `Phan so`
  - `shortHint`: `Con dang hay nham o dang toan nay. Minh luyen them 2-3 cau nhe hon nhe.`
  - `actionLabel`: `Luyen phan so`

- `luyen_tu_va_cau`
  - `title`: `Luyen tu va cau`
  - `shortHint`: `Con can on lai cach nhan biet va dung cau cho dung.`
  - `actionLabel`: `On luyen tu va cau`

### 2.5 Cau truc component khuyen nghi
Ten de xuat:

- `WeaknessSummaryCard`

Props de xuat:

```ts
type WeaknessSummaryCardProps = {
  resultId: string | number;
  scorePct: number;
  onOpenDrOwl: () => void;
  onSwitchToRecommendations: () => void;
}
```

### 2.6 Trang thai UI can co

#### State A: Loading
- Skeleton 2-3 card nho
- Khong chan ca trang
- Khong dung spinner to o giua man hinh

#### State B: Success, co skill can chu y
- Hien title `Con can luyen them`
- Hien top 2-3 skill co `weak` hoac `needs_practice`
- Moi item gom:
  - Ten ky nang
  - Badge: `Can uu tien` hoac `Can luyen them`
  - Accuracy
  - 1 cau goi y ngan
  - CTA

#### State C: Success, khong co skill can chu y
- Hien thong diep tich cuc:
  - `Con dang lam kha tot roi! Neu muon, minh co the luyen them de gioi hon nua.`
- CTA nhe:
  - `Xem goi y hoc`

#### State D: Coverage thap
- Neu `coveragePercent < 70` hoac `unclassifiedQuestionCount > 0`, hien warning nhe:
  - `He thong dang hoc them tu bai lam cua con, nen goi y hien tai chi mang tinh dinh huong.`
- Van cho hien skill neu co, nhung khong dung copy qua manh

#### State E: Error
- UI mem:
  - `Chua tai duoc goi y luyen them. Con co the xem goi y AI hoac lam lai mot vai cau cung dang.`
- CTA:
  - `Xem goi y hoc`

### 2.7 Hanh dong CTA khuyen nghi
Ban MVP khong nen sinh them flow moi qua som. Dung 3 muc hanh dong sau:

1. `Luyen ngay`
- Neu score rat thap (`< 50%`) va co it nhat 2 cau sai:
  - uu tien mo `DrOwlModal`

2. `Xem goi y hoc`
- Chuyen sang `RecommendationsTab`

3. `On lai sau`
- Chi dong card hoac bo qua

### 2.8 Luat dieu huong de xuat

```ts
if (scorePct < 50 && wrongQuestionIds.length >= 2) {
  primaryAction = 'open_dr_owl';
} else {
  primaryAction = 'switch_to_recommendations';
}
```

### 2.9 Layout khuyen nghi

#### Mobile
- 1 card doc
- Moi skill la 1 block bo tron goc
- CTA dang full-width

#### Desktop
- 1 card tong
- Ben trong la 2-3 item dang stack
- Khong dung layout qua nhieu cot

### 2.10 Visual tone
- Than thien, dong vien, khong phan xet
- Mau:
  - `weak`: cam do nhe
  - `needs_practice`: vang cam
  - `stable`: xanh la nhe
- Tranh do dam gay ap luc

### 2.11 Telemetry de xuat
- `result_weakness_card_viewed`
- `result_weakness_primary_action_clicked`
- `result_weakness_dr_owl_opened`
- `result_weakness_recommendations_opened`

### 2.12 Non-goals cho MVP
- Khong lam roadmap 7 ngay
- Khong sinh quiz moi theo skill
- Khong hien qua 3 skill cung luc
- Khong cho hoc sinh sua threshold hoac bo loc

### 2.13 Definition of Done
- [ ] `OverviewTab` co khoi `Con can luyen them`
- [ ] Hien dung top skill can chu y tu weakness profile
- [ ] Label hien thi bang tieng Viet de hieu
- [ ] Co loading, error, low coverage, empty state
- [ ] CTA dan dung sang `DrOwl` hoac `RecommendationsTab`
- [ ] Khong lam roi trai nghiem hien tai cua result screen

---

## 3. Spec API + Data Contract: Smart Assignment MVP

### 3.1 Muc tieu
Smart Assignment MVP khong thay the flow giao bai hien tai.
No la lop `smart preview + prefill` de giao vien giao bai nhanh hon cho 1 hoc sinh cu the.

### 3.2 Pham vi MVP
Chi lam cho `1 hoc sinh`, entry tu `StudentDetailModal`.

Khong lam trong MVP:
- giao cho ca nhom cung luc
- auto-create khong preview
- AI tu chon hoc sinh
- rule engine phuc tap theo xu huong dai han

### 3.3 Entry point tren UI
Trong `src/components/teacher/ResultsView/StudentDetailModal.tsx`

Vi tri khuyen nghi:
- Ngay duoi khoi `Ky nang can chu y`

Nut de xuat:
- `Giao bai on loi cho em nay`

### 3.4 Nguyen tac nghiep vu
`Smart assignment` phai dung `weakness profile` lam nguon su that.

Cong thuc:

`resultId -> weakness profile -> smart preview -> giao vien xac nhan -> create assignment`

### 3.5 Ly do can Preview API rieng
Hien tai da co `POST /api/assignments` de tao assignment that.
Cho MVP, khong nen tao route `smart-create` moi neu chua can.

Can them route preview:

- `POST /api/assignments/smart-preview`

Route nay chi:
- resolve hoc sinh
- doc weakness profile
- chon skill uu tien
- de xuat quiz phu hop
- tra draft assignment de frontend prefill

Frontend sau do dung lai route cu:

- `POST /api/assignments`

### 3.6 API de xuat

#### Endpoint

```http
POST /api/assignments/smart-preview
```

#### Request body

```json
{
  "resultId": "123",
  "teacherUsername": "teacher_001",
  "strategy": "top_weak_skill",
  "preferredQuizId": "",
  "deadlinePreset": "7d",
  "maxAttempts": 1
}
```

#### Field meaning
- `resultId`
  - Bat buoc
  - Dung de truy ra `student_name`, `class_name`, `weakness profile`
- `teacherUsername`
  - Bat buoc
  - Dung de permission-check va filter class
- `strategy`
  - MVP chi can:
    - `top_weak_skill`
- `preferredQuizId`
  - Tuy chon
  - Neu giao vien muon uu tien 1 quiz cu the
- `deadlinePreset`
  - `3d | 7d | 14d | custom`
- `maxAttempts`
  - default `1`

### 3.7 Backend flow
1. Validate request.
2. Lay result theo `resultId`.
3. Resolve hoc sinh:
   - tu `student_name + class_name`
   - join sang `classes` va `students`
4. Neu tim thay 0 hoc sinh:
   - tra `STUDENT_NOT_FOUND`
5. Neu tim thay >1 hoc sinh:
   - tra `AMBIGUOUS_STUDENT_MATCH`
6. Lay weakness profile tu result context.
7. Chon `top_weak_skill` dau tien co status `weak`, neu khong co thi lay `needs_practice`.
8. Tim danh sach quiz phu hop:
   - uu tien quiz co metadata/tag map voi `skillCode`
   - cung mon
   - uu tien quiz co so cau ngan, muc co ban
9. Build response preview.

### 3.8 Response contract de xuat

```json
{
  "status": "success",
  "data": {
    "student": {
      "id": "s-001",
      "fullName": "Nguyen Van A",
      "classId": "c-001",
      "className": "2A"
    },
    "weaknessSummary": {
      "resultId": "123",
      "coveragePercent": 86,
      "basedOnResultIds": ["123", "120", "118"],
      "topSkill": {
        "subject": "math",
        "subjectLabel": "Toan",
        "skillCode": "phan_so",
        "skillLabel": "Phan so",
        "status": "weak",
        "accuracy": 33,
        "attempted": 6,
        "wrong": 4
      }
    },
    "recommendedQuizzes": [
      {
        "quizId": "quiz-phan-so-01",
        "title": "On luyen phan so co ban",
        "matchReason": "Khop skill phan_so",
        "questionCount": 10,
        "timeLimit": 15,
        "confidence": 0.92
      }
    ],
    "assignmentDraft": {
      "quizId": "quiz-phan-so-01",
      "classId": "c-001",
      "studentId": "s-001",
      "deadline": "2026-04-29T16:59:00.000Z",
      "maxAttempts": 1
    },
    "warnings": []
  }
}
```

### 3.9 Error responses de xuat

#### Student not found

```json
{
  "status": "error",
  "code": "STUDENT_NOT_FOUND",
  "message": "Khong tim thay hoc sinh tu result hien tai."
}
```

#### Ambiguous student match

```json
{
  "status": "error",
  "code": "AMBIGUOUS_STUDENT_MATCH",
  "message": "Co nhieu hoc sinh trung ten trong cung ngu canh lop.",
  "data": {
    "candidates": [
      { "id": "s-001", "fullName": "Nguyen Van A", "classId": "c-001", "className": "2A" },
      { "id": "s-078", "fullName": "Nguyen Van A", "classId": "c-017", "className": "2A-buoi-chieu" }
    ]
  }
}
```

#### No recommended quiz

```json
{
  "status": "error",
  "code": "NO_RECOMMENDED_QUIZ",
  "message": "Chua tim thay quiz phu hop voi skill hien tai."
}
```

#### Low coverage warning but still usable

```json
{
  "status": "success",
  "data": {
    "warnings": [
      {
        "code": "LOW_COVERAGE",
        "message": "Weakness profile moi phu 62% so cau. Nen xem day la goi y som."
      }
    ]
  }
}
```

### 3.10 Frontend contract cho AssignmentTab / Modal
Frontend can 1 ViewModel rieng:

```ts
type SmartAssignmentPreviewVM = {
  student: {
    id: string;
    fullName: string;
    classId: string;
    className: string;
  };
  topSkill: {
    skillCode: string;
    skillLabel: string;
    status: 'weak' | 'needs_practice' | 'stable';
    accuracy: number;
  };
  recommendedQuizzes: Array<{
    quizId: string;
    title: string;
    matchReason: string;
    confidence: number;
  }>;
  assignmentDraft: {
    quizId: string;
    classId: string;
    studentId: string;
    deadline: string;
    maxAttempts: number;
  };
  warnings: Array<{
    code: string;
    message: string;
  }>;
}
```

### 3.11 Quiz matching strategy cho MVP
MVP nen don gian va explainable:

1. Neu `preferredQuizId` ton tai va hop le:
   - uu tien quiz do
2. Neu khong:
   - tim quiz co `skillCode` explicit trung
3. Neu khong co:
   - tim quiz co `tags` chua alias cua skill
4. Neu van khong co:
   - tra `NO_RECOMMENDED_QUIZ`

Khong dung AI de matching o MVP.

### 3.12 Cac field nen them sau nay, nhung chua bat buoc cho MVP
- `results.student_id`
- `results.class_id`
- bang `skill_quiz_mapping`
- `difficulty_band` cho quiz/practice set

### 3.13 Definition of Done
- [ ] Tu `StudentDetailModal` co the goi smart preview cho 1 hoc sinh
- [ ] Backend resolve duoc hoc sinh tu `resultId`
- [ ] Preview tra ve top skill + recommended quiz + assignment draft
- [ ] Frontend prefill form giao bai hien co
- [ ] Giao vien van la nguoi bam xac nhan cuoi cung
- [ ] Co xu ly ro cho `STUDENT_NOT_FOUND`, `AMBIGUOUS_STUDENT_MATCH`, `NO_RECOMMENDED_QUIZ`

---

## Thu tu khuyen nghi de lam tiep
- Buoc 1: Chay migration `0013` local/remote va verify schema
- Buoc 2: Lam `Con can luyen them` trong `OverviewTab`
- Buoc 3: Lam `Smart Assignment` MVP cho 1 hoc sinh
- Buoc 4: Sau khi du lieu on dinh moi mo rong sang smart assignment cho nhom/lop

## Decision Log
- Chon migration rieng theo file thay vi dung `schema.sql` toan bo.
- Chon `OverviewTab` la vi tri dat `Con can luyen them` vi day la noi hoc sinh thay dau tien.
- Chon `DrOwl` va `RecommendationsTab` lam CTA MVP thay vi tao flow moi.
- Chon `smart-preview + create_assignment hien co` de tan dung he assignment san co va tranh duplicate route.
- Chon `single-student MVP` truoc `group assignment` de giam rui ro identity mapping.
