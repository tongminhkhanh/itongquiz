import { requireTeacherForAssignment, requireTeacherForClass, requireTeacherForStudent } from '../../classroom/authorization';
import type { ClassroomRouteContext } from '../../classroom/types';
import { isStudent, requireTeacher } from '../../middleware/jwtAuth';
import { getSmartAssignmentPreview } from '../../services/smartAssignment';
import { extractIdFromPath, parseBody } from '../../utils/helpers';
import { errorResponse, generateId, jsonResponse } from '../../utils/response';

export async function handleAssignmentCreateRoute(context: ClassroomRouteContext): Promise<Response | null> {
    const { request, path, method, db, nowIso, user } = context;
    // POST /api/assignments
        if (path === '/api/assignments' && method === 'POST') {
            const body = await parseBody(request);
            if (!body) return errorResponse('Invalid JSON body');

            const classError = await requireTeacherForClass(db, user, body.classId);
            if (classError) return classError;
            if (body.studentId) {
                const studentError = await requireTeacherForStudent(db, user, body.studentId);
                if (studentError) return studentError;
            }

            const aId = generateId('a');
            const createdAt = new Date().toISOString();
            await db.prepare(
                'INSERT INTO assignments (id, quiz_id, class_id, student_id, deadline, max_attempts, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            ).bind(aId, body.quizId, body.classId, body.studentId || '', body.deadline, Number(body.maxAttempts) || 1, 'OPEN', createdAt).run();

            return jsonResponse({
                status: 'success',
                data: { id: aId, quizId: body.quizId, classId: body.classId, studentId: body.studentId || '', deadline: body.deadline, maxAttempts: Number(body.maxAttempts) || 1, status: 'OPEN', createdAt },
            });
        }
    return null;
}
