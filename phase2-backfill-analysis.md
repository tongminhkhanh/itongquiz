# Phase 2 Backfill Analysis

## Goal
Tang metadata coverage vuot `16.4%` sau khi Phase 1 da xu ly het cac row `preview-safe`.

## Verified Starting Point
- `total_questions = 1264`
- `explicit metadata rows = 207`
- `coverage = 16.4%`
- `with_nonempty_tags = 258`
- `remaining tagged-unmapped = 51`
- `remaining no-tags-no-metadata = 1006`

## Why Phase 2 Exists
Phase 1 dung lai khong phai vi script khong chay duoc, ma vi:
- khong con row nao duoc infer an toan theo `map V1`
- phan con lai khong du ro rang de auto-map ma khong tang rui ro sai skill

## Bucket Breakdown

### Bucket A: `#tieng_viet,#trang_nguyen` (`40` rows)
Observation:
- tag nay khong bieu thi mot `skill` ro rang
- mau noi dung da lay cho thay no gom nhieu dang cau hoi:
  - chinh ta
  - tu vung
  - chu ngu / vi ngu
  - doc hieu

Examples:
- `Đáp án nào dưới đây có từ viết sai chính tả?`
- `Từ nào dưới đây có nghĩa giống với từ "chất phác"?`
- `Đáp án nào là chủ ngữ trong câu văn dưới đây?`
- `Đọc đoạn thơ dưới đây và cho biết khung cảnh thiên nhiên...`

Interpretation:
- `trang_nguyen` nhieu kha nang la bucket noi dung / nguon / dang tong hop
- khong nen auto-map tag nay thanh mot `skill_code` duy nhat

Recommended next step:
- QA/Product sample 40 row va chia nho thanh:
  - `chinh_ta`
  - `tu_vung`
  - `luyen_tu_va_cau`
  - `doc_hieu`
  - `khong du can cu`

### Bucket B: `#gia_dinh,#tieng_viet` (`10` rows)
Observation:
- tag `gia_dinh` co ve la `theme/content`, khong phai skill
- mau noi dung gom:
  - tu vung ve gia dinh
  - noi cau/tim tu
  - nhan dien mau cau

Examples:
- `Từ nào dưới đây chỉ người thân trong gia đình?`
- `Điền từ thích hợp vào chỗ trống...`
- `Câu 'Gia đình em đang quây quần bên mâm cơm.' thuộc mẫu câu nào?`

Interpretation:
- co the infer `subject = vietnamese`
- nhung chua du ro de infer mot `skill_code` duy nhat cho toan bo bucket

Recommended next step:
- tach bucket nay thanh:
  - `tu_vung`
  - `luyen_tu_va_cau`
  - `theme-only`

### Bucket C: `#test_tag` (`1` row)
Interpretation:
- noise / test data

Recommended next step:
- khong dua vao map V2
- danh dau cleanup data

### Bucket D: No tags + no metadata (`1006` rows)
Interpretation:
- day la bucket lon nhat
- khong the giai quyet bang `tag -> taxonomy`

Recommended next step:
- khong auto-backfill bucket nay
- mo thanh luong rieng:
  - authoring cleanup
  - manual annotation
  - import pipeline cleanup

## Phase 2 Decision Rules

### Rule 1
Khong auto-map `theme/content tag` thanh `skill_code`.

### Rule 2
Khong auto-apply neu bucket van gom nhieu dang cau hoi khac nhau.

### Rule 3
Neu Product muon cho phep `subject-only` backfill, phai chot ro:
- no dung de lam gi
- co cho phep weakness profile bo qua row khong co skill hay khong

### Rule 4
Bucket `no-tags` phai co owner rieng, khong tron vao phase `map V2`.

## Proposed Phase 2 Output

### Output A
`map V2 preview` cho `#trang_nguyen` sau khi da sample + classify

### Output B
`map V2 preview` cho `#gia_dinh,#tieng_viet`

### Output C
Danh sach row `manual-only` cho bucket no-tags

## Done When
- Team thong nhat `trang_nguyen` va `gia_dinh` la gi trong taxonomy
- Co `map V2` preview ma QA xem hop ly
- Team co owner cho bucket `1006` row no-tags
