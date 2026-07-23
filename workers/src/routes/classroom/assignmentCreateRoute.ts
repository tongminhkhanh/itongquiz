import { requireTeacherForClass, requireTeacherForStudent } from '../../classroom/authorization';
import type { ClassroomRouteContext } from '../../classroom/types';
import { parseBody } from '../../utils/helpers';
import { errorResponse, generateId, jsonResponse } from '../../utils/response';

export async function handleAssignmentCreateRoute(context: ClassroomRouteContext): Promise<Response | null> {
    const { request, path, method, db, nowIso, user } = context;
    if (path !== '/api/assignments' || method !== 'POST') return null;

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid JSON body');

    const quizId = String(body.quizId || '').trim();
    const classId = String(body.classId || '').trim();
    const studentId = String(body.studentId || '').trim();
    const maxAttempts = Number(body.maxAttempts);
    const deadlineMs = Date.parse(String(body.deadline || ''));
    const nowMs = Date.parse(nowIso);

    if (!quizId) return errorResponse('quizId is required');
    if (!classId) return errorResponse('classId is required');
    if (!Number.isFinite(deadlineMs)) return errorResponse('deadline must be a valid date');
    if (deadlineMs <= nowMs) return errorResponse('deadline must be in the future');
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
        return errorResponse('maxAttempts must be an integer from 1 to 10');
    }

    const classError = await requireTeacherForClass(db, user, classId);
    if (classError) return classError;

    const quiz = await db.prepare('SELECT id FROM quizzes WHERE id = ?').bind(quizId).first<{ id: string }>();
    if (!quiz) return errorResponse('Quiz not found', 404);

    if (studentId) {
        const studentError = await requireTeacherForStudent(db, user, studentId);
        if (studentError) return studentError;
        const studentInClass = await db.prepare('SELECT id FROM students WHERE id = ? AND class_id = ?')
            .bind(studentId, classId).first<{ id: string }>();
        if (!studentInClass) return errorResponse('studentId must belong to classId');
    }

    const existing = await db.prepare(
        `SELECT id FROM assignments
         WHERE quiz_id = ? AND class_id = ? AND COALESCE(student_id, '') = ?
           AND status = 'OPEN' AND deadline > ?
         LIMIT 1`
    ).bind(quizId, classId, studentId, nowIso).first<{ id: string }>();
    if (existing) {
        return jsonResponse({
            status: 'error',
            message: 'An open assignment already exists for this quiz and audience',
            existingAssignmentId: existing.id,
        }, 409);
    }

    const id = generateId('a');
    const deadline = new Date(deadlineMs).toISOString();
    await db.prepare(
        'INSERT INTO assignments (id, quiz_id, class_id, student_id, deadline, max_attempts, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, quizId, classId, studentId, deadline, maxAttempts, 'OPEN', nowIso).run();

    return jsonResponse({
        status: 'success',
        data: { id, quizId, classId, studentId, deadline, maxAttempts, status: 'OPEN', createdAt: nowIso },
    });
}
