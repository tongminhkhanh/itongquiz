import type { Env } from '../../types';
import { errorResponse, jsonResponse } from '../../utils/response';
import { getActorAccessFromUser, getAuthenticatedUser } from './auth';
import { mapOrder } from './mappers';
import { ORDER_SELECT } from './orderRepository';
import type { GiftOrderRow } from './types';
import { normalizeStatus } from './values';

export const handleOrderList = async (request: Request, env: Env): Promise<Response> => {
    const url = new URL(request.url);
    const studentId = String(url.searchParams.get('studentId') || '').trim();
    const classId = String(url.searchParams.get('classId') || '').trim();
    const userOrResponse = await getAuthenticatedUser(request, env);
    if (userOrResponse instanceof Response) return userOrResponse;

    const actorAccess = getActorAccessFromUser(userOrResponse);
    const status = normalizeStatus(url.searchParams.get('status'));
    const hasStudentScope = Boolean(studentId);
    const hasStaffScope = actorAccess.isAdmin || Boolean(actorAccess.teacherClass);
    if (!hasStudentScope && !hasStaffScope) {
        return errorResponse('Teacher class assignment not found', 403);
    }

    const effectiveClassScope = actorAccess.isAdmin ? classId : (actorAccess.teacherClass || '');
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (studentId) {
        conditions.push('o.student_id = ?');
        params.push(studentId);
    }
    if (effectiveClassScope) {
        conditions.push('(o.class_id = ? OR c.name = ?)');
        params.push(effectiveClassScope, effectiveClassScope);
    }
    if (status && status !== 'ALL') {
        conditions.push('o.status = ?');
        params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `${ORDER_SELECT} ${whereClause} ORDER BY datetime(o.updated_at) DESC`;
    let stmt = env.DB.prepare(query);
    if (params.length > 0) stmt = stmt.bind(...params);

    const rows = await stmt.all<GiftOrderRow>();
    return jsonResponse((rows.results || []).map(mapOrder));
};
