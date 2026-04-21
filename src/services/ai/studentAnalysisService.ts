import { StudentResult, Question } from '../../types';
import { extractAIContent, extractAIErrorMessage } from './utils/aiResponseParser';
import { resolvePublicProviderBaseUrl, resolveTargetUrl, shouldUseCliproxyDevProxy } from './utils/networkHelpers';

/**
 * Service phân tích chuyên sâu năng lực học sinh sử dụng AI (Gemini)
 */
export const analyzeStudentPerformance = async (
  result: StudentResult,
  competencyData: any[],
  apiKey: string
): Promise<string> => {
  const MODEL_NAME = 'gemini-2.0-flash';
  const configuredBaseUrl = (import.meta as any).env.VITE_LOCALHOST_AI_URL || 'http://localhost:3000/v1';
  const reviewerBaseUrl = resolvePublicProviderBaseUrl(configuredBaseUrl, 'https://api.thitong.site/v1');
  const API_URL = `${reviewerBaseUrl}/chat/completions`;

  // Chuẩn bị dữ liệu tinh gọn để gửi cho AI (tiết kiệm token)
  const analysisContext = {
    studentName: result.studentName,
    quizTitle: result.quizTitle,
    score: result.score,
    correctCount: result.correctCount,
    totalQuestions: result.totalQuestions,
    timeTaken: result.timeTaken,
    competencies: competencyData.map(d => ({ name: d.subject, score: d.score })),
  };

  const systemPrompt = `
Bạn là một Giáo viên Tiểu học tâm lý và giàu kinh nghiệm tại Việt Nam. 
Nhiệm vụ của bạn là viết một đoạn nhận xét chuyên môn ngắn gọn (khoảng 100-150 từ) dựa trên kết quả bài thi của học sinh.

Cấu trúc nhận xét:
1. Khen ngợi: Tìm điểm mạnh của học sinh dựa trên các trục năng lực có điểm cao (>70%).
2. Góp ý: Chỉ ra vùng kiến thức cần cải thiện một cách nhẹ nhàng (những trục có điểm thấp <50%).
3. Lời khuyên cho phụ huynh: Gợi ý 1-2 hành động cụ thể để giúp con tiến bộ tại nhà.

Lưu ý: 
- Giọng văn: Ấm áp, khích lệ, chuyên nghiệp.
- Ngôn ngữ: Tiếng Việt.
- Định dạng: Sử dụng Markdown (in đậm các từ khóa quan trọng).
- Không được bịa đặt thông tin không có trong dữ liệu context.
`;

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Đây là kết quả bài làm của em ${result.studentName}:\n\n${JSON.stringify(analysisContext, null, 2)}`,
    },
  ];

  const requestBody = {
    model: MODEL_NAME,
    messages,
    temperature: 0.7,
  };

  try {
    const targetUrl = resolveTargetUrl(API_URL);
    const fetchUrl = shouldUseCliproxyDevProxy(targetUrl)
        ? '/api/cliproxy/chat/completions'
        : targetUrl;

    const response = await fetch(fetchUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${apiKey}` 
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) throw new Error(`AI Analysis failed with status: ${response.status}`);

    const data = await response.json();
    const aiError = extractAIErrorMessage(data);
    if (aiError) throw new Error(aiError);

    const text = extractAIContent(data);
    if (!text) throw new Error('AI không trả về kết quả phân tích nào.');

    return text;
  } catch (error) {
    console.error('[StudentAnalysisService] Lỗi:', error);
    throw error;
  }
};
