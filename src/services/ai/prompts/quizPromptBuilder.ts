/**
 * @module quizPromptBuilder
 * Builds the full prompt sent to AI providers for quiz generation.
 * Contains all Vietnamese educational prompt instructions, type descriptions,
 * difficulty level rules, and LaTeX formatting constraints.
 */

import type { QuizGenerationOptions } from '../../geminiService';

// ─────────────────────────────────────────────────────────
//  AGENTIC SKILL PROMPTS
// ─────────────────────────────────────────────────────────

const SCIENTIFIC_GROUNDING_PROMPT = `
    [SCIENTIFIC RESEARCH PHASE]:
    Trước khi tạo mảng câu hỏi, hãy thực hiện các bước tư duy sau:
    1. Xác định kiến thức cốt lõi (Core Facts) và các sự thật khoa học của chủ đề.
    2. Phân tích các lỗi sai phổ biến (Misconceptions) mà học sinh lứa tuổi này thường mắc phải. Dùng chúng để tạo các phương án nhiễu (distractors) có tính thách thức cao.
    3. Tìm kiếm các tình huống đời thường (Real-world Application) gần gũi để lồng ghép vào câu hỏi, giúp bài thi không bị khô khan.
`;

const PEDAGOGICAL_EXPLANATION_PROMPT = `
    [EXPLANATION GENERATOR RULE]:
    Trường "explanation" PHẢI là một bài giảng mini (2-4 câu) theo cấu trúc:
    - ✅ Khẳng định: Xác nhận đáp án đúng và lý do chọn.
    - 🧩 Dẫn dắt (Scaffolding): Giải thích bước đi tư duy hoặc quy tắc áp dụng (VD: "Theo quy tắc bàn tay trái...", "Vì đây là danh từ chỉ vật...").
    - 💡 Liên hệ/Mẹo: Đưa ra một ví dụ thực tế hoặc một "mẹo nhớ" (Mnemonic/Fun Fact) giúp học sinh ghi nhớ lâu hơn.
    - Tuyệt đối không viết kiểu "Đáp án A là đúng" một cách đơn điệu.
`;

// ─────────────────────────────────────────────────────────
//  QUESTION TYPE DESCRIPTIONS
// ─────────────────────────────────────────────────────────

const buildTypeDescriptions = (options?: QuizGenerationOptions): Record<string, string> => ({
  'MCQ': 'MCQ (Trắc nghiệm chọn 1 đáp án đúng. Format: {"type": "MCQ", "question": "Nội dung câu hỏi (TUYỆT ĐỐI KHÔNG xuống dòng, dùng inline math $...$ thay vì $$...$$)", "options": ["A...", "B...", "C...", "D..."], "correctAnswer": "A", "explanation": "✅ [Kết luận đúng]. 🧩 [Giải thích các bước/quy tắc]. 💡 [Mẹo nhớ/Liên hệ thực tế]." })',
  'TRUE_FALSE': 'TRUE_FALSE (Câu hỏi đúng sai. Format: {"type": "TRUE_FALSE", "mainQuestion": "Câu hỏi chính (1 dòng)", "items": [{"statement": "Ý 1", "isCorrect": true}, {"statement": "Ý 2", "isCorrect": false}]})',
  'SHORT_ANSWER': 'SHORT_ANSWER (Điền đáp án ngắn. Format: {"type": "SHORT_ANSWER", "question": "Câu hỏi (1 dòng)", "correctAnswer": "Đáp án đúng"})',
  'MATCHING': 'MATCHING (Nối cột. Format: {"type": "MATCHING", "question": "Câu hỏi (1 dòng)", "pairs": [{"left": "A", "right": "1"}, {"left": "B", "right": "2"}]})',
  'MULTIPLE_SELECT': 'MULTIPLE_SELECT (Chọn TẤT CẢ đáp án đúng. Format: {"type": "MULTIPLE_SELECT", "question": "Câu hỏi (1 dòng)", "options": ["A", "B", "C", "D"], "correctAnswers": ["A", "C"]})',
  'DRAG_DROP': 'DRAG_DROP (⚠️ NHẬN DIỆN: Câu hỏi có dạng "điền từ vào chỗ trống". question chứa đề bài gốc + danh sách từ cho sẵn, text chứa đoạn văn/thơ với từ ĐÚNG đã điền trong [ngoặc vuông], blanks là mảng các từ đúng, distractors là mảng các từ còn lại không dùng.)',
  'ORDERING': 'ORDERING (Sắp xếp thứ tự câu. items là mảng các câu ĐÃ XÁO TRỘN, correctOrder là mảng chỉ thứ tự đúng.)',
  'IMAGE_QUESTION': `IMAGE_QUESTION (Câu hỏi trắc nghiệm CÓ HÌNH ẢNH minh họa.
    ${options?.imageLibrary?.length ? '✅ CÓ THƯ VIỆN ẢNH: Hãy dùng ID hình ảnh từ thư viện đã upload.' : '⚠️ KHÔNG CÓ HÌNH UPLOAD - Dùng "IMAGE_PROMPT: <Mô tả chi tiết>" để AI tự vẽ.'}
    Format: {"type": "IMAGE_QUESTION", "question": "...", "image": "IMAGE_PROMPT: ...", "options": ["A...", "B...", "C...", "D..."], "correctAnswer": "A"})`,
  'DROPDOWN': 'DROPDOWN (Điền vào chỗ trống bằng DROPDOWN. Trong text dùng [1], [2]... để đánh dấu vị trí. blanks là mảng các dropdown tương ứng với options và correctAnswer)',
  'UNDERLINE': 'UNDERLINE (Gạch chân từ/cụm từ. Format: {"type": "UNDERLINE", "question": "...", "sentence": "...", "words": [...], "correctWordIndexes": [1]})',
  'CATEGORIZATION': 'CATEGORIZATION (Kéo thả phân loại vào nhóm. categories là mảng nhóm (id, name). items là mảng mục (id, content, categoryId). MỖI ITEM BẮT BUỘC CÓ content không rỗng.)',
  'WORD_SCRAMBLE': 'WORD_SCRAMBLE (Sắp xếp chữ cái thành từ. Format: {"type": "WORD_SCRAMBLE", "question": "...", "letters": [...], "correctWord": "..."})',
  'RIDDLE': 'RIDDLE (Câu đố chữ tiếng Việt. Format: {"type": "RIDDLE", "question": "...", "riddleLines": [...], "correctAnswer": "1 tiếng", "answerType": "original|transformed", "answerLabel": "...", "hint": "..."})',
  'ERROR_CORRECTION': 'ERROR_CORRECTION (Tìm từ sai và sửa lại. Format: {"type": "ERROR_CORRECTION", "question": "...", "passage": "...", "wrongWord": "...", "correctWord": "..."})',
});

// ─────────────────────────────────────────────────────────
//  BUILD PROMPT
// ─────────────────────────────────────────────────────────

/** Build the full prompt string for quiz generation. */
export const buildPrompt = (
  topic: string,
  classLevel: string,
  content: string,
  options?: QuizGenerationOptions
): string => {
  const title = options?.title || `Kiểm tra: ${topic}`;
  const count = options?.questionCount || 10;
  const types = options?.questionTypes || [];
  const levels = options?.difficultyLevels;
  const customPrompt = options?.customPrompt?.trim();
  const images = options?.imageLibrary || [];

  const typeDescriptions = buildTypeDescriptions(options);
  const typesDescription = types.map(t => typeDescriptions[t] || t).join('\n    - ');
  const typesList = types.join(', ');

  // ── Difficulty levels ──────────────────────────────────
  let difficultyInstructions = '';
  if (levels) {
    difficultyInstructions = `
    PHÂN BỔ CÂU HỎI THEO MỨC ĐỘ NHẬN THỨC (Chuẩn đánh giá Tiểu học Việt Nam):
    
    📗 MỨC 1 - NHẬN BIẾT (${levels.level1} câu): Câu hỏi đơn giản, quen thuộc, áp dụng trực tiếp.
    📘 MỨC 2 - THÔNG HIỂU (${levels.level2} câu): Kết nối 2-3 kiến thức, tình huống tương tự.
    📕 MỨC 3 - VẬN DỤNG (${levels.level3} câu): Câu hỏi phức tạp, thực tế, gắn với đời sống.
    
    TỔNG CỘNG: ${levels.level1 + levels.level2 + levels.level3} câu
    
    ⚠️ KHÔNG ghi nhãn mức độ vào nội dung câu hỏi.
    🔴 BẮT BUỘC: Mỗi câu PHẢI CÓ TRƯỜNG "difficultyLevel": 1, 2 hoặc 3.
    🔴 THỨ TỰ: Mức 1 đầu đề → Mức 2 giữa → Mức 3 cuối.`;
  }

  // ── Image library ──────────────────────────────────────
  let imageInstructions = '';
  if (images.length > 0) {
    const imageList = images.map((img, idx) => `${idx + 1}. "${img.name}" (ID: ${img.id})`).join('\n    ');
    imageInstructions = `
    
    THƯ VIỆN HÌNH ẢNH ĐÃ UPLOAD:
    ${imageList}
    
    ⚠️ ƯU TIÊN sử dụng các hình ảnh trên. Khi dùng, thêm trường "image" với giá trị là ID của hình.`;
  }

  // ── Custom prompt ──────────────────────────────────────
  let customPromptSection = '';
  if (customPrompt) {
    customPromptSection = `
    
    🔴 YÊU CẦU ĐẶC BIỆT TỪ GIÁO VIÊN (ƯU TIÊN CAO NHẤT - PHẢI TUÂN THỦ):
    "${customPrompt}"`;
  }

  // ── Build final prompt ─────────────────────────────────
  return `
    ⛔⛔⛔ GIỚI HẠN SỐ LƯỢNG - QUY TẮC TUYỆT ĐỐI ⛔⛔⛔
    SỐ CÂU HỎI: CHÍNH XÁC ${count} CÂU. Vi phạm → toàn bộ đề BỊ HỦY.
    ⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔

    Tạo đề kiểm tra cho học sinh Lớp ${classLevel}.
    ${customPromptSection}
    
    ${SCIENTIFIC_GROUNDING_PROMPT}
    ${PEDAGOGICAL_EXPLANATION_PROMPT}
    
    THÔNG TIN CẤU HÌNH:
    - Tiêu đề: "${title}"
    - Chủ đề: "${topic}"
    - SỐ CÂU: ${count} (KHÔNG ĐƯỢC THAY ĐỔI)

    METADATA AI BẮT BUỘC Ở CẤP ROOT JSON:
    - detectedCategory: "toan" | "tieng-viet" | "tieng-anh" | "tu-nhien-xa-hoi" | "tin-hoc"
    - detectedLesson: Tên bài học tóm tắt gọn
    - suggestedTags: Mảng 3-5 hashtag (chữ thường, không dấu, dùng "_")
    
    ${difficultyInstructions}
    ${imageInstructions}
    
    ⚠️ CHỈ ĐƯỢC PHÉP SỬ DỤNG CÁC DẠNG CÂU HỎI SAU:
    - ${typesDescription}
    
    ${options?.isPdfMode ? `
    [PDF MODE - OCR FIRST]
    - Dùng nội dung OCR bên dưới là NGUỒN CHÍNH.
    OCR CONTENT FROM FILE:
    ${content ? `"${content}"` : '[ERROR: missing OCR content]'}
    ` : `
    NỘI DUNG THAM KHẢO:
    ${content || 'Không có nội dung cụ thể. Hãy tự động sinh câu hỏi dựa trên kiến thức chuẩn của sách giáo khoa Tiểu học Việt Nam.'}
    `}

    ⛔ QUY TẮC BẮT BUỘC:
    1. TẠO ĐÚNG ${count} CÂU - GIỚI HẠN CỨNG.
    2. CHỈ dạng: ${typesList}.
    3. Ngôn ngữ: Tiếng Việt, phù hợp tiểu học.
    4. ROOT JSON: title, detectedCategory, detectedLesson, suggestedTags, questions.
    
    📐 QUY TẮC LATEX:
    🚫 CHỮ TIẾNG VIỆT KHÔNG BAO GIỜ NẰM TRONG $...$
    ✅ $...$ CHỈ CHỨA: Số, phép toán (+−×÷=), \\\\frac{}{}, \\\\sqrt{}, ký hiệu toán.
    
    ⚠️ KIỂM TRA LẦN CUỐI: Đếm lại số câu hỏi. Phải ĐÚNG ${count} câu.
  `;
};
