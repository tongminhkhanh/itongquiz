# Next-Phase Dev-Ready Roadmap

## Summary
Tai lieu nay cap nhat roadmap theo `trang thai moi nhat da verify`, khong con dung baseline cu.

No tong hop 3 lop cong viec:
1. Nhan feature/flow da o muc nao
2. Metadata rollout da den dau tren DB that
3. Phase 2 backfill can tap trung vao bucket nao de tang coverage vuot `16.4%`

## Status Snapshot

### Da xong trong code
- `StudentDetailModal -> AssignmentTab prefill` da noi xong
- `useTeacherDashboardUIStore` da co
- `AssignmentTab` da hydrate draft, co banner goi y, co manual mode
- `WeaknessSummaryCard` da co tests
- `smart-preview` da co:
  - `subskill > skill > tags`
  - `targetDifficulty`
  - `matchBreakdown`
  - `confidence`
- `AssignmentTab` da hien `matchReason + Do tin cay + insight card`
- Migration:
  - `0013_add_question_skill_metadata.sql`
  - `0014_add_question_difficulty.sql`
- Backfill toolchain da co:
  - `audit`
  - `preview`
  - `apply`
  - `CSV/JSON reports`

### Da verify
- Integration test `StudentDetailModal -> AssignmentTab prefill` da pass
- `WeaknessSummaryCard` tests da pass
- `smartAssignment` worker tests da pass
- `npm run build` da pass
- `0014` da rollout tren `remote D1`
- Local D1 da bootstrap va verify co `questions.difficulty`
- Backfill phase 1 da chay den diem dung tu nhien

### Da xong o muc van hanh phase 1
- `remote D1` hien tai:
  - `with_subject = 207`
  - `with_skill_code = 207`
  - `with_subskill_code = 207`
  - `with_difficulty = 207`
  - coverage = `16.4%`
- `remote-dry-run-latest.json` hien tra ve:
  - `candidateRows = 0`

### Chua xong
- Van con `51` row co tags nhung chua du dieu kien map an toan
- Van con `1006` row khong co tags usable
- Chua co `map V2`
- Chua co owner/process chinh thuc cho bucket `no-tags`

## Verified Data State

### Remote Audit
- `total_questions = 1264`
- `with_subject = 207`
- `with_skill_code = 207`
- `with_subskill_code = 207`
- `with_difficulty = 207`
- `with_nonempty_tags = 258`

### Remaining Tagged-Unmapped Rows
- `#tieng_viet,#trang_nguyen` -> `40`
- `#gia_dinh,#tieng_viet` -> `10`
- `#test_tag` -> `1`

### No-Tag / No-Metadata Rows
- `1006`

## Interpretation
- Phase 1 khong bi mac ky thuat nua; no da dung dung diem vi du lieu dau vao khong con du ro rang
- Phan tang coverage tiep theo khong con la van de `chay them batch`
- No da tro thanh bai toan:
  - taxonomy clarification
  - sampling + QA review
  - authoring/data cleanup

## Decisions Locked
- `AssignmentTab` van la noi xac nhan cuoi
- Recommendation van `rule-based`
- Khong dua AI vao scoring phase nay
- Khong auto-map tag mo ho thanh `skill_code`
- Khong co gang heuristic cho `1006` row khong co tags

## Phase 1 Outcome

### Objective
Dung `map V1` de backfill het nhung row co the infer an toan.

### Outcome
- Dat
- Toan bo row `preview-safe` da duoc apply
- Team co report artifact cho QA truoc moi dot
- Khong con candidate row nao theo rule hien tai

### Evidence
- `workers/reports/metadata-backfill/remote-dry-run-latest.json`
- `workers/reports/metadata-backfill/remote-apply-latest.json`
- `npm run db:audit:question-metadata:remote`

## Phase 2 Goal
Tang coverage vuot `16.4%` ma khong ha nguong tin cay.

## Phase 2 Workstreams

### Workstream A: Resolve tagged-but-unmapped rows
Muc tieu:
- Xu ly `51` row con tags nhung chua infer duoc an toan

Tac vu:
- sampling `#trang_nguyen`
- sampling `#gia_dinh,#tieng_viet`
- chot nghia taxonomy cho 2 bucket nay
- preview `map V2`
- chi apply neu QA/Product dong y

Expected gain:
- toi da them `51` row neu tim duoc rule tot
- realistic gain:
  - `#trang_nguyen`: mot phan
  - `#gia_dinh`: co the rat han che neu day chi la theme tag

### Workstream B: Separate theme tags from skill tags
Muc tieu:
- khong de Product/Backend tiep tuc nham `chu de noi dung` voi `ky nang`

Tac vu:
- chot danh sach tag la:
  - `skill`
  - `subskill`
  - `theme/content`
  - `noise/test`

Expected gain:
- giam ambiguity cho map V2
- giu chat luong weakness profile

### Workstream C: Create plan for no-tag rows
Muc tieu:
- lap duoc lo trinh cho `1006` row khong co tags usable

Tac vu:
- tach bucket theo quiz/source/import period neu co
- uu tien quiz dang duoc dung nhieu
- chon owner:
  - authoring
  - data cleanup
  - manual annotation

Expected gain:
- khong tang coverage ngay lap tuc, nhung mo duoc duong xu ly that cho bucket lon nhat

## Recommended Order From Here
1. Cap nhat tai lieu theo state moi nhat
2. Phan tich `#trang_nguyen`
3. Phan tich `#gia_dinh,#tieng_viet`
4. Chot `map V2`
5. Chay preview V2
6. QA review report
7. Neu on moi apply dot moi
8. Song song: lap backlog cho `1006` row no-tags

## Backend Backlog
- [x] Freeze Phase 1 state
- [x] Bao cao `candidateRows = 0`
- [ ] Tao report `phase2-unmapped-analysis`
- [ ] Tao `map V2` preview branch cho `#trang_nguyen`
- [ ] Tao `map V2` preview branch cho `#gia_dinh,#tieng_viet`
- [ ] Khong cho apply that neu chua co QA sign-off

## QA Backlog
- [ ] Review sample `#trang_nguyen`
- [ ] Review sample `#gia_dinh,#tieng_viet`
- [ ] Danh dau row nao:
  - map chac chan
  - map mo ho
  - khong nen auto-map
- [ ] Re-run preview report sau khi co `map V2`

## Product Backlog
- [ ] Chot `trang_nguyen` trong taxonomy
- [ ] Chot `gia_dinh` co phai skill khong
- [ ] Chot co cho phep `subject-only` backfill khong
- [ ] Chot owner cho bucket `1006` row no-tags

## Risks
- Co gang ep `theme tag` thanh `skill` se lam weakness profile mat tin cay
- Co gang heuristic cho bucket no-tags se gay nhiu hon loi
- Neu khong cap nhat roadmap, team se tiep tuc doc baseline cu `0/1264` va ra quyet dinh sai

## Definition Of Done For Current Phase
- Roadmap khop voi DB state moi nhat
- Team biet Phase 1 da xong den dau
- Team co mo ta ro cho Phase 2
- Team co backlog tach rieng cho:
  - tagged-unmapped
  - no-tags

## Decision Log
- Freeze Phase 1 o moc `207 row explicit`
- Khong chay them batch nua khi `candidateRows = 0`
- Chuyen trong tam sang `analysis + taxonomy clarification + map V2`
