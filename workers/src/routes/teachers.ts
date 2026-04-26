// Teachers API Routes
// GET /api/teachers - List all teachers
// POST /api/teachers - Create teacher
// PUT /api/teachers/:username - Update teacher
// DELETE /api/teachers/:username - Delete teacher
// POST /api/login - Teacher login

import { Env } from '../types';
import { jsonResponse, errorResponse, hashPassword } from '../utils/response';
import { parseBody } from '../utils/helpers';

const isAdminActor = async (db: D1Database, actorUsername: string): Promise<boolean> => {
    const username = String(actorUsername || '').trim();
    if (!username) return false;
    const actor = await db.prepare('SELECT role FROM teachers WHERE username = ?').bind(username).first<any>();
    return String(actor?.role || '').trim().toLowerCase() === 'admin';
};

export async function handleTeacherRoutes(request: Request, env: Env, path: string, method: string): Promise<Response> {
    const db = env.DB;
    const url = new URL(request.url);

    // GET /api/teachers
    if (path === '/api/teachers' && method === 'GET') {
        const rows = await db.prepare(
            'SELECT username, full_name, role, class FROM teachers'
        ).all<{
            username: string;
            full_name: string;
            role: string;
            class: string;
        }>();

        return jsonResponse((rows.results || []).map((teacher) => ({
            username: teacher.username,
            fullName: teacher.full_name,
            full_name: teacher.full_name,
            role: teacher.role,
            class: teacher.class,
        })));
    }

    // POST /api/teachers - Create teacher
    if (path === '/api/teachers' && method === 'POST') {
        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        const { username, password, fullName, role, teacherClass, actorUsername } = body;
        if (!actorUsername) return errorResponse('Missing actorUsername');
        if (!(await isAdminActor(db, actorUsername))) return errorResponse('Forbidden', 403);
        if (!username || !password || !fullName) {
            return errorResponse('Missing required fields: username, password, fullName');
        }

        // Check if username already exists
        const existing = await db.prepare('SELECT username FROM teachers WHERE username = ?').bind(username).first();
        if (existing) {
            return jsonResponse({ status: 'error', message: `Tài khoản "${username}" đã tồn tại.` });
        }

        const hashedPassword = await hashPassword(password);
        await db.prepare(
            `INSERT INTO teachers (username, password, full_name, role, class) VALUES (?, ?, ?, ?, ?)`
        ).bind(
            username, hashedPassword, fullName, role || 'teacher', teacherClass || ''
        ).run();

        return jsonResponse({ status: 'success', message: `Đã tạo tài khoản giáo viên "${fullName}".` });
    }

    // PUT /api/teachers/:username - Update teacher
    if (path.startsWith('/api/teachers/') && method === 'PUT') {
        const targetUsername = decodeURIComponent(path.split('/api/teachers/')[1]);
        if (!targetUsername) return errorResponse('Missing username');

        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        const { password, fullName, role, teacherClass, actorUsername } = body;
        if (!actorUsername) return errorResponse('Missing actorUsername');
        if (!(await isAdminActor(db, actorUsername))) return errorResponse('Forbidden', 403);

        // Build dynamic SET clause
        const updates: string[] = [];
        const values: any[] = [];

        if (password) {
            const hashedPassword = await hashPassword(password);
            updates.push('password = ?');
            values.push(hashedPassword);
        }
        if (fullName) { updates.push('full_name = ?'); values.push(fullName); }
        if (role) { updates.push('role = ?'); values.push(role); }
        if (teacherClass !== undefined) { updates.push('class = ?'); values.push(teacherClass); }

        if (updates.length === 0) return errorResponse('No fields to update');

        values.push(targetUsername);
        await db.prepare(`UPDATE teachers SET ${updates.join(', ')} WHERE username = ?`).bind(...values).run();

        return jsonResponse({ status: 'success', message: `Đã cập nhật tài khoản "${targetUsername}".` });
    }

    // DELETE /api/teachers/:username - Delete teacher
    if (path.startsWith('/api/teachers/') && method === 'DELETE') {
        const targetUsername = decodeURIComponent(path.split('/api/teachers/')[1]);
        if (!targetUsername) return errorResponse('Missing username');
        const actorUsername = String(url.searchParams.get('actorUsername') || '').trim();
        if (!actorUsername) return errorResponse('Missing actorUsername');
        if (!(await isAdminActor(db, actorUsername))) return errorResponse('Forbidden', 403);

        await db.prepare('DELETE FROM teachers WHERE username = ?').bind(targetUsername).run();
        return jsonResponse({ status: 'success', message: `Đã xóa tài khoản "${targetUsername}".` });
    }

    // POST /api/login
    if (path === '/api/login' && method === 'POST') {
        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        const { username, password } = body;
        if (!username || !password) return errorResponse('Missing username or password');

        const hashedPassword = await hashPassword(password);
        let teacher = await db.prepare(
            'SELECT * FROM teachers WHERE username = ? AND password = ?'
        ).bind(username, hashedPassword).first<any>();

        // Lazy Migration: If hash login fails, try plain text login
        if (!teacher) {
            teacher = await db.prepare(
                'SELECT * FROM teachers WHERE username = ? AND password = ?'
            ).bind(username, password).first<any>();

            if (teacher) {
                // Auto-hash and update the plain text password
                await db.prepare('UPDATE teachers SET password = ? WHERE username = ?')
                    .bind(hashedPassword, username).run();
                console.log(`[Lazy Migration] Password hashed for user: ${username}`);
            }
        }

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
