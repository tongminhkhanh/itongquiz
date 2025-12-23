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
}

// Build the prompt for quiz generation
const buildPrompt = (topic: string, classLevel: string, content: string, options?: QuizGenerationOptions): string => {
  const title = options?.title || `Kiểm tra: ${topic}`;
  const count = options?.questionCount || 10;
  const types = options?.questionTypes || [];
  const levels = options?.difficultyLevels;

  // Map question types to Vietnamese descriptions for better AI understanding
  const typeDescriptions: Record<string, string> = {
    'MCQ': 'MCQ (Trắc nghiệm chọn 1 đáp án đúng trong 4 lựa chọn A, B, C, D)',
    'TRUE_FALSE': 'TRUE_FALSE (Cho một câu hỏi chính và nhiều phát biểu, học sinh chọn Đúng hoặc Sai cho mỗi phát biểu)',
    'SHORT_ANSWER': 'SHORT_ANSWER (Điền đáp án ngắn, thường là 1-4 ký tự hoặc số)',
    'MATCHING': 'MATCHING (Nối các ý ở cột A với cột B sao cho phù hợp, có 3-4 cặp)',
    'MULTIPLE_SELECT': 'MULTIPLE_SELECT (Chọn TẤT CẢ các đáp án đúng, có thể 2-3 đáp án đúng trong 4 lựa chọn, correctAnswers là mảng như ["A", "C"])'
  };

  const typesDescription = types.map(t => typeDescriptions[t] || t).join('\n    - ');
  const typesList = types.join(', ');
  const images = options?.imageLibrary || [];

  // Build difficulty level instructions
  let difficultyInstructions = '';
  if (levels) {
    difficultyInstructions = `
    PHAN BO CAU HOI THEO MUC DO (CHI LA HUONG DAN CHO AI, KHONG GHI VAO DE):
    - Muc 1 (Nhan biet): ${levels.level1} cau - De, quen thuoc
    - Muc 2 (Thong hieu): ${levels.level2} cau - Trung binh
    - Muc 3 (Van dung cao): ${levels.level3} cau - Kho, thuc tien
    
    TONG CONG: ${levels.level1 + levels.level2 + levels.level3} cau
    
    LUU Y QUAN TRONG: KHONG duoc ghi "Muc 1", "Muc 2", "Muc 3", "Nhan biet", "Thong hieu", "Van dung" hay bat ky nhan muc do nao vao trong cau hoi. Chi tao cau hoi binh thuong.`;
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

  return `
    Tao de kiem tra cho hoc sinh Lop ${classLevel}.
    
    THONG TIN CAU HINH:
    - Tieu de bai kiem tra: "${title}"
    - Chu de: "${topic}"
    - Tong so luong cau hoi can tao: CHINH XAC ${count} cau.
    ${difficultyInstructions}
    ${imageInstructions}
    
    ⚠️ CHỈ ĐƯỢC PHÉP SỬ DỤNG CÁC DẠNG CÂU HỎI SAU (KHÔNG ĐƯỢC DÙNG DẠNG KHÁC):
    - ${typesDescription}
    
    NỘI DUNG THAM KHẢO:
    ${content ? `"${content}"` : "Không có nội dung cụ thể. Hãy tự động sinh câu hỏi dựa trên kiến thức chuẩn của sách giáo khoa Tiểu học Việt Nam phù hợp với Chủ đề và Lớp học đã nêu trên."}

    ⛔ QUY TẮC BẮT BUỘC:
    1. CHỈ tạo câu hỏi thuộc dạng: ${typesList}. TUYỆT ĐỐI KHÔNG tạo dạng câu hỏi nào khác.
    2. Phân bổ đều ${count} câu cho các dạng đã chọn.
    3. Nếu chỉ chọn 1 dạng (ví dụ: MULTIPLE_SELECT), thì TẤT CẢ ${count} câu đều phải là dạng đó.
    4. Với MULTIPLE_SELECT: correctAnswers phải là mảng có ít nhất 2 đáp án đúng, ví dụ: ["A", "C"] hoặc ["B", "C", "D"].
    5. Ngôn ngữ: Tiếng Việt, phù hợp với học sinh tiểu học.
    6. Đảm bảo đầu ra đúng định dạng JSON.
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
    parts.push({ text: "Tài liệu đính kèm (Attached File):" });
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

      return parseAndRepairJSON(text);

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

  // Handle Attached File (if image)
  if (file && file.type.startsWith('image/')) {
    const base64Data = await fileToBase64(file);
    userContent.push({
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
  return parseAndRepairJSON(text);
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