// Results + Validate API Routes
// GET /api/results - List all results
// POST /api/results - Submit result
// POST /api/validate - Validate answers (anti-cheat)

import { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';
import { handleValidateAnswers, parseBody } from '../utils/helpers';
import { JWTPayload } from '../utils/jwt';
import { verifyJWTMiddleware, requireAdmin, requireTeacher, isStudent } from '../middleware/jwtAuth';
import {
    buildResultSkillBreakdownFromData,
    buildWeaknessProfileFromData,
    getQuestionsForQuizIds,
    getRecentResultsForStudentContext,
    getResultById,
} from '../services/weaknessProfile';

const normalizeName = (value: string | null | undefined): string => String(value || '').trim().toLowerCase();

const getStudentForUser = async (db: D1Database, user: JWTPayload): Promise<any | null> => {
    if (!isStudent(user)) return null;
    return await db.prepare(
        `SELECT students.id, students.username, students.full_name, students.class_id, classes.name AS class_name
         FROM students
         LEFT JOIN classes ON classes.id = students.class_id
         WHERE students.username = ?`
    ).bind(user.username).first<any>();
};

const canTeacherAccessClassName = async (db: D1Database, user: JWTPayload, className: string): Promise<boolean> => {
    if (requireAdmin(user)) return true;
    if (user.role !== 'teacher') return false;
    const classroom = await db.prepare('SELECT id FROM classes WHERE name = ? AND teacher_username = ?')
        .bind(className, user.username)
        .first<any>();
    return !!classroom;
};

const canAccessResult = async (db: D1Database, user: JWTPayload, result: any): Promise<boolean> => {
    if (requireAdmin(user)) return true;
    if (user.role === 'teacher') {
        return await canTeacherAccessClassName(db, user, result.class_name || '');
    }
    if (isStudent(user)) {
        const student = await getStudentForUser(db, user);
        if (!student) return false;
        return normalizeName(result.student_name) === normalizeName(student.full_name) &&
            normalizeName(result.class_name) === normalizeName(student.class_name);
    }
    return false;
};

const requireResultAccess = async (db: D1Database, user: JWTPayload, resultId: string): Promise<{ result: any } | Response> => {
    const result = await getResultById(db, resultId);
    if (!result) return errorResponse('Result not found', 404);
    if (!(await canAccessResult(db, user, result))) {
        return errorResponse('Forbidden: You do not have access to this result', 403);
    }
    return { result };
};

export async function handleResultRoutes(request: Request, env: Env, path: string, method: string): Promise<Response> {
    const db = env.DB;

    const authResult = await verifyJWTMiddleware(request, env);
    if (authResult instanceof Response) return authResult;
    const { user } = authResult;

    // GET /api/results - List results with pagination
    // Supports: ?page=1&limit=50&quizId=xxx
    if (path === '/api/results' && method === 'GET') {
        const url = new URL(request.url);
        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
        const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '100', 10)));
        const quizId = url.searchParams.get('quizId') || '';
        const offset = (page - 1) * limit;

        // Count total for pagination metadata; scope by JWT role.
        let countQuery = 'SELECT COUNT(*) as total FROM results';
        let dataQuery = 'SELECT id, student_name, class_name, quiz_id, quiz_title, score, correct_count, total_questions, time_taken, submitted_at FROM results';
        const bindings: any[] = [];
        const whereClauses: string[] = [];

        if (quizId) {
            whereClauses.push('quiz_id = ?');
            bindings.push(quizId);
        }

        if (user.role === 'teacher') {
            whereClauses.push('class_name IN (SELECT name FROM classes WHERE teacher_username = ?)');
            bindings.push(user.username);
        } else if (isStudent(user)) {
            const student = await getStudentForUser(db, user);
            if (!student) return errorResponse('Student not found', 404);
            whereClauses.push('LOWER(TRIM(student_name)) = ? AND LOWER(TRIM(class_name)) = ?');
            bindings.push(normalizeName(student.full_name), normalizeName(student.class_name));
        } else if (!requireAdmin(user)) {
            return errorResponse('Forbidden: Results access required', 403);
        }

        if (whereClauses.length > 0) {
            const whereSql = ` WHERE ${whereClauses.join(' AND ')}`;
            countQuery += whereSql;
            dataQuery += whereSql;
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
        const access = await requireResultAccess(db, user, id);
        if (access instanceof Response) return access;

        const row = await db.prepare('SELECT answers FROM results WHERE id = ?').bind(id).first<{ answers: string }>();
        if (!row) return errorResponse('Result not found', 404);
        return jsonResponse({ answers: row.answers });
    }

    // GET /api/results/:id/skill-breakdown
    if (path.match(/^\/api\/results\/[^/]+\/skill-breakdown$/) && method === 'GET') {
        const resultId = path.split('/')[3];
        const access = await requireResultAccess(db, user, resultId);
        if (access instanceof Response) return access;
        const { result } = access;

        const questions = await getQuestionsForQuizIds(db, [result.quiz_id]);
        return jsonResponse(buildResultSkillBreakdownFromData(result, questions));
    }

    // GET /api/results/:id/weakness-profile
    if (path.match(/^\/api\/results\/[^/]+\/weakness-profile$/) && method === 'GET') {
        const resultId = path.split('/')[3];
        const access = await requireResultAccess(db, user, resultId);
        if (access instanceof Response) return access;
        const { result } = access;

        const recentResults = await getRecentResultsForStudentContext(db, result);
        const visibleRecentResults: any[] = [];
        for (const item of recentResults) {
            if (await canAccessResult(db, user, item)) visibleRecentResults.push(item);
        }
        const questions = await getQuestionsForQuizIds(db, visibleRecentResults.map((item) => item.quiz_id));
        return jsonResponse(buildWeaknessProfileFromData(result, visibleRecentResults, questions));
    }

    // POST /api/results - Submit result
    if (path === '/api/results' && method === 'POST') {
        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        const quizId = body.quizId || '';
        let studentName = body.studentName || '';
        let className = body.className || '';

        if (isStudent(user)) {
            const student = await getStudentForUser(db, user);
            if (!student) return errorResponse('Student not found', 404);
            studentName = student.full_name || '';
            className = student.class_name || '';
        } else if (user.role === 'teacher') {
            if (!(await canTeacherAccessClassName(db, user, className))) {
                return errorResponse('Forbidden: You do not manage this class', 403);
            }
        } else if (!requireAdmin(user)) {
            return errorResponse('Forbidden: Results submit access required', 403);
        }

        // SECURITY CHECK: Check if this quiz has an assignment with maxAttempts limit
        // 1. Find if there's an assignment for this quiz and class
        const assignment = await db.prepare(
            'SELECT max_attempts FROM assignments WHERE quiz_id = ? AND class_id IN (SELECT id FROM classes WHERE name = ?)'
        ).bind(quizId, className).first<{ max_attempts: number }>();

        if (assignment) {
            const maxAttempts = Number(assignment.max_attempts) || 1;

            // 2. Count existing results for this student and quiz in the same class
            const countResult = await db.prepare(
                'SELECT COUNT(*) as cnt FROM results WHERE LOWER(TRIM(student_name)) = ? AND LOWER(TRIM(class_name)) = ? AND quiz_id = ?'
            ).bind(normalizeName(studentName), normalizeName(className), quizId).first<{ cnt: number }>();

            const currentAttempts = countResult?.cnt || 0;

            if (currentAttempts >= maxAttempts) {
                return errorResponse(`Bạn đã hết lượt làm bài tập này (${currentAttempts}/${maxAttempts}).`, 403);
            }
        }

        const insertResult = await db.prepare(
            `INSERT INTO results (student_name, class_name, quiz_id, quiz_title, score, correct_count, total_questions, time_taken, submitted_at, answers)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            studentName, className, quizId,
            body.quizTitle || '', body.score || 0, body.correctCount || 0,
            body.totalQuestions || 0, body.timeTaken || 0,
            new Date().toISOString(),
            JSON.stringify(body.answers || {})
        ).run();

        const resultId = insertResult.meta.last_row_id;
        return jsonResponse({ status: 'success', resultId });
    }

    // DELETE /api/results/:id - Delete result
    if (path.match(/^\/api\/results\/[^/]+$/) && method === 'DELETE') {
        const id = path.split('/').pop();
        if (!id) return errorResponse('Result id is required', 400);
        const access = await requireResultAccess(db, user, id);
        if (access instanceof Response) return access;
        if (!requireAdmin(user) && user.role !== 'teacher') {
            return errorResponse('Forbidden: Teacher or admin access required', 403);
        }

        await db.prepare('DELETE FROM results WHERE id = ?').bind(id).run();
        return jsonResponse({ status: 'success' });
    }

    // POST /api/validate - Validate answers (server-side anti-cheat)
    if (path === '/api/validate' && method === 'POST') {
        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');
        if (!requireTeacher(user) && !isStudent(user)) {
            return errorResponse('Forbidden: Authenticated user required', 403);
        }

        return await handleValidateAnswers(db, body);
    }

    return errorResponse('Not found: ' + path, 404);
}
