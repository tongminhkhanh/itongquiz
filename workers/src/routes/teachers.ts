// Teachers API Routes
// GET /api/teachers - List all teachers
// POST /api/teachers - Create teacher
// PUT /api/teachers/:username - Update teacher
// DELETE /api/teachers/:username - Delete teacher
// POST /api/login - Teacher login

import { Env } from '../types';
import { jsonResponse, errorResponse, hashPassword } from '../utils/response';
import { parseBody } from '../utils/helpers';
import { signJWT, createJWTCookie } from '../utils/jwt';
import { verifyJWTMiddleware, requireAdmin, requireTeacher } from '../middleware/jwtAuth';

export async function handleTeacherRoutes(request: Request, env: Env, path: string, method: string): Promise<Response> {
    const db = env.DB;

    // POST /api/login remains public because it creates the JWT session.
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

        // SECURITY: Generate JWT token for teacher session
        if (!env.JWT_SECRET) {
            console.error('[Teacher Login] JWT_SECRET not configured');
            return errorResponse('Authentication service unavailable', 503);
        }

        const jwtToken = await signJWT(
            {
                username: teacher.username,
                role: teacher.role === 'admin' ? 'admin' : 'teacher',
                fullName: teacher.full_name,
            },
            env.JWT_SECRET,
            '7d' // 7 days expiration
        );

        const response = jsonResponse({
            status: 'success',
            data: {
                username: teacher.username,
                fullName: teacher.full_name,
                role: teacher.role,
                class: teacher.class,
                token: jwtToken,
            },
        });

        // Set JWT cookie
        const headers = new Headers(response.headers);
        headers.append('Set-Cookie', createJWTCookie(jwtToken));

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
        });
    }

    const authResult = await verifyJWTMiddleware(request, env);
    if (authResult instanceof Response) {
        return authResult;
    }

    const { user } = authResult;
    if (!requireTeacher(user)) {
        return errorResponse('Forbidden: Teacher access required', 403);
    }

    const requireAdminForMutation = () => {
        if (!requireAdmin(user)) {
            return errorResponse('Forbidden: Admin access required', 403);
        }
        return null;
    };

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

        const adminError = requireAdminForMutation();
        if (adminError) return adminError;

        const { username, password, fullName, role, teacherClass } = body;
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

        const adminError = requireAdminForMutation();
        if (adminError) return adminError;

        const { password, fullName, role, teacherClass } = body;

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

        const adminError = requireAdminForMutation();
        if (adminError) return adminError;

        await db.prepare('DELETE FROM teachers WHERE username = ?').bind(targetUsername).run();
        return jsonResponse({ status: 'success', message: `Đã xóa tài khoản "${targetUsername}".` });
    }

    return errorResponse('Not found: ' + path, 404);
}
