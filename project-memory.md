# Project Memory

## Scope
Tai lieu nay ghi nho boi canh lam viec giua user va Codex cho du an `itongquiz`, de cac buoi sau co the tiep tuc nhanh ma khong can doc lai toan bo chuoi chat.

## Latest Session Closure - 2026-04-24
- Da commit va push 3 thay doi len `origin/main`:
  - `68dc4aa` - `feat(student): add focused weakness recommendations and phase2 metadata review tooling`
  - `c9d04ec` - `feat(teacher-dashboard): add smart assignment insight flow and build cleanup`
  - `d7467e5` - `chore(seo): refresh sitemap with latest public quiz URLs`
- Frontend production da auto-deploy qua Vercel tu Git:
  - deployment `Ready`
  - alias production gom `https://www.thitong.site` va `https://itongquiz1.vercel.app`
- Backend production da deploy rieng qua Cloudflare Workers:
  - worker `itongquiz-api`
  - version `970e1171-5f67-4996-a579-064b79b77e03`
  - verify `GET https://phieu.thitong.site/api/health` tra `200`
- Worktree da duoc don sach sau deploy:
  - da xoa report artifacts Phase 2 moi sinh
  - da restore local Wrangler state
  - da restore `AGENTS.md` va `CLAUDE.md`
  - da giu va commit `public/sitemap.xml` vi co them URL quiz public moi

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
- Student-side focused recommendation handoff:
  - `WeaknessSummaryCard` gui focus skill sang `RecommendationsTab`
  - `RecommendationsTab` hien focus card truoc AI recommendation
- `smart-preview` scoring nang cap:
  - `targetDifficulty`
  - `matchBreakdown`
  - `confidence`
- `AssignmentTab` co explanation card:
  - `matchReason`
  - `Do tin cay`
  - `Vi sao de nay duoc goi y`
- Teacher-side smart assignment insight flow da duoc tach sach:
  - `SmartAssignmentInsightCard`
  - `buildSmartAssignmentInsightModel`
  - states: `recommended`, `review`, `low-confidence`, `manual-adjusted`
- Build warning cleanup da xu ly:
  - Tailwind source scan `source(none)` de tranh CSS selector rac
  - Recharts direct imports de tranh circular re-export warnings
  - bo empty manual chunk `vendor-data`

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
  - `analyze-question-metadata-phase2.cjs`
  - `question-metadata-phase2-review-utils.cjs`
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
- Da co script review Phase 2 chi de phan loai/sampling, khong auto-apply
- Ket qua remote moi nhat:
  - `total_questions = 1329`
  - `phase2ReviewRows = 51`
  - coverage review = `3.8%`
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
- [teacher-intervention-flow-dev-ready.md](C:/itongquiz1/itongquiz1/teacher-intervention-flow-dev-ready.md)

## Recommended Next Steps
1. Sampling va review bucket `#trang_nguyen` theo output `phase2-review`
2. Sampling va review bucket `#gia_dinh,#tieng_viet`
3. Neu Product + QA chot duoc rule moi, mo `map V2` preview truoc
4. Khong auto-map theme/source tags thanh `skill_code`
5. Neu tiep tuc student-side, noi focus skill sang practice library/topic entry point

## Notes
- Neu can tiep tuc boi canh o cac buoi sau, uu tien doc file nay truoc
- Sau do doc:
  - `next-phase-dev-ready-roadmap.md`
  - `phase2-backfill-analysis.md`

## Security Audit Batch - 2026-04-24
- Da mo batch hardening uu tien theo huong it anh huong production.
- Da dung `api-security-testing` va `api-security-best-practices` de phan loai rui ro.
- GitNexus impact truoc khi sua:
  - `handleTeacherRoutes`: HIGH vi nam tren Worker fetch flow chung, sua narrow field selection.
  - `corsHeaders`: HIGH vi nam tren CORS flow chung, sua narrow origin matching.
- Secret hygiene:
  - `.env` van ton tai local nhung da go khoi Git index.
  - `workers/.wrangler/` da duoc ignore va local D1 state da go khoi Git index.
  - Can rotate `VITE_API_SECRET_TOKEN` va `SITEMAP_API_TOKEN` neu `.env` tung push len remote.
- Data leak fix:
  - `/api/teachers` khong con tra `SELECT *`.
  - List teachers chi tra public teacher fields va giu `fullName/full_name` de han che vo UI cu.
- CORS hardening:
  - Bo rule `includes('103.47.224.66')`.
  - Chi allow exact origins da nam trong allowlist.
- Dependency patch:
  - Root `vite` da update len `6.4.2`.
  - Workers `wrangler` da update len `4.85.0`; workers audit ve `0 vulnerabilities`.
- XSS guard:
  - Da them regression test cho `formatHtmlText` voi script tag, event handler, allowed inline tags va underscore phonetics.
- Deferred security backlog:
  - Thay shared frontend `VITE_API_SECRET_TOKEN` bang session/JWT/RBAC.
  - Xu ly `xlsx` vulnerability bang thay the/contain import-export Excel trong batch rieng.
  - Danh gia `better-react-mathjax` dependency chain trong batch rieng.

## Repo Hygiene Batch - 2026-04-26
- Muc tieu: don tracked generated/debug artifacts ma khong anh huong runtime.
- Quyet dinh an toan:
  - Khong chuyen `App.tsx`, `index.tsx`, root `stores/`, root `utils/` trong batch nay.
  - Chi cap nhat `tsconfig.json` de IDE/type project nhan dung cac runtime files hien tai.
  - Giu refactor move source vao `src/` cho batch rieng sau nay.
- Ignore/cached cleanup:
  - Them ignore cho `.next`, `tmp`, debug JSON/output/html artifacts.
  - Go tracked generated artifacts khoi Git index, khong xoa local files.
- Deferred repo-structure backlog:
  - Chuyen entrypoint sang `src/main.tsx`.
  - Chuyen `App.tsx` sang `src/App.tsx`.
  - Hop nhat root `stores/` vao `src/stores/`.
  - Chuyen root `utils/InputValidator.ts` vao `src/utils/`.
  - Gom root markdown/scripts vao `docs/` va `scripts/legacy/` theo batch rieng.
