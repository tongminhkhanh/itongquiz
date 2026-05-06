// Quizzes + Questions API Routes
// GET /api/quizzes - List all quizzes (PUBLIC)
// GET /api/questions - List questions (PUBLIC)
// POST /api/quizzes - Create quiz (TEACHER/ADMIN)
// PUT /api/quizzes/:id - Update quiz (TEACHER/ADMIN with ownership check)
// DELETE /api/quizzes/:id - Delete quiz (TEACHER/ADMIN with ownership check)
// POST /api/quizzes/:id/duplicate - Duplicate quiz (TEACHER/ADMIN)

import { Env } from '../types';
import { jsonResponse, errorResponse, generateId } from '../utils/response';
import { mapQuestionForSave, parseBody, extractIdFromPath } from '../utils/helpers';
import { verifyJWTMiddleware, requireAdmin, requireTeacher } from '../middleware/jwtAuth';
import { JWTPayload } from '../utils/jwt';

const canAccessQuiz = async (db: D1Database, user: JWTPayload, quizId: string): Promise<boolean> => {
    if (requireAdmin(user)) return true;
    if (user.role !== 'teacher') return false;

    const quiz = await db.prepare('SELECT created_by FROM quizzes WHERE id = ?').bind(quizId).first<{ created_by: string }>();
    if (!quiz) return false;

    return quiz.created_by === user.username;
};

export async function handleQuizRoutes(request: Request, env: Env, path: string, method: string): Promise<Response> {
    const db = env.DB;

    // GET /api/quizzes
    if (path === '/api/quizzes' && method === 'GET') {
        const rows = await db.prepare('SELECT * FROM quizzes').all<import('../types').Quiz>();
        return jsonResponse(rows.results);
    }

    // GET /api/questions
    if (path === '/api/questions' && method === 'GET') {
        const url = new URL(request.url);
        const quizId = url.searchParams.get('quizId');
        if (quizId) {
            const rows = await db.prepare('SELECT * FROM questions WHERE quiz_id = ?').bind(quizId).all<import('../types').Question>();
            return jsonResponse(rows.results);
        }
        const rows = await db.prepare('SELECT * FROM questions').all<import('../types').Question>();
        return jsonResponse(rows.results);
    }

    // POST /api/quizzes - Create quiz (TEACHER/ADMIN only)
    if (path === '/api/quizzes' && method === 'POST') {
        const authResult = await verifyJWTMiddleware(request, env);
        if (authResult instanceof Response) return authResult;
        const { user } = authResult;

        if (!requireTeacher(user)) {
            return errorResponse('Forbidden: Teacher or admin access required', 403);
        }

        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        try {
            const batch = [];
            // Set created_by to the authenticated user
            const createdBy = user.username;
            batch.push(
                db.prepare(
                    `INSERT INTO quizzes (id, title, class_level, category, time_limit, created_at, access_code, require_code, created_by, show_on_home, tags)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                ).bind(
                    body.id, body.title, body.classLevel, body.category || '',
                    body.timeLimit, body.createdAt, body.accessCode || '',
                    body.requireCode ? 'TRUE' : 'FALSE', createdBy,
                    body.showOnHome === false ? 'FALSE' : 'TRUE',
                    body.tags ? (Array.isArray(body.tags) ? JSON.stringify(body.tags) : body.tags) : '[]'
                )
            );

            // Insert questions (batch)
            if (body.questions && Array.isArray(body.questions) && body.questions.length > 0) {
                const stmt = db.prepare(
                    `INSERT INTO questions (id, quiz_id, type, question, options, correct_answer, items, text_field, blanks, distractors, sentence, words, correct_word_indexes, image, tags, subject, skill_code, subskill_code, difficulty)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                );
                body.questions.forEach((q: Partial<import('../types').Question> & { type: string }) => {
                    const mapped = mapQuestionForSave(q, body.id);
                    batch.push(stmt.bind(...mapped));
                });
            }

            // Excute all inside one transaction to ensure atomicity
            await db.batch(batch);

            return jsonResponse({ status: 'success' });
        } catch (err: any) {
            console.error('[POST /api/quizzes] Error:', err.message, err.stack);
            return errorResponse(`Failed to create quiz: ${err.message}`, 500);
        }
    }

    // PUT /api/quizzes/:id - Update quiz (TEACHER/ADMIN with ownership check)
    if (path.startsWith('/api/quizzes/') && method === 'PUT') {
        const authResult = await verifyJWTMiddleware(request, env);
        if (authResult instanceof Response) return authResult;
        const { user } = authResult;

        if (!requireTeacher(user)) {
            return errorResponse('Forbidden: Teacher or admin access required', 403);
        }

        const quizId = extractIdFromPath(path, '/api/quizzes');
        if (!quizId) return errorResponse('Missing quiz ID');

        // Check ownership
        if (!(await canAccessQuiz(db, user, quizId))) {
            return errorResponse('Forbidden: You do not have permission to edit this quiz', 403);
        }

        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        // Use body.id or path id
        const id = body.id || quizId;

        try {
            // Fetch original created_by BEFORE deleting
            const originalQuiz = await db.prepare('SELECT created_by FROM quizzes WHERE id = ?').bind(id).first<{ created_by: string }>();
            const createdBy = originalQuiz?.created_by || user.username;

            const batch = [];
            // Delete old data then re-insert
            batch.push(db.prepare('DELETE FROM questions WHERE quiz_id = ?').bind(id));
            batch.push(db.prepare('DELETE FROM quizzes WHERE id = ?').bind(id));

            batch.push(
                db.prepare(
                    `INSERT INTO quizzes (id, title, class_level, category, time_limit, created_at, access_code, require_code, created_by, show_on_home, tags)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                ).bind(
                    id, body.title, body.classLevel, body.category || '',
                    body.timeLimit, body.createdAt, body.accessCode || '',
                    body.requireCode ? 'TRUE' : 'FALSE', createdBy,
                    body.showOnHome === false ? 'FALSE' : 'TRUE',
                    body.tags ? (Array.isArray(body.tags) ? JSON.stringify(body.tags) : body.tags) : '[]'
                )
            );

            // Re-insert questions
            if (body.questions && Array.isArray(body.questions) && body.questions.length > 0) {
                const stmt = db.prepare(
                    `INSERT INTO questions (id, quiz_id, type, question, options, correct_answer, items, text_field, blanks, distractors, sentence, words, correct_word_indexes, image, tags, subject, skill_code, subskill_code, difficulty)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                );
                body.questions.forEach((q: any) => {
                    const mapped = mapQuestionForSave(q, id);
                    batch.push(stmt.bind(...mapped));
                });
            }

            await db.batch(batch);

            // Verify count
            const countResult = await db.prepare('SELECT COUNT(*) as cnt FROM questions WHERE quiz_id = ?').bind(id).first<{ cnt: number }>();
            const actualCount = countResult?.cnt || 0;
            const expectedCount = body.questions?.length || 0;

            if (actualCount !== expectedCount) {
                return jsonResponse({ status: 'error', message: `Save verification failed: expected ${expectedCount} questions, but ${actualCount} were saved` });
            }

            return jsonResponse({ status: 'success', questionCount: actualCount });
        } catch (err: any) {
            console.error('[PUT /api/quizzes] Error:', err.message, err.stack);
            return errorResponse(`Failed to update quiz: ${err.message}`, 500);
        }
    }

    // POST /api/quizzes/:id/duplicate - Duplicate quiz with all questions (TEACHER/ADMIN)
    if (path.match(/^\/api\/quizzes\/[^/]+\/duplicate$/) && method === 'POST') {
        const authResult = await verifyJWTMiddleware(request, env);
        if (authResult instanceof Response) return authResult;
        const { user } = authResult;

        if (!requireTeacher(user)) {
            return errorResponse('Forbidden: Teacher or admin access required', 403);
        }

        const segments = path.split('/');
        const quizId = segments[3]; // /api/quizzes/{id}/duplicate
        if (!quizId) return errorResponse('Missing quiz ID');

        try {
            // Fetch original quiz
            const originalQuiz = await db.prepare('SELECT * FROM quizzes WHERE id = ?').bind(quizId).first<import('../types').Quiz>();
            if (!originalQuiz) return errorResponse('Quiz not found', 404);

            // Fetch original questions
            const originalQuestions = await db.prepare('SELECT * FROM questions WHERE quiz_id = ?').bind(quizId).all<import('../types').Question>();

            // Generate new IDs
            const newQuizId = generateId('quiz');
            const createdAt = new Date().toISOString();
            const newTitle = `Bản sao của ${originalQuiz.title}`;

            const batch = [];

            // Insert new quiz (set created_by to current user)
            batch.push(
                db.prepare(
                    `INSERT INTO quizzes (id, title, class_level, category, time_limit, created_at, access_code, require_code, created_by, show_on_home, tags)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                ).bind(
                    newQuizId, newTitle, originalQuiz.class_level, originalQuiz.category || '',
                    originalQuiz.time_limit, createdAt, '', // No access code for copy
                    originalQuiz.require_code || 'FALSE', user.username, // Set to current user
                    'FALSE', // Don't show copies on home by default
                    originalQuiz.tags || '[]'
                )
            );

            // Insert copied questions
            if (originalQuestions.results.length > 0) {
                const stmt = db.prepare(
                    `INSERT INTO questions (id, quiz_id, type, question, options, correct_answer, items, text_field, blanks, distractors, sentence, words, correct_word_indexes, image, tags, subject, skill_code, subskill_code, difficulty)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                );
                for (const q of originalQuestions.results) {
                    const newQId = generateId('q');
                    batch.push(stmt.bind(
                        newQId, newQuizId, q.type, q.question || '', q.options || '', q.correct_answer || '',
                        q.items || '', q.text_field || '', q.blanks || '', q.distractors || '',
                        q.sentence || '', q.words || '', q.correct_word_indexes || '', q.image || '', q.tags || '',
                        q.subject || '', q.skill_code || '', q.subskill_code || '', q.difficulty || ''
                    ));
                }
            }

            await db.batch(batch);

            return jsonResponse({
                status: 'success',
                data: {
                    id: newQuizId,
                    title: newTitle,
                    classLevel: originalQuiz.class_level,
                    category: originalQuiz.category || '',
                    timeLimit: originalQuiz.time_limit,
                    createdAt,
                    questionCount: originalQuestions.results.length,
                },
            });
        } catch (err: any) {
            console.error('[POST /api/quizzes/:id/duplicate] Error:', err.message, err.stack);
            return errorResponse(`Failed to duplicate quiz: ${err.message}`, 500);
        }
    }

    // DELETE /api/quizzes/:id (TEACHER/ADMIN with ownership check)
    if (path.startsWith('/api/quizzes/') && method === 'DELETE') {
        const authResult = await verifyJWTMiddleware(request, env);
        if (authResult instanceof Response) return authResult;
        const { user } = authResult;

        if (!requireTeacher(user)) {
            return errorResponse('Forbidden: Teacher or admin access required', 403);
        }

        const quizId = extractIdFromPath(path, '/api/quizzes');
        if (!quizId) return errorResponse('Missing quiz ID');

        // Check ownership
        if (!(await canAccessQuiz(db, user, quizId))) {
            return errorResponse('Forbidden: You do not have permission to delete this quiz', 403);
        }

        await db.prepare('DELETE FROM questions WHERE quiz_id = ?').bind(quizId).run();
        await db.prepare('DELETE FROM quizzes WHERE id = ?').bind(quizId).run();
        return jsonResponse({ status: 'success' });
    }

    return errorResponse('Not found: ' + path, 404);
}
