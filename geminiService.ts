import { SYSTEM_INSTRUCTION } from "./constants";
import { QuestionType } from "./types";

export type AIProvider = 'gemini' | 'perplexity';

export interface QuizGenerationOptions {
  title: string;
  questionCount: number;
  questionTypes: QuestionType[];
}

// Build the prompt for quiz generation
const buildPrompt = (topic: string, classLevel: string, content: string, options?: QuizGenerationOptions): string => {
  const title = options?.title || `Kiểm tra: ${topic}`;
  const count = options?.questionCount || 10;
  const types = options?.questionTypes || [];

  // Map question types to Vietnamese descriptions for better AI understanding
  const typeDescriptions: Record<string, string> = {
    'MCQ': 'MCQ (Trắc nghiệm 1 đáp án đúng)',
    'TRUE_FALSE': 'TRUE_FALSE (Đúng/Sai với nhiều phát biểu)',
    'SHORT_ANSWER': 'SHORT_ANSWER (Điền đáp án ngắn)',
    'MATCHING': 'MATCHING (Nối cột A với cột B)',
    'MULTIPLE_SELECT': 'MULTIPLE_SELECT (Chọn NHIỀU đáp án đúng - correctAnswers là mảng)'
  };

  const typesDescription = types.map(t => typeDescriptions[t] || t).join(', ');

  return `
    Tạo đề kiểm tra cho học sinh Lớp ${classLevel}.
    
    THÔNG TIN CẤU HÌNH:
    - Tiêu đề bài kiểm tra: "${title}"
    - Chủ đề: "${topic}"
    - Tổng số lượng câu hỏi cần tạo: ${count} câu.
    - Các dạng câu hỏi BẮT BUỘC phải có: ${typesDescription}.
    
    NỘI DUNG THAM KHẢO:
    ${content ? `"${content}"` : "Không có nội dung cụ thể. Hãy tự động sinh câu hỏi dựa trên kiến thức chuẩn của sách giáo khoa Tiểu học Việt Nam phù hợp với Chủ đề và Lớp học đã nêu trên."}

    YÊU CẦU QUAN TRỌNG:
    - Phân bổ số lượng câu hỏi hợp lý cho TẤT CẢ các dạng đã yêu cầu.
    - Nếu có MULTIPLE_SELECT: tạo câu hỏi có nhiều đáp án đúng (correctAnswers là mảng như ["A", "C"]).
    - Nếu có MATCHING: tạo 3-4 cặp nối.
    - Ngôn ngữ phù hợp, dễ hiểu cho học sinh tiểu học.
    - Đảm bảo đầu ra đúng định dạng JSON.
  `;
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
    max_tokens: 4096
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

  // Clean up markdown if present
  const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleanedText);
};

// Generate quiz using Gemini API
const generateWithGemini = async (
  promptText: string,
  apiKey: string,
  file?: File | null
): Promise<any> => {
  const MODEL_NAME = 'gemini-2.0-flash';
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

  const contents: any[] = [];
  const parts: any[] = [];

  if (file) {
    const base64Data = await fileToBase64(file);
    parts.push({
      inline_data: {
        mime_type: file.type,
        data: base64Data
      }
    });
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

      // Clean up markdown if present
      const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanedText);

    } catch (error: any) {
      if (attempt >= maxRetries || !error.message.includes("429")) {
        console.error("Generate Quiz Error:", error);
        throw error;
      }
    }
  }
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
  const apiKey = (customApiKey || (import.meta as any).env.VITE_API_KEY || process.env.API_KEY || '').trim();
  if (!apiKey) throw new Error("Vui lòng nhập API Key trong phần Cấu hình.");

  const promptText = buildPrompt(topic, classLevel, content, options);

  if (provider === 'perplexity') {
    return generateWithPerplexity(promptText, apiKey);
  } else {
    return generateWithGemini(promptText, apiKey, file);
  }
};

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