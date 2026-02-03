/**
 * aiTutorService.ts - Service để lấy tư vấn học tập từ AI (Gemini)
 * Phân tích kết quả bài kiểm tra và đưa ra gợi ý cá nhân hóa cho học sinh
 */

import { Quiz, StudentResult, Question, QuestionType } from '../types';

export interface WrongAnswer {
    questionNumber: number;
    questionType: string;
    questionText: string;
    studentAnswer: string;
    correctAnswer: string;
}

export interface AIRecommendation {
    weakTopics: string[];
    analysis: string;
    studyTips: string[];
    encouragement: string;
    isLoading?: boolean;
    error?: string;
}

const TUTOR_SYSTEM_PROMPT = `Bạn là một giáo viên tiểu học thân thiện, nhiệt tình và giàu kinh nghiệm. 
Nhiệm vụ của bạn là phân tích kết quả bài kiểm tra của học sinh và đưa ra lời khuyên học tập.

Quy tắc:
1. Sử dụng ngôn ngữ đơn giản, dễ hiểu, phù hợp với học sinh tiểu học
2. Luôn động viên và khích lệ học sinh, không chê bai
3. Đưa ra gợi ý cụ thể, có thể thực hiện được
4. Giữ câu trả lời ngắn gọn, súc tích
5. Sử dụng emoji để tạo sự thân thiện

Format trả lời (bắt buộc theo đúng format JSON):
{
  "weakTopics": ["Chủ đề 1", "Chủ đề 2"],
  "analysis": "Phân tích ngắn gọn về điểm mạnh/yếu của học sinh (2-3 câu)",
  "studyTips": ["Gợi ý 1", "Gợi ý 2", "Gợi ý 3"],
  "encouragement": "Một lời động viên ngắn gọn, ấm áp cho học sinh"
}`;

/**
 * Build prompt chứa thông tin bài làm của học sinh
 */
function buildAnalysisPrompt(
    quiz: Quiz,
    result: StudentResult,
    wrongAnswers: WrongAnswer[]
): string {
    const wrongList = wrongAnswers.map((w, idx) =>
        `${idx + 1}. Câu ${w.questionNumber} (${w.questionType}): "${w.questionText.substring(0, 100)}..."
   - Em trả lời: "${w.studentAnswer}"
   - Đáp án đúng: "${w.correctAnswer}"`
    ).join('\n');

    return `Phân tích kết quả bài kiểm tra của học sinh:

**Thông tin bài kiểm tra:**
- Tên bài: ${quiz.title}
- Điểm: ${result.score}/10
- Số câu đúng: ${result.correctCount}/${result.totalQuestions}
- Thời gian làm bài: ${result.timeTaken || 0} phút

**Các câu sai (${wrongAnswers.length} câu):**
${wrongList || 'Không có câu sai - Hoàn hảo!'}

Hãy phân tích và đưa ra gợi ý học tập cho học sinh này. Trả lời bằng JSON theo format đã định.`;
}

/**
 * Gọi AI API để lấy recommendations
 * Ưu tiên: CLIProxy -> Gemini -> Default
 */
export async function getAIRecommendations(
    quiz: Quiz,
    result: StudentResult,
    wrongAnswers: WrongAnswer[]
): Promise<AIRecommendation> {
    const cliproxyApi = import.meta.env.VITE_CLIPROXY_API;
    const cliproxyToken = import.meta.env.VITE_CLIPROXY_TOKEN;
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;

    const prompt = buildAnalysisPrompt(quiz, result, wrongAnswers);

    // Priority 1: CLIProxy (OpenAI-compatible API)
    if (cliproxyApi && cliproxyToken) {
        try {
            return await callCliProxy(prompt, cliproxyApi, cliproxyToken);
        } catch (error) {
            console.error('CLIProxy Error, falling back:', error);
        }
    }

    // Priority 2: Direct Gemini API
    if (geminiKey) {
        try {
            return await callGeminiDirect(prompt, geminiKey);
        } catch (error) {
            console.error('Gemini Error:', error);
        }
    }

    // Fallback: Default recommendations
    return getDefaultRecommendations(wrongAnswers);
}

/**
 * Gọi CLIProxy API (OpenAI-compatible format)
 */
async function callCliProxy(
    prompt: string,
    baseUrl: string,
    apiKey: string
): Promise<AIRecommendation> {
    const API_URL = `${baseUrl}/chat/completions`;

    const requestBody = {
        model: 'gemini-2.0-flash',
        messages: [
            { role: 'system', content: TUTOR_SYSTEM_PROMPT },
            { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1024,
        response_format: { type: 'json_object' }
    };

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        throw new Error(`CLIProxy API Error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content?.trim();

    if (!responseText) {
        throw new Error('Empty response from CLIProxy');
    }

    return parseAIResponse(responseText);
}

/**
 * Gọi Gemini API trực tiếp
 */
async function callGeminiDirect(
    prompt: string,
    apiKey: string
): Promise<AIRecommendation> {
    const MODEL_NAME = 'gemini-2.0-flash';
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

    const requestBody = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        system_instruction: { parts: [{ text: TUTOR_SYSTEM_PROMPT }] },
        generation_config: {
            temperature: 0.7,
            max_output_tokens: 1024,
            response_mime_type: 'application/json'
        },
    };

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!responseText) {
        throw new Error('Empty response from Gemini');
    }

    return parseAIResponse(responseText);
}

/**
 * Parse AI response JSON
 */
function parseAIResponse(responseText: string): AIRecommendation {
    try {
        const parsed = JSON.parse(responseText);
        return {
            weakTopics: parsed.weakTopics || [],
            analysis: parsed.analysis || 'Không có phân tích',
            studyTips: parsed.studyTips || [],
            encouragement: parsed.encouragement || 'Cố gắng lên em nhé! 💪'
        };
    } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        throw new Error('Invalid JSON response');
    }
}


/**
 * Generate default recommendations khi không có AI
 */
function getDefaultRecommendations(wrongAnswers: WrongAnswer[]): AIRecommendation {
    // Group by question type
    const typeCount: Record<string, number> = {};
    wrongAnswers.forEach(w => {
        typeCount[w.questionType] = (typeCount[w.questionType] || 0) + 1;
    });

    const weakTopics = Object.entries(typeCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type]) => {
            const typeLabels: Record<string, string> = {
                MCQ: 'Câu hỏi trắc nghiệm',
                TRUE_FALSE: 'Câu hỏi đúng/sai',
                SHORT_ANSWER: 'Câu hỏi tự luận',
                MATCHING: 'Câu hỏi nối cặp',
                MULTIPLE_SELECT: 'Câu hỏi chọn nhiều',
                WORD_SCRAMBLE: 'Câu ghép từ',
                RIDDLE: 'Câu đố'
            };
            return typeLabels[type] || type;
        });

    const studyTips = [
        '📚 Đọc lại bài học trong sách giáo khoa',
        '✏️ Làm thêm bài tập tương tự để củng cố',
        '🤔 Hỏi thầy cô hoặc bạn bè những phần chưa hiểu'
    ];

    if (wrongAnswers.length === 0) {
        return {
            weakTopics: [],
            analysis: '🌟 Tuyệt vời! Em đã trả lời đúng tất cả các câu hỏi. Hãy tiếp tục phát huy nhé!',
            studyTips: ['Thử thách bản thân với những bài khó hơn', 'Giúp đỡ bạn bè học tập'],
            encouragement: 'Em thật giỏi! Thầy cô rất tự hào về em! 🏆'
        };
    }

    return {
        weakTopics,
        analysis: `Em cần ôn lại ${weakTopics.join(', ')}. Đừng lo lắng, luyện tập nhiều em sẽ tiến bộ thôi!`,
        studyTips,
        encouragement: 'Mỗi sai lầm là một bài học quý giá. Cố gắng lên em nhé! 💪'
    };
}

/**
 * Extract wrong answers from quiz results
 */
export function extractWrongAnswers(
    quiz: Quiz,
    answers: Record<string, any>
): WrongAnswer[] {
    const wrongAnswers: WrongAnswer[] = [];

    quiz.questions.forEach((q, idx) => {
        const answer = answers[q.id];
        const isCorrect = checkCorrectness(q, answer);

        if (!isCorrect) {
            wrongAnswers.push({
                questionNumber: idx + 1,
                questionType: q.type,
                questionText: getQuestionText(q),
                studentAnswer: formatAnswer(answer, q),
                correctAnswer: getCorrectAnswer(q)
            });
        }
    });

    return wrongAnswers;
}

function getQuestionText(q: Question): string {
    if (q.type === QuestionType.TRUE_FALSE) {
        return (q as any).mainQuestion || '';
    }
    return (q as any).question || '';
}

function formatAnswer(answer: any, q: Question): string {
    if (!answer && answer !== false && answer !== 0) return 'Không trả lời';
    if (typeof answer === 'string') return answer;
    if (Array.isArray(answer)) {
        if (q.type === QuestionType.WORD_SCRAMBLE) {
            const letters = (q as any).letters || [];
            return (answer as number[]).map((i: number) => letters[i]).join('');
        }
        return answer.join(', ');
    }
    if (typeof answer === 'object') {
        return Object.entries(answer).map(([k, v]) => `${k}: ${v}`).join('; ');
    }
    return String(answer);
}

function getCorrectAnswer(q: Question): string {
    switch (q.type) {
        case QuestionType.MCQ:
        case QuestionType.SHORT_ANSWER:
        case QuestionType.RIDDLE:
            return String((q as any).correctAnswer || '');
        case QuestionType.TRUE_FALSE:
            return (q.items || []).map((item: any) =>
                `"${item.statement}": ${item.isCorrect ? 'Đúng' : 'Sai'}`
            ).join('; ');
        case QuestionType.MATCHING:
            return (q.pairs || []).map((p: any) => `${p.left} → ${p.right}`).join('; ');
        case QuestionType.MULTIPLE_SELECT:
            return ((q as any).correctAnswers || []).join(', ');
        case QuestionType.WORD_SCRAMBLE:
            return (q as any).correctWord || '';
        default:
            return '';
    }
}

function checkCorrectness(q: Question, answer: any): boolean {
    if (!answer && answer !== false && answer !== 0) return false;

    switch (q.type) {
        case QuestionType.MCQ:
            return answer === (q as any).correctAnswer;
        case QuestionType.SHORT_ANSWER:
            return String(answer).toLowerCase().trim() === String((q as any).correctAnswer).toLowerCase().trim();
        case QuestionType.TRUE_FALSE:
            return (q.items || []).every((item: any, idx: number) => {
                const key = item.id || `item-${idx}`;
                return answer?.[key] === item.isCorrect;
            });
        case QuestionType.MATCHING:
            return (q.pairs || []).every((p: any) => answer?.[p.left] === p.right);
        case QuestionType.MULTIPLE_SELECT:
            const studentAns = (answer as string[]) || [];
            const correctAns = (q as any).correctAnswers || [];
            return studentAns.length === correctAns.length && studentAns.every((v: string) => correctAns.includes(v));
        case QuestionType.WORD_SCRAMBLE:
            const letters = (q as any).letters || [];
            const word = ((answer as number[]) || []).map((i: number) => letters[i]).join('');
            return word.toLowerCase().replace(/\s+/g, '') === ((q as any).correctWord || '').toLowerCase().replace(/\s+/g, '');
        case QuestionType.RIDDLE:
            return String(answer).toLowerCase().trim() === String((q as any).correctAnswer).toLowerCase().trim();
        default:
            return false;
    }
}
