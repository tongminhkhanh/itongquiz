sử dụng skill tương ứng trong thư mục .codex/skill để thực hiện# Metadata Backfill Plan

## Goal
Backfill explicit metadata cho question bank cu de `subject`, `skill_code`, `subskill_code`, va `difficulty` khong con phu thuoc lau dai vao `tags fallback`.

## Baseline
- `remote D1` dang co `1264` questions
- explicit metadata coverage hien tai:
  - `subject = 0`
  - `skill_code = 0`
  - `subskill_code = 0`
  - `difficulty = 0`
- `258/1264` questions dang co non-empty `tags`

## Tasks

### Backend
- [ ] Chot file taxonomy nguon su that cho:
  - `subject`
  - `skill_code`
  - `subskill_code`
  -> Verify: team cung tham chieu 1 nguon mapping duy nhat

- [ ] Viet bang map `tag -> metadata` cho cac tag pho bien nhat
  - vi du: `#toan`, `#phan_so`, `#quy_dong`
  -> Verify: co map cho nhom tag co tac dong cao nhat

- [ ] Viet script preview backfill:
  - doc `questions.id`, `tags`
  - suy ra `subject`
  - suy ra `skill_code`
  - suy ra `subskill_code` neu du tu tin
  - suy ra `difficulty` neu co rule ro rang
  -> Verify: script xuat preview ma chua ghi DB

- [ ] Them che do report cho script preview:
  - bao nhieu questions map duoc
  - bao nhieu questions ambiguous
  - bao nhieu questions khong map duoc
  -> Verify: team biet muc do tu dong hoa kha thi den dau

- [ ] Sau khi preview on, them script apply backfill co logging
  -> Verify: update DB co the audit lai sau khi chay

- [ ] Chay lai `npm run db:audit:question-metadata:remote`
  -> Verify: coverage tang len ro rang sau moi dot backfill

### Frontend
- [ ] Review create/edit quiz flow de quiz moi bat buoc giu metadata khi luu
  -> Verify: khong tao them du lieu moi bi thieu metadata

- [ ] Can nhac warning nhe trong luong tao/sua quiz neu question chua co `subject/skill_code`
  -> Verify: nguoi tao quiz biet de bo sung metadata som

- [ ] Review `AssignmentTab` va `WeaknessSummaryCard` sau moi dot backfill
  -> Verify: UI khong can copy fallback qua manh neu explicit metadata da tang

### QA
- [ ] Lay mau 20-30 questions duoc script preview map
  -> Verify: metadata suy ra co hop ly voi noi dung cau hoi

- [ ] Tach rieng 3 nhom de test:
  - map chac chan
  - map mo ho
  - khong map duoc
  -> Verify: team thong nhat nguong tin cay truoc khi apply DB

- [ ] Sau khi apply backfill, chay lai audit script
  -> Verify: coverage metadata thay doi dung nhu du kien

- [ ] Regression recommendation:
  - quiz co explicit metadata
  - quiz chi co tags
  - quiz chua co metadata
  -> Verify: scoring va warning fallback van hop ly

## Suggested Order
1. Chot taxonomy + tag mapping
2. Viet script preview backfill
3. QA sample preview output
4. Viet script apply
5. Chay audit lai
6. Polish UI/copy neu fallback giam

## Done When
- Team co script preview backfill
- Team co script apply backfill
- Team do duoc coverage tang theo moi dot
- Quiz moi khong tiep tuc roi metadata
