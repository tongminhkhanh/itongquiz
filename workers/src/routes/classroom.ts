// Classroom API Routes (Classes, Students, Assignments)
// Handles classes, students, student-login, and assignments

import { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';
import { mapAssignment, mapAssignments, hashSHA256, parseBody, extractIdFromPath } from '../utils/helpers';
import { generateId, hashPassword } from '../utils/response';

export async function handleClassroomRoutes(request: Request, env: Env, path: string, method: string): Promise<Response> {
    const db = env.DB;
    const url = new URL(request.url);

    // ===== CLASSES =====

    // GET /api/classes
    if (path === '/api/classes' && method === 'GET') {
        const teacherUsername = url.searchParams.get('teacherUsername');
        let query = `
            SELECT
                c.*,
                t.full_name AS teacher_full_name
            FROM classes c
            LEFT JOIN teachers t ON t.username = c.teacher_username
        `;
        const params: any[] = [];
        if (teacherUsername) {
            query += ' WHERE c.teacher_username = ?';
            params.push(teacherUsername);
        }
        const rows = await db.prepare(query).bind(...params).all();
        return jsonResponse({
            status: 'success',
            data: rows.results.map((r: any) => ({
                id: r.id,
                name: r.name,
                teacherUsername: r.teacher_username,
                teacherFullName: r.teacher_full_name || '',
                createdAt: r.created_at,
            })),
        });
    }

    // POST /api/classes
    if (path === '/api/classes' && method === 'POST') {
        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        const id = generateId('c');
        const createdAt = new Date().toISOString();
        await db.prepare('INSERT INTO classes (id, name, teacher_username, created_at) VALUES (?, ?, ?, ?)')
            .bind(id, body.name, body.teacherUsername, createdAt).run();

        const teacher = await db.prepare('SELECT full_name FROM teachers WHERE username = ?')
            .bind(body.teacherUsername || '')
            .first<any>();

        return jsonResponse({
            status: 'success',
            data: {
                id,
                name: body.name,
                teacherUsername: body.teacherUsername,
                teacherFullName: teacher?.full_name || '',
                createdAt,
            },
        });
    }

    // PATCH /api/classes/:id/teacher
    if (path.match(/\/api\/classes\/[^/]+\/teacher/) && method === 'PATCH') {
        const parts = path.split('/');
        const classId = parts[3]; // /api/classes/{id}/teacher
        if (!classId) return errorResponse('Missing class ID');

        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        const actorUsername = String(body.actorUsername || '').trim();
        const newTeacherUsername = String(body.teacherUsername || '').trim();
        if (!actorUsername) return errorResponse('Missing actorUsername');
        if (!newTeacherUsername) return errorResponse('Missing teacherUsername');

        const actor = await db.prepare('SELECT role FROM teachers WHERE username = ?').bind(actorUsername).first<any>();
        const actorRole = String(actor?.role || '').trim().toLowerCase();
        if (actorRole !== 'admin') {
            return errorResponse('Forbidden', 403);
        }

        const classroom = await db.prepare('SELECT id, name, teacher_username, created_at FROM classes WHERE id = ?')
            .bind(classId)
            .first<any>();
        if (!classroom) return errorResponse('Class not found', 404);

        const teacher = await db.prepare('SELECT username, full_name FROM teachers WHERE username = ?')
            .bind(newTeacherUsername)
            .first<any>();
        if (!teacher) return errorResponse('Teacher not found', 404);

        const className = String(classroom.name || '').trim();
        const oldTeacherUsername = String(classroom.teacher_username || '').trim();

        const conflictClass = await db.prepare(`
            SELECT id, name
            FROM classes
            WHERE teacher_username = ?
              AND id <> ?
            LIMIT 1
        `).bind(newTeacherUsername, classId).first<any>();
        if (conflictClass) {
            return errorResponse(
                `Giáo viên "${newTeacherUsername}" đang phụ trách lớp "${conflictClass.name}". Vui lòng chuyển lớp đó trước.`,
                409
            );
        }

        await db.prepare('UPDATE classes SET teacher_username = ? WHERE id = ?').bind(newTeacherUsername, classId).run();

        if (oldTeacherUsername && oldTeacherUsername !== newTeacherUsername) {
            await db.prepare('UPDATE teachers SET class = ? WHERE username = ? AND class = ?')
                .bind('', oldTeacherUsername, className)
                .run();
        }

        await db.prepare('UPDATE teachers SET class = ? WHERE username = ?')
            .bind(className, newTeacherUsername)
            .run();

        return jsonResponse({
            status: 'success',
            data: {
                id: classroom.id,
                name: classroom.name,
                teacherUsername: newTeacherUsername,
                teacherFullName: teacher.full_name || '',
                createdAt: classroom.created_at,
            },
        });
    }

    // DELETE /api/classes/:id
    if (path.startsWith('/api/classes/') && method === 'DELETE') {
        const classId = extractIdFromPath(path, '/api/classes');
        if (!classId) return errorResponse('Missing class ID');

        await db.prepare('DELETE FROM students WHERE class_id = ?').bind(classId).run();
        await db.prepare('DELETE FROM assignments WHERE class_id = ?').bind(classId).run();
        await db.prepare('DELETE FROM classes WHERE id = ?').bind(classId).run();
        return jsonResponse({ status: 'success' });
    }

    // ===== STUDENTS =====

    // GET /api/students?classId=X
    if (path === '/api/students' && method === 'GET') {
        const classId = url.searchParams.get('classId');
        if (!classId) return errorResponse('Missing classId parameter');

        const role = url.searchParams.get('role') || '';
        const students = await db.prepare('SELECT * FROM students WHERE class_id = ?').bind(classId).all();
        const mapped = students.results.map((s: any) => {
            const base: any = { id: s.id, fullName: s.full_name, username: s.username, classId: s.class_id, avatar: s.avatar || '' };
            if (role !== 'student') {
                base.parentPhone = s.parent_phone || '';
                base.createdAt = s.created_at;
            }
            return base;
        });
        return jsonResponse({ status: 'success', data: mapped });
    }

    // POST /api/students
    if (path === '/api/students' && method === 'POST') {
        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        // Check duplicate username
        const existing = await db.prepare('SELECT id FROM students WHERE username = ?').bind(body.username).first();
        if (existing) return jsonResponse({ status: 'error', message: 'Tên đăng nhập đã tồn tại: ' + body.username });

        const pwdHash = await hashPassword(body.password);
        const sId = generateId('s');
        const createdAt = new Date().toISOString();

        await db.prepare(
            'INSERT INTO students (id, full_name, username, password_hash, class_id, parent_phone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(sId, body.fullName, body.username, pwdHash, body.classId, body.parentPhone || '', createdAt).run();

        return jsonResponse({
            status: 'success',
            data: { id: sId, fullName: body.fullName, username: body.username, classId: body.classId, parentPhone: body.parentPhone || '', createdAt },
        });
    }

    // POST /api/students/batch
    if (path === '/api/students/batch' && method === 'POST') {
        const body = await parseBody(request);
        if (!body || !Array.isArray(body.students)) return errorResponse('Invalid JSON body');

        if (body.students.length === 0) {
            return jsonResponse({ status: 'success', data: { successCount: 0, errorCount: 0, successes: [], errors: [] }});
        }

        // 1. Get existing usernames to avoid duplicates
        const usernames = body.students.map((s: any) => s.username);
        // SQLite has a limit on variables, but 50-100 is fine.
        const placeholders = usernames.map(() => '?').join(',');
        const existingResults = await db.prepare(
            `SELECT username FROM students WHERE username IN (${placeholders})`
        ).bind(...usernames).all();
        
        const existingUsernames = new Set(existingResults.results.map((r: any) => r.username));

        const stmts = [];
        const successList = [];
        const errorList = [];

        for (const student of body.students) {
            if (existingUsernames.has(student.username)) {
                errorList.push({ username: student.username, fullName: student.fullName, reason: 'Tên đăng nhập đã tồn tại' });
                continue;
            }

            const pwdHash = await hashPassword(student.password);
            const sId = generateId('s');
            const createdAt = new Date().toISOString();
            
            // In D1, batch expects an array of statement objects. 
            // Return from db.prepare(...) is the statement.
            stmts.push(db.prepare(
                'INSERT INTO students (id, full_name, username, password_hash, class_id, parent_phone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
            ).bind(sId, student.fullName, student.username, pwdHash, student.classId, student.parentPhone || '', createdAt));

            successList.push({ id: sId, fullName: student.fullName, username: student.username, classId: student.classId, parentPhone: student.parentPhone || '', createdAt });
            // Add to Set to prevent duplicates within the same batch payload
            existingUsernames.add(student.username);
        }

        if (stmts.length > 0) {
            try {
                await db.batch(stmts);
            } catch (dbErr: any) {
                return errorResponse(`Database batch error: ${dbErr.cause?.message || dbErr.message}`);
            }
        }

        return jsonResponse({
            status: 'success',
            data: { successCount: successList.length, errorCount: errorList.length, successes: successList, errors: errorList }
        });
    }

    // DELETE /api/students/:id
    if (
        path.startsWith('/api/students/')
        && !path.includes('/reset-password')
        && !path.includes('/change-password')
        && !path.includes('/avatar')
        && method === 'DELETE'
    ) {
        const studentId = extractIdFromPath(path, '/api/students');
        if (!studentId) return errorResponse('Missing student ID');

        await db.prepare('DELETE FROM students WHERE id = ?').bind(studentId).run();
        return jsonResponse({ status: 'success' });
    }

    // POST /api/students/:id/change-password
    if (path.match(/\/api\/students\/[^/]+\/change-password/) && method === 'POST') {
        const parts = path.split('/');
        const studentId = parts[3]; // /api/students/{id}/change-password
        if (!studentId) return errorResponse('Missing student ID');

        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        const currentPassword = String(body.currentPassword || '').trim();
        const newPassword = String(body.newPassword || '').trim();
        if (!currentPassword || !newPassword) {
            return errorResponse('Missing currentPassword or newPassword');
        }
        if (newPassword.length < 6) {
            return errorResponse('Mật khẩu mới phải từ 6 ký tự.', 400);
        }

        const student = await db.prepare('SELECT id, password_hash FROM students WHERE id = ?').bind(studentId).first<any>();
        if (!student) return errorResponse('Student not found', 404);

        const currentHash = await hashPassword(currentPassword);
        if (String(student.password_hash || '') !== currentHash) {
            return errorResponse('Mật khẩu cũ không đúng.', 400);
        }

        const newHash = await hashPassword(newPassword);
        await db.prepare('UPDATE students SET password_hash = ? WHERE id = ?').bind(newHash, studentId).run();
        return jsonResponse({ status: 'success' });
    }

    // POST /api/students/:id/reset-password
    if (path.match(/\/api\/students\/[^/]+\/reset-password/) && method === 'POST') {
        const parts = path.split('/');
        const studentId = parts[3]; // /api/students/{id}/reset-password
        if (!studentId) return errorResponse('Missing student ID');

        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        const actorUsername = String(body.actorUsername || '').trim();
        const newPassword = String(body.newPassword || '').trim();
        if (!actorUsername) return errorResponse('Missing actorUsername');
        if (!newPassword) return errorResponse('Missing newPassword');
        if (newPassword.length < 6) {
            return errorResponse('Mật khẩu mới phải từ 6 ký tự.', 400);
        }

        const actor = await db.prepare('SELECT role FROM teachers WHERE username = ?').bind(actorUsername).first<any>();
        const actorRole = String(actor?.role || '').toLowerCase();
        if (actorRole !== 'admin') {
            return errorResponse('Forbidden', 403);
        }

        const student = await db.prepare('SELECT id FROM students WHERE id = ?').bind(studentId).first<any>();
        if (!student) return errorResponse('Student not found', 404);

        const hash = await hashPassword(newPassword);
        await db.prepare('UPDATE students SET password_hash = ? WHERE id = ?').bind(hash, studentId).run();
        return jsonResponse({ status: 'success' });
    }

    // PUT /api/students/:id/avatar
    if (path.match(/\/api\/students\/[^/]+\/avatar/) && method === 'PUT') {
        const parts = path.split('/');
        const studentId = parts[3]; // /api/students/{id}/avatar
        if (!studentId) return errorResponse('Missing student ID');

        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        await db.prepare('UPDATE students SET avatar = ? WHERE id = ?').bind(body.avatar || '', studentId).run();
        return jsonResponse({ status: 'success', data: { avatar: body.avatar } });
    }

    // ===== STUDENT LOGIN =====

    // POST /api/student-login
    if (path === '/api/student-login' && method === 'POST') {
        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        const inputHash = await hashPassword(body.password);
        const student = await db.prepare('SELECT * FROM students WHERE username = ? AND password_hash = ?')
            .bind(body.username, inputHash).first<any>();

        if (!student) return jsonResponse({ status: 'error', message: 'Sai tên đăng nhập hoặc mật khẩu.' });

        const cls = await db.prepare('SELECT name FROM classes WHERE id = ?').bind(student.class_id).first<any>();
        const pet = await db.prepare('SELECT * FROM user_pets WHERE username = ?').bind(student.username).first<any>();
        const shopItems = await db.prepare('SELECT * FROM shop_items').all();

        // Update pet lastActive
        if (pet) {
            await db.prepare('UPDATE user_pets SET last_active = ?, mood = ? WHERE username = ?')
                .bind(new Date().toISOString(), 'happy', student.username).run();
        }

        const petData = pet ? {
            petId: pet.pet_id, petName: pet.pet_name,
            level: Number(pet.level) || 1, exp: Number(pet.exp) || 0,
            expToNext: Number(pet.exp_to_next) || 100, mood: pet.mood || 'happy',
            items: pet.items ? JSON.parse(pet.items as string) : [],
            lastActive: pet.last_active || '', imageUrl: pet.image_url || '',
        } : null;

        return jsonResponse({
            status: 'success',
            data: {
                studentId: student.id, fullName: student.full_name, username: student.username,
                classId: student.class_id, className: cls?.name || '', avatar: student.avatar || '',
                coins: Number(student.coins) || 0, pet: petData,
                shopItems: shopItems.results.map((i: any) => ({
                    itemId: i.item_id, name: i.name, price: Number(i.price) || 0,
                    type: i.type || 'ACCESSORY', category: i.category || '', assetUrl: i.asset_url || '',
                })),
            },
        });
    }

    // ===== ASSIGNMENTS =====

    // GET /api/assignments
    if (path === '/api/assignments' && method === 'GET') {
        const classId = url.searchParams.get('classId');
        const teacherUsername = url.searchParams.get('teacherUsername');
        const studentId = url.searchParams.get('studentId');
        const all = url.searchParams.get('all');

        // Auto-close expired
        await db.prepare(`UPDATE assignments SET status = 'CLOSED' WHERE status = 'OPEN' AND deadline < ?`)
            .bind(new Date().toISOString()).run();

        // Get all assignments (for teacher dashboard)
        if (all === 'true') {
            const assignments = await db.prepare(`
                SELECT 
                    a.*, 
                    c.name as class_name, 
                    q.title as quiz_title, 
                    s.full_name as student_name,
                    (SELECT COUNT(*) FROM students WHERE class_id = a.class_id) as total_students,
                    (
                        SELECT COUNT(DISTINCT r.student_name) 
                        FROM results r 
                        WHERE r.quiz_id = a.quiz_id 
                        AND (r.class_name = c.name OR r.class_name = 'Lớp ' || c.name OR REPLACE(r.class_name, 'Lớp ', '') = c.name)
                        AND r.answers != '{"status":"STARTED"}'
                    ) as submitted_count
                FROM assignments a
                LEFT JOIN classes c ON a.class_id = c.id
                LEFT JOIN quizzes q ON a.quiz_id = q.id
                LEFT JOIN students s ON a.student_id = s.id
            `).all();

            const mapped = assignments.results.map((a: any) => ({
                ...mapAssignment(a),
                className: a.class_name || '',
                quizTitle: a.quiz_title || 'Bài tập',
                studentName: a.student_name || '',
                totalStudents: Number(a.total_students) || 0,
                submittedCount: Number(a.submitted_count) || 0
            }));
            return jsonResponse({ status: 'success', data: mapped });
        }

        // Get teacher assignments
        if (teacherUsername) {
            const teacherClasses = await db.prepare('SELECT id FROM classes WHERE teacher_username = ?').bind(teacherUsername).all();
            const classIds = teacherClasses.results.map((c: any) => c.id);
            if (classIds.length === 0) return jsonResponse({ status: 'success', data: [] });

            const placeholders = classIds.map(() => '?').join(',');
            const assignments = await db.prepare(`
                SELECT 
                    a.*, 
                    c.name as class_name, 
                    s.full_name as student_name,
                    (SELECT COUNT(*) FROM students WHERE class_id = a.class_id) as total_students,
                    (
                        SELECT COUNT(DISTINCT r.student_name) 
                        FROM results r 
                        WHERE r.quiz_id = a.quiz_id 
                        AND (r.class_name = c.name OR r.class_name = 'Lớp ' || c.name OR REPLACE(r.class_name, 'Lớp ', '') = c.name)
                        AND r.answers != '{"status":"STARTED"}'
                    ) as submitted_count
                FROM assignments a 
                LEFT JOIN classes c ON a.class_id = c.id 
                LEFT JOIN students s ON a.student_id = s.id 
                WHERE a.class_id IN (${placeholders})
            `).bind(...classIds).all();

            const mapped = assignments.results.map((a: any) => ({
                ...mapAssignment(a),
                className: a.class_name || '',
                studentName: a.student_name || '',
                totalStudents: Number(a.total_students) || 0,
                submittedCount: Number(a.submitted_count) || 0
            }));
            return jsonResponse({ status: 'success', data: mapped });
        }

        // Get student assignments
        if (studentId) {
            const stu = await db.prepare('SELECT * FROM students WHERE id = ?').bind(studentId).first<any>();
            if (!stu) return jsonResponse({ status: 'error', message: 'Student not found' });

            const asns = await db.prepare(
                `SELECT * FROM assignments WHERE class_id = ? AND (student_id = '' OR student_id = ?)`
            ).bind(stu.class_id, stu.id).all();

            if (asns.results.length === 0) {
                return jsonResponse({ status: 'success', data: [] });
            }

            const quizIds = [...new Set(asns.results.map((a: any) => a.quiz_id))];
            const placeholders = quizIds.map(() => '?').join(',');

            const countsQuery = `SELECT quiz_id, COUNT(*) as cnt FROM results WHERE student_name = ? AND quiz_id IN (${placeholders}) AND answers != '{"status":"STARTED"}' GROUP BY quiz_id`;
            const countsResult = await db.prepare(countsQuery).bind(stu.full_name, ...quizIds).all();

            const countMap = new Map();
            for (const row of countsResult.results as any[]) {
                countMap.set(row.quiz_id, row.cnt);
            }

            const mapped = asns.results.map((a: any) => ({
                ...mapAssignment(a),
                attemptCount: countMap.get(a.quiz_id) || 0,
                maxAttempts: Number(a.max_attempts) || 1,
            }));

            return jsonResponse({ status: 'success', data: mapped });
        }

        // Get assignments by classId
        if (classId) {
            const rows = await db.prepare(`
                SELECT a.*, s.full_name as student_name 
                FROM assignments a 
                LEFT JOIN students s ON a.student_id = s.id 
                WHERE a.class_id = ?
            `).bind(classId).all();
            const mapped = rows.results.map((a: any) => ({
                ...mapAssignment(a), studentName: a.student_name || ''
            }));
            return jsonResponse({ status: 'success', data: mapped });
        }

        return errorResponse('Missing query parameter: classId, teacherUsername, studentId, or all=true');
    }

    // POST /api/assignments
    if (path === '/api/assignments' && method === 'POST') {
        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

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

    // DELETE /api/assignments/:id
    if (path.startsWith('/api/assignments/') && !path.includes('/deadline') && !path.includes('/status') && !path.includes('/start') && method === 'DELETE') {
        const assignmentId = extractIdFromPath(path, '/api/assignments');
        if (!assignmentId) return errorResponse('Missing assignment ID');

        await db.prepare('DELETE FROM assignments WHERE id = ?').bind(assignmentId).run();
        return jsonResponse({ status: 'success' });
    }

    // PUT /api/assignments/:id/deadline
    if (path.match(/\/api\/assignments\/[^/]+\/deadline/) && method === 'PUT') {
        const parts = path.split('/');
        const assignmentId = parts[3];
        if (!assignmentId) return errorResponse('Missing assignment ID');

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

    // PUT /api/assignments/:id/status
    if (path.match(/\/api\/assignments\/[^/]+\/status/) && method === 'PUT') {
        const parts = path.split('/');
        const assignmentId = parts[3];
        if (!assignmentId) return errorResponse('Missing assignment ID');

        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        const s = body.newStatus || 'CLOSED';
        await db.prepare('UPDATE assignments SET status = ? WHERE id = ?').bind(s, assignmentId).run();
        return jsonResponse({ status: 'success', data: { assignmentId, status: s } });
    }

    // POST /api/assignments/:id/start
    if (path.match(/\/api\/assignments\/[^/]+\/start/) && method === 'POST') {
        const parts = path.split('/');
        const assignmentId = parts[3];
        if (!assignmentId) return errorResponse('Missing assignment ID');

        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        const stu = await db.prepare('SELECT * FROM students WHERE id = ?').bind(body.studentId).first<any>();
        if (!stu) return jsonResponse({ status: 'error', message: 'Student not found' });

        const asn = await db.prepare('SELECT * FROM assignments WHERE id = ?').bind(assignmentId).first<any>();
        if (!asn) return jsonResponse({ status: 'error', message: 'Assignment not found' });

        const cnt = await db.prepare(
            `SELECT COUNT(*) as cnt FROM results WHERE student_name = ? AND quiz_id = ? AND answers != '{"status":"STARTED"}'`
        ).bind(stu.full_name, asn.quiz_id).first<{ cnt: number }>();
        const attemptCount = cnt?.cnt || 0;
        const maxAttempts = Number(asn.max_attempts) || 1;

        if (attemptCount >= maxAttempts) {
            return jsonResponse({ status: 'error', message: 'Max attempts reached', attemptCount, maxAttempts });
        }
        return jsonResponse({ status: 'success', attemptCount, maxAttempts });
    }

    return errorResponse('Not found: ' + path, 404);
}
