const fs = require('fs');
const filePath = 'c:/itongquiz1/itongquiz1/src/services/geminiService.ts';

let content = fs.readFileSync(filePath, 'utf8');

const startIndex = content.indexOf('// Generate quiz using Gemini API');
const endIndexStr = '// Generate quiz using OpenAI API';
const endIndex = content.indexOf(endIndexStr);

if (startIndex === -1 || endIndex === -1) {
    console.error('Could not find boundaries');
    process.exit(1);
}

const replacement = `// Generate quiz using Gemini API (Tương thích qua AI Proxy)
const generateWithGemini = async (
  promptText: string,
  apiKey: string,
  file?: File | null,
  imageLibrary?: Array<{ id: string; name: string; data?: string; }>
): Promise<any> => {
  const MODEL_NAME = 'gemini-2.0-flash';
  const VITE_LOCALHOST_AI_URL = (import.meta as any).env.VITE_LOCALHOST_AI_URL || 'http://localhost:3000/v1';
  const API_URL = \`\${VITE_LOCALHOST_AI_URL}/chat/completions\`;

  const messages: any[] = [
    {
      role: 'system',
      content: SYSTEM_INSTRUCTION
    }
  ];

  const userContent: any[] = [{ type: 'text', text: promptText }];

  if (file) {
    const base64Data = await fileToBase64(file);
    const isPDF = file.type === 'application/pdf';
    
    userContent.unshift({
      type: 'text',
      text: \`⛔⛔⛔ TÀI LIỆU ĐÍNH KÈM - ƯU TIÊN TUYỆT ĐỐI ⛔⛔⛔\\n\\n📄 LOẠI FILE: \${isPDF ? 'PDF - Tài liệu văn bản' : 'HÌNH ẢNH - Ảnh chụp bài học'}\\n📁 TÊN FILE: \${file.name}\\n\\n🔴🔴🔴 NHIỆM VỤ BẮT BUỘC - ƯU TIÊN CAO NHẤT 🔴🔴🔴\\n\\nBƯỚC 1: XỬ LÝ NỘI DUNG FILE\\n- ĐỌC KỸ toàn bộ nội dung trong file\\n- NẾU LÀ ĐỀ THI CÓ SẴN: Trích xuất nguyên văn câu hỏi.\\n- NẾU LÀ TÀI LIỆU HỌC TẬP (Truyện, văn, lý thuyết): Tự tạo câu hỏi trắc nghiệm dựa trên nội dung đó.\\n- ĐƯỢC PHÉP điều chỉnh, bổ sung để câu hỏi rõ ràng, chính xác hơn.\\n\\n📝 QUY TẮC ĐỊNH DẠNG VĂN BẢN:\\n⚠️ QUAN TRỌNG - GIỮ NGUYÊN ĐỊNH DẠNG:\\n- Nếu có từ GẠCH CHÂN trong câu hỏi → dùng thẻ <u>từ gạch chân</u>\\n- Nếu có từ QUAN TRỌNG, TỪ KHOÁ (VD: "Không đúng", "Sai", "Đồng nghĩa") → dùng thẻ <b>từ in đậm</b>\\n- Nếu có TÊN RIÊNG, TRÍCH DẪN, TỪ ĐƯỢC NHẮC ĐẾN → dùng thẻ <q>từ trích dẫn</q> (sẽ hiển thị ngoặc kép cong)\\n- VÍ DỤ: "Tìm từ <b>trái nghĩa</b> với từ <q>thông minh</q>"\\n\\n📖 QUY TẮC VỚI ĐOẠN VĂN/THƠ/BÀI ĐỌC:\\n⚠️ RẤT QUAN TRỌNG - NẾU CÂU HỎI CÓ ĐOẠN THƠ, ĐOẠN VĂN, BÀI VĂN ĐI KÈM:\\n- PHẢI LẤY TOÀN BỘ đoạn thơ/văn/bài đọc vào trường "question"\\n- Format: "[Nội dung đoạn thơ/văn]\\\\n\\\\n[Câu hỏi về đoạn đó]"\\n- VÍ DỤ: Nếu có bài thơ rồi hỏi "Mẹ của bạn nhỏ làm nghề gì?" \\n  → question phải chứa CẢ bài thơ VÀ câu hỏi\\n- GIỮ NGUYÊN VĂN đoạn thơ/văn, kể cả tên tác giả nếu có\\n\\n⚠️ QUY TẮC LỌC CÂU HỎI:\\n- BỎ QUA các câu hỏi cần HÌNH ẢNH/BIỂU ĐỒ/SƠ ĐỒ để trả lời\\n- NHƯNG GIỮ LẠI các câu có ĐOẠN VĂN/THƠ/BÀI ĐỌC bằng chữ\\n- ƯU TIÊN các câu hỏi có thể hiểu và làm được chỉ bằng chữ\\n\\nBƯỚC 2: TỰ ĐỘNG TẠO ĐÁP ÁN ĐÚNG\\n⚠️ ĐÂY LÀ YÊU CẦU QUAN TRỌNG NHẤT:\\n- Nếu file KHÔNG có đáp án: AI PHẢI TỰ GIẢI và đưa ra đáp án đúng\\n- Nếu file CÓ đáp án: Sử dụng đáp án trong file\\n- Với câu trắc nghiệm: Xác định đáp án đúng (A, B, C, D)\\n- Với câu điền số: Tính toán và đưa ra kết quả đúng\\n- Với câu Đúng/Sai: Xác định phát biểu nào Đúng, nào Sai\\n- Với câu nối: Xác định cặp nối đúng\\n\\nBƯỚC 3: FORMAT JSON CHUẨN\\n- question: NGUYÊN VĂN từ file (bao gồm cả đoạn thơ/văn nếu có)\\n- options: NGUYÊN VĂN từ file (nếu có)\\n- correctAnswer: Đáp án đúng (AI tự xác định hoặc lấy từ file)\\n\\n⚠️ LƯU Ý QUAN TRỌNG:\\n1. Câu hỏi phải COPY NGUYÊN VĂN từ file - KHÔNG được sửa đổi\\n2. Nếu có đoạn thơ/văn → PHẢI đưa vào question cùng câu hỏi\\n3. Đáp án AI phải TỰ XÁC ĐỊNH nếu file không có\\n4. BỎ QUA câu cần hình ảnh - GIỮ câu có đoạn văn/thơ bằng chữ\\n5. NẾU file không phải đề thi (chỉ là tài liệu): HÃY SÁNG TẠO câu hỏi dựa trên nội dung file và kiến thức chuẩn.\\n6. ƯU TIÊN sử dụng kiến thức trong file, nhưng CÓ THỂ dùng kiến thức bên ngoài để bổ trợ.\\n\\n⏬⏬⏬ TÀI LIỆU BẮT ĐẦU - ĐỌC VÀ TRÍCH XUẤT CÂU HỎI ⏬⏬⏬\`
    });
    userContent.splice(1, 0, {
      type: 'image_url',
      image_url: {
        url: \`data:\${file.type};base64,\${base64Data}\`
      }
    });
    userContent.push({
      type: 'text',
      text: \`⏫⏫⏫ KẾT THÚC TÀI LIỆU ⏫⏫⏫\\n\\n📋 NHẮC LẠI NHIỆM VỤ:\\n1. Lấy NGUYÊN VĂN câu hỏi từ file (kèm đoạn thơ/văn nếu có)\\n2. TỰ XÁC ĐỊNH đáp án đúng cho mỗi câu hỏi\\n3. Format theo JSON schema đã định nghĩa\`
    });
  }

  // Handle Image Library
  if (imageLibrary && imageLibrary.length > 0) {
    userContent.push({ type: 'text', text: "THƯ VIỆN HÌNH ẢNH (Image Library):" });
    for (const img of imageLibrary) {
      if (img.data && img.data.startsWith('http')) {
        try {
          const { data, mimeType } = await urlToBase64(img.data);
          userContent.push({ type: 'text', text: \`Image ID: \${img.id} (Name: \${img.name})\` });
          userContent.push({
            type: 'image_url',
            image_url: {
              url: \`data:\${mimeType};base64,\${data}\`
            }
          });
        } catch (err) {
          console.error(\`Failed to fetch image \${img.id}:\`, err);
          userContent.push({ type: 'text', text: \`[Failed to load image ID: \${img.id}]\` });
        }
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

  const maxRetries = 5;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${apiKey}\`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(\`AI request failed with status: \${response.status}\`);
      }
      
      const data = await response.json();
      const text = extractAIContent(data);
      if (!text) throw new Error("AI không trả về kết quả nào.");

      // Format multiplication signs
      const formattedText = text
        .replace(/\\s\\*\\s/g, ' x ')
        .replace(/\\)\\s*\\*\\s*/g, ') x ')
        .replace(/\\s*\\*\\s*\\(/g, ' x (')
        .replace(/([a-zA-Z0-9?])\\s*\\*\\s*([a-zA-Z0-9?(])/g, '$1 x $2')
        .replace(/([a-zA-Z0-9?]+)\\s+\\/\\s+([a-zA-Z0-9?]+)/g, '$1 : $2');

      const quizData = validateAndFixQuiz(parseAndRepairJSON(formattedText));
      return quizData; // Trả về quizData trực tiếp

    } catch (error: any) {
      attempt++;
      if (attempt >= maxRetries) {
        console.error("Generate Quiz Error (Gemini through Proxy):", error);
        throw error;
      }
      const delay = Math.pow(2, attempt) * 1000;
      console.log(\`Rate limited or Error (Gemini Proxy). Đang chờ \${delay / 1000}s trước khi thử lại (lần \${attempt}/\${maxRetries})...\`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Review quiz using AI Validation Chain
export const validateQuizWithAI = async (
  quizJson: any,
  apiKey: string
): Promise<any> => {
  const MODEL_NAME = 'gemini-2.0-flash';
  const VITE_LOCALHOST_AI_URL = (import.meta as any).env.VITE_LOCALHOST_AI_URL || 'http://localhost:3000/v1';
  const API_URL = \`\${VITE_LOCALHOST_AI_URL}/chat/completions\`;

  console.log('[AI Validation Chain] Đang tiến hành duyệt và sửa lỗi JSON...');

  const messages: any[] = [
    {
      role: 'system',
      content: REVIEWER_INSTRUCTION
    },
    {
      role: 'user',
      content: \`Hãy soát lỗi và sửa lại file JSON bản thảo đề thi dưới đây:\\n\\n\${JSON.stringify(quizJson, null, 2)}\`
    }
  ];

  const requestBody = {
    model: MODEL_NAME,
    messages: messages,
    temperature: 0.1, // Temperature rất thấp
    response_format: { type: "json_object" }
  };

  const maxRetries = 2;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${apiKey}\`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(\`Reviewer request failed with status: \${response.status}\`);
      }
      
      const data = await response.json();
      const text = extractAIContent(data);
      
      if (!text) throw new Error("AI Reviewer không trả về kết quả nào.");

      const parsedJSON = parseAndRepairJSON(text);
      console.log('[AI Validation Chain] Đã rà soát và sửa lỗi thành công!');
      
      return validateAndFixQuiz(parsedJSON); 

    } catch (error: any) {
      attempt++;
      if (attempt >= maxRetries) {
        console.error("[AI Validation Chain] Lỗi rà soát đề thi:", error);
        console.warn("[AI Validation Chain] Dùng lại JSON bản thảo ban đầu làm Fallback.");
        return validateAndFixQuiz(quizJson); // Fallback to original
      }
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

`;

content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated geminiService.ts');
