// Results + Validate API Routes
// GET /api/results - List all results
// POST /api/results - Submit result
// POST /api/validate - Validate answers (anti-cheat)

import { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';
import { handleValidateAnswers, parseBody } from '../utils/helpers';
import {
    buildResultSkillBreakdownFromData,
    buildWeaknessProfileFromData,
    getQuestionsForQuizIds,
    getRecentResultsForStudentContext,
    getResultById,
} from '../services/weaknessProfile';

export async function handleResultRoutes(request: Request, env: Env, path: string, method: string): Promise<Response> {
    const db = env.DB;

    // GET /api/results - List results with pagination
    // Supports: ?page=1&limit=50&quizId=xxx
    if (path === '/api/results' && method === 'GET') {
        const url = new URL(request.url);
        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
        const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '100', 10)));
        const quizId = url.searchParams.get('quizId') || '';
        const offset = (page - 1) * limit;

        // Count total for pagination metadata
        let countQuery = 'SELECT COUNT(*) as total FROM results';
        let dataQuery = 'SELECT id, student_name, class_name, quiz_id, quiz_title, score, correct_count, total_questions, time_taken, submitted_at FROM results';
        const bindings: any[] = [];

        if (quizId) {
            countQuery += ' WHERE quiz_id = ?';
            dataQuery += ' WHERE quiz_id = ?';
            bindings.push(quizId);
        }

        dataQuery += ' ORDER BY submitted_at DESC LIMIT ? OFFSET ?';

        const countResult = await db.prepare(countQuery).bind(...bindings).first<{ total: number }>();
        const total = countResult?.total || 0;

        const rows = await db.prepare(dataQuery).bind(...bindings, limit, offset).all<import('../types').ResultRow>();

        // Map column names to match GAS output format
        const mapped = rows.results.map((r) => ({
            id: r.id,
            'Student Name': r.student_name,
            'Class': r.class_name,
            'Quiz ID': r.quiz_id,
            'Quiz Title': r.quiz_title,
            'Score': r.score,
            'correctCount': r.correct_count,
            'Total Questions': r.total_questions,
            'Time Taken': r.time_taken || 0,
            'Submitted At': r.submitted_at,
        }));
        return jsonResponse({ data: mapped, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    }

    // GET /api/results/:id/answers - Lazy-load answers for a specific result
    if (path.match(/^\/api\/results\/[^/]+\/answers$/) && method === 'GET') {
        const id = path.split('/')[3];
        const row = await db.prepare('SELECT answers FROM results WHERE id = ?').bind(id).first<{ answers: string }>();
        if (!row) return errorResponse('Result not found', 404);
        return jsonResponse({ answers: row.answers });
    }

    // GET /api/results/:id/skill-breakdown
    if (path.match(/^\/api\/results\/[^/]+\/skill-breakdown$/) && method === 'GET') {
        const resultId = path.split('/')[3];
        const result = await getResultById(db, resultId);
        if (!result) return errorResponse('Result not found', 404);

        const questions = await getQuestionsForQuizIds(db, [result.quiz_id]);
        return jsonResponse(buildResultSkillBreakdownFromData(result, questions));
    }

    // GET /api/results/:id/weakness-profile
    if (path.match(/^\/api\/results\/[^/]+\/weakness-profile$/) && method === 'GET') {
        const resultId = path.split('/')[3];
        const result = await getResultById(db, resultId);
        if (!result) return errorResponse('Result not found', 404);

        const recentResults = await getRecentResultsForStudentContext(db, result);
        const questions = await getQuestionsForQuizIds(db, recentResults.map((item) => item.quiz_id));
        return jsonResponse(buildWeaknessProfileFromData(result, recentResults, questions));
    }

    // POST /api/results - Submit result
    if (path === '/api/results' && method === 'POST') {
        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        const quizId = body.quizId || '';
        const studentName = body.studentName || '';
        const className = body.className || '';

        // 🛡️ SECURITY CHECK: Check if this quiz has an assignment with maxAttempts limit
        // 1. Find if there's an assignment for this quiz and class
        const assignment = await db.prepare(
            'SELECT max_attempts FROM assignments WHERE quiz_id = ? AND class_id IN (SELECT id FROM classes WHERE name = ?)'
        ).bind(quizId, className).first<{ max_attempts: number }>();

        if (assignment) {
            const maxAttempts = Number(assignment.max_attempts) || 1;

            // 2. Count existing results for this student and quiz
            const countResult = await db.prepare(
                'SELECT COUNT(*) as cnt FROM results WHERE student_name = ? AND quiz_id = ?'
            ).bind(studentName, quizId).first<{ cnt: number }>();

            const currentAttempts = countResult?.cnt || 0;

            if (currentAttempts >= maxAttempts) {
                return errorResponse(`Bạn đã hết lượt làm bài tập này (${currentAttempts}/${maxAttempts}).`, 403);
            }
        }

        await db.prepare(
            `INSERT INTO results (student_name, class_name, quiz_id, quiz_title, score, correct_count, total_questions, time_taken, submitted_at, answers)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            studentName, className, quizId,
            body.quizTitle || '', body.score || 0, body.correctCount || 0,
            body.totalQuestions || 0, body.timeTaken || 0,
            body.submittedAt || new Date().toISOString(),
            JSON.stringify(body.answers || {})
        ).run();
        return jsonResponse({ status: 'success' });
    }

    // DELETE /api/results/:id - Delete result
    if (path.match(/^\/api\/results\/[^/]+$/) && method === 'DELETE') {
        const id = path.split('/').pop();
        await db.prepare('DELETE FROM results WHERE id = ?').bind(id).run();
        return jsonResponse({ status: 'success' });
    }

    // POST /api/validate - Validate answers (server-side anti-cheat)
    if (path === '/api/validate' && method === 'POST') {
        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        return await handleValidateAnswers(db, body);
    }

    return errorResponse('Not found: ' + path, 404);
}
