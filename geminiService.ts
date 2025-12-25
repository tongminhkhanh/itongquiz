import { SYSTEM_INSTRUCTION } from "./constants";
import { QuestionType } from "./types";

export type AIProvider = 'gemini' | 'perplexity' | 'openai' | 'llm-mux';

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
    'DRAG_DROP': 'DRAG_DROP (Điền từ vào chỗ trống. Text chứa các từ cần điền trong ngoặc vuông, ví dụ: "Con mèo [trèo] cây cau". Blanks là mảng các từ trong ngoặc ["trèo"]. Distractors là mảng các từ gây nhiễu ["bơi", "bay"])'
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
    
    NỘI DUNG THAM KHẢO:
    ${content ? `"${content}"` : "Không có nội dung cụ thể. Hãy tự động sinh câu hỏi dựa trên kiến thức chuẩn của sách giáo khoa Tiểu học Việt Nam phù hợp với Chủ đề và Lớp học đã nêu trên."}

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
      'Authorization': `Bearer ${apiKey}`,
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

    throw new Error(`Lỗi Perplexity API (${response.status}): ${errorData.error?.message || response.statusText}`);
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
    parts.push({
      text: `⚠️ TÀI LIỆU ĐÍNH KÈM (Attached File) - ƯU TIÊN CAO NHẤT:
Đây là tài liệu bài học/nội dung do giáo viên tải lên.

🔴 YÊU CẦU BẮT BUỘC:
1. ĐỌC KỸ VÀ HIỂU nội dung trong tài liệu này.
2. TẠO CÂU HỎI DỰA TRÊN NỘI DUNG TRONG TÀI LIỆU NÀY LÀ CHÍNH.
3. Tất cả câu hỏi phải liên quan trực tiếp đến kiến thức trong tài liệu.
4. Không tự bịa nội dung ngoài tài liệu trừ khi cần bổ sung.
5. Nếu là ảnh chụp bài học, hãy đọc văn bản trong ảnh và tạo câu hỏi từ đó.
6. Nếu là PDF, hãy phân tích và trích xuất nội dung để tạo câu hỏi.

Tài liệu đính kèm:` });
    parts.push({
      inline_data: {
        mime_type: file.type,
        data: base64Data
      }
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