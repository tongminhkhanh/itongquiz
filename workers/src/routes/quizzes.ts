// Quizzes + Questions API Routes
// GET /api/quizzes - List all quizzes
// POST /api/quizzes - Create quiz
// PUT /api/quizzes/:id - Update quiz
// DELETE /api/quizzes/:id - Delete quiz
// GET /api/questions - List questions (optional ?quizId=X)

import { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';
import { mapQuestionForSave, parseBody, extractIdFromPath } from '../utils/helpers';

export async function handleQuizRoutes(request: Request, env: Env, path: string, method: string): Promise<Response> {
    const db = env.DB;

    // GET /api/quizzes
    if (path === '/api/quizzes' && method === 'GET') {
        const rows = await db.prepare('SELECT * FROM quizzes').all();
        return jsonResponse(rows.results);
    }

    // GET /api/questions
    if (path === '/api/questions' && method === 'GET') {
        const url = new URL(request.url);
        const quizId = url.searchParams.get('quizId');
        if (quizId) {
            const rows = await db.prepare('SELECT * FROM questions WHERE quiz_id = ?').bind(quizId).all();
            return jsonResponse(rows.results);
        }
        const rows = await db.prepare('SELECT * FROM questions').all();
        return jsonResponse(rows.results);
    }

    // POST /api/quizzes - Create quiz
    if (path === '/api/quizzes' && method === 'POST') {
        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        await db.prepare(
            `INSERT INTO quizzes (id, title, class_level, category, time_limit, created_at, access_code, require_code, created_by, show_on_home)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            body.id, body.title, body.classLevel, body.category || '',
            body.timeLimit, body.createdAt, body.accessCode || '',
            body.requireCode ? 'TRUE' : 'FALSE', body.createdBy || '',
            body.showOnHome === false ? 'FALSE' : 'TRUE'
        ).run();

        // Insert questions (batch)
        if (body.questions && Array.isArray(body.questions)) {
            const stmt = db.prepare(
                `INSERT INTO questions (id, quiz_id, type, question, options, correct_answer, items, text_field, blanks, distractors, sentence, words, correct_word_indexes, image)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            );
            const batch = body.questions.map((q: any) => {
                const mapped = mapQuestionForSave(q, body.id);
                return stmt.bind(...mapped);
            });
            await db.batch(batch);
        }
        return jsonResponse({ status: 'success' });
    }

    // PUT /api/quizzes/:id - Update quiz (delete + re-insert)
    if (path.startsWith('/api/quizzes/') && method === 'PUT') {
        const quizId = extractIdFromPath(path, '/api/quizzes');
        if (!quizId) return errorResponse('Missing quiz ID');

        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        // Use body.id or path id
        const id = body.id || quizId;

        // Delete old data then re-insert
        await db.prepare('DELETE FROM questions WHERE quiz_id = ?').bind(id).run();
        await db.prepare('DELETE FROM quizzes WHERE id = ?').bind(id).run();

        // Re-insert quiz
        await db.prepare(
            `INSERT INTO quizzes (id, title, class_level, category, time_limit, created_at, access_code, require_code, created_by, show_on_home)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            id, body.title, body.classLevel, body.category || '',
            body.timeLimit, body.createdAt, body.accessCode || '',
            body.requireCode ? 'TRUE' : 'FALSE', body.createdBy || '',
            body.showOnHome === false ? 'FALSE' : 'TRUE'
        ).run();

        // Re-insert questions
        if (body.questions && Array.isArray(body.questions)) {
            const stmt = db.prepare(
                `INSERT INTO questions (id, quiz_id, type, question, options, correct_answer, items, text_field, blanks, distractors, sentence, words, correct_word_indexes, image)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            );
            const batch = body.questions.map((q: any) => {
                const mapped = mapQuestionForSave(q, id);
                return stmt.bind(...mapped);
            });
            await db.batch(batch);
        }

        // Verify count
        const countResult = await db.prepare('SELECT COUNT(*) as cnt FROM questions WHERE quiz_id = ?').bind(id).first<{ cnt: number }>();
        const actualCount = countResult?.cnt || 0;
        const expectedCount = body.questions?.length || 0;

        if (actualCount !== expectedCount) {
            return jsonResponse({ status: 'error', message: `Save verification failed: expected ${expectedCount} questions, but ${actualCount} were saved` });
        }

        return jsonResponse({ status: 'success', questionCount: actualCount });
    }

    // DELETE /api/quizzes/:id
    if (path.startsWith('/api/quizzes/') && method === 'DELETE') {
        const quizId = extractIdFromPath(path, '/api/quizzes');
        if (!quizId) return errorResponse('Missing quiz ID');

        await db.prepare('DELETE FROM questions WHERE quiz_id = ?').bind(quizId).run();
        await db.prepare('DELETE FROM quizzes WHERE id = ?').bind(quizId).run();
        return jsonResponse({ status: 'success' });
    }

    return errorResponse('Not found: ' + path, 404);
}
