# Weakness Profile Dev-Ready

## Goal
Xây dựng `Hồ sơ điểm yếu theo kỹ năng` cho iTongQuiz để biến dữ liệu bài làm hiện có thành phân tích kỹ năng học tập cụ thể, làm nền cho luyện bù, giao bài thông minh và tóm tắt lớp.

## Scope
- Pha đầu chỉ làm cho `Toan` và `Tieng Viet`
- Chỉ dùng rule-based analytics để xác định điểm yếu
- AI chỉ dùng để diễn giải, không dùng để tự quyết định học sinh yếu kỹ năng nào
- Ưu tiên hiển thị teacher-side trước, student-side sau khi dữ liệu ổn định

## Existing Foundation
- Kết quả theo từng câu đã có qua `StudentResult.answers` và `validationDetails`
- Đã có phân tích năng lực theo loại câu hỏi ở `src/utils/competencyMapping.ts`
- Đã có modal phân tích từng học sinh ở `src/components/teacher/ResultsView/StudentDetailModal.tsx`
- Đã có AI insight cho từng học sinh ở `src/services/ai/studentAnalysisService.ts`
- Đã có `practice` và `aiTutor` để nối sang pha luyện bù sau này

## Key Decision
- `question_type` != `competency` != `skill`
- `skill` là trục chính của tính năng này
- Mỗi câu hỏi ở V1 chỉ gắn `1 skillCode` chính
- Có thể mở rộng `subskillCode` về sau nhưng không bắt buộc trong MVP

## Subject Taxonomy

### Toan
- `so_va_cau_tao_so`
- `phep_cong_tru`
- `phep_nhan_chia`
- `phan_so`
- `so_thap_phan`
- `don_vi_do_luong`
- `hinh_hoc_co_ban`
- `toan_co_loi_van`
- `du_lieu_va_bieu_do`
- `quy_luat_va_tu_duy_logic`

### Tieng Viet
- `doc_thanh_tieng`
- `doc_hieu`
- `tim_y_chinh`
- `tu_vung`
- `luyen_tu_va_cau`
- `dat_cau_va_viet_cau`
- `chinh_ta`
- `dau_cau_va_quy_tac_viet`
- `sap_xep_va_lien_ket_y`
- `cam_thu_noi_dung_va_nhan_vat`

## Data Model Changes

### Question metadata
Thêm metadata skill cho câu hỏi. Không trộn vào `type`.

Đề xuất mở rộng `Question`:

```ts
type SubjectCode = 'math' | 'vietnamese';

interface SkillMetadata {
  subject?: SubjectCode;
  skillCode?: string;
  subskillCode?: string;
}
```

Áp dụng vào các question types hiện có trong `src/types/domain.types.ts` bằng cách thêm:

```ts
subject?: SubjectCode;
skillCode?: string;
subskillCode?: string;
```

### Weakness profile
V1 có thể tính on-demand, nhưng structure chuẩn phải được chốt từ đầu:

```ts
type WeaknessStatus = 'weak' | 'needs_practice' | 'stable';

interface SkillPerformance {
  skillCode: string;
  subskillCode?: string;
  attempted: number;
  correct: number;
  wrong: number;
  accuracy: number;
  status: WeaknessStatus;
  lastSeenAt: string;
  recentQuestionIds: string[];
}

interface SubjectWeaknessProfile {
  subject: SubjectCode;
  skills: SkillPerformance[];
}

interface WeaknessProfile {
  studentId: string;
  studentName?: string;
  updatedAt: string;
  basedOnResultIds: string[];
  subjects: SubjectWeaknessProfile[];
}
```

## MVP Classification Rules
- Nếu `attempted < 2` -> chưa kết luận, tạm coi là `stable`
- Nếu `accuracy < 50` và `wrong >= 2` -> `weak`
- Nếu `accuracy >= 50` và `accuracy < 75` -> `needs_practice`
- Nếu `accuracy >= 75` -> `stable`

Ghi chú:
- V1 nên tính từ `1-5` bài gần nhất thay vì toàn bộ lịch sử
- Không kết luận điểm yếu từ 1 câu sai đơn lẻ

## Processing Flow
1. Học sinh nộp bài
2. Hệ thống đã chấm và có `validationDetails`
3. Analytics service đọc:
   - `result.answers`
   - `result.validationDetails`
   - `questionsMap`
4. Mỗi câu được map sang `skillCode`
5. Gom thống kê theo `subject + skillCode`
6. Tính:
   - attempted
   - correct
   - wrong
   - accuracy
7. Gán trạng thái:
   - `weak`
   - `needs_practice`
   - `stable`
8. Sinh `WeaknessProfile`
9. Dùng hồ sơ này để:
   - hiển thị teacher-side
   - hiển thị student-side
   - làm input cho remedial practice
   - làm input cho smart assignment

## Backend Design

### Phase 1A: Compute on demand
Chưa cần migration lưu bảng riêng ngay. Tạo service tính từ `results + questions`.

Đề xuất service:
- `workers/src/services/skillAnalysis.ts`

Core functions:

```ts
getQuestionSkillMetadata(question): { subject, skillCode, subskillCode }
buildWeaknessProfile(results, questionsMap): WeaknessProfile
classifySkillStatus(skillPerformance): WeaknessStatus
```

### Phase 1B: API
Đề xuất endpoints mới:

- `GET /api/students/:id/weakness-profile`
  Trả về hồ sơ điểm yếu của 1 học sinh

- `GET /api/results/:id/skill-breakdown`
  Trả về breakdown kỹ năng từ 1 bài cụ thể

- `GET /api/classes/:id/skill-summary`
  Aggregate theo lớp, phục vụ phase teacher summary sau

V1 có thể ưu tiên làm:
- `GET /api/students/:id/weakness-profile`
- `GET /api/results/:id/skill-breakdown`

## Frontend Design

### Teacher-side first
Tích hợp vào:
- `src/components/teacher/ResultsView/StudentDetailModal.tsx`

Thêm section mới:
- `Ky nang can chu y`
- Hiển thị top 3 skill có status `weak` hoặc `needs_practice`
- Mỗi skill hiển thị:
  - label
  - accuracy
  - so cau da gap
  - muc do

Ví dụ UI:

```text
Kỹ năng cần chú ý
- Phân số: 33% (2/6) - Yếu
- Toán có lời văn: 50% (2/4) - Cần luyện thêm
```

### Student-side after validation
Sau khi teacher-side ổn mới thêm block vào result screen:
- `Con can luyen them`

Vị trí gợi ý:
- `src/components/student/ResultScreen/tabs/OverviewTab.tsx`

## Files To Touch
- `src/types/domain.types.ts`
- `src/utils/competencyMapping.ts` hoặc tạo mới `src/utils/skillMapping.ts`
- `src/components/teacher/ResultsView/StudentDetailModal.tsx`
- `workers/src/routes/results.ts` hoặc route mới cho student analytics
- Mới: `workers/src/services/skillAnalysis.ts`
- Mới: `src/types/analytics.types.ts` nếu muốn tách types sạch hơn

## Recommended Implementation Order
- [ ] Task 1: Chốt taxonomy `Toan` + `Tieng Viet` => Verify: file taxonomy được review và không còn tranh luận tên skill
- [ ] Task 2: Mở rộng question metadata với `subject`, `skillCode`, `subskillCode` => Verify: typecheck pass
- [ ] Task 3: Gắn skill cho 30-50 câu mẫu của `Toan` => Verify: có dataset thử nghiệm đủ để phân tích
- [ ] Task 4: Tạo service `skillAnalysis` để build profile từ result + question metadata => Verify: unit test cho 3 case `weak`, `needs_practice`, `stable`
- [ ] Task 5: Tạo API `GET /api/results/:id/skill-breakdown` => Verify: trả đúng breakdown cho 1 bài
- [ ] Task 6: Tạo API `GET /api/students/:id/weakness-profile` => Verify: trả đúng top skill từ 1-5 bài gần nhất
- [ ] Task 7: Gắn UI teacher-side vào `StudentDetailModal` => Verify: modal hiện đúng top skill và accuracy
- [ ] Task 8: Cho AI đọc `WeaknessProfile` để viết nhận xét phụ trợ => Verify: AI summary bám đúng số liệu, không bịa skill
- [ ] Task 9: Verification => Run `npm run build` và test tay 3 case học sinh mạnh / trung bình / yếu

## Example Response Contract

```json
{
  "studentId": "s_001",
  "updatedAt": "2026-04-21T10:30:00Z",
  "subjects": [
    {
      "subject": "math",
      "skills": [
        {
          "skillCode": "phan_so",
          "attempted": 6,
          "correct": 2,
          "wrong": 4,
          "accuracy": 33,
          "status": "weak",
          "lastSeenAt": "2026-04-21T10:30:00Z",
          "recentQuestionIds": ["q12", "q15", "q18"]
        }
      ]
    }
  ]
}
```

## Guardrails
- Không dùng AI để tự gán `skillCode`
- Không kết luận điểm yếu nếu dữ liệu quá ít
- Không trộn `question_type` thành `skill`
- Không hiển thị cho học sinh trước khi teacher-side đã xác nhận logic ổn

## Done When
- [ ] Có taxonomy chính thức cho `Toan` và `Tieng Viet`
- [ ] Câu hỏi có thể mang `skillCode`
- [ ] Hệ thống tính ra `weakness_profile` từ dữ liệu thật
- [ ] Teacher xem được top kỹ năng yếu của một học sinh trong modal kết quả
- [ ] API và UI bám đúng rule-based analytics, AI chỉ đóng vai trò diễn giải
