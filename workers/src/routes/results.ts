// Results + Validate API Routes
// GET /api/results - List all results
// POST /api/results - Submit result
// POST /api/validate - Validate answers (anti-cheat)

import { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';
import { handleValidateAnswers, parseBody } from '../utils/helpers';

export async function handleResultRoutes(request: Request, env: Env, path: string, method: string): Promise<Response> {
    const db = env.DB;

    // GET /api/results
    if (path === '/api/results' && method === 'GET') {
        const rows = await db.prepare('SELECT * FROM results ORDER BY submitted_at DESC').all();
        // Map column names to match GAS output format
        const mapped = rows.results.map((r: any) => ({
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
            'answers': r.answers,
        }));
        return jsonResponse(mapped);
    }

    // POST /api/results - Submit result
    if (path === '/api/results' && method === 'POST') {
        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        await db.prepare(
            `INSERT INTO results (student_name, class_name, quiz_id, quiz_title, score, correct_count, total_questions, time_taken, submitted_at, answers)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            body.studentName || '', body.className || '', body.quizId || '',
            body.quizTitle || '', body.score || 0, body.correctCount || 0,
            body.totalQuestions || 0, body.timeTaken || 0,
            body.submittedAt || new Date().toISOString(),
            JSON.stringify(body.answers || {})
        ).run();
        return jsonResponse({ status: 'success' });
    }

    // DELETE /api/results/:id - Delete result
    if (path.match(/^\/api\/results\/\d+$/) && method === 'DELETE') {
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
