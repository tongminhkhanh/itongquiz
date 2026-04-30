# Prompt Profile Design for Thong tu 27

## Understanding Summary

- Màn `Tạo đề` hiện đã có các khối: thông tin cơ bản, dạng câu hỏi, độ khó và số lượng, nội dung bổ sung, tùy chọn nâng cao, giao bài.
- Luồng sinh đề hiện tại nhận các đầu vào chính gồm `topic`, `classLevel`, `questionTypes`, `difficultyLevels`, `content`, `customPrompt`, `quizMode`, `aiProvider`.
- Hệ thống đã có cơ chế phân bổ mức độ nhận thức qua `level1`, `level2`, `level3`, nhưng chưa có lớp cấu hình theo hồ sơ học sinh hay định hướng sư phạm.
- Cần bổ sung một section mới tên `Định hướng ra đề` để giáo viên chọn hướng sinh đề theo mục tiêu đánh giá và đối tượng học sinh.
- Section mới có 3 card: `Bám Thông tư 27`, `Bồi dưỡng học sinh giỏi`, `Phụ đạo học sinh yếu/kém`.
- `Bồi dưỡng học sinh giỏi` và `Phụ đạo học sinh yếu/kém` chỉ được bật khi `Bám Thông tư 27` đang bật, và hai card này loại trừ nhau.
- Tác động của section mới là vừa điều chỉnh prompt AI, vừa gợi ý lại preset `level1/level2/level3`, nhưng giáo viên vẫn được sửa tay trước khi bấm tạo đề.

## Assumptions

- `Bám Thông tư 27` được hiểu là bám chuẩn đánh giá học sinh tiểu học, chú trọng yêu cầu cần đạt, ngôn ngữ phù hợp lứa tuổi, không ra đề đánh đố vô nghĩa.
- `Bồi dưỡng học sinh giỏi` là profile tăng mức phân hóa và vận dụng, nhưng vẫn nằm trong phạm vi chương trình tiểu học, không biến thành đề vượt khung.
- `Phụ đạo học sinh yếu/kém` là profile tập trung kiến thức cốt lõi, giảm độ nhiễu, tăng câu rõ ràng và hỗ trợ củng cố nền tảng.
- Preset chỉ là gợi ý thông minh cho giáo viên, không khóa cứng phần `Độ khó & Số lượng`.
- Section mới áp dụng cho luồng tạo đề tổng quát trước; không áp dụng ngay cho luồng riêng `Trạng Nguyên` ở batch đầu.

## Decision Log

- Quyết định: đặt thành section riêng `Định hướng ra đề`.
  - Phương án đã cân nhắc: nhét vào `Nội dung bổ sung` hoặc `Độ khó & Số lượng`.
  - Lý do chọn: đây là lớp điều khiển sư phạm riêng, đủ quan trọng để không bị chìm trong ô `customPrompt`.

- Quyết định: dùng card chọn thay vì checkbox thường.
  - Phương án đã cân nhắc: checkbox cơ bản, segmented control.
  - Lý do chọn: card giúp giáo viên hiểu đây là preset có mô tả, không phải toggle kỹ thuật nhỏ.

- Quyết định: chọn mô hình `1 + 2/3`.
  - Phương án đã cân nhắc: độc lập hoàn toàn hoặc loại trừ toàn bộ.
  - Lý do chọn: `Thông tư 27` là lớp chuẩn nền, còn `Giỏi` và `Phụ đạo` là hai nhánh phân hóa của lớp nền đó.

- Quyết định: `Giỏi` và `Phụ đạo` bắt buộc phụ thuộc `Thông tư 27`.
  - Phương án đã cân nhắc: cho phép bật độc lập.
  - Lý do chọn: tránh prompt mâu thuẫn và giữ định hướng sư phạm nhất quán.

- Quyết định: dùng `template profile` làm khung prompt chính, có chèn thêm rule block.
  - Phương án đã cân nhắc: nối các rule block rời rạc.
  - Lý do chọn: dễ bảo trì, dễ mở rộng, giảm xung đột câu lệnh khi sau này thêm profile khác.

## Final Design

### 1. UI Placement and Structure

Section mới được đặt giữa `Độ khó & Số lượng` và `Nội dung bổ sung`. Vị trí này hợp lý vì preset sư phạm ảnh hưởng trực tiếp đến độ khó, nhưng vẫn là lớp nghĩa nghiệp vụ tách biệt với cấu hình số học của `level1/2/3`.

Section hiển thị theo dạng 3 card có mô tả ngắn:

- `Bám Thông tư 27`
  - Mô tả: `Bám chuẩn đánh giá tiểu học, ngôn ngữ phù hợp lứa tuổi, phủ yêu cầu cần đạt.`

- `Bồi dưỡng học sinh giỏi`
  - Mô tả: `Tăng mức phân hóa, ưu tiên câu vận dụng và suy luận cho nhóm khá giỏi.`

- `Phụ đạo học sinh yếu/kém`
  - Mô tả: `Củng cố nền tảng, tăng câu nhận biết và thông hiểu gần, giảm nhiễu không cần thiết.`

Card `Bám Thông tư 27` dùng tông xanh trung tính. Card `Bồi dưỡng học sinh giỏi` dùng tông cam hoặc đỏ ấm. Card `Phụ đạo học sinh yếu/kém` dùng tông xanh lá hoặc teal. Khi disabled, hai card phụ có opacity thấp và hiển thị note `Bật Thông tư 27 để sử dụng`.

### 2. Interaction Rules

Rule tương tác cần đơn giản và dự đoán được:

- Nếu `Bám Thông tư 27` đang tắt:
  - `Bồi dưỡng học sinh giỏi` và `Phụ đạo học sinh yếu/kém` bị disabled.
  - Nếu trước đó một profile phụ đã bật mà giáo viên tắt `Bám Thông tư 27`, hệ thống tự tắt profile phụ đó.

- Nếu `Bám Thông tư 27` đang bật:
  - Giáo viên có thể để trống profile phụ.
  - Giáo viên có thể chọn một trong hai profile phụ.
  - Nếu chọn `Bồi dưỡng học sinh giỏi`, card `Phụ đạo` tự tắt.
  - Nếu chọn `Phụ đạo`, card `Bồi dưỡng học sinh giỏi` tự tắt.

Ngay dưới section cần có dòng trạng thái tóm tắt:

- `Đang dùng chuẩn Thông tư 27`
- `Đang dùng chuẩn Thông tư 27 + profile bồi dưỡng học sinh giỏi`
- `Đang dùng chuẩn Thông tư 27 + profile phụ đạo học sinh yếu/kém`

Mục tiêu của dòng này là để giáo viên không cần suy diễn cấu hình hiện tại.

### 3. Suggested Difficulty Presets

Khi giáo viên bật hoặc đổi cấu hình trong section `Định hướng ra đề`, hệ thống tự gợi ý lại `level1/level2/level3`. Đây là hành vi `soft preset`, tức hệ thống điền giá trị gợi ý, nhưng giáo viên vẫn chỉnh tay được sau đó.

Preset khuyến nghị:

- `Bám Thông tư 27`:
  - `level1 = 40%`
  - `level2 = 40%`
  - `level3 = 20%`

- `Bám Thông tư 27 + Bồi dưỡng học sinh giỏi`:
  - `level1 = 20%`
  - `level2 = 30%`
  - `level3 = 50%`

- `Bám Thông tư 27 + Phụ đạo học sinh yếu/kém`:
  - `level1 = 65%`
  - `level2 = 25%`
  - `level3 = 10%`

Với tổng số câu bất kỳ, hệ thống cần quy đổi theo số nguyên gần nhất và giữ tổng không đổi. Nếu do làm tròn phát sinh lệch, hệ thống cộng hoặc trừ sai số vào `level2` trước, sau đó đến `level1`. `level2` được chọn làm vùng hấp thụ sai số vì nó là mức trung gian, ít làm lệch profile tổng thể nhất.

### 4. Prompt Architecture

Prompt generation nên có 3 lớp:

- `Core prompt`
  - Giữ nguyên các ràng buộc hiện tại về JSON format, số lượng câu, loại câu, lớp, OCR mode, image rules, metadata root.

- `Policy profile`
  - Chỉ chèn khi bật `Bám Thông tư 27`.
  - Nội dung nên nhấn:
    - bám yêu cầu cần đạt của chương trình tiểu học
    - ngôn ngữ rõ ràng, thân thiện, đúng lứa tuổi
    - đánh giá theo năng lực và tiến bộ
    - câu hỏi có ý nghĩa học tập, tránh mẹo đánh đố
    - mức độ phân hóa có kiểm soát

- `Learner profile`
  - Chỉ chèn khi bật `Bồi dưỡng học sinh giỏi` hoặc `Phụ đạo`.
  - `Bồi dưỡng học sinh giỏi`:
    - tăng câu cần suy luận, kết nối kiến thức, so sánh, giải thích
    - tăng tình huống mới nhưng vẫn trong phạm vi chương trình
    - đáp án nhiễu gần đúng hơn, đòi hỏi phân tích kỹ
  - `Phụ đạo học sinh yếu/kém`:
    - ưu tiên câu ngắn, rõ, trực diện
    - tăng nhận biết và thông hiểu gần
    - giảm distractor gây rối
    - ưu tiên củng cố kiến thức nền và lỗi sai phổ biến

### 5. Prompt Template Draft

Khung prompt logic đề xuất:

```text
[CORE QUIZ GENERATION RULES]
... prompt hiện tại ...

[PEDAGOGICAL POLICY PROFILE]
Chỉ bật khi chọn Bám Thông tư 27.

[LEARNER PROFILE]
Hoặc học sinh giỏi, hoặc phụ đạo học sinh yếu/kém.

[TEACHER CUSTOM INSTRUCTION]
Nội dung từ customPrompt của giáo viên vẫn giữ ưu tiên cao,
nhưng không được phép phá vỡ policy profile nếu policy profile đang bật.
```

Rule quan trọng là thứ tự ưu tiên:

1. JSON and safety rules
2. Policy profile
3. Learner profile
4. Teacher custom prompt

Lý do là `customPrompt` hiện đang được nhúng rất mạnh; nếu không chặn, giáo viên có thể vô tình viết lệnh làm prompt lệch hẳn tinh thần `Thông tư 27`.

### 6. State Model

State đề xuất trong UI logic:

```ts
promptProfile: {
  useThongTu27: boolean;
  learnerMode: 'default' | 'gifted' | 'remedial';
  lastAutoAppliedPreset?: 'thongtu27' | 'gifted' | 'remedial';
}
```

`learnerMode = default` nghĩa là chỉ bật `Bám Thông tư 27` mà không chọn profile phụ.

Không nên encode 3 nút này thành 3 boolean độc lập vì dễ tạo trạng thái mâu thuẫn như `gifted = true` và `remedial = true`. Chỉ `useThongTu27` là boolean độc lập; profile phụ nên đi bằng một enum.

### 7. UX Safety Rules

Để tránh gây khó hiểu:

- Khi preset tự cập nhật `level1/2/3`, hiển thị note nhỏ:
  - `Đã gợi ý lại độ khó theo định hướng ra đề. Bạn vẫn có thể chỉnh tay.`

- Nếu giáo viên chỉnh tay `level1/2/3` sau đó đổi profile:
  - Hệ thống hỏi nhẹ bằng inline confirmation hoặc note:
  - `Áp dụng lại preset độ khó theo profile mới`

- Nếu giáo viên chỉ muốn prompt đổi nhưng không muốn mất phân bổ tay:
  - Có thể để nút nhỏ:
  - `Khôi phục preset gợi ý`

Batch đầu có thể chưa cần popup xác nhận phức tạp. Chỉ cần tự áp preset và hiển thị note là đủ, miễn hành vi rõ ràng.

### 8. Non-Goals for Batch One

- Không đổi logic chấm điểm.
- Không đổi schema câu hỏi.
- Không áp dụng sang luồng `Trạng Nguyên` ngay.
- Không tự sinh rubric hay nhận xét học sinh theo Thông tư 27 trong batch này.
- Không dùng profile này để can thiệp vào `AI reviewer` sau sinh đề trong batch đầu.

## Recommended Implementation Order

1. Thêm state `promptProfile` vào `useCreateQuizLogic`
2. Thêm component UI `PedagogicalProfileSection`
3. Nối rule preset với `difficultyLevels`
4. Mở rộng `QuizGenerationOptions` để mang `promptProfile`
5. Chèn `policy profile` và `learner profile` vào `buildPrompt`
6. Test các tổ hợp chọn và hành vi sửa tay `level1/2/3`

## Risks

- Nếu prompt profile viết quá dài, AI có thể bớt tuân thủ phần cuối prompt. Cần giữ profile block ngắn, sắc và có thứ tự ưu tiên rõ.
- Nếu preset đổi `level1/2/3` quá đột ngột, giáo viên có thể thấy mất kiểm soát. Cần hiển thị note rằng đây chỉ là gợi ý.
- Nếu sau này thêm nhiều profile mới, state bằng nhiều boolean sẽ vỡ nhanh. Vì vậy nên chốt enum ngay từ đầu.

## Handoff Note

Thiết kế này phù hợp nhất với luồng tạo đề hiện tại vì tận dụng:

- state `difficultyLevels` đã có
- trường `customPrompt` đã có
- `buildPrompt()` làm trung tâm ghép prompt
- UI form theo section đã có sẵn

Thiết kế ưu tiên thay đổi nhỏ, rõ, kiểm soát tốt, không làm gãy flow hiện tại của giáo viên.
