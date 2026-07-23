# Đặc tả kỹ thuật: AI Question Blueprint Contract V3

**Ngày:** 2026-07-23  
**Trạng thái:** Đã được duyệt về hướng kiến trúc  
**Phạm vi:** Nâng cấp AI Quiz Generation V2 bằng blueprint theo từng câu, registry chuẩn cho 13 dạng câu hỏi và hợp đồng thống nhất giữa giao diện, prompt, JSON, schema, validator, repair và trình biên tập.

## 1. Mục tiêu

Xây dựng một hợp đồng sinh câu hỏi có tính xác định, trong đó server quyết định trước từng vị trí câu hỏi và AI chỉ điền nội dung theo đúng hợp đồng đó.

Kết quả cần đạt:

- đúng tổng số câu;
- đúng số câu theo từng dạng;
- đúng số câu theo từng mức độ;
- mỗi câu khớp đúng slot blueprint được giao;
- chỉ dùng đúng 13 dạng AI mà giao diện cho phép;
- prompt chỉ chứa contract của các dạng đang được chọn;
- đầu ra AI được kiểm tra bằng mã trước khi hiển thị;
- chỉ sinh lại những slot thiếu hoặc lỗi;
- sinh lại riêng một câu thành công tiếp tục tính đúng một lượt AI mới;
- giữ nguyên các cơ chế V2 đã có về auth, quota, `actionId`, OCR một lần, hủy yêu cầu và feature flag.

## 2. Bối cảnh hiện tại

AI Quiz Generation V2 đã cung cấp:

- quota và idempotency tại Cloudflare Worker;
- một `actionId` xuyên suốt OCR → GENERATE → REPAIR → REVIEW;
- blueprint ở mức tổng hợp gồm `typeAllocations` và `difficultyLevels`;
- Zod schema cho 13 dạng AI;
- audit tổng số câu, số câu theo dạng, mức độ và câu gần trùng;
- tối đa một lần repair có mục tiêu;
- OCR theo trang, tiến trình thật, hủy yêu cầu và rollout bằng `VITE_FEATURE_AI_QUIZ_V2`.

Tuy nhiên V2 chưa khóa chính xác từng câu. Khi chỉ biết “MCQ 4 câu, TRUE_FALSE 2 câu, mức 1 có 3 câu…”, hệ thống vẫn phải suy luận xem câu nào cần thay thế bằng dạng nào và mức độ nào. Điều này làm repair dựa vào index dễ mơ hồ.

Ngoài ra còn các sai lệch cần giải quyết:

- giao diện AI có 13 dạng;
- catalog biên tập thủ công có thêm `ERROR_CORRECTION`;
- enum miền dữ liệu có thêm `GEOMETRY`;
- một số schema cũ chỉ hỗ trợ 10 dạng;
- đầu ra AI V2 dùng `difficultyLevel`, còn domain và trình biên tập dùng `difficulty`;
- mô tả dạng câu hỏi đang nằm rải rác ở nhiều file;
- system prompt cũ có hướng dẫn tìm kiếm Internet ngay cả khi provider không có công cụ tìm kiếm;
- prompt còn lặp, dài và chứa các quy tắc không liên quan đến dạng câu đang chọn.

## 3. Các giả định được khóa

1. Đây là nâng cấp tiếp theo của nhánh `feat/ai-quiz-generation-v2`, không thay thế phần security/quota/OCR đã hoàn thành.
2. AI selectable contract chỉ gồm đúng 13 dạng đang hiển thị trên màn tạo đề.
3. `ERROR_CORRECTION` được phân loại là `manualOnly` trong phiên bản này.
4. `GEOMETRY` được phân loại là `experimentalLegacy`; không đưa vào prompt V3 và không mở thêm phạm vi triển khai.
5. Không thay đổi logic chấm điểm.
6. Không thay đổi schema lưu D1 của quiz/question.
7. Không thêm dependency runtime mới.
8. Trường canonical của domain là `difficulty: 1 | 2 | 3`.
9. `difficultyLevel` chỉ được chấp nhận ở lớp tương thích dữ liệu AI V2 và phải được normalize sang `difficulty` trước khi vào domain.
10. Không yêu cầu model trả về `thought_process`, chain-of-thought hoặc nội dung suy luận nội bộ.
11. Reviewer AI chỉ là lớp bổ sung; schema, slot audit và semantic validator bằng mã là bắt buộc.
12. Production deploy, bật feature flag và migration remote luôn cần phê duyệt thủ công. Thiết kế này không cần migration mới.

## 4. Phạm vi 13 dạng câu hỏi

Danh sách canonical theo đúng giao diện tạo đề AI:

1. `MCQ` — Trắc nghiệm một đáp án.
2. `TRUE_FALSE` — Đúng/Sai nhiều mệnh đề.
3. `SHORT_ANSWER` — Điền đáp án ngắn.
4. `MATCHING` — Nối hai cột.
5. `MULTIPLE_SELECT` — Chọn nhiều đáp án.
6. `DRAG_DROP` — Kéo thả điền khuyết.
7. `ORDERING` — Sắp xếp thứ tự.
8. `IMAGE_QUESTION` — Câu hỏi dựa vào hình.
9. `DROPDOWN` — Chọn từ danh sách tại ô trống.
10. `UNDERLINE` — Gạch chân từ hoặc cụm từ.
11. `CATEGORIZATION` — Phân loại vào nhóm.
12. `WORD_SCRAMBLE` — Ghép chữ thành từ.
13. `RIDDLE` — Giải câu đố chữ.

Mọi giá trị `QuestionType` phải thuộc đúng một nhóm:

```ts
export type QuestionTypeAvailability =
  | 'aiSelectable'
  | 'manualOnly'
  | 'experimentalLegacy';
```

Phân loại bắt buộc:

```ts
AI_SELECTABLE_TYPES = [
  MCQ,
  TRUE_FALSE,
  SHORT_ANSWER,
  MATCHING,
  MULTIPLE_SELECT,
  DRAG_DROP,
  ORDERING,
  IMAGE_QUESTION,
  DROPDOWN,
  UNDERLINE,
  CATEGORIZATION,
  WORD_SCRAMBLE,
  RIDDLE,
];

MANUAL_ONLY_TYPES = [ERROR_CORRECTION];
EXPERIMENTAL_LEGACY_TYPES = [GEOMETRY];
```

Có test bảo đảm ba nhóm không trùng nhau và hợp của ba nhóm bằng toàn bộ enum `QuestionType`.

## 5. Kiến trúc tổng thể

```text
Cấu hình giáo viên
  ↓
Build QuizBlueprintV3
  ↓
Tạo QuestionBlueprintSlot[] xác định
  ↓
Build prompt từ:
  Core + Context + Slot table + Selected type contracts + Output contract + Source
  ↓
AI GENERATE
  ↓
Parse JSON + normalize compatibility
  ↓
Zod schema theo registry
  ↓
Slot audit + semantic checks + math checks
  ↓
Nếu có slot lỗi: REPAIR đúng slot một lần
  ↓
Audit lại
  ↓
Reviewer tùy chọn, không được đổi cấu trúc
  ↓
Strip metadata tạm + map sang Question domain
  ↓
QuizPreview và lưu theo luồng hiện có
```

Ranh giới tin cậy tiếp tục là Cloudflare Worker cho quyền, quota và số lượt gọi. Ranh giới chất lượng câu hỏi nằm ở client/domain layer hiện tại nhưng phải hoàn toàn xác định và không dựa vào việc reviewer “có vẻ đúng”.

## 6. Registry hợp đồng câu hỏi

### 6.1. Mục tiêu registry

Registry là nguồn sự thật duy nhất cho phần AI của 13 dạng. Mỗi contract chứa:

- định danh và nhãn giao diện;
- availability;
- schema của đầu ra AI;
- prompt fragment;
- semantic validator;
- capability về hình ảnh, marker và môn học;
- fixture hợp lệ tối thiểu để test.

### 6.2. Interface

```ts
export type AiSelectableQuestionType =
  | QuestionType.MCQ
  | QuestionType.TRUE_FALSE
  | QuestionType.SHORT_ANSWER
  | QuestionType.MATCHING
  | QuestionType.MULTIPLE_SELECT
  | QuestionType.DRAG_DROP
  | QuestionType.ORDERING
  | QuestionType.IMAGE_QUESTION
  | QuestionType.DROPDOWN
  | QuestionType.UNDERLINE
  | QuestionType.CATEGORIZATION
  | QuestionType.WORD_SCRAMBLE
  | QuestionType.RIDDLE;

export interface QuestionContractContext {
  classLevel: string;
  intent: 'EXAM' | 'PRACTICE';
  sourceMode: 'TOPIC' | 'DOCUMENT';
  hasImageLibrary: boolean;
}

export interface QuestionContractSlot {
  slotId: string;
  ordinal: number;
  type: AiSelectableQuestionType;
  difficulty: 1 | 2 | 3;
  objective: string;
  subject?: SupportedSkillSubject;
  skillCode?: string;
  subskillCode?: string;
  imagePolicy: 'forbidden' | 'optional' | 'required';
}

export interface QuestionContractIssue {
  code: string;
  path: Array<string | number>;
  message: string;
  repairable: boolean;
}

export interface AiQuestionTypeContract<TQuestion> {
  type: AiSelectableQuestionType;
  label: string;
  shortLabel: string;
  availability: 'aiSelectable';
  requiresPrimaryImage: boolean;
  promptFragment(context: QuestionContractContext): string;
  schema: z.ZodType<TQuestion>;
  validateSemantics(
    question: TQuestion,
    slot: QuestionContractSlot,
  ): QuestionContractIssue[];
  validFixture: TQuestion;
}
```

### 6.3. Cấu trúc file

```text
src/services/ai/question-contracts/
  questionContract.types.ts
  questionContract.shared.ts
  choiceQuestionContracts.ts
  completionQuestionContracts.ts
  interactionQuestionContracts.ts
  languageQuestionContracts.ts
  imageQuestionContract.ts
  questionContractRegistry.ts
```

Không tạo một file hàng nghìn dòng. Các contract được chia theo trách nhiệm nhưng được xuất qua một registry duy nhất.

## 7. Contract chi tiết theo từng dạng

### 7.1. MCQ

- Chính xác 4 phương án trong luồng V3.
- Nội dung option không có tiền tố `A.`, `B.`, `C.`, `D.`.
- `correctAnswer` là một trong `A|B|C|D`.
- Các option không rỗng, không trùng sau normalize.
- Chỉ có một đáp án đúng.
- Phương án nhiễu cùng loại ngữ nghĩa và phản ánh lỗi sai hợp lý.

### 7.2. TRUE_FALSE

- Có `mainQuestion` và 2–4 `items`.
- Mỗi item có `statement`, `isCorrect`.
- Có ít nhất một mệnh đề Đúng và một mệnh đề Sai.
- Không dùng hai mệnh đề chỉ khác nhau bởi từ phủ định đơn giản.
- Mỗi statement phải có thể đánh giá độc lập.

### 7.3. SHORT_ANSWER

- `correctAnswer` là từ, số hoặc cụm từ ngắn; tối đa 120 ký tự sau normalize.
- Không giới hạn cứng 1–4 ký tự.
- Không chứa nhiều đáp án phân cách mơ hồ bằng `/` hoặc `hoặc`.
- Lớp chấm điểm hiện tại vẫn nhận một đáp án canonical; các alias đáp án là backlog riêng.

### 7.4. MATCHING

- 3–5 cặp.
- Mỗi vế trái và phải là duy nhất sau normalize.
- Quan hệ một-một; không có hai vế trái cùng ghép hợp lý với một vế phải.
- Không dùng nhãn kỹ thuật làm nội dung thật.

### 7.5. MULTIPLE_SELECT

- Chính xác 4 phương án.
- Có 2–3 đáp án đúng duy nhất.
- `correctAnswers` chỉ chứa `A|B|C|D` và đều tham chiếu option hiện có.
- Câu dẫn thể hiện rõ “chọn tất cả” hoặc tương đương.

### 7.6. DRAG_DROP

- `text` chỉ dùng marker tuần tự `[1]`, `[2]`, ...
- Số marker bằng `blanks.length`.
- Marker không lặp, không bỏ số.
- `text` không chứa đáp án đúng trong ngoặc vuông.
- `distractors` không trùng đáp án và không trùng nhau.
- Với LaTeX, marker nằm đúng bên trong tham số, ví dụ `$\frac{[1]}{8}$`.

### 7.7. ORDERING

- 3–8 item đối với AI V3.
- `items` là dữ liệu đã xáo trộn.
- `correctOrder` là hoán vị đầy đủ của `0..n-1`.
- Không hỗ trợ trộn index và ID trong output V3.
- Các item không trùng nội dung.

### 7.8. IMAGE_QUESTION

- Bắt buộc có `image` và `imageAlt`.
- Ảnh phải là ID trong thư viện ảnh hoặc giá trị đã được image service resolve theo pipeline hiện có.
- Không chấp nhận placeholder công khai ở kết quả cuối.
- Chính xác 4 phương án và một đáp án đúng.
- Câu hỏi phải phụ thuộc trực tiếp vào dữ kiện nhìn thấy trong ảnh.

### 7.9. DROPDOWN

- `text` dùng marker `[1]`, `[2]`, ...
- Mỗi blank có `id` đúng bằng số marker tương ứng dưới dạng chuỗi.
- Mỗi blank có 2–5 option không trùng.
- `correctAnswer` thuộc `options`.
- Marker, ID và số blank khớp tuyệt đối.

### 7.10. UNDERLINE

- `sentence` là nguồn văn bản canonical.
- Server tách `words` bằng cùng utility mà renderer/editor đang dùng.
- AI V3 trả `targetWords`; normalizer ánh xạ sang `correctWordIndexes`.
- Nếu một target xuất hiện nhiều lần và không xác định được vị trí duy nhất, câu bị từ chối để repair.
- Không yêu cầu AI tự tính index trong prompt V3.

### 7.11. CATEGORIZATION

- 2–4 category.
- 4–10 item.
- ID category và item duy nhất.
- Mọi `categoryId` tham chiếu category hiện có.
- Mỗi category có ít nhất một item.
- Không có item nhập nhằng thuộc nhiều nhóm theo cùng tiêu chí.

### 7.12. WORD_SCRAMBLE

- `letters` ghép chính xác thành `correctWord` sau khi bỏ ký hiệu phân tách, nhưng giữ nguyên dấu tiếng Việt.
- Không làm mất dấu hoặc đổi `đ` thành `d` trong phép kiểm tra chính xác.
- Từ nhiều tiếng phải dùng token theo ký tự và có quy tắc khoảng trắng rõ ràng.
- Không sinh đáp án có ký tự không tồn tại trong `letters`.

### 7.13. RIDDLE

- Có 2–6 dòng câu đố.
- Một đáp án ngắn, duy nhất và phù hợp lớp học.
- Nếu là đổi/thêm/bớt dấu, phép biến đổi phải được reviewer và semantic check xác nhận ở mức cấu trúc có thể kiểm tra.
- Không tự nhận là ca dao, tục ngữ hoặc câu đố dân gian có nguồn nếu không có dữ liệu nguồn được cung cấp.
- Không tạo nội dung gây sợ hãi, bạo lực hoặc không phù hợp tiểu học.

## 8. Blueprint V3 theo từng slot

### 8.1. Data model

```ts
export type BlueprintDifficulty = 1 | 2 | 3;
export type BlueprintImagePolicy = 'forbidden' | 'optional' | 'required';

export interface QuestionBlueprintSlot extends QuestionContractSlot {
  slotId: `slot-${number}`;
  difficulty: BlueprintDifficulty;
  imagePolicy: BlueprintImagePolicy;
  sourceRefs?: string[];
}

export interface QuizBlueprintV3 {
  version: 3;
  intent: 'EXAM' | 'PRACTICE';
  sourceMode: 'TOPIC' | 'DOCUMENT';
  topic: string;
  classLevel: string;
  totalQuestions: number;
  slots: QuestionBlueprintSlot[];
}
```

`typeAllocations` và `difficultyLevels` vẫn tồn tại ở form/UI trong giai đoạn tương thích, nhưng prompt, schema audit và repair chỉ dùng `slots` sau khi `QuizBlueprintV3` được build.

### 8.2. Thuật toán tạo slot

Thuật toán phải xác định và thuần hàm:

1. Kiểm tra tổng phân bổ dạng bằng tổng câu.
2. Kiểm tra tổng phân bổ độ khó bằng tổng câu.
3. Mở rộng difficulty theo thứ tự mức 1 → mức 2 → mức 3 để giữ tiến trình sư phạm.
4. Trong từng mức, phân phối dạng câu theo weighted round-robin để tránh một khối dài cùng loại.
5. Gán `slotId` tuần tự `slot-1..slot-N`.
6. `imagePolicy = required` cho `IMAGE_QUESTION`; `optional` cho các dạng cho phép ảnh; `forbidden` nếu contract không hỗ trợ ảnh chính.
7. `objective` mặc định là chủ đề giáo viên nhập. Khi có skill metadata rõ ràng, dùng nhãn skill làm objective cụ thể hơn.
8. Với tài liệu, `sourceRefs` chứa marker trang đã chọn khi pipeline có dữ liệu trang; không đưa toàn bộ OCR vào blueprint.

### 8.3. Invariant

```ts
slots.length === totalQuestions
new Set(slots.map(s => s.slotId)).size === totalQuestions
slots[i].ordinal === i + 1
countByType(slots) === configuredTypeAllocations
countByDifficulty(slots) === configuredDifficultyLevels
```

## 9. Hợp đồng đầu ra AI V3

### 9.1. Root payload

```ts
export interface GeneratedQuizV3 {
  promptVersion: 'ai-blueprint-v3';
  blueprintVersion: 3;
  title: string;
  detectedCategory?: string;
  detectedLesson?: string;
  suggestedTags?: string[];
  questions: GeneratedQuestionV3[];
}
```

### 9.2. Common fields của mỗi câu

```ts
interface GeneratedQuestionCommonV3 {
  slotId: string;
  type: AiSelectableQuestionType;
  difficulty: 1 | 2 | 3;
  explanation: string;
  subject?: SupportedSkillSubject;
  skillCode?: string;
  subskillCode?: string;
}
```

AI phải echo đúng `slotId`, `type` và `difficulty` được giao. Các trường này là immutable trong repair và reviewer.

### 9.3. Metadata tạm và metadata lưu

- `slotId`, `promptVersion`, `blueprintVersion` là metadata tạm; không bắt buộc lưu vào quiz domain.
- `subject`, `skillCode`, `subskillCode` dùng các field domain đã có và có thể được giữ lại.
- Trước khi đưa vào `QuizPreview`, adapter bỏ các field tạm và tạo `id` theo luồng hiện có.

## 10. Kiến trúc prompt V3

Prompt được chia thành sáu phần theo thứ tự cố định:

1. **System core** — vai trò, tiếng Việt, JSON-only, không giả vờ tìm kiếm, không xuất suy luận nội bộ.
2. **Generation context** — lớp, chủ đề, intent, source mode, profile Thông tư 27, profile học sinh.
3. **Exact slot table** — một dòng hoặc một object cho mỗi slot.
4. **Selected type contracts** — chỉ chèn contract của các type xuất hiện trong slot.
5. **Output contract** — root JSON và common fields immutable.
6. **Source content** — nội dung chủ đề/OCR/ảnh được đặt cuối và phân cách rõ.

Ví dụ slot table:

```json
[
  {
    "slotId": "slot-1",
    "type": "MCQ",
    "difficulty": 1,
    "objective": "Nhận biết phân số bằng nhau",
    "imagePolicy": "optional"
  },
  {
    "slotId": "slot-2",
    "type": "DRAG_DROP",
    "difficulty": 2,
    "objective": "Điền tử số còn thiếu",
    "imagePolicy": "forbidden"
  }
]
```

Quy tắc:

- Không chèn contract của dạng không được chọn.
- Không lặp toàn bộ ví dụ dài trong system prompt.
- Không yêu cầu model tìm kiếm Internet trừ khi pipeline đã có `retrievalContext` từ provider có khả năng tìm kiếm.
- Perplexity có thể nhận context truy xuất riêng, nhưng generator không được tự tuyên bố đã kiểm chứng nguồn.
- `customPrompt` của giáo viên không được thay đổi schema, slot, type, difficulty, safety hoặc policy sư phạm đã bật.
- Prompt tiếng Việt phải có dấu và được kiểm tra UTF-8.

## 11. Parse, normalize và compatibility

Thứ tự xử lý bắt buộc:

```text
parseAndRepairJSON
  → normalizeGeneratedQuizV3Compatibility
  → GeneratedQuizV3Schema.parse
  → auditGeneratedQuizV3
```

Compatibility adapter chỉ hỗ trợ các alias được định nghĩa rõ:

- `difficultyLevel` → `difficulty`;
- thiếu `promptVersion` nhưng request đang chạy dưới flag V3 → gán phiên bản trong adapter;
- output V2 không có `slotId` không được tự đoán theo index trong production V3; phải repair hoặc fail rõ ràng.

Không còn sửa âm thầm bằng cách:

- tạo content giả `(Mục 1)`;
- gán item vào category đầu tiên;
- cắt câu dư rồi coi là hợp lệ;
- tự đổi type để khớp số lượng.

## 12. Audit theo slot

Audit V3 dùng `slotId`, không dùng index làm định danh chính.

Các mã lỗi tối thiểu:

```ts
export type QuizSlotAuditCode =
  | 'ROOT_VERSION_MISMATCH'
  | 'MISSING_SLOT'
  | 'DUPLICATE_SLOT'
  | 'UNEXPECTED_SLOT'
  | 'SLOT_TYPE_MISMATCH'
  | 'SLOT_DIFFICULTY_MISMATCH'
  | 'SLOT_SKILL_MISMATCH'
  | 'QUESTION_SCHEMA_INVALID'
  | 'QUESTION_SEMANTIC_INVALID'
  | 'DUPLICATE_QUESTION_CONTENT'
  | 'MATH_FORMAT_INVALID'
  | 'MISSING_EXPLANATION';
```

Mỗi issue chứa:

```ts
export interface QuizSlotAuditIssue {
  code: QuizSlotAuditCode;
  slotIds: string[];
  path?: Array<string | number>;
  message: string;
  repairable: boolean;
}
```

Invariant sau audit thành công:

- mỗi slot có đúng một câu;
- không có câu ngoài blueprint;
- type và difficulty khớp tuyệt đối;
- schema và semantic contract đạt;
- math validator đạt;
- không có nội dung gần trùng trên ngưỡng hiện hành;
- mỗi câu có explanation.

## 13. Repair và sinh lại câu

### 13.1. Repair tự động

- Tối đa một call `REPAIR` trong cùng `QUIZ_CREATE actionId`.
- Prompt repair chỉ chứa các slot lỗi, contract liên quan và thông tin cần thiết để tránh trùng với các câu hợp lệ.
- Không gửi lại toàn bộ câu hợp lệ dưới dạng yêu cầu viết lại.
- Kết quả repair phải echo đúng `slotId`, `type`, `difficulty`.
- Merge theo `slotId` và giữ nguyên câu hợp lệ.
- Audit lại toàn bộ sau merge.
- Nếu còn lỗi, dừng và hiển thị lỗi; không retry đệ quy.

### 13.2. Sinh lại riêng một câu

- Tạo `actionId` mới với workflow `QUESTION_REGENERATE`.
- Thành công tính đúng một lượt AI mới theo quy tắc hiện hành.
- Dùng đúng `QuestionBlueprintSlot` của câu cũ.
- Giữ nguyên `type`, `difficulty`, skill và image policy.
- Giáo viên có thể thêm yêu cầu nội dung, nhưng không được đổi contract.
- Câu mới phải qua schema, semantic validator, math validator và duplicate check với các câu còn lại.

## 14. Reviewer V3

Reviewer chỉ được sửa nội dung bên trong contract. Reviewer không được:

- thêm/xóa câu;
- thay `slotId`;
- đổi `type`;
- đổi `difficulty`;
- đổi schema của câu;
- thay đổi blueprint;
- thêm dạng ngoài 13 dạng.

Reviewer output được parse và audit lại. Nếu reviewer lỗi hoặc làm thay đổi cấu trúc, bỏ output reviewer và giữ bản đã đạt deterministic validation.

Reviewer không được yêu cầu xuất chain-of-thought. Prompt reviewer yêu cầu trả JSON cuối cùng hoặc danh sách patch có cấu trúc.

## 15. Tích hợp giao diện

### 15.1. Question type selector

`QuestionTypeSelector` đọc danh sách từ registry. Không duy trì mảng 13 dạng riêng trong component.

### 15.2. Blueprint editor

Giữ UI V2 hiện có về số câu theo dạng và độ khó. UI không cần hiển thị hoặc cho sửa từng slot trong batch đầu.

Khi cấu hình hợp lệ, có thể hiển thị tóm tắt nhỏ:

- `10 slot đã sẵn sàng`;
- `4 dạng câu`;
- `Mức 1: 3 · Mức 2: 5 · Mức 3: 2`.

### 15.3. Feature flag

Thêm flag độc lập:

```env
VITE_FEATURE_AI_BLUEPRINT_V3=false
```

Điều kiện dùng pipeline V3:

```ts
isAiQuizV2Enabled() && isAiBlueprintV3Enabled()
```

Tắt V3 phải quay về pipeline V2 mà không làm mất tính năng quota, OCR, progress và cancel.

## 16. Xử lý lỗi

Nhóm lỗi hiển thị cho giáo viên:

- cấu hình blueprint không hợp lệ;
- AI trả thiếu slot;
- AI trả sai dạng/mức độ;
- câu chưa đạt contract;
- repair vẫn chưa đạt;
- ảnh bắt buộc không khả dụng;
- yêu cầu bị hủy;
- quota hoặc upstream lỗi theo V2.

Thông báo không hiển thị raw JSON hoặc nội dung nội bộ của prompt. Có thể hiển thị số slot lỗi và loại lỗi bằng ngôn ngữ dễ hiểu.

## 17. Bảo mật và riêng tư

- Không log prompt đầy đủ, OCR, câu hỏi, đáp án, file base64, token, tên học sinh hoặc dữ liệu cá nhân.
- Log/telemetry chỉ chứa `actionId`, workflow, stage, promptVersion, blueprintVersion, số slot, type counts, mã lỗi và thời lượng.
- Không tin role, quota, workflow hoặc stage từ frontend nếu Worker chưa xác thực.
- Không để custom prompt chèn lệnh thay đổi output contract.
- Không nhúng secret vào prompt hoặc response.

## 18. Observability

Các chỉ số cần thu thập mà không chứa nội dung đề:

- số request V3 theo provider và intent;
- schema first-pass rate;
- slot audit first-pass rate;
- repair invocation rate;
- repair success rate;
- reviewer rejection rate;
- số lỗi theo `QuizSlotAuditCode`;
- tỷ lệ dùng alias `difficultyLevel`;
- số type ngoài registry;
- thời gian GENERATE, REPAIR, REVIEW;
- tỷ lệ sinh lại riêng một câu thành công/thất bại.

Mục tiêu rollout:

- blueprint match rate sau repair: 100%;
- không có câu ngoài 13 type;
- không có slot trùng hoặc thiếu ở kết quả được hiển thị;
- không có hồi quy quota/idempotency.

## 19. Chiến lược kiểm thử

### 19.1. Unit tests

- registry phân loại đầy đủ enum;
- mỗi contract có fixture valid và tối thiểu hai fixture invalid;
- 13 contract được parse độc lập;
- slot builder giữ đúng tổng theo type và difficulty;
- normalize `difficultyLevel` sang `difficulty`;
- prompt chỉ chứa contract được chọn;
- prompt không chứa `thought_process` hoặc yêu cầu tìm kiếm giả;
- audit phát hiện mọi dạng slot mismatch;
- repair chỉ thay slot lỗi;
- regeneration giữ immutable fields.

### 19.2. Integration tests

- topic → blueprint V3 → prompt → fixture AI → parse → audit → domain;
- PDF đã OCR → source markers → V3 pipeline;
- một đề gồm 13 slot, mỗi loại một câu;
- reviewer đổi type hoặc slotId bị bỏ qua;
- repair trả thiếu slot bị từ chối;
- V3 tắt quay về V2.

### 19.3. E2E

Cypress mock provider, không gọi AI thật:

1. Chọn 13 dạng, mỗi dạng một câu.
2. Cấu hình mức độ tổng bằng 13.
3. Tạo đề và xác nhận 13 câu hiển thị được.
4. Mock một slot sai type và repair đúng slot.
5. Sinh lại một câu, xác nhận action mới và UI giữ nguyên type/mức độ.
6. Tắt flag V3, xác nhận V2 vẫn hoạt động.

### 19.4. Golden fixtures

Tạo fixture JSON chuẩn cho từng dạng tại:

```text
tests/fixtures/ai-question-contracts/
  mcq.valid.json
  true-false.valid.json
  ...
  riddle.valid.json
```

Không lưu dữ liệu học sinh hoặc tài liệu thật trong fixture.

## 20. Lệnh kiểm tra

```bash
npx vitest run tests/aiQuestionTypeRegistry.test.ts
npx vitest run tests/aiQuestionContracts.*.test.ts
npx vitest run tests/quizBlueprintV3.test.ts
npx vitest run tests/quizPromptBuilderV3.test.ts
npx vitest run tests/quizGenerationSchemaV3.test.ts
npx vitest run tests/quizSlotAudit.test.ts
npx vitest run tests/quizSlotRepair.test.ts
npx vitest run tests/quizGenerationPipelineV3.test.ts
npm run test:run
npx tsc --noEmit
npm run build
npx cypress run --spec cypress/e2e/ai-question-blueprint-v3.cy.ts
npm run security:check
```

## 21. Ranh giới triển khai

### Luôn thực hiện

- TDD cho từng task.
- Commit độc lập theo task.
- Giữ mỗi task ở phạm vi khoảng 3–5 file khi có thể.
- Chạy test tập trung trước commit.
- Chạy full test, TypeScript và build tại checkpoint.
- Dùng registry thay vì tạo thêm danh sách type rời.
- Giữ tiếng Việt UTF-8 có dấu.

### Phải xin phê duyệt trước

- thay đổi quota 5 lượt/ngày;
- thay đổi quy tắc “sinh lại một câu thành công tính một lượt”;
- thêm dependency runtime;
- thay đổi schema D1;
- đưa `ERROR_CORRECTION` hoặc `GEOMETRY` vào AI selector;
- bật flag production;
- deploy Worker/frontend production.

### Không được thực hiện

- log nội dung prompt/OCR/đáp án;
- yêu cầu model trả chain-of-thought;
- tự cắt câu dư rồi coi là hợp lệ;
- tự tạo placeholder để che lỗi schema;
- retry repair vô hạn;
- để reviewer quyết định tính hợp lệ cuối cùng;
- đổi logic chấm điểm ngoài phạm vi.

## 22. Non-goals

- Không thêm `ERROR_CORRECTION` vào 13 dạng AI.
- Không triển khai `GEOMETRY` AI.
- Không xây RAG hoặc web crawler mới.
- Không thay đổi trình chấm điểm.
- Không redesign toàn bộ màn tạo đề.
- Không thay đổi cấu trúc lưu quiz trong D1.
- Không tự ánh xạ đầy đủ chương trình SGK cho mọi môn/lớp trong batch này.
- Không thêm đáp án tương đương cho `SHORT_ANSWER` trong batch này.

## 23. Tiêu chí nghiệm thu cuối

- [ ] Registry có đúng 13 type `aiSelectable`, 1 type `manualOnly`, 1 type `experimentalLegacy`.
- [ ] Giao diện AI lấy danh sách type từ registry.
- [ ] Mỗi type có schema, prompt fragment, semantic validator và fixture valid.
- [ ] `QuizBlueprintV3` tạo đúng một slot cho mỗi câu.
- [ ] Output AI echo đúng `slotId`, `type`, `difficulty`.
- [ ] `difficulty` là field canonical sau normalize.
- [ ] Prompt chỉ chứa contract của type đã chọn.
- [ ] Prompt không yêu cầu chain-of-thought và không giả định provider có web search.
- [ ] Mọi đề hiển thị cho giáo viên có đúng một câu cho mỗi slot.
- [ ] Repair chỉ thay slot lỗi và chạy tối đa một lần.
- [ ] Reviewer không thể đổi slot/type/difficulty mà vẫn được chấp nhận.
- [ ] Sinh lại riêng một câu giữ nguyên contract và tính một lượt khi thành công.
- [ ] V3 có flag riêng và tắt flag quay lại V2.
- [ ] Full Vitest, TypeScript, build, Cypress và security check đạt.
- [ ] Không cần migration mới và không thay đổi logic chấm điểm.

## 24. Quyết định đã chốt

- Chọn kiến trúc **server-controlled per-question blueprint**.
- Dùng registry hợp đồng cho đúng 13 dạng AI.
- Dùng `difficulty` làm canonical.
- Dùng `slotId` làm khóa audit/repair thay cho index.
- Reviewer là optional supplement, không phải validator chính.
- Dùng feature flag V3 riêng để rollout và rollback độc lập với V2.
- Triển khai nối tiếp trên nhánh AI Quiz Generation V2 hiện có.
