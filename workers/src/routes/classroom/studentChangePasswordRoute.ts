import { canAccessClass, requireTeacherForClass, requireTeacherForStudent } from '../../classroom/authorization';
import { getClassroomById, getStudentById } from '../../classroom/repositories';
import type { ClassroomRouteContext } from '../../classroom/types';
import { normalizeStudentInput, validateStudentInput } from '../../classroom/validation';
import { isStudent } from '../../middleware/jwtAuth';
import { extractIdFromPath, parseBody } from '../../utils/helpers';
import { errorResponse, generateId, hashPassword, jsonResponse, verifyPassword } from '../../utils/response';
import { buildAuthSessionData, withAuthCookie } from '../../utils/authSession';
import { signJWT } from '../../utils/jwt';

export async function handleStudentChangePasswordRoute(context: ClassroomRouteContext): Promise<Response | null> {
    const { request, path, method, db, url, nowIso, user, env } = context;
    // POST /api/students/:id/change-password
        if (path.match(/\/api\/students\/[^/]+\/change-password/) && method === 'POST') {
            const parts = path.split('/');
            const studentId = parts[3]; // /api/students/{id}/change-password
            if (!studentId) return errorResponse('Missing student ID');

            const body = await parseBody(request);
            if (!body) return errorResponse('Invalid JSON body');

            const student = await getStudentById(db, studentId);
            if (!student) return errorResponse('Student not found', 404);
            if (!isStudent(user) || user.username !== student.username) {
                return errorResponse('Forbidden: You can only change your own password', 403);
            }

            const currentPassword = String(body.currentPassword || '').trim();
            const newPassword = String(body.newPassword || '').trim();
            if (!currentPassword || !newPassword) {
                return errorResponse('Missing currentPassword or newPassword');
            }
            if (newPassword.length < 6) {
                return errorResponse('Mật khẩu mới phải từ 6 ký tự.', 400);
            }

            const studentWithPassword = await db.prepare(
                'SELECT id, username, full_name, class_id, password_hash, token_version FROM students WHERE id = ?'
            ).bind(studentId).first<any>();
            if (!studentWithPassword) return errorResponse('Student not found', 404);

            const currentPasswordCheck = await verifyPassword(currentPassword, String(studentWithPassword.password_hash || ''));
            if (!currentPasswordCheck.valid) {
                return errorResponse('Mật khẩu cũ không đúng.', 400);
            }

            const newHash = await hashPassword(newPassword);
            const nextTokenVersion = Number(studentWithPassword.token_version || 0) + 1;
            await db.prepare(
                'UPDATE students SET password_hash = ?, token_version = token_version + 1 WHERE id = ?'
            ).bind(newHash, studentId).run();
            if (!env.JWT_SECRET) return errorResponse('Authentication service unavailable', 503);
            const token = await signJWT({
                id: studentWithPassword.id,
                username: studentWithPassword.username || user.username,
                role: 'student',
                fullName: studentWithPassword.full_name || user.fullName,
                classId: studentWithPassword.class_id || user.classId,
                tokenVersion: nextTokenVersion,
            }, env.JWT_SECRET, '7d');
            const response = jsonResponse({
                status: 'success',
                data: buildAuthSessionData(env, {}, token),
            });
            return withAuthCookie(response, token);
        }
    return null;
}
