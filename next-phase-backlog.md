# Next Phase Backlog

## Goal
Day backlog bien roadmap hien tai thanh task nho de doi co the vao viec ngay, dua tren trang thai da verify:

- `0014_add_question_difficulty.sql` da rollout xong
- explicit metadata tren remote question bank hien tai = `0/1264`
- tags fallback hien co = `258/1264`

## Backend
- [ ] Viet 1 query/script audit co the chay lai de do:
  - `with_subject`
  - `with_skill_code`
  - `with_subskill_code`
  - `with_difficulty`
  - `with_nonempty_tags`
  -> Verify: team co the chay lai audit ma khong phai nho query thu cong
  -> Status: da xong qua:
  - `npm run db:audit:question-metadata:local`
  - `npm run db:audit:question-metadata:remote`

- [ ] Them script npm cho metadata audit trong `workers/package.json`
  -> Verify: co lenh ro rang cho `local` va/hoac `remote`
  -> Status: da xong

- [ ] Xac nhan `smart-preview` scoring uu tien explicit `difficulty` truoc tags fallback
  -> Verify: worker tests pass va khong co regression contract

- [ ] Bo sung worker test cho case:
  - explicit `difficulty` co gia tri
  - khong co `difficulty` nhung co tags
  - khong co ca hai thi van fallback an toan
  -> Verify: `npm run test:run -- tests/smartAssignment.worker.test.ts` xanh

- [ ] Chuan bi plan backfill metadata cho question bank cu:
  - nguon du lieu nao se cap `subject`
  - nguon du lieu nao se cap `skill_code`
  - nguon du lieu nao se cap `subskill_code`
  - nguon du lieu nao se cap `difficulty`
  -> Verify: co 1 tai lieu/prompt/script strategy ro rang de bat dau backfill
  -> Status: da tao `metadata-backfill-plan.md`

- [ ] Uu tien xac dinh xem tags hien tai co map duoc den taxonomy nao
  -> Verify: co bang map ban dau cho cac tag pho bien nhu `#phan_so`, `#toan`

## Frontend
- [ ] Review lai copy trong `AssignmentTab` de giao vien de hieu hon:
  - `Vi sao de nay duoc goi y`
  - `Do tin cay`
  - `Dang o che do chon de thu cong`
  -> Verify: copy da de doc, it ky thuat hon

- [ ] Can nhac them 1 state nhe cho truong hop recommendation dang dua chu yeu vao tags fallback
  -> Verify: giao vien nhin thay duoc muc do tin cay cua metadata

- [ ] Kiem tra lai flow `StudentDetailModal -> AssignmentTab` bang tay voi 3 tinh huong:
  - draft hop le
  - bo goi y
  - doi quiz bang tay
  -> Verify: UI khong giu stale explanation

- [ ] Can nhac them 1 dashboard-level smoke test neu doi thay flow nay con de vo khi refactor
  -> Verify: co quyet dinh ro rang `lam` hoac `khong lam`

## QA
- [ ] Verify tren remote D1:
  - cot `difficulty` da ton tai
  -> Verify: `pragma_table_info('questions')` tra ve `difficulty INTEGER`

- [ ] Verify create/update/fetch quiz moi co `difficulty`
  -> Verify: field khong bi roi o worker/frontend

- [ ] Verify teacher flow:
  - mo `StudentDetailModal`
  - dung smart preview
  - sang `AssignmentTab`
  - submit assignment thanh cong
  -> Verify: draft clear dung luc, manual flow khong vo

- [ ] Verify recommendation insight card:
  - doi quiz goi y
  - doi sang quiz thu cong
  - xem warning fallback neu co
  -> Verify: `matchReason + confidence` cap nhat dung

- [ ] Verify metadata reality:
  - question bank cu chua co explicit metadata
  - recommendation hien tai van chay duoc voi tags fallback o mot phan du lieu
  -> Verify: team QA va team product co cung ky vong ve chat luong recommendation hien tai

## Suggested Order
1. Backend them script audit + khoa worker tests
2. QA verify rollout `difficulty` va round-trip quiz moi
3. Frontend polish copy/warning trong `AssignmentTab`
4. Backend + Product chot plan backfill metadata

## Done When
- Team co script audit co the chay lai
- Team biet ro explicit metadata coverage dang bang 0 tren du lieu cu
- Teacher flow da duoc QA lai sau rollout schema
- Co ke hoach backfill metadata cu the de recommendation khong phu thuoc lau dai vao tags
