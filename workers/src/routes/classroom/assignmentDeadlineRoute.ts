import { requireTeacherForAssignment, requireTeacherForClass, requireTeacherForStudent } from '../../classroom/authorization';
import type { ClassroomRouteContext } from '../../classroom/types';
import { isStudent, requireTeacher } from '../../middleware/jwtAuth';
import { getSmartAssignmentPreview } from '../../services/smartAssignment';
import { extractIdFromPath, parseBody } from '../../utils/helpers';
import { errorResponse, generateId, jsonResponse } from '../../utils/response';

export async function handleAssignmentDeadlineRoute(context: ClassroomRouteContext): Promise<Response | null> {
    const { request, path, method, db, nowIso, user } = context;
    // PUT /api/assignments/:id/deadline
        if (path.match(/\/api\/assignments\/[^/]+\/deadline/) && method === 'PUT') {
            const parts = path.split('/');
            const assignmentId = parts[3];
            if (!assignmentId) return errorResponse('Missing assignment ID');

            const assignmentError = await requireTeacherForAssignment(db, user, assignmentId);
            if (assignmentError) return assignmentError;

            const body = await parseBody(request);
            if (!body) return errorResponse('Invalid JSON body');

            const newDeadline = new Date(body.newDeadline);
            const newStatus = newDeadline > new Date() ? 'OPEN' : undefined;
            if (newStatus) {
                await db.prepare('UPDATE assignments SET deadline = ?, status = ? WHERE id = ?')
                    .bind(body.newDeadline, newStatus, assignmentId).run();
            } else {
                await db.prepare('UPDATE assignments SET deadline = ? WHERE id = ?')
                    .bind(body.newDeadline, assignmentId).run();
            }
            return jsonResponse({ status: 'success', data: { assignmentId, newDeadline: body.newDeadline, status: newStatus || 'CLOSED' } });
        }
    return null;
}
