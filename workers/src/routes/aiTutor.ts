// AI Tutor (Dr. Owl) - Emergency Tutoring Route Handler
// Analyzes wrong answers and generates practice questions via Gemini AI

import { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';
import { requireAdmin, verifyJWTMiddleware } from '../middleware/jwtAuth';
import { internalErrorResponse } from '../utils/internalError';
import {
    loadTeacherQuizOwnerIdentity,
    quizOwnerMatchesIdentity,
} from '../services/quizOwnership';

const hasAiTutorQuestionAccess = async (
    db: D1Database,
    user: import('../utils/jwt').JWTPayload,
    quizId: string,
    questionIds: string[],
): Promise<boolean> => {
    if (requireAdmin(user)) return true;

    if (user.role === 'teacher') {
        const [quiz, identity] = await Promise.all([
            db.prepare('SELECT created_by FROM quizzes WHERE id = ?')
                .bind(quizId)
                .first<{ created_by: string }>(),
            loadTeacherQuizOwnerIdentity(db, user.username),
        ]);
        return Boolean(quiz && identity && quizOwnerMatchesIdentity(quiz.created_by, identity));
    }

    if (user.role !== 'student' || !user.id) return false;
    const rows = await db.prepare(`
        SELECT answers
        FROM results
        WHERE student_id = ?
          AND quiz_id = ?
          AND answers != '{"status":"STARTED"}'
        ORDER BY submitted_at DESC
        LIMIT 20
    `).bind(user.id, quizId).all<{ answers: string }>();

    const wrongQuestionIds = new Set<string>();
    for (const row of rows.results || []) {
        try {
            const answers = JSON.parse(String(row.answers || '{}'));
            if (!answers || typeof answers !== 'object' || Array.isArray(answers)) continue;
            for (const [questionId, answer] of Object.entries(answers)) {
                if (answer && typeof answer === 'object'
                    && (answer as { isCorrect?: unknown }).isCorrect === false) {
                    wrongQuestionIds.add(questionId);
                }
            }
        } catch {
            // Ignore malformed legacy rows; access remains denied unless a valid row proves ownership.
        }
    }
    return questionIds.every((questionId) => wrongQuestionIds.has(questionId));
};

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
        const authResult = await verifyJWTMiddleware(request, env);
        if (authResult instanceof Response) return authResult;

        try {
            const body = await request.json() as any;
            const quizId = typeof body.quizId === 'string' ? body.quizId.trim() : '';
            const wrongQuestionIds = body.wrongQuestionIds;

            if (!quizId || quizId.length > 128 || !Array.isArray(wrongQuestionIds)
                || wrongQuestionIds.length === 0 || wrongQuestionIds.length > 3) {
                return errorResponse('Missing quizId or wrongQuestionIds', 400);
            }

            const limitedIds = Array.from(new Set(wrongQuestionIds.map((id: unknown) => (
                typeof id === 'string' ? id.trim() : ''
            ))));
            if (limitedIds.length !== wrongQuestionIds.length
                || limitedIds.some((id) => !id || id.length > 128)) {
                return errorResponse('Invalid wrongQuestionIds', 400);
            }
            if (!(await hasAiTutorQuestionAccess(env.DB, authResult.user, quizId, limitedIds))) {
                return errorResponse('Forbidden: You do not have access to these questions', 403);
            }

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
                        { role: 'user', content: prompt + '\nLƯU Ý QUAN TRỌNG: CÂU TRẢ LỜI PHẢI RẤT NGẮN GỌN (dưới 150 chữ tổng cộng) ĐỂ TRÁNH BỊ CẮT ĐỨT. Tối đa 2 câu hỏi thực hành thôi.' }
                    ],
                    temperature: 0.7,
                    max_tokens: 4096,
                    max_completion_tokens: 4096,
                    maxOutputTokens: 4096,
                    response_format: { type: 'json_object' },
                }),
            });

            if (!aiResponse.ok) {
                console.error('[AI Tutor] CLIProxy error status:', aiResponse.status);
                return errorResponse('AI service temporarily unavailable. Status: ' + aiResponse.status, 503);
            }

            const aiData = await aiResponse.json() as any;
            const rawContent = aiData?.choices?.[0]?.message?.content || '';
            console.log('[AI Tutor] AI response received:', { length: rawContent.length });

            // Robust JSON extraction - multiple strategies
            let parsed: any = null;

            // Strategy 1: Direct JSON parse
            try {
                parsed = JSON.parse(rawContent.trim());
            } catch { /* not direct JSON */ }

            // Strategy 2: Strip markdown code fences
            if (!parsed) {
                try {
                    let cleaned = rawContent.trim();
                    // Remove ```json ... ``` or ``` ... ```
                    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
                    parsed = JSON.parse(cleaned.trim());
                } catch { /* not code-fenced JSON */ }
            }

            // Strategy 3: Find first { ... } block via regex
            if (!parsed) {
                try {
                    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        parsed = JSON.parse(jsonMatch[0]);
                    }
                } catch { /* no valid JSON object found */ }
            }

            if (!parsed) {
                console.error('[AI Tutor] AI response JSON parse failed');
                return errorResponse('AI service returned an invalid response', 502);
            }

            // Validate the parsed response structure
            if (!parsed.diagnosis || !parsed.practiceQuestions || !Array.isArray(parsed.practiceQuestions)) {
                console.error('[AI Tutor] AI response structure validation failed');
                return errorResponse('AI service returned an invalid response', 502);
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

        } catch (error: unknown) {
            return internalErrorResponse(error, request, {
                context: 'POST /api/ai-tutor/diagnose',
            });
        }
    }

    return null;
}
