// AI Tutor (Dr. Owl) - Emergency Tutoring Route Handler
// Analyzes wrong answers and generates practice questions via Gemini AI

import { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';

// Prompt template for Gemini AI
const buildPrompt = (wrongQuestions: any[]): string => {
    const questionsText = wrongQuestions.map((q, i) => {
        let detail = `Câu ${i + 1}: "${q.question}"`;
        if (q.options) {
            try {
                const opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
                if (Array.isArray(opts)) {
                    detail += `\nĐáp án: ${opts.join(' | ')}`;
                }
            } catch { /* ignore parse errors */ }
        }
        if (q.correct_answer) {
            detail += `\nĐáp án đúng: ${q.correct_answer}`;
        }
        return detail;
    }).join('\n\n');

    return `Bạn là một giáo viên tiểu học tận tâm tên "Bác sĩ Cú Mèo". Một học sinh vừa làm sai các câu hỏi sau:

${questionsText}

Hãy thực hiện 3 việc sau (trả lời bằng tiếng Việt, ngôn ngữ dễ hiểu cho học sinh tiểu học):

1. **diagnosis**: Phân tích ngắn gọn (1-2 câu) lỗ hổng kiến thức của em học sinh dựa trên các câu sai. Ví dụ: "Em đang gặp khó khăn với phép chia có dư."

2. **explanation**: Giải thích lại cách giải câu đầu tiên một cách đơn giản, thân thiện (3-4 câu). Dùng emoji và ngôn ngữ khích lệ.

3. **practiceQuestions**: Tạo CHÍNH XÁC 3 câu hỏi trắc nghiệm mới cùng dạng với các câu sai, nhưng đổi số liệu/ngữ cảnh. Mỗi câu gồm: question, options (mảng 4 lựa chọn), correctAnswer (đáp án đúng, phải nằm trong options).

Trả lời ĐÚNG format JSON sau, KHÔNG thêm text nào khác:
{
  "diagnosis": "...",
  "explanation": "...",
  "practiceQuestions": [
    { "question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "A" },
    { "question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "B" },
    { "question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "C" }
  ]
}`;
};

export async function handleAiTutorRoutes(
    request: Request,
    env: Env,
    path: string,
    method: string
): Promise<Response | null> {

    // POST /api/ai-tutor/diagnose
    if (path === '/api/ai-tutor/diagnose' && method === 'POST') {
        try {
            const body = await request.json() as any;
            const { quizId, wrongQuestionIds } = body;

            if (!quizId || !wrongQuestionIds || !Array.isArray(wrongQuestionIds) || wrongQuestionIds.length === 0) {
                return errorResponse('Missing quizId or wrongQuestionIds', 400);
            }

            // Limit to max 3 wrong questions to control token usage
            const limitedIds = wrongQuestionIds.slice(0, 3);

            // Fetch the actual question content from DB
            const placeholders = limitedIds.map(() => '?').join(',');
            const questionsResult = await env.DB.prepare(
                `SELECT id, type, question, options, correct_answer FROM questions WHERE id IN (${placeholders}) AND quiz_id = ?`
            ).bind(...limitedIds, quizId).all();

            if (!questionsResult.results || questionsResult.results.length === 0) {
                return errorResponse('No questions found for the given IDs', 404);
            }

            // Build the AI prompt
            const prompt = buildPrompt(questionsResult.results);

            // Call CLIProxy (Gemini) via OpenAI-compatible API
            const aiResponse = await fetch(`${env.CLIPROXY_API}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${env.CLIPROXY_TOKEN}`,
                },
                body: JSON.stringify({
                    model: 'gemini-2.0-flash',
                    messages: [
                        { role: 'system', content: 'You are Dr. Owl, a friendly AI tutor for elementary school students. Always respond in valid JSON format only.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000,
                }),
            });

            if (!aiResponse.ok) {
                const errText = await aiResponse.text();
                console.error('[AI Tutor] CLIProxy error:', aiResponse.status, errText);
                return errorResponse('AI service temporarily unavailable', 503);
            }

            const aiData = await aiResponse.json() as any;
            const rawContent = aiData?.choices?.[0]?.message?.content || '';

            // Parse AI response - handle markdown code blocks
            let parsed: any;
            try {
                // Strip markdown code block if present
                let cleanContent = rawContent.trim();
                if (cleanContent.startsWith('```')) {
                    cleanContent = cleanContent.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
                }
                parsed = JSON.parse(cleanContent);
            } catch (parseErr) {
                console.error('[AI Tutor] Failed to parse AI response:', rawContent);
                return errorResponse('AI response format error. Please try again.', 500);
            }

            // Validate the parsed response structure
            if (!parsed.diagnosis || !parsed.practiceQuestions || !Array.isArray(parsed.practiceQuestions)) {
                console.error('[AI Tutor] Invalid AI response structure:', parsed);
                return errorResponse('AI response missing required fields. Please try again.', 500);
            }

            return jsonResponse({
                status: 'success',
                data: {
                    diagnosis: parsed.diagnosis,
                    explanation: parsed.explanation || '',
                    practiceQuestions: parsed.practiceQuestions.slice(0, 3).map((q: any, i: number) => ({
                        id: `ai-practice-${Date.now()}-${i}`,
                        question: q.question,
                        options: q.options,
                        correctAnswer: q.correctAnswer,
                    })),
                    wrongQuestionIds: limitedIds,
                }
            });

        } catch (error: any) {
            console.error('[AI Tutor] Error:', error);
            return errorResponse('Internal error: ' + (error.message || 'Unknown'), 500);
        }
    }

    return null;
}
