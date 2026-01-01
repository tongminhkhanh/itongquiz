import { SYSTEM_INSTRUCTION } from "../config/constants";
import { QuestionType } from "../types";

export type AIProvider = 'gemini' | 'perplexity' | 'openai' | 'llm-mux' | 'native-ocr';

export interface QuizGenerationOptions {
  title: string;
  questionCount: number;
  questionTypes: QuestionType[];
  difficultyLevels?: {
    level1: number;
    level2: number;
    level3: number;
  };
  imageLibrary?: Array<{ id: string; name: string; data?: string; }>;
  customPrompt?: string; // Custom prompt từ giáo viên - ưu tiên cao nhất
  isPdfMode?: boolean; // Chế độ tạo đề từ PDF - không cần chủ đề
}

// Build the prompt for quiz generation
const buildPrompt = (topic: string, classLevel: string, content: string, options?: QuizGenerationOptions): string => {
  const title = options?.title || `Kiểm tra: ${topic}`;
  const count = options?.questionCount || 10;
  const types = options?.questionTypes || [];
  const levels = options?.difficultyLevels;
  const customPrompt = options?.customPrompt?.trim(); // Custom prompt từ giáo viên

  // Map question types to Vietnamese descriptions for better AI understanding
  const typeDescriptions: Record<string, string> = {
    'MCQ': 'MCQ (Trắc nghiệm chọn 1 đáp án đúng trong 4 lựa chọn A, B, C, D)',
    'TRUE_FALSE': 'TRUE_FALSE (Cho một câu hỏi chính và nhiều phát biểu, học sinh chọn Đúng hoặc Sai cho mỗi phát biểu)',
    'SHORT_ANSWER': 'SHORT_ANSWER (Điền đáp án ngắn, thường là 1-4 ký tự hoặc số)',
    'MATCHING': 'MATCHING (Nối các ý ở cột A với cột B. ⚠️ BẮT BUỘC: Cột A (left) và Cột B (right) PHẢI CÓ CÙNG SỐ LƯỢNG mục, thường là 3-4 cặp. Mỗi mục ở cột A chỉ nối với 1 mục ở cột B)',
    'MULTIPLE_SELECT': 'MULTIPLE_SELECT (Chọn TẤT CẢ các đáp án đúng, có thể 2-3 đáp án đúng trong 4 lựa chọn, correctAnswers là mảng như ["A", "C"])',
    'DRAG_DROP': 'DRAG_DROP (⚠️ NHẬN DIỆN: Câu hỏi có dạng "điền từ vào chỗ trống", "điền từ thích hợp", "điền vào (...)", "chọn từ trong ngoặc điền vào". CÁCH TẠO: question chứa đề bài gốc + danh sách từ cho sẵn, text chứa đoạn văn/thơ với từ ĐÚNG đã điền trong [ngoặc vuông], blanks là mảng các từ đúng, distractors là mảng các từ còn lại không dùng. VD: đề "Điền từ (suối,đồng,xoan) vào: Mưa giăng trên... Hoa... theo gió" → text: "Mưa giăng trên [đồng]. Hoa [xoan] theo gió", blanks: ["đồng","xoan"], distractors: ["suối"])',
    'ORDERING': 'ORDERING (Sắp xếp thứ tự câu trong đoạn văn. ⚠️ BẮT BUỘC: Phải TÌM KIẾM đoạn văn THẬT từ sách giáo khoa, truyện cổ tích Việt Nam, bài thơ, bài văn mẫu - KHÔNG ĐƯỢC TỰ BỊA. Đoạn văn 4-5 câu ngắn gọn, phù hợp lứa tuổi. items là mảng các câu ĐÃ XÁO TRỘN, correctOrder là mảng chỉ thứ tự đúng. VD: items=["Câu 2","Câu 1","Câu 3"], correctOrder=[1,0,2] nghĩa là items[1] đứng đầu, items[0] đứng 2, items[2] đứng 3. Nên lấy từ: truyện Tấm Cám, Thạch Sanh, Sọ Dừa, thơ Trần Đăng Khoa, Võ Quảng...)',
    'IMAGE_QUESTION': 'IMAGE_QUESTION (Câu hỏi trắc nghiệm CÓ HÌNH ẢNH minh họa BẮT BUỘC. ⚠️ QUAN TRỌNG: Trường "image" là BẮT BUỘC - phải là URL hình ảnh từ internet hoặc từ thư viện hình đã upload. Format: {"type": "IMAGE_QUESTION", "question": "Dựa vào hình bên, ...", "image": "URL_HOẶC_ID_HÌNH", "options": ["A...", "B...", "C...", "D..."], "correctAnswer": "A"}. Dùng cho câu hỏi cần quan sát hình: đếm số, nhận diện hình, so sánh hình, tìm quy luật trong hình...)',
    'DROPDOWN': 'DROPDOWN (Câu hỏi điền vào chỗ trống bằng DROPDOWN. Format: {"type": "DROPDOWN", "question": "Chọn từ đúng điền vào chỗ trống", "text": "Thủ đô Việt Nam là [1]. Dân số khoảng [2] triệu người.", "blanks": [{"id": "blank-1", "options": ["Hà Nội", "TP.HCM", "Đà Nẵng"], "correctAnswer": "Hà Nội"}, {"id": "blank-2", "options": ["90", "100", "80"], "correctAnswer": "100"}]}. Trong text dùng [1], [2]... để đánh dấu vị trí dropdown. Mảng blanks chứa các dropdown tương ứng với options và correctAnswer)',
    'UNDERLINE': 'UNDERLINE (Câu hỏi gạch chân từ/cụm từ trong câu. Học sinh click vào từ để gạch chân. Format: {"type": "UNDERLINE", "question": "Gạch chân động từ trong câu sau", "sentence": "Mặt trời ngả nắng đằng tây", "words": ["Mặt trời", "ngả", "nắng", "đằng tây"], "correctWordIndexes": [1]}. Lưu ý: words là mảng các từ/cụm từ tách ra từ sentence. correctWordIndexes là mảng index các từ cần gạch chân (0-indexed). VD: Với câu trên, "ngả" ở index 1 là động từ cần gạch chân.)'
  };

  const typesDescription = types.map(t => typeDescriptions[t] || t).join('\n    - ');
  const typesList = types.join(', ');
  const images = options?.imageLibrary || [];

  // Build difficulty level instructions with detailed Vietnamese educational standards
  let difficultyInstructions = '';
  if (levels) {
    difficultyInstructions = `
    PHÂN BỔ CÂU HỎI THEO MỨC ĐỘ NHẬN THỨC (Chuẩn đánh giá Tiểu học Việt Nam):
    
    📗 MỨC 1 - NHẬN BIẾT (${levels.level1} câu):
    Định nghĩa: Nhận biết, nhắc lại hoặc mô tả được nội dung đã học và áp dụng trực tiếp để giải quyết một số tình huống quen thuộc trong học tập.
    Đặc điểm câu hỏi Mức 1:
    - Câu hỏi đơn giản, quen thuộc
    - Yêu cầu nhớ lại kiến thức cơ bản
    - Áp dụng trực tiếp công thức/quy tắc đã học
    - Tình huống đã gặp trong sách giáo khoa
    - Ví dụ: "5 + 3 = ?", "Từ nào là danh từ?", "Nước sôi ở bao nhiêu độ?"
    
    📘 MỨC 2 - THÔNG HIỂU (${levels.level2} câu):
    Định nghĩa: Kết nối, sắp xếp được một số nội dung đã học để giải quyết vấn đề có nội dung tương tự.
    Đặc điểm câu hỏi Mức 2:
    - Câu hỏi có biến đổi nhẹ so với ví dụ trong sách
    - Yêu cầu kết nối 2-3 kiến thức đã học
    - Giải quyết vấn đề tương tự nhưng khác ngữ cảnh
    - Cần suy luận một bước
    - Ví dụ: "Mẹ có 15 quả táo, cho lan 7 quả, còn lại bao nhiêu?", "Điền từ thích hợp vào câu..."
    
    📕 MỨC 3 - VẬN DỤNG (${levels.level3} câu):
    Định nghĩa: Vận dụng các nội dung đã học để giải quyết một số vấn đề mới hoặc đưa ra những phản hồi hợp lý trong học tập và cuộc sống.
    Đặc điểm câu hỏi Mức 3:
    - Câu hỏi phức tạp, thực tế, gắn với đời sống
    - Yêu cầu vận dụng tổng hợp nhiều kiến thức
    - Tình huống mới chưa gặp trong sách
    - Cần suy luận nhiều bước
    - Có thể có nhiều cách giải
    - Ví dụ: "Nam có 50.000đ, mua 3 quyển vở giá 8.000đ/quyển và 2 cây bút giá 5.000đ/cây. Nam còn bao nhiêu tiền?", "Viết đoạn văn ngắn về..."
    
    TỔNG CỘNG: ${levels.level1 + levels.level2 + levels.level3} câu
    
    ⚠️ LƯU Ý QUAN TRỌNG: 
    - KHÔNG được ghi "Mức 1", "Mức 2", "Mức 3", "Nhận biết", "Thông hiểu", "Vận dụng" hay nhãn mức độ nào vào câu hỏi
    - Chỉ tạo câu hỏi bình thường, độ khó phản ánh qua nội dung câu hỏi
    - Đảm bảo phân bổ đúng số lượng theo từng mức`;
  }

  // Build image library instructions
  let imageInstructions = '';
  if (images.length > 0) {
    const imageList = images.map((img, idx) => `${idx + 1}. "${img.name}" (ID: ${img.id})`).join('\n    ');
    imageInstructions = `
    
    THU VIEN HINH ANH DA UPLOAD (co the gan vao cau hoi):
    ${imageList}
    
    ⚠️ YEU CAU BAT BUOC VE HINH ANH:
    1. UU TIEN TUYET DOI viec su dung cac hinh anh tren de tao cau hoi.
    2. Hay doc ten hinh anh de hieu noi dung va tao cau hoi phu hop voi hinh do.
    3. Khi su dung hinh, BAT BUOC phai them truong "image" voi gia tri la ID cua hinh (vi du: "image": "img-123...").
    4. Noi dung cau hoi phai lien quan truc tiep den hinh anh (vi du: "Dua vao hinh ben...", "Hinh anh nay mo ta...", "Ket qua cua phep tinh trong hinh la...").
    5. Neu khong co hinh phu hop, moi tu tao cau hoi khong hinh hoac dung URL ngoai.`;
  }

  // ⭐ Build custom prompt instructions (HIGHEST PRIORITY)
  let customPromptSection = '';
  if (customPrompt) {
    customPromptSection = `
    
    🔴 YÊU CẦU ĐẶC BIỆT TỪ GIÁO VIÊN (ƯU TIÊN CAO NHẤT - PHẢI TUÂN THỦ):
    "${customPrompt}"
    
    ⚠️ LƯU Ý: Yêu cầu trên của giáo viên có độ ưu tiên cao nhất. Hãy tuân thủ chặt chẽ các yêu cầu này khi tạo đề.
    `;
  }

  return `
    ⛔⛔⛔ GIỚI HẠN SỐ LƯỢNG - QUY TẮC TUYỆT ĐỐI KHÔNG ĐƯỢC VI PHẠM ⛔⛔⛔
    SỐ CÂU HỎI: CHÍNH XÁC ${count} CÂU
    - KHÔNG ĐƯỢC tạo nhiều hơn ${count} câu
    - KHÔNG ĐƯỢC tạo ít hơn ${count} câu  
    - Mảng "questions" trong JSON PHẢI có ĐÚNG ${count} phần tử
    - Nếu vi phạm giới hạn này, toàn bộ đề thi sẽ BỊ HỦY
    ⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔⛔

    Tao de kiem tra cho hoc sinh Lop ${classLevel}.
    ${customPromptSection}
    
    THONG TIN CAU HINH:
    - Tieu de bai kiem tra: "${title}"
    - Chu de: "${topic}"
    - SO CAU: ${count} (KHONG DUOC THAY DOI)
    
    ${difficultyInstructions}
    ${imageInstructions}
    
    ⚠️ CHỈ ĐƯỢC PHÉP SỬ DỤNG CÁC DẠNG CÂU HỎI SAU (KHÔNG ĐƯỢC DÙNG DẠNG KHÁC):
    - ${typesDescription}
    
    ${options?.isPdfMode ? `
    🔴🔴🔴 CHẾ ĐỘ TẠO ĐỀ TỪ FILE PDF - ƯU TIÊN TUYỆT ĐỐI 🔴🔴🔴
    ⛔ KHÔNG cần tuân theo chủ đề "${topic}" - CHỈ lấy nội dung từ FILE ĐÍNH KÈM
    ⛔ KHÔNG được tự bịa câu hỏi - CHỈ trích xuất từ file
    ⛔ Lấy NGUYÊN VĂN câu hỏi trong file và TỰ XÁC ĐỊNH đáp án đúng
    ` : `
    NỘI DUNG THAM KHẢO:
    ${content ? `"${content}"` : "Không có nội dung cụ thể. Hãy tự động sinh câu hỏi dựa trên kiến thức chuẩn của sách giáo khoa Tiểu học Việt Nam phù hợp với Chủ đề và Lớp học đã nêu trên."}
    `}

    ⛔ QUY TẮC BẮT BUỘC:
    1. TẠO ĐÚNG ${count} CÂU - ĐÂY LÀ GIỚI HẠN CỨNG, KHÔNG ĐƯỢC VƯỢT QUÁ.
    2. CHỈ tạo câu hỏi thuộc dạng: ${typesList}. TUYỆT ĐỐI KHÔNG tạo dạng câu hỏi nào khác.
    3. Nếu chỉ chọn 1 dạng (ví dụ: MULTIPLE_SELECT), thì TẤT CẢ ${count} câu đều phải là dạng đó.
    4. Với MULTIPLE_SELECT: correctAnswers phải là mảng có ít nhất 2 đáp án đúng, ví dụ: ["A", "C"] hoặc ["B", "C", "D"].
    5. Ngôn ngữ: Tiếng Việt, phù hợp với học sinh tiểu học.
    6. Đảm bảo đầu ra đúng định dạng JSON với ĐÚNG ${count} câu hỏi.
    7. QUY TẮC VIẾT PHÉP TÍNH:
       - Phân số: Viết liền không cách (ví dụ: 1/2, 3/4).
       - Phép chia: Viết có khoảng cách (ví dụ: 10 / 2, 15 / 3).
       - Phép nhân: Viết có khoảng cách (ví dụ: 5 * 3).
    
    📐 QUY TẮC LATEX CHO CÔNG THỨC TOÁN HỌC (QUAN TRỌNG):
    Khi câu hỏi có công thức toán học phức tạp, PHẢI dùng cú pháp LaTeX:
    - Phân số: $\\frac{a}{b}$ (ví dụ: $\\frac{1}{2}$, $\\frac{3}{4}$)
    - Lũy thừa: $x^n$ (ví dụ: $2^3$, $x^2$, $10^5$)
    - Chỉ số dưới: $x_n$ (ví dụ: $a_1$, $x_n$)
    - Căn bậc hai: $\\sqrt{x}$ (ví dụ: $\\sqrt{4}$, $\\sqrt{16}$)
    - Căn bậc n: $\\sqrt[n]{x}$ (ví dụ: $\\sqrt[3]{8}$)
    - Pi: $\\pi$
    - Nhân: $\\times$ hoặc $\\cdot$
    - Chia: $\\div$
    - Lớn hơn hoặc bằng: $\\geq$
    - Nhỏ hơn hoặc bằng: $\\leq$
    - Không bằng: $\\neq$
    - Tổng: $\\sum_{i=1}^{n}$
    - Tích phân: $\\int_{a}^{b}$
    - Góc: $\\angle ABC$
    - Độ: $90^\\circ$
    - Tam giác: $\\triangle ABC$
    - Song song: $\\parallel$
    - Vuông góc: $\\perp$
    
    ⚠️ LƯU Ý LATEX - QUAN TRỌNG:
    - LUÔN dùng inline math $...$ để công thức CÙNG DÒNG với câu hỏi
    - KHÔNG dùng display math $$...$$ (sẽ làm công thức xuống dòng riêng)
    - VÍ DỤ ĐÚNG: "Rút gọn kết quả của $\\\\frac{2}{6} + \\\\frac{1}{3}$?"
    - VÍ DỤ SAI: "Rút gọn kết quả của $$\\\\frac{2}{6} + \\\\frac{1}{3}$$?"
    - LUÔN escape dấu backslash trong JSON: dùng \\\\\\\\ thay vì \\\\
    
    🎨 HÌNH MINH HỌA - SVG GEOMETRY (Cho câu hỏi hình học):
    Khi câu hỏi CẦN HÌNH VẼ (tam giác, hình vuông, đường tròn), thêm trường "geometry":
    
    📐 TAM GIÁC: {"type": "triangle", "vertices": [{"x": 20, "y": 20, "label": "A"}, {"x": 180, "y": 20, "label": "B"}, {"x": 100, "y": 160, "label": "C"}], "measurements": {"AB": "5cm"}}
    ⬜ HÌNH VUÔNG: {"type": "square", "vertices": [{"x": 30, "y": 30, "label": "A"}, {"x": 150, "y": 30, "label": "B"}, {"x": 150, "y": 150, "label": "C"}, {"x": 30, "y": 150, "label": "D"}]}
    ⭕ ĐƯỜNG TRÒN: {"type": "circle", "circles": [{"center": {"x": 100, "y": 100}, "radius": 60, "label": "O", "radiusLabel": "r = 5cm"}]}
    📏 ĐOẠN THẲNG: {"type": "line", "lines": [{"from": {"x": 20, "y": 100, "label": "A"}, "to": {"x": 180, "y": 100, "label": "B"}, "label": "6cm"}]}
    
    ⚠️ KIỂM TRA LẦN CUỐI: Đếm lại số câu hỏi trước khi trả về. Nếu không đúng ${count} câu, hãy điều chỉnh.
  `;
};

// Function to parse and repair common JSON errors from AI
const parseAndRepairJSON = (text: string): any => {
  // Step 1: Remove markdown code blocks
  let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  // Step 2: Find JSON object boundaries
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');

  if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) {
    throw new Error("Không tìm thấy JSON hợp lệ trong response của AI.");
  }

  cleaned = cleaned.substring(startIdx, endIdx + 1);

  // Step 3: Try to parse directly first
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("JSON parse failed, attempting repair...", e);
  }

  // Step 4: Attempt to repair common JSON issues
  let repaired = cleaned;

  // Fix trailing commas before ] or }
  repaired = repaired.replace(/,\s*([}\]])/g, '$1');

  // Fix missing commas between objects/arrays
  repaired = repaired.replace(/}\s*{/g, '},{');
  repaired = repaired.replace(/]\s*\[/g, '],[');
  repaired = repaired.replace(/"\s*{/g, '",{');
  repaired = repaired.replace(/}\s*"/g, '},"');
  repaired = repaired.replace(/]\s*"/g, '],"');
  repaired = repaired.replace(/"\s*\[/g, '",[');

  // Fix unquoted property names (simple cases)
  repaired = repaired.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');

  // Fix single quotes to double quotes (for strings)
  repaired = repaired.replace(/:\s*'([^']*)'/g, ': "$1"');

  // Remove any control characters
  repaired = repaired.replace(/[\x00-\x1F\x7F]/g, ' ');

  // Step 5: Try parsing repaired JSON
  try {
    return JSON.parse(repaired);
  } catch (e2) {
    console.error("JSON repair failed:", e2);
    console.error("Original text:", text.substring(0, 500));
    throw new Error("AI trả về JSON không hợp lệ. Vui lòng thử tạo đề lại.");
  }
};

// Generate quiz using Perplexity API
const generateWithPerplexity = async (
  promptText: string,
  apiKey: string
): Promise<any> => {
  const API_URL = 'https://api.perplexity.ai/chat/completions';
  const MODEL_NAME = 'sonar'; // or 'sonar-pro' for better quality

  const requestBody = {
    model: MODEL_NAME,
    messages: [
      {
        role: 'system',
        content: SYSTEM_INSTRUCTION
      },
      {
        role: 'user',
        content: promptText
      }
    ],
    temperature: 0.4,
    max_tokens: 8192 // Increased for larger quizzes
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey} `,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Perplexity API Error:", errorData);

    if (response.status === 401) {
      throw new Error("API Key không hợp lệ. Vui lòng kiểm tra lại Perplexity API Key của bạn.");
    }
    if (response.status === 429) {
      throw new Error("Đã vượt quá giới hạn request. Vui lòng đợi một chút rồi thử lại.");
    }

    throw new Error(`Lỗi Perplexity API(${response.status}): ${errorData.error?.message || response.statusText} `);
  }

  const data = await response.json();

  if (!data.choices || data.choices.length === 0) {
    throw new Error("AI không trả về kết quả nào.");
  }

  const text = data.choices[0].message.content;
  if (!text) throw new Error("AI trả về dữ liệu rỗng.");

  return parseAndRepairJSON(text);
};

// Generate quiz using Gemini API
const generateWithGemini = async (
  promptText: string,
  apiKey: string,
  file?: File | null,
  imageLibrary?: Array<{ id: string; name: string; data?: string; }>
): Promise<any> => {
  const MODEL_NAME = 'gemini-2.0-flash';
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

  const contents: any[] = [];
  const parts: any[] = [];

  if (file) {
    const base64Data = await fileToBase64(file);
    const isPDF = file.type === 'application/pdf';
    parts.push({
      text: `⛔⛔⛔ TÀI LIỆU ĐÍNH KÈM - ƯU TIÊN TUYỆT ĐỐI ⛔⛔⛔

📄 LOẠI FILE: ${isPDF ? 'PDF - Tài liệu văn bản' : 'HÌNH ẢNH - Ảnh chụp bài học'}
📁 TÊN FILE: ${file.name}

🔴🔴🔴 NHIỆM VỤ BẮT BUỘC - ƯU TIÊN CAO NHẤT 🔴🔴🔴

BƯỚC 1: ĐỌC VÀ TRÍCH XUẤT CÂU HỎI
- ĐỌC KỸ toàn bộ nội dung trong file
- TRÍCH XUẤT NGUYÊN VĂN tất cả câu hỏi/bài tập trong file
- GIỮ NGUYÊN 100% nội dung đề bài, các đáp án (nếu có)
- KHÔNG ĐƯỢC thay đổi, diễn đạt lại, hay sửa bất kỳ từ nào

📝 QUY TẮC ĐỊNH DẠNG VĂN BẢN:
⚠️ QUAN TRỌNG - GIỮ NGUYÊN ĐỊNH DẠNG:
- Nếu có từ GẠCH CHÂN trong câu hỏi → dùng thẻ <u>từ gạch chân</u>
- Nếu có từ IN ĐẬM → dùng thẻ <b>từ in đậm</b>
- Nếu có từ IN NGHIÊNG → dùng thẻ <i>từ in nghiêng</i>
- VÍ DỤ: "Từ <u>gạch chân</u> thuộc loại từ nào?"

📖 QUY TẮC VỚI ĐOẠN VĂN/THƠ/BÀI ĐỌC:
⚠️ RẤT QUAN TRỌNG - NẾU CÂU HỎI CÓ ĐOẠN THƠ, ĐOẠN VĂN, BÀI VĂN ĐI KÈM:
- PHẢI LẤY TOÀN BỘ đoạn thơ/văn/bài đọc vào trường "question"
- Format: "[Nội dung đoạn thơ/văn]\\n\\n[Câu hỏi về đoạn đó]"
- VÍ DỤ: Nếu có bài thơ rồi hỏi "Mẹ của bạn nhỏ làm nghề gì?" 
  → question phải chứa CẢ bài thơ VÀ câu hỏi
- GIỮ NGUYÊN VĂN đoạn thơ/văn, kể cả tên tác giả nếu có

⚠️ QUY TẮC LỌC CÂU HỎI:
- BỎ QUA các câu hỏi cần HÌNH ẢNH/BIỂU ĐỒ/SƠ ĐỒ để trả lời
- NHƯNG GIỮ LẠI các câu có ĐOẠN VĂN/THƠ/BÀI ĐỌC bằng chữ
- ƯU TIÊN các câu hỏi có thể hiểu và làm được chỉ bằng chữ

BƯỚC 2: TỰ ĐỘNG TẠO ĐÁP ÁN ĐÚNG
⚠️ ĐÂY LÀ YÊU CẦU QUAN TRỌNG NHẤT:
- Nếu file KHÔNG có đáp án: AI PHẢI TỰ GIẢI và đưa ra đáp án đúng
- Nếu file CÓ đáp án: Sử dụng đáp án trong file
- Với câu trắc nghiệm: Xác định đáp án đúng (A, B, C, D)
- Với câu điền số: Tính toán và đưa ra kết quả đúng
- Với câu Đúng/Sai: Xác định phát biểu nào Đúng, nào Sai
- Với câu nối: Xác định cặp nối đúng

BƯỚC 3: FORMAT JSON CHUẨN
- question: NGUYÊN VĂN từ file (bao gồm cả đoạn thơ/văn nếu có)
- options: NGUYÊN VĂN từ file (nếu có)
- correctAnswer: Đáp án đúng (AI tự xác định hoặc lấy từ file)

⚠️ LƯU Ý QUAN TRỌNG:
1. Câu hỏi phải COPY NGUYÊN VĂN từ file - KHÔNG được sửa đổi
2. Nếu có đoạn thơ/văn → PHẢI đưa vào question cùng câu hỏi
3. Đáp án AI phải TỰ XÁC ĐỊNH nếu file không có
4. BỎ QUA câu cần hình ảnh - GIỮ câu có đoạn văn/thơ bằng chữ
5. Chỉ bổ sung câu hỏi mới nếu file không đủ số lượng yêu cầu

⏬⏬⏬ TÀI LIỆU BẮT ĐẦU - ĐỌC VÀ TRÍCH XUẤT CÂU HỎI ⏬⏬⏬`
    });
    parts.push({
      inline_data: {
        mime_type: file.type,
        data: base64Data
      }
    });
    parts.push({
      text: `⏫⏫⏫ KẾT THÚC TÀI LIỆU ⏫⏫⏫

📋 NHẮC LẠI NHIỆM VỤ:
1. Lấy NGUYÊN VĂN câu hỏi từ file (kèm đoạn thơ/văn nếu có)
2. TỰ XÁC ĐỊNH đáp án đúng cho mỗi câu hỏi
3. Format theo JSON schema đã định nghĩa`
    });
  }

  // Handle Image Library
  if (imageLibrary && imageLibrary.length > 0) {
    parts.push({ text: "THƯ VIỆN HÌNH ẢNH (Image Library):" });
    for (const img of imageLibrary) {
      if (img.data && img.data.startsWith('http')) {
        try {
          const { data, mimeType } = await urlToBase64(img.data);
          parts.push({ text: `Image ID: ${img.id} (Name: ${img.name})` });
          parts.push({
            inline_data: {
              mime_type: mimeType,
              data: data
            }
          });
        } catch (err) {
          console.error(`Failed to fetch image ${img.id}:`, err);
          parts.push({ text: `[Failed to load image ID: ${img.id}]` });
        }
      }
    }
  }

  parts.push({ text: promptText });
  contents.push({ parts: parts });

  const requestBody = {
    contents: contents,
    system_instruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }]
    },
    tools: [
      {
        google_search_retrieval: {
          dynamic_retrieval_config: {
            mode: "MODE_DYNAMIC",
            dynamic_threshold: 0.6
          }
        }
      }
    ],
    generation_config: {
      temperature: 0.4,
      response_mime_type: "application/json"
    }
  };

  const maxRetries = 5;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Handle 429 (Too Many Requests) or 503 (Service Unavailable)
        if (response.status === 429 || response.status === 503) {
          attempt++;
          if (attempt >= maxRetries) {
            throw new Error("Hệ thống đang quá tải (429). Bạn đang dùng gói miễn phí của Google, hãy đợi 1-2 phút rồi thử lại nhé!");
          }
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`Rate limited. Đang chờ ${delay / 1000}s trước khi thử lại (lần ${attempt}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        console.error("Gemini API Error:", errorData);

        let errorMessage = `Lỗi API (${response.status}): ${response.statusText}`;
        if (errorData.error) {
          errorMessage = `Lỗi từ Google: ${errorData.error.message}`;

          if (errorData.error.code === 404 || errorData.error.status === 'NOT_FOUND') {
            try {
              const listModelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
              const listResponse = await fetch(listModelsUrl);
              const listData = await listResponse.json();

              if (listData.models) {
                const availableModels = listData.models.map((m: any) => m.name.replace('models/', '')).join(', ');
                errorMessage = `Không tìm thấy model '${MODEL_NAME}'. Key của bạn chỉ hỗ trợ các model: ${availableModels}`;
              } else {
                errorMessage = "Không tìm thấy model và không thể lấy danh sách model. Vui lòng kiểm tra lại API Key.";
              }
            } catch (e) {
              errorMessage = "Không tìm thấy model. Vui lòng kiểm tra lại API Key.";
            }
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error("AI không trả về kết quả nào.");
      }

      const text = data.candidates[0].content.parts[0].text;
      if (!text) throw new Error("AI trả về dữ liệu rỗng.");

      // Format multiplication signs: Replace ALL * with x in math contexts
      // Format division signs: Replace / with : ONLY if surrounded by spaces (e.g., 5 / 3 -> 5 : 3). Keep fractions (1/2) as is.
      const formattedText = text
        // Replace * when surrounded by spaces: " * " -> " x "
        .replace(/\s\*\s/g, ' x ')
        // Replace * after parenthesis: ") * " -> ") x "
        .replace(/\)\s*\*\s*/g, ') x ')
        // Replace * before parenthesis: " * (" -> " x ("
        .replace(/\s*\*\s*\(/g, ' x (')
        // Replace * between alphanumeric: "a * b", "5 * 3" -> "a x b", "5 x 3"
        .replace(/([a-zA-Z0-9?])\s*\*\s*([a-zA-Z0-9?(])/g, '$1 x $2')
        // Division with spaces
        .replace(/([a-zA-Z0-9?]+)\s+\/\s+([a-zA-Z0-9?]+)/g, '$1 : $2');

      return parseAndRepairJSON(formattedText);

    } catch (error: any) {
      if (attempt >= maxRetries || !error.message.includes("429")) {
        console.error("Generate Quiz Error:", error);
        throw error;
      }
    }
  }
};

// Generate quiz using OpenAI API (or compatible LLM-Mux)
const generateWithOpenAI = async (
  promptText: string,
  apiKey: string,
  file?: File | null,
  imageLibrary?: Array<{ id: string; name: string; data?: string; }>,
  baseUrl: string = 'https://api.openai.com/v1'
): Promise<any> => {
  const API_URL = `${baseUrl}/chat/completions`;
  // If using LLM-Mux, default to a model that is likely to exist for Google login
  // The user can override this via env var if they want, but for now let's pick a safe default
  const isLlmMux = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
  const MODEL_NAME = isLlmMux ? 'gemini-2.5-flash' : 'gpt-4o';

  const messages: any[] = [
    {
      role: 'system',
      content: SYSTEM_INSTRUCTION
    }
  ];

  const userContent: any[] = [{ type: 'text', text: promptText }];

  // Handle Attached File (if image) - PRIORITIZE for quiz generation
  if (file && file.type.startsWith('image/')) {
    const base64Data = await fileToBase64(file);
    userContent.unshift({
      type: 'text',
      text: `⚠️ TÀI LIỆU ĐÍNH KÈM (Attached File) - ƯU TIÊN CAO NHẤT:
Đây là tài liệu bài học/nội dung do giáo viên tải lên.

🔴 YÊU CẦU BẮT BUỘC:
1. ĐỌC KỸ VÀ HIỂU nội dung trong tài liệu này.
2. TẠO CÂU HỎI DỰA TRÊN NỘI DUNG TRONG TÀI LIỆU NÀY LÀ CHÍNH.
3. Tất cả câu hỏi phải liên quan trực tiếp đến kiến thức trong tài liệu.
4. Không tự bịa nội dung ngoài tài liệu trừ khi cần bổ sung.
5. Nếu là ảnh chụp bài học, hãy đọc văn bản trong ảnh và tạo câu hỏi từ đó.

Tài liệu đính kèm:`
    });
    userContent.splice(1, 0, {
      type: 'image_url',
      image_url: {
        url: `data:${file.type};base64,${base64Data}`
      }
    });
  }

  // Handle Image Library
  if (imageLibrary && imageLibrary.length > 0) {
    userContent.push({ type: 'text', text: "\n\nTHƯ VIỆN HÌNH ẢNH (Image Library):" });
    for (const img of imageLibrary) {
      if (img.data && img.data.startsWith('http')) {
        // OpenAI can take URLs directly, which is faster and cheaper than base64
        userContent.push({ type: 'text', text: `\nImage ID: ${img.id} (Name: ${img.name})` });
        userContent.push({
          type: 'image_url',
          image_url: {
            url: img.data
          }
        });
      }
    }
  }

  messages.push({
    role: 'user',
    content: userContent
  });

  const requestBody = {
    model: MODEL_NAME,
    messages: messages,
    temperature: 0.4,
    response_format: { type: "json_object" }
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("OpenAI API Error:", errorData);

    if (response.status === 429) {
      throw new Error("Hết tiền trong tài khoản OpenAI (Quota Exceeded). Vui lòng nạp thêm tiền hoặc chuyển sang dùng Google Gemini (Miễn phí).");
    }

    throw new Error(`Lỗi OpenAI API (${response.status}): ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const text = data.choices[0].message.content;

  // Format multiplication signs: Replace ALL * with x in math contexts
  // Format division signs: Replace / with : ONLY if surrounded by spaces
  const formattedText = text
    // Replace * when surrounded by spaces: " * " -> " x "
    .replace(/\s\*\s/g, ' x ')
    // Replace * after parenthesis: ") * " -> ") x "
    .replace(/\)\s*\*\s*/g, ') x ')
    // Replace * before parenthesis: " * (" -> " x ("
    .replace(/\s*\*\s*\(/g, ' x (')
    // Replace * between alphanumeric: "a * b", "5 * 3" -> "a x b", "5 x 3"
    .replace(/([a-zA-Z0-9?])\s*\*\s*([a-zA-Z0-9?(])/g, '$1 x $2')
    // Division with spaces
    .replace(/([a-zA-Z0-9?]+)\s+\/\s+([a-zA-Z0-9?]+)/g, '$1 : $2');

  return parseAndRepairJSON(formattedText);
};

// Main export function
export const generateQuiz = async (
  topic: string,
  classLevel: string,
  content: string,
  file?: File | null,
  options?: QuizGenerationOptions,
  customApiKey?: string,
  provider: AIProvider = 'perplexity' // Default to Perplexity
): Promise<any> => {
  // Determine API Key based on provider
  let envKey = '';
  if (provider === 'perplexity') {
    envKey = (import.meta as any).env.VITE_PERPLEXITY_API_KEY || '';
  } else if (provider === 'openai') {
    envKey = (import.meta as any).env.VITE_OPENAI_API_KEY || '';
  } else if (provider === 'llm-mux') {
    envKey = (import.meta as any).env.VITE_LLM_MUX_API_KEY || 'sk-dummy-key'; // LLM-Mux might not need a real key, but usually requires something
  } else {
    envKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.VITE_API_KEY || '';
  }

  const apiKey = (customApiKey || envKey || '').trim();
  if (!apiKey && provider !== 'llm-mux') throw new Error(`Vui lòng nhập API Key cho ${provider.toUpperCase()} trong phần Cấu hình.`);

  const promptText = buildPrompt(topic, classLevel, content, options);

  if (provider === 'perplexity') {
    return generateWithPerplexity(promptText, apiKey);
  } else if (provider === 'openai') {
    return generateWithOpenAI(promptText, apiKey, file, options?.imageLibrary);
  } else if (provider === 'llm-mux') {
    const baseUrl = (import.meta as any).env.VITE_LLM_MUX_BASE_URL || 'http://localhost:8317/v1';
    return generateWithOpenAI(promptText, apiKey, file, options?.imageLibrary, baseUrl);
  } else {
    return generateWithGemini(promptText, apiKey, file, options?.imageLibrary);
  }
};

// =====================================================
// FUNCTION: Extract Text from PDF (OCR Mode)
// Returns raw text instead of JSON for editing purposes
// Supports: Gemini (direct) and LLM-Mux (OpenAI-compatible)
// =====================================================
export const extractTextFromPdf = async (
  file: File,
  provider: AIProvider = 'gemini',
  customApiKey?: string
): Promise<string> => {
  console.log('extractTextFromPdf called with provider:', provider);

  // ========== NATIVE OCR (Tesseract local at localhost:8000) ==========
  if (provider === 'native-ocr') {
    const OCR_URL = 'http://localhost:8000/extract';

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(OCR_URL, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Lỗi OCR Backend (${response.status}): ${errorData.detail || response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error('OCR Backend trả về lỗi');
      }

      console.log(`Extracted ${data.text.length} chars using ${data.method} method from ${data.pages} pages`);
      return data.text;

    } catch (err: any) {
      console.error('Native OCR Error:', err);
      if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
        throw new Error('Không thể kết nối đến OCR Backend (localhost:8000). Vui lòng đảm bảo bạn đã chạy "uvicorn main:app" trong folder ocr-backend.');
      }
      throw err;
    }
  }

  // Only Gemini and LLM-Mux support file upload for AI-based OCR
  if (provider !== 'gemini' && provider !== 'llm-mux') {
    throw new Error('Chức năng trích xuất văn bản từ PDF chỉ hỗ trợ với Gemini, LLM-Mux hoặc Native OCR. Vui lòng chọn một trong các provider này.');
  }

  console.log('Converting file to base64...');
  const base64Data = await fileToBase64(file);
  console.log('Base64 conversion complete. Length:', base64Data.length);
  const isPDF = file.type === 'application/pdf';

  const ocrPrompt = `🔍 CHẾ ĐỘ TRÍCH XUẤT VĂN BẢN (OCR) - KHÔNG TRẢ VỀ JSON

📄 LOẠI FILE: ${isPDF ? 'PDF - Tài liệu văn bản' : 'HÌNH ẢNH - Ảnh chụp đề thi'}
📁 TÊN FILE: ${file.name}

🎯 NHIỆM VỤ: Trích xuất TOÀN BỘ văn bản từ file này.

📝 QUY TẮC BẮT BUỘC:
1. ĐỌC và TRÍCH XUẤT nguyên văn tất cả nội dung trong file
2. SỬA LỖI OCR phổ biến:
   - "l" bị nhận thành "1" → sửa lại thành "l"
   - "O" bị nhận thành "0" → sửa lại thành "O"
   - Dấu tiếng Việt bị sai → sửa lại đúng
   - Từ bị thiếu dấu → bổ sung dấu
3. GIỮ NGUYÊN cấu trúc:
   - Số thứ tự câu hỏi (Câu 1, Câu 2...)
   - Đánh dấu đáp án (A, B, C, D)
   - Đoạn văn, bài thơ nếu có
4. Format OUTPUT:
   - Mỗi câu hỏi cách nhau 1 dòng trống
   - Đáp án thụt lề rõ ràng
   - Nếu có hình ảnh ghi: [Hình: mô tả ngắn]

⚠️ CHỈ TRẢ VỀ VĂN BẢN THUẦN TÚY - KHÔNG JSON, KHÔNG MARKDOWN CODE BLOCK

Hãy trích xuất TOÀN BỘ văn bản từ file, đã sửa lỗi OCR.`;

  const systemPrompt = `Bạn là trợ lý OCR chuyên nghiệp. Nhiệm vụ của bạn là đọc file PDF/ảnh và trích xuất văn bản một cách chính xác nhất.

QUY TẮC QUAN TRỌNG:
- Trả về VĂN BẢN THUẦN TÚY, không phải JSON
- Sửa lỗi OCR nhưng KHÔNG thay đổi nội dung
- Giữ nguyên cấu trúc đề thi: số thứ tự câu, đáp án A/B/C/D
- Nếu có đoạn văn/thơ, giữ nguyên format với xuống dòng`;

  // ========== LLM-MUX (OpenAI-compatible API) ==========
  if (provider === 'llm-mux') {
    const baseUrl = (import.meta as any).env.VITE_LLM_MUX_BASE_URL || 'http://localhost:8317/v1';
    const envKey = (import.meta as any).env.VITE_LLM_MUX_API_KEY || 'sk-dummy-key';
    const apiKey = (customApiKey || envKey || '').trim();

    const API_URL = `${baseUrl}/chat/completions`;
    const MODEL_NAME = 'gemini-2.0-flash'; // LLM-Mux will route to appropriate model

    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    const userContent: any[] = [{ type: 'text', text: ocrPrompt }];

    if (isPDF) {
      // For PDF with LLM-Mux, use 'input_file' type which is supported by its parser
      userContent.push({
        type: 'input_file',
        file_data: `data:${file.type};base64,${base64Data}`,
        filename: file.name
      });
    } else {
      // For Images, use standard image_url
      userContent.push({
        type: 'image_url',
        image_url: {
          url: `data:${file.type};base64,${base64Data}`
        }
      });
    }

    messages.push({
      role: 'user',
      content: userContent
    });

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        mode: 'cors', // Explicitly enable CORS
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: messages,
          temperature: 0.2,
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("LLM-Mux API Error Details:", errorData);
        throw new Error(`Lỗi LLM-Mux API (${response.status}): ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error("AI trả về dữ liệu rỗng.");

      return text.trim();
    } catch (err: any) {
      console.error("LLM-Mux Fetch Error:", err);
      if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
        throw new Error('Không thể kết nối đến LLM-Mux (localhost:8317). Vui lòng đảm bảo bạn đã chạy "llm-mux" trong terminal.');
      }
      throw err;
    }


  }

  // ========== GEMINI (Direct API) ==========
  const envKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.VITE_API_KEY || '';
  const apiKey = (customApiKey || envKey || '').trim();
  if (!apiKey) throw new Error('Vui lòng nhập Gemini API Key trong phần Cấu hình.');

  const MODEL_NAME = 'gemini-2.0-flash';
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

  const parts: any[] = [
    { text: ocrPrompt },
    {
      inline_data: {
        mime_type: file.type,
        data: base64Data
      }
    }
  ];

  const requestBody = {
    contents: [{ parts }],
    system_instruction: {
      parts: [{ text: systemPrompt }]
    },
    generation_config: {
      temperature: 0.2,
    }
  };

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 429 || response.status === 503) {
          attempt++;
          if (attempt >= maxRetries) {
            throw new Error("Hệ thống đang quá tải. Vui lòng đợi 1-2 phút rồi thử lại.");
          }
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw new Error(`Lỗi API (${response.status}): ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error("AI không trả về kết quả nào.");
      }

      const text = data.candidates[0].content.parts[0].text;
      if (!text) throw new Error("AI trả về dữ liệu rỗng.");

      return text.trim();

    } catch (error: any) {
      if (attempt >= maxRetries) {
        console.error("Extract Text Error:", error);
        throw error;
      }
      attempt++;
    }
  }

  throw new Error("Không thể trích xuất văn bản sau nhiều lần thử.");
};

async function urlToBase64(url: string): Promise<{ data: string; mimeType: string }> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

    const blob = await response.blob();
    const mimeType = blob.type || 'image/jpeg'; // Default fallback

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        resolve({ data: base64Data, mimeType });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("urlToBase64 error:", error);
    throw error;
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}