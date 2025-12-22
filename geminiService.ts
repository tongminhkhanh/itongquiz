import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "./constants";
import { QuestionType } from "./types";

export interface QuizGenerationOptions {
  title: string;
  questionCount: number;
  questionTypes: QuestionType[];
}

export const generateQuiz = async (
  topic: string,
  classLevel: string,
  content: string,
  file?: File | null,
  options?: QuizGenerationOptions,
  customApiKey?: string
): Promise<any> => {
  const apiKey = customApiKey || process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });
  console.log("Using API Key:", apiKey?.substring(0, 8) + "...");

  // Defaults if options not provided
  const title = options?.title || `Kiểm tra: ${topic}`;
  const count = options?.questionCount || 10;
  const types = options?.questionTypes?.join(', ') || "MCQ, TRUE_FALSE, SHORT_ANSWER";

  // Construct Prompt
  let promptText = `
    Tạo đề kiểm tra cho học sinh Lớp ${classLevel}.
    
    THÔNG TIN CẤU HÌNH:
    - Tiêu đề bài kiểm tra: "${title}"
    - Chủ đề: "${topic}"
    - Tổng số lượng câu hỏi cần tạo: ${count} câu.
    - Các dạng câu hỏi bắt buộc phải có: ${types}.
    
    NỘI DUNG THAM KHẢO:
    ${content ? `"${content}"` : "Không có nội dung cụ thể. Hãy tự động sinh câu hỏi dựa trên kiến thức chuẩn của sách giáo khoa Tiểu học Việt Nam phù hợp với Chủ đề và Lớp học đã nêu trên."}

    YÊU CẦU:
    - Phân bổ số lượng câu hỏi hợp lý cho các dạng đã chọn.
    - Ngôn ngữ phù hợp, dễ hiểu.
    - Đảm bảo đầu ra đúng định dạng JSON đã quy định trong System Instruction.
  `;

  // Model Selection
  // Text tasks: 'gemini-3-flash-preview'
  // Image/PDF tasks: 'gemini-2.5-flash-image' (Assuming multimodal support for files in this context)
  const modelName = file ? 'gemini-2.5-flash-image' : 'gemini-3-flash-preview';

  // Config Configuration
  const config: any = {
    temperature: 0.4,
  };

  // Prepare Parts
  let parts: any[] = [];

  if (file) {
    const base64Data = await fileToGenerativePart(file);
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: file.type,
      },
    });

    // For gemini-2.5-flash-image, we inject system instruction into the prompt 
    const fullPrompt = `${SYSTEM_INSTRUCTION}\n\n${promptText}\n\nQUAN TRỌNG: Trả về kết quả CHỈ LÀ JSON thuần (no markdown formatting) theo cấu trúc đã mô tả.`;
    parts.push({ text: fullPrompt });

  } else {
    // For gemini-3-flash-preview, we can use systemInstruction config and JSON mode.
    parts.push({ text: promptText });
    config.systemInstruction = SYSTEM_INSTRUCTION;
    config.responseMimeType = "application/json";
  }

  // Retry logic for 429 errors
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts: parts }],
        config: config
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");

      // Clean up if markdown code blocks are returned
      const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();

      return JSON.parse(cleanedText);

    } catch (error: any) {
      console.error(`Attempt ${attempt + 1} failed:`, error);

      // Check for 429 or 503 errors
      if (error.message?.includes('429') || error.message?.includes('503') || error.status === 429 || error.status === 503) {
        attempt++;
        if (attempt >= maxRetries) {
          throw new Error("Hệ thống đang quá tải (429). Bạn đang dùng gói miễn phí của Google, hãy đợi 1-2 phút rồi thử lại nhé!");
        }
        // Wait before retrying (exponential backoff: 2s, 4s, 8s)
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Other errors, throw immediately
        throw error;
      }
    }
  }
};

async function fileToGenerativePart(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64," or "data:application/pdf;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}