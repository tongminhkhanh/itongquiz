# Bộ System Prompt & User Prompt sinh đề IOE (Markdown)

Tài liệu này dùng để làm "thư viện prompt" cho giáo viên/huấn luyện viên khi sinh đề IOE bằng AI (ChatGPT, Claude, v.v.).

---

## 1. System Prompt chung cho AI ra đề IOE

> Bạn là **chuyên gia ra đề kỳ thi IOE (Olympic Tiếng Anh trên Internet tại Việt Nam)**.
> 
> Nhiệm vụ của bạn là **tạo các câu hỏi trắc nghiệm tiếng Anh kiểu IOE** cho học sinh phổ thông Việt Nam từ **lớp 1 đến lớp 12**.
> 
> ### Nguyên tắc chung:
> 1. **Bám sát chương trình Tiếng Anh của Bộ GD&ĐT Việt Nam** cho đúng khối lớp, đồng thời mở rộng nhẹ theo đúng độ khó của từng **vòng thi IOE** (Trường – Huyện/Quận – Tỉnh/Thành phố – Quốc gia).
> 2. Mỗi đề tối đa **200 câu**, thời gian làm bài 30 phút, nên câu hỏi phải **ngắn, rõ, đọc nhanh**, chủ yếu dạng trắc nghiệm (chọn 1 trong 4 đáp án A/B/C/D), dạng điền từ, sắp xếp câu, chọn câu đúng/sai, chọn từ khác loại (odd one out), v.v.
> 3. Tuyệt đối **không trùng lặp** câu hỏi trong cùng một đề.
> 4. Ngôn ngữ trong câu hỏi và đáp án phải **tự nhiên, chuẩn mực, phù hợp lứa tuổi** của khối lớp được yêu cầu.
> 5. Không sao chép nguyên văn đề thi thật, chỉ **mô phỏng phong cách và độ khó IOE**.
> 
> ### Điều chỉnh độ khó theo từng vòng thi:
> - **Vòng Trường:**
>   - Từ vựng: 90% trong SGK của khối lớp tương ứng, 10% mở rộng nhưng rất quen thuộc.
>   - Ngữ pháp: thì hiện tại đơn/hiện tại tiếp diễn (tiểu học), thêm một số thì cơ bản khác với THCS/THPT; câu hỏi dựa trên mẫu câu và cấu trúc cơ bản.
>   - Hạn chế bẫy; không dùng cấu trúc quá phức tạp.
> 
> - **Vòng Huyện/Quận:**
>   - Tăng mức mở rộng từ vựng (20–25%), xuất hiện các cặp từ dễ nhầm (some/any, much/many, few/a few, borrow/lend…).
>   - Ngữ pháp: thêm thì quá khứ, tương lai đơn, so sánh hơn/so sánh nhất, trạng từ tần suất; câu dài hơn và có bối cảnh.
>   - Distractor (đáp án nhiễu) gần nghĩa, có bẫy vừa phải.
> 
> - **Vòng Tỉnh/Thành phố:**
>   - Từ vựng: thêm collocations (cụm từ cố định), phrasal verbs cơ bản, từ nối (because, although, however, therefore, so…).
>   - Ngữ pháp: câu phức có 1 mệnh đề phụ, mệnh đề quan hệ đơn giản (đặc biệt ở THCS/THPT), cấu trúc nâng cao trong chương trình.
>   - Có câu **đọc hiểu** (reading) và **cloze test** (điền từ vào đoạn văn), yêu cầu hiểu mạch văn chứ không chỉ dịch từng từ.
>   - Distractor phải tạo phân hóa, yêu cầu hiểu sâu ngữ nghĩa và ngữ pháp.
> 
> - **Vòng Quốc gia:**
>   - Bao phủ đầy đủ từ vựng, ngữ pháp trong chương trình khối lớp; thêm 10–20% từ mở rộng nâng cao nhưng vẫn phù hợp lứa tuổi.
>   - Dùng câu phức, mệnh đề quan hệ, câu điều kiện, câu bị động, câu tường thuật, cấu trúc đặc trưng đề thi (It is + adj + for sb to do sth, so…that, too…to…).
>   - Có đoạn đọc hiểu dài hơn, câu hỏi suy luận, từ vựng theo ngữ cảnh, câu hỏi tham chiếu (it/they/this/that). 
>   - Distractor tinh vi, phân biệt được học sinh khá và học sinh giỏi.
> 
> 6. Đầu ra **luôn kèm đáp án đúng rõ ràng**, có thể thêm giải thích ngắn nếu được yêu cầu.
> 7. Nếu người dùng không nói gì khác, hãy **chỉ in ra đề và bảng đáp án**, không kèm lời giải chi tiết.

---

## 2. Khung User Prompt chung (tham số hóa theo LỚP & VÒNG)

Sử dụng mẫu này rồi thay `{LOP}`, `{VONG}`, `{SO_CAU}`, `{CHU_DE}`, `{MUC_DO}`.

```text
Hãy tạo một bộ {SO_CAU} câu hỏi trắc nghiệm tiếng Anh **kiểu IOE – Vòng {VONG}** cho học sinh **lớp {LOP}** ở Việt Nam.

Yêu cầu:
- Bám sát chương trình Tiếng Anh lớp {LOP} của Bộ GD&ĐT.
- Độ khó ở mức **Vòng {VONG} – {MUC_DO}** (theo chuẩn IOE đã mô tả trong system prompt).
- Chủ đề chính ưu tiên: {CHU_DE}.
- Câu hỏi chủ yếu dạng: chọn đáp án đúng (A, B, C, D), điền từ, odd one out, sắp xếp từ thành câu, đọc hiểu (nếu phù hợp với vòng).
- Mỗi câu hỏi hiển thị:
  - Câu hỏi/đoạn văn bằng tiếng Anh.
  - 4 lựa chọn A, B, C, D.
- Cuối cùng, ghi **bảng đáp án đúng** theo dạng: `1.A  2.C  3.B …`.
- Không cần lời giải chi tiết, trừ khi được yêu cầu ở prompt khác.
```

Có thể dùng thêm các prompt chi tiết theo từng vòng bên dưới.

---

## 3. Prompt chi tiết theo từng vòng thi

### 3.1. Prompt chi tiết – Vòng Trường

#### 3.1.1. Mẫu cho tiểu học (ví dụ: lớp 4, 5)

```text
Hãy tạo một bộ **40 câu hỏi trắc nghiệm kiểu IOE – Vòng Trường** cho **học sinh lớp 5 tiểu học** Việt Nam.

Yêu cầu chi tiết:
- Mục tiêu: kiểm tra từ vựng – ngữ pháp – cấu trúc câu cơ bản của chương trình Tiếng Anh lớp 5, bám sát SGK.
- Độ khó: mức **Vòng Trường**, tương đương trình độ A1+.
- Từ vựng chủ yếu xoay quanh: school, family, friends, daily routines, hobbies, food and drinks, places in town, weather, transport, jobs, holiday activities.
- Ngữ pháp:
  - Thì hiện tại đơn, hiện tại tiếp diễn, quá khứ đơn đơn giản.
  - Câu hỏi Wh- (What, Where, When, Who, How old, How many…).
  - Cấu trúc: like/love, can/can’t, there is/there are, giới từ in/on/at, next to, between.
- Dạng bài đề nghị:
  1) 10 câu chọn đáp án đúng về từ vựng/cụm từ.
  2) 10 câu chọn đáp án đúng về ngữ pháp.
  3) 10 câu odd one out (tìm từ khác loại).
  4) 5 câu điền từ vào chỗ trống trong câu.
  5) 5 câu sắp xếp các từ bị xáo trộn thành câu hoàn chỉnh.

Định dạng:
- Mỗi câu gồm câu hỏi tiếng Anh và 4 lựa chọn A, B, C, D.
- Cuối đề, ghi rõ bảng đáp án đúng theo dạng: `1.A  2.C  3.B …`.
```

#### 3.1.2. Mẫu cho THCS / THPT – Vòng Trường

```text
Hãy tạo một bộ **40 câu hỏi trắc nghiệm tiếng Anh kiểu IOE – Vòng Trường** cho **học sinh lớp 8** ở Việt Nam.

Yêu cầu:
- Bám sát chương trình Tiếng Anh lớp 8 (SGK mới) và độ khó Vòng Trường.
- Ngữ pháp trọng tâm: thì hiện tại đơn, hiện tại tiếp diễn, hiện tại hoàn thành cơ bản, quá khứ đơn; câu so sánh; câu hỏi Yes/No và Wh-.
- Từ vựng: các chủ đề chính của lớp 8 như: leisure activities, community service, the environment, communication, festivals, science and technology.
- Dạng bài:
  1) 20 câu chọn đáp án đúng về từ vựng/ngữ pháp.
  2) 10 câu hoàn thành hội thoại ngắn (chọn câu trả lời phù hợp).
  3) 5 câu điền từ vào câu.
  4) 5 câu chọn câu đúng/sai so với câu cho trước.
- Cuối đề ghi bảng đáp án đúng.
```

---

### 3.2. Prompt chi tiết – Vòng Huyện / Quận

#### 3.2.1. Mẫu cho tiểu học

```text
Hãy tạo một bộ **50 câu hỏi trắc nghiệm tiếng Anh kiểu IOE – Vòng Huyện** cho học sinh **lớp 5 tiểu học**.

Thiết kế độ khó theo chuẩn Vòng Huyện:
- Từ vựng: vẫn bám chương trình lớp 5, nhưng tăng khoảng 20–25% từ mở rộng và cặp từ dễ nhầm (some/any, much/many, few/a few, borrow/lend, bring/take…).
- Ngữ pháp:
  - hiện tại đơn/tiếp diễn, quá khứ đơn, tương lai đơn,
  - so sánh hơn/so sánh nhất,
  - trạng từ tần suất (always, often, sometimes, never),
  - cấu trúc “would like”, “be going to + V”.
- Câu dài hơn Vòng Trường, có bối cảnh 1–2 câu, yêu cầu hiểu ý chứ không chỉ dịch.

Dạng bài gợi ý:
1) 20 câu từ vựng/ngữ pháp chọn đáp án đúng.
2) 10 câu chọn câu trả lời phù hợp cho đoạn hội thoại ngắn.
3) 10 câu điền từ vào câu (giới từ, đại từ, mạo từ, thì).
4) 10 câu đọc đoạn văn ngắn (40–60 từ) và trả lời 1 câu hỏi mỗi đoạn (có thể gom 2–3 đoạn).

Định dạng:
- Mỗi câu có câu hỏi/đoạn văn + 4 lựa chọn A–D.
- Đảm bảo ít nhất 2 đáp án trông có vẻ hợp lý để phân loại học sinh khá.
- Cuối đề ghi bảng đáp án đúng.
```

#### 3.2.2. Mẫu cho THCS / THPT

```text
Hãy tạo một bộ **60 câu hỏi trắc nghiệm tiếng Anh kiểu IOE – Vòng Huyện** cho **học sinh lớp 9**.

Yêu cầu:
- Bám sát chương trình lớp 9, nhưng độ khó cao hơn Vòng Trường.
- Ngữ pháp:
  - thì hiện tại hoàn thành, quá khứ hoàn thành ở mức cơ bản,
  - câu điều kiện loại 1 (có thể thêm một ít loại 2 đơn giản),
  - mệnh đề quan hệ đơn giản (who, which, that),
  - câu bị động ở thì hiện tại đơn/quá khứ đơn.
- Từ vựng: mở rộng chủ đề về môi trường, thành phố tương lai, nghề nghiệp, khoa học công nghệ.
- Dạng bài:
  1) 30 câu từ vựng/ngữ pháp.
  2) 10 câu cloze test (đoạn văn 80–100 từ, điền 10 chỗ trống, mỗi chỗ có 4 lựa chọn).
  3) 10 câu hoàn thành hội thoại.
  4) 10 câu đọc hiểu đoạn 80–100 từ với câu hỏi chi tiết.

Cuối đề ghi bảng đáp án đúng.
```

---

### 3.3. Prompt chi tiết – Vòng Tỉnh / Thành phố

#### 3.3.1. Mẫu cho tiểu học (lớp 4–5)

```text
Hãy tạo một bộ **60 câu hỏi tiếng Anh kiểu IOE – Vòng Tỉnh/Thành phố** cho **học sinh lớp 5**.

Yêu cầu về độ khó:
- Trình độ mục tiêu: A2.
- Từ vựng:
  - dựa trên SGK lớp 5,
  - bổ sung collocations cơ bản (have breakfast, do homework, make a cake, take a bus, go shopping…),
  - bổ sung từ nối: because, although, however, therefore, so.
- Ngữ pháp:
  - hiện tại đơn/tiếp diễn, quá khứ đơn, tương lai đơn,
  - câu so sánh, câu hỏi với How often/How long,
  - câu phức với because/when/if,
  - có thể dùng bị động đơn giản ở mức vừa phải.

Cấu trúc đề:
1) 25 câu trắc nghiệm từ vựng – ngữ pháp (4 lựa chọn, có distractor gần nghĩa).
2) 10 câu cloze test: 1 đoạn văn ~80–100 từ, 10 chỗ trống, mỗi chỗ có 4 lựa chọn.
3) 15 câu đọc hiểu: 2 đoạn văn, mỗi đoạn ~100–120 từ, mỗi đoạn 7–8 câu hỏi multiple choice.
4) 10 câu sắp xếp từ thành câu hoàn chỉnh hoặc chọn câu đúng/sai so với tranh/miêu tả.

Yêu cầu thêm:
- Các câu hỏi đọc hiểu phải có cả câu hỏi chi tiết, câu hỏi ý chính và suy luận đơn giản.
- Cuối đề ghi đầy đủ bảng đáp án đúng.
```

#### 3.3.2. Mẫu cho THCS / THPT – Vòng Tỉnh

```text
Hãy tạo một bộ **80 câu hỏi tiếng Anh kiểu IOE – Vòng Tỉnh/Thành phố** cho **học sinh lớp 10**.

Yêu cầu:
- Trình độ mục tiêu: A2+ đến B1-.
- Từ vựng: bám chương trình lớp 10, thêm một số từ học thuật nhẹ về giáo dục, công nghệ, môi trường, sức khỏe, xã hội.
- Ngữ pháp:
  - thì hiện tại hoàn thành, quá khứ hoàn thành, tương lai gần,
  - câu điều kiện loại 1–2,
  - mệnh đề quan hệ (who, which, that, where, when),
  - câu bị động ở nhiều thì phổ biến.

Cấu trúc đề gợi ý:
1) 35 câu trắc nghiệm từ vựng – ngữ pháp (nhiều distractor gần nghĩa).
2) 15 câu cloze test trên một đoạn văn 120–150 từ.
3) 20 câu đọc hiểu trên 2 đoạn văn (mỗi đoạn 120–150 từ), có câu hỏi suy luận, từ vựng theo ngữ cảnh.
4) 10 câu nhận diện lỗi sai trong câu hoặc chọn câu viết lại có nghĩa tương đương.

Cuối đề ghi bảng đáp án đúng.
```

---

### 3.4. Prompt chi tiết – Vòng Quốc gia

#### 3.4.1. Mẫu cho tiểu học – Vòng Quốc gia

```text
Đóng vai chuyên gia ra đề IOE Quốc gia cho cấp tiểu học.
Hãy tạo một đề **IOE Vòng Quốc gia rút gọn** gồm **80 câu hỏi** cho **học sinh lớp 5** (giữ nguyên phong cách Quốc gia nhưng số câu ít hơn để minh họa).

Chuẩn độ khó:
- Trình độ: A2+ tiệm cận B1.
- Đối tượng là học sinh đã vượt qua Vòng Tỉnh/Thành phố, thuộc nhóm học sinh giỏi của tỉnh.

Yêu cầu nội dung:
- Ngữ pháp:
  - bao phủ toàn bộ chương trình tiểu học nâng cao,
  - dùng linh hoạt hiện tại đơn/tiếp diễn, quá khứ đơn, tương lai đơn,
  - câu điều kiện loại 1, câu bị động đơn giản,
  - câu với because/although/when,
  - cấu trúc: “It is + adj + for sb to do sth”, “too … to …”, “enough to …”.
- Từ vựng:
  - mở rộng chủ đề: môi trường, du lịch, sức khỏe, công nghệ đơn giản, giao thông, văn hóa,
  - dùng nhiều collocations và phrasal verbs cơ bản (take part in, look after, turn off, put on, etc.).

Cấu trúc đề gợi ý:
1) 30 câu trắc nghiệm từ vựng – ngữ pháp, trong đó ít nhất 10 câu về collocations/phrasal verbs.
2) 20 câu cloze test trên 2 đoạn văn (mỗi đoạn 120–150 từ).
3) 20 câu đọc hiểu trên một đoạn văn 150–200 từ, có câu hỏi chi tiết, ý chính, suy luận và từ vựng theo ngữ cảnh.
4) 10 câu nhận diện lỗi sai hoặc chọn câu viết lại có nghĩa tương đương (ở mức phù hợp tuổi tiểu học, paraphrase đơn giản).

Định dạng:
- Mỗi câu có câu hỏi/đoạn văn + 4 lựa chọn A–D.
- Cuối đề, ghi bảng đáp án đúng cho tất cả câu.
- Nếu có thể, hãy đánh dấu 5–10 câu khó nhất (ví dụ: ghi thêm [KHÓ] sau số câu).
```

#### 3.4.2. Mẫu cho THCS / THPT – Vòng Quốc gia

```text
Đóng vai chuyên gia ra đề IOE Quốc gia cho cấp THCS.
Hãy tạo một đề **IOE Vòng Quốc gia rút gọn** gồm **100 câu hỏi** cho **học sinh lớp 9**.

Chuẩn độ khó:
- Trình độ: B1 vững.
- Học sinh là top Vòng Tỉnh/Thành phố.

Yêu cầu:
- Ngữ pháp:
  - toàn bộ các thì phổ biến (hiện tại/ quá khứ/ tương lai, hiện tại hoàn thành, quá khứ hoàn thành),
  - câu điều kiện loại 1–2 (có thể thêm một ít loại 3),
  - mệnh đề quan hệ (full + rút gọn),
  - câu bị động với nhiều thì,
  - câu tường thuật, câu so sánh kép, cấu trúc nhấn mạnh (It is/was … that …).
- Từ vựng: mở rộng theo chủ đề học thuật nhẹ (môi trường, biến đổi khí hậu, khoa học công nghệ, sức khỏe cộng đồng, truyền thông, văn hóa).

Cấu trúc đề gợi ý:
1) 40 câu trắc nghiệm từ vựng – ngữ pháp với distractor tinh vi.
2) 20 câu cloze test trên một đoạn văn 150–200 từ.
3) 30 câu đọc hiểu trên 2 đoạn văn (mỗi đoạn 180–220 từ), bao gồm câu hỏi suy luận, reference (it/they/this), từ vựng theo ngữ cảnh.
4) 10 câu nhận diện lỗi sai hoặc viết lại câu.

Cuối đề, ghi bảng đáp án đúng.
Nếu có thể, đánh dấu 10 câu khó nhất để giáo viên dễ nhận diện.
```

---

## 4. Gợi ý cách dùng nhanh

- Bước 1: Dán **System Prompt chung** vào phần "system" (hoặc yêu cầu đầu tiên) của chatbot.
- Bước 2: Chọn **một prompt chi tiết** phù hợp (lớp, vòng) ở trên và dán vào phần "user".
- Bước 3: Điều chỉnh `{LOP}`, `{SO_CAU}`, `{CHU_DE}` theo nhu cầu cụ thể.
- Bước 4: Sau khi AI sinh đề, giáo viên rà soát nhanh, chỉnh lại vài câu chưa phù hợp (nếu có), rồi dùng in ra cho học sinh luyện.
