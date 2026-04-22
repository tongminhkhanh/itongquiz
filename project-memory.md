# Project Memory

## Scope
Tai lieu nay ghi nho boi canh lam viec giua user va Codex cho du an `itongquiz`, de cac buoi sau co the tiep tuc nhanh ma khong can doc lai toan bo chuoi chat.

## Current Product Direction
- Muc tieu trung tam la `Weakness Profile V1`
- Huong trien khai da chot:
  - teacher-side truoc
  - on-demand computation
  - dua tren `resultId`
  - khong tao bang `weakness_profile`
- Hai mon duoc uu tien:
  - `math`
  - `vietnamese`

## Key Decisions Already Locked
- Skill taxonomy la truc chinh, khong tron voi:
  - `question_type`
  - `competency`
- `AssignmentTab` la noi xac nhan cuoi cho smart assignment
- Recommendation giu `rule-based`, khong dua AI vao scoring phase nay
- Thu tu uu tien recommendation:
  - `subskill > skill > tags`
- `difficulty` la signal quan trong, da duoc dua xuong D1 `questions`
- `WeaknessSummaryCard` test theo huong:
  - `Vitest + RTL`
  - khong them Storybook

## Major Deliverables Already Implemented
- Weakness profile endpoint va teacher-side analytics
- Student-side `Con can luyen them`
- `StudentDetailModal -> AssignmentTab prefill`
- `WeaknessSummaryCard` component tests
- `smart-preview` scoring nang cap:
  - `targetDifficulty`
  - `matchBreakdown`
  - `confidence`
- `AssignmentTab` co explanation card:
  - `matchReason`
  - `Do tin cay`
  - `Vi sao de nay duoc goi y`

## Database / Migration State
- `0013_add_question_skill_metadata.sql`: da co
- `0014_add_question_difficulty.sql`: da rollout va verify
- `remote D1` hien co:
  - `subject`
  - `skill_code`
  - `subskill_code`
  - `difficulty`
- local D1 da bootstrap bang `schema.sql`

## Metadata Backfill State
- Da co script:
  - `audit-question-metadata.cjs`
  - `preview-question-metadata-backfill.cjs`
  - `apply-question-metadata-backfill.cjs`
  - `question-metadata-backfill-map.v1.cjs`
  - `metadata-backfill-report-utils.cjs`
- Da co report cho QA:
  - JSON
  - CSV

## Verified Coverage Latest
- `total_questions = 1264`
- `with_subject = 207`
- `with_skill_code = 207`
- `with_subskill_code = 207`
- `with_difficulty = 207`
- explicit metadata coverage hien tai:
  - `16.4%`
- `with_nonempty_tags = 258`

## Backfill Phase Status

### Phase 1
- Da xong
- Da apply het toan bo row `preview-safe`
- `remote-dry-run-latest.json` hien tra:
  - `candidateRows = 0`

### Phase 2
- Da mo phase 2
- Con 2 bucket can xu ly:
  - `51` row co tags nhung chua map duoc an toan
  - `1006` row khong co tags usable

## Remaining Tagged-Unmapped Buckets
- `#tieng_viet,#trang_nguyen` -> `40`
- `#gia_dinh,#tieng_viet` -> `10`
- `#test_tag` -> `1`

## Interpretation For Phase 2
- `trang_nguyen` hien khong duoc xem la mot `skill` ro rang
- `gia_dinh` co ve la `theme/content tag`, khong nen auto-map thanh `skill_code`
- `1006` row no-tags khong nen co gang heuristic tiep, can:
  - authoring cleanup
  - manual annotation
  - import cleanup

## Important Working Files
- [weakness-profile-dev-ready.md](C:/itongquiz1/itongquiz1/weakness-profile-dev-ready.md)
- [metadata-backfill-plan.md](C:/itongquiz1/itongquiz1/metadata-backfill-plan.md)
- [next-phase-dev-ready-roadmap.md](C:/itongquiz1/itongquiz1/next-phase-dev-ready-roadmap.md)
- [phase2-backfill-analysis.md](C:/itongquiz1/itongquiz1/phase2-backfill-analysis.md)

## Recommended Next Steps
1. Lam ticket cuc nho cho Phase 2 theo `Backend / QA / Product`
2. Sampling va review bucket `#trang_nguyen`
3. Sampling va review bucket `#gia_dinh,#tieng_viet`
4. Neu Product + QA chot duoc rule moi, mo `map V2`
5. Khong chay them backfill batch neu `candidateRows = 0`

## Notes
- Neu can tiep tuc boi canh o cac buoi sau, uu tien doc file nay truoc
- Sau do doc:
  - `next-phase-dev-ready-roadmap.md`
  - `phase2-backfill-analysis.md`
