// Teachers API Routes
// GET /api/teachers - List all teachers
// POST /api/login - Teacher login

import { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';
import { parseBody } from '../utils/helpers';

export async function handleTeacherRoutes(request: Request, env: Env, path: string, method: string): Promise<Response> {
    const db = env.DB;

    // GET /api/teachers
    if (path === '/api/teachers' && method === 'GET') {
        const rows = await db.prepare('SELECT * FROM teachers').all();
        return jsonResponse(rows.results);
    }

    // POST /api/login
    if (path === '/api/login' && method === 'POST') {
        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        const { username, password } = body;
        if (!username || !password) return errorResponse('Missing username or password');

        const teacher = await db.prepare(
            'SELECT * FROM teachers WHERE username = ? AND password = ?'
        ).bind(username, password).first<any>();

        if (!teacher) {
            return jsonResponse({ status: 'error', message: 'Sai tên đăng nhập hoặc mật khẩu.' });
        }

        return jsonResponse({
            status: 'success',
            data: {
                username: teacher.username,
                fullName: teacher.full_name,
                role: teacher.role,
                class: teacher.class,
            },
        });
    }

    return errorResponse('Not found: ' + path, 404);
}
