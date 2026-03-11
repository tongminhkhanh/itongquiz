// iTongQuiz Workers API - Main Entry Point
// Replaces Google Apps Script (gas_script.js)

import { handleCors, corsHeaders } from './middleware/cors';
import { verifyToken } from './middleware/auth';
import { jsonResponse, errorResponse } from './utils/response';
import { handleTeacherRoutes } from './routes/teachers';
import { handleQuizRoutes } from './routes/quizzes';
import { handleResultRoutes } from './routes/results';
import { handleClassroomRoutes } from './routes/classroom';
import { handleGamificationRoutes } from './routes/gamification';
import { handleAnnouncementRoutes } from './routes/announcements';
import { Env } from './types';
import { mapQuestionForSave, mapAssignment, mapAssignments, handleValidateAnswers } from './utils/helpers';

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        // Handle CORS preflight
        const corsResponse = handleCors(request);
        if (corsResponse) return corsResponse;

        // Auth check from header
        const authError = verifyToken(request, env);
        if (authError) return addCors(authError, request);

        try {
            const url = new URL(request.url);
            const path = url.pathname;
            const method = request.method;

            // ============ LEGACY GAS COMPATIBILITY MODE ============
            // Support POST with action param (same as GAS doPost)
            // This allows frontend to work WITHOUT changes initially
            if (method === 'POST' && (path === '/' || path === '/api/gas')) {
                return addCors(await handleLegacyGasRequest(request, env), request);
            }

            // ============ RESTful API ROUTES ============
            let response: Response | null = null;

            if (path.startsWith('/api/teachers') || path === '/api/login') {
                response = await handleTeacherRoutes(request, env, path, method);
            } else if (path.startsWith('/api/quizzes') || path.startsWith('/api/questions')) {
                response = await handleQuizRoutes(request, env, path, method);
            } else if (path.startsWith('/api/results') || path === '/api/validate') {
                response = await handleResultRoutes(request, env, path, method);
            } else if (path.startsWith('/api/classes') || path.startsWith('/api/students') || path.startsWith('/api/assignments') || path === '/api/student-login') {
                response = await handleClassroomRoutes(request, env, path, method);
            } else if (path.startsWith('/api/pets') || path.startsWith('/api/game-state') || path.startsWith('/api/shop') || path.startsWith('/api/leaderboard')) {
                response = await handleGamificationRoutes(request, env, path, method);
            } else if (path.startsWith('/api/announcements')) {
                response = await handleAnnouncementRoutes(request, env, path, method);
            } else if (path === '/api/health') {
                response = jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
            }

            if (response) return addCors(response, request);

            return addCors(errorResponse('Not found: ' + path, 404), request);
        } catch (error: any) {
            console.error('Worker error:', error);
            return addCors(errorResponse(error.message || 'Internal server error', 500), request);
        }
    },
};

// Add CORS headers to any response
function addCors(response: Response, request: Request): Response {
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders(request))) {
        headers.set(key, value);
    }
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

// ============ LEGACY GAS COMPATIBILITY ============
// This function handles the old GAS-style POST requests
// so the frontend can work WITHOUT any changes initially
async function handleLegacyGasRequest(request: Request, env: Env): Promise<Response> {
    let body: any = {};
    try {
        const text = await request.text();
        body = JSON.parse(text);
    } catch {
        return errorResponse('Invalid JSON body');
    }

    // Verify token from body (GAS style)
    if (body.token !== env.API_SECRET_TOKEN) {
        return errorResponse('Unauthorized: Invalid Token', 401);
    }

    const action = body.action;
    const db = env.DB;

    switch (action) {
        // --- Teachers ---
        case 'get_teachers': {
            const rows = await db.prepare('SELECT * FROM teachers').all();
            return jsonResponse(rows.results);
        }

        // --- Quizzes ---
        case 'get_quizzes': {
            const rows = await db.prepare('SELECT * FROM quizzes').all();
            return jsonResponse(rows.results);
        }

        case 'get_questions': {
            const rows = await db.prepare('SELECT * FROM questions').all();
            return jsonResponse(rows.results);
        }

        case 'create_quiz': {
            await db.prepare(
                `INSERT INTO quizzes (id, title, class_level, category, time_limit, created_at, access_code, require_code, created_by, show_on_home, tags)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
                body.id, body.title, body.classLevel, body.category || '',
                body.timeLimit, body.createdAt, body.accessCode || '',
                body.requireCode ? 'TRUE' : 'FALSE', body.createdBy || '',
                body.showOnHome === false ? 'FALSE' : 'TRUE',
                JSON.stringify(body.tags || [])
            ).run();

            if (body.questions && Array.isArray(body.questions)) {
                const stmt = db.prepare(
                    `INSERT INTO questions (id, quiz_id, type, question, options, correct_answer, items, text_field, blanks, distractors, sentence, words, correct_word_indexes, image)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                );
                const batch = body.questions.map((q: any) => {
                    const mapped = mapQuestionForSave(q, body.id);
                    return stmt.bind(...mapped);
                });
                await db.batch(batch);
            }
            return jsonResponse({ status: 'success' });
        }

        case 'update_quiz': {
            if (!body.id) return errorResponse('Missing quiz ID');
            await db.prepare('DELETE FROM questions WHERE quiz_id = ?').bind(body.id).run();
            await db.prepare('DELETE FROM quizzes WHERE id = ?').bind(body.id).run();

            await db.prepare(
                `INSERT INTO quizzes (id, title, class_level, category, time_limit, created_at, access_code, require_code, created_by, show_on_home, tags)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
                body.id, body.title, body.classLevel, body.category || '',
                body.timeLimit, body.createdAt, body.accessCode || '',
                body.requireCode ? 'TRUE' : 'FALSE', body.createdBy || '',
                body.showOnHome === false ? 'FALSE' : 'TRUE',
                JSON.stringify(body.tags || [])
            ).run();

            if (body.questions && Array.isArray(body.questions)) {
                const stmt = db.prepare(
                    `INSERT INTO questions (id, quiz_id, type, question, options, correct_answer, items, text_field, blanks, distractors, sentence, words, correct_word_indexes, image)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                );
                const batch = body.questions.map((q: any) => {
                    const mapped = mapQuestionForSave(q, body.id);
                    return stmt.bind(...mapped);
                });
                await db.batch(batch);
            }

            const countResult = await db.prepare('SELECT COUNT(*) as cnt FROM questions WHERE quiz_id = ?').bind(body.id).first<{ cnt: number }>();
            const actualCount = countResult?.cnt || 0;
            const expectedCount = body.questions?.length || 0;

            if (actualCount !== expectedCount) {
                return jsonResponse({ status: 'error', message: `Save verification failed: expected ${expectedCount} questions, but ${actualCount} were saved` });
            }

            return jsonResponse({ status: 'success', questionCount: actualCount });
        }

        case 'delete_quiz': {
            await db.prepare('DELETE FROM questions WHERE quiz_id = ?').bind(body.quizId).run();
            await db.prepare('DELETE FROM quizzes WHERE id = ?').bind(body.quizId).run();
            return jsonResponse({ status: 'success' });
        }

        // --- Results ---
        case 'get_results': {
            const rows = await db.prepare('SELECT * FROM results ORDER BY submitted_at DESC').all();
            const mapped = rows.results.map((r: any) => ({
                id: r.id, 'Student Name': r.student_name, 'Class': r.class_name,
                'Quiz ID': r.quiz_id, 'Quiz Title': r.quiz_title,
                'Score': r.score, 'correctCount': r.correct_count,
                'Total Questions': r.total_questions, 'Submitted At': r.submitted_at,
                'answers': r.answers,
            }));
            return jsonResponse(mapped);
        }

        case 'delete_result': {
            if (!body.resultId) return errorResponse('Missing resultId');
            await db.prepare('DELETE FROM results WHERE id = ?').bind(body.resultId).run();
            return jsonResponse({ status: 'success' });
        }

        case 'submit_result': {
            await db.prepare(
                `INSERT INTO results (student_name, class_name, quiz_id, quiz_title, score, correct_count, total_questions, submitted_at, answers)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
                body.studentName || '', body.className || '', body.quizId || '',
                body.quizTitle || '', body.score || 0, body.correctCount || 0,
                body.totalQuestions || 0, body.submittedAt || new Date().toISOString(),
                JSON.stringify(body.answers || {})
            ).run();
            return jsonResponse({ status: 'success' });
        }

        case 'validate_answers': {
            return await handleValidateAnswers(db, body);
        }

        // --- Announcements ---
        case 'get_announcement': {
            const row = await db.prepare('SELECT * FROM announcements WHERE id = ?').bind('1').first();
            if (!row) return jsonResponse({ status: 'success', announcement: null });
            return jsonResponse({
                status: 'success',
                announcement: {
                    id: (row as any).id, content: (row as any).content || '',
                    isActive: (row as any).is_active === 'true' || (row as any).is_active === 'TRUE',
                    updatedAt: (row as any).updated_at,
                },
            });
        }

        case 'save_announcement': {
            const existing = await db.prepare('SELECT id FROM announcements WHERE id = ?').bind('1').first();
            if (existing) {
                await db.prepare(`UPDATE announcements SET content = ?, is_active = ?, updated_at = ? WHERE id = ?`)
                    .bind(body.content || '', body.isActive ? 'true' : 'false', new Date().toISOString(), '1').run();
            } else {
                await db.prepare(`INSERT INTO announcements (id, content, is_active, updated_at) VALUES (?, ?, ?, ?)`)
                    .bind('1', body.content || '', body.isActive ? 'true' : 'false', new Date().toISOString()).run();
            }
            return jsonResponse({ status: 'success', message: 'Announcement saved successfully' });
        }

        // --- Classroom ---
        case 'get_classes': {
            let query = 'SELECT * FROM classes';
            const params: any[] = [];
            if (body.teacherUsername) { query += ' WHERE teacher_username = ?'; params.push(body.teacherUsername); }
            const rows = await db.prepare(query).bind(...params).all();
            return jsonResponse({ status: 'success', data: rows.results.map((r: any) => ({ id: r.id, name: r.name, teacherUsername: r.teacher_username, createdAt: r.created_at })) });
        }

        case 'create_class': {
            const id = `c-${crypto.randomUUID().substring(0, 8)}`;
            const createdAt = new Date().toISOString();
            await db.prepare('INSERT INTO classes (id, name, teacher_username, created_at) VALUES (?, ?, ?, ?)').bind(id, body.name, body.teacherUsername, createdAt).run();
            return jsonResponse({ status: 'success', data: { id, name: body.name, teacherUsername: body.teacherUsername, createdAt } });
        }

        case 'delete_class': {
            await db.prepare('DELETE FROM students WHERE class_id = ?').bind(body.classId).run();
            await db.prepare('DELETE FROM assignments WHERE class_id = ?').bind(body.classId).run();
            await db.prepare('DELETE FROM classes WHERE id = ?').bind(body.classId).run();
            return jsonResponse({ status: 'success' });
        }

        case 'get_students': {
            const students = await db.prepare('SELECT * FROM students WHERE class_id = ?').bind(body.classId).all();
            const mapped = students.results.map((s: any) => {
                const base: any = { id: s.id, fullName: s.full_name, username: s.username, classId: s.class_id, avatar: s.avatar || '' };
                if (body.role !== 'student') { base.parentPhone = s.parent_phone || ''; base.createdAt = s.created_at; }
                return base;
            });
            return jsonResponse({ status: 'success', data: mapped });
        }

        case 'add_student': {
            const existing = await db.prepare('SELECT id FROM students WHERE username = ?').bind(body.username).first();
            if (existing) return jsonResponse({ status: 'error', message: 'Tên đăng nhập đã tồn tại: ' + body.username });
            const encoder = new TextEncoder();
            const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(body.password));
            const pwdHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
            const sId = `s-${crypto.randomUUID().substring(0, 8)}`;
            const createdAt = new Date().toISOString();
            await db.prepare('INSERT INTO students (id, full_name, username, password_hash, class_id, parent_phone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(sId, body.fullName, body.username, pwdHash, body.classId, body.parentPhone || '', createdAt).run();
            return jsonResponse({ status: 'success', data: { id: sId, fullName: body.fullName, username: body.username, classId: body.classId, parentPhone: body.parentPhone || '', createdAt } });
        }

        case 'delete_student': {
            await db.prepare('DELETE FROM students WHERE id = ?').bind(body.studentId).run();
            return jsonResponse({ status: 'success' });
        }

        case 'reset_student_password': {
            const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
            let newPwd = '';
            for (let i = 0; i < 6; i++) newPwd += chars.charAt(Math.floor(Math.random() * chars.length));
            const enc = new TextEncoder();
            const hBuf = await crypto.subtle.digest('SHA-256', enc.encode(newPwd));
            const hash = Array.from(new Uint8Array(hBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
            await db.prepare('UPDATE students SET password_hash = ? WHERE id = ?').bind(hash, body.studentId).run();
            return jsonResponse({ status: 'success', data: { newPassword: newPwd } });
        }

        case 'student_login': {
            const enc = new TextEncoder();
            const hBuf = await crypto.subtle.digest('SHA-256', enc.encode(body.password));
            const inputHash = Array.from(new Uint8Array(hBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
            const student = await db.prepare('SELECT * FROM students WHERE username = ? AND password_hash = ?').bind(body.username, inputHash).first<any>();
            if (!student) return jsonResponse({ status: 'error', message: 'Sai tên đăng nhập hoặc mật khẩu.' });
            const cls = await db.prepare('SELECT name FROM classes WHERE id = ?').bind(student.class_id).first<any>();
            const pet = await db.prepare('SELECT * FROM user_pets WHERE username = ?').bind(student.username).first<any>();
            const shopItems = await db.prepare('SELECT * FROM shop_items').all();
            if (pet) { await db.prepare('UPDATE user_pets SET last_active = ?, mood = ? WHERE username = ?').bind(new Date().toISOString(), 'happy', student.username).run(); }
            const petData = pet ? {
                petId: pet.pet_id, petName: pet.pet_name, level: Number(pet.level) || 1, exp: Number(pet.exp) || 0,
                expToNext: Number(pet.exp_to_next) || 100, mood: pet.mood || 'happy',
                items: pet.items ? JSON.parse(pet.items as string) : [], lastActive: pet.last_active || '', imageUrl: pet.image_url || '',
            } : null;
            return jsonResponse({
                status: 'success', data: {
                    studentId: student.id, fullName: student.full_name, username: student.username,
                    classId: student.class_id, className: cls?.name || '', avatar: student.avatar || '',
                    coins: Number(student.coins) || 0, pet: petData,
                    shopItems: shopItems.results.map((i: any) => ({ itemId: i.item_id, name: i.name, price: Number(i.price) || 0, type: i.type || 'ACCESSORY', category: i.category || '', assetUrl: i.asset_url || '' })),
                },
            });
        }

        case 'update_student_avatar': {
            await db.prepare('UPDATE students SET avatar = ? WHERE id = ?').bind(body.avatar || '', body.studentId).run();
            return jsonResponse({ status: 'success', data: { avatar: body.avatar } });
        }

        // --- Assignments ---
        case 'get_assignments': {
            await db.prepare(`UPDATE assignments SET status = 'CLOSED' WHERE status = 'OPEN' AND deadline < ?`).bind(new Date().toISOString()).run();
            const rows = await db.prepare('SELECT * FROM assignments WHERE class_id = ?').bind(body.classId).all();
            return jsonResponse({ status: 'success', data: mapAssignments(rows.results) });
        }

        case 'get_teacher_assignments': {
            await db.prepare(`UPDATE assignments SET status = 'CLOSED' WHERE status = 'OPEN' AND deadline < ?`).bind(new Date().toISOString()).run();
            const teacherClasses = await db.prepare('SELECT id, name FROM classes WHERE teacher_username = ?').bind(body.teacherUsername).all();
            const classIds = teacherClasses.results.map((c: any) => c.id);
            if (classIds.length === 0) return jsonResponse({ status: 'success', data: [] });
            const placeholders = classIds.map(() => '?').join(',');
            const assignments = await db.prepare(`SELECT a.*, c.name as class_name FROM assignments a LEFT JOIN classes c ON a.class_id = c.id WHERE a.class_id IN (${placeholders})`).bind(...classIds).all();
            const mapped = assignments.results.map((a: any) => ({ ...mapAssignment(a), className: a.class_name || '' }));
            return jsonResponse({ status: 'success', data: mapped });
        }

        case 'get_all_assignments': {
            await db.prepare(`UPDATE assignments SET status = 'CLOSED' WHERE status = 'OPEN' AND deadline < ?`).bind(new Date().toISOString()).run();
            const all = await db.prepare(`SELECT a.*, c.name as class_name, q.title as quiz_title FROM assignments a LEFT JOIN classes c ON a.class_id = c.id LEFT JOIN quizzes q ON a.quiz_id = q.id`).all();
            const mapped = all.results.map((a: any) => ({ ...mapAssignment(a), className: a.class_name || '', quizTitle: a.quiz_title || 'Bài tập' }));
            return jsonResponse({ status: 'success', data: mapped });
        }

        case 'get_student_assignments': {
            const stu = await db.prepare('SELECT * FROM students WHERE id = ?').bind(body.studentId).first<any>();
            if (!stu) return jsonResponse({ status: 'error', message: 'Student not found' });
            await db.prepare(`UPDATE assignments SET status = 'CLOSED' WHERE status = 'OPEN' AND deadline < ?`).bind(new Date().toISOString()).run();
            const asns = await db.prepare(`SELECT * FROM assignments WHERE class_id = ? AND (student_id = '' OR student_id = ?)`).bind(stu.class_id, stu.id).all();
            const mapped = [];
            for (const a of asns.results as any[]) {
                const countResult = await db.prepare(`SELECT COUNT(*) as cnt FROM results WHERE student_name = ? AND quiz_id = ? AND answers != '{"status":"STARTED"}'`).bind(stu.full_name, a.quiz_id).first<{ cnt: number }>();
                mapped.push({ ...mapAssignment(a), attemptCount: countResult?.cnt || 0, maxAttempts: Number(a.max_attempts) || 1 });
            }
            return jsonResponse({ status: 'success', data: mapped });
        }

        case 'create_assignment': {
            const aId = `a-${crypto.randomUUID().substring(0, 8)}`;
            const createdAt = new Date().toISOString();
            await db.prepare('INSERT INTO assignments (id, quiz_id, class_id, student_id, deadline, max_attempts, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(aId, body.quizId, body.classId, body.studentId || '', body.deadline, Number(body.maxAttempts) || 1, 'OPEN', createdAt).run();
            return jsonResponse({ status: 'success', data: { id: aId, quizId: body.quizId, classId: body.classId, studentId: body.studentId || '', deadline: body.deadline, maxAttempts: Number(body.maxAttempts) || 1, status: 'OPEN', createdAt } });
        }

        case 'delete_assignment': {
            await db.prepare('DELETE FROM assignments WHERE id = ?').bind(body.assignmentId).run();
            return jsonResponse({ status: 'success' });
        }

        case 'update_assignment_deadline': {
            const newDeadline = new Date(body.newDeadline);
            const newStatus = newDeadline > new Date() ? 'OPEN' : undefined;
            if (newStatus) { await db.prepare('UPDATE assignments SET deadline = ?, status = ? WHERE id = ?').bind(body.newDeadline, newStatus, body.assignmentId).run(); }
            else { await db.prepare('UPDATE assignments SET deadline = ? WHERE id = ?').bind(body.newDeadline, body.assignmentId).run(); }
            return jsonResponse({ status: 'success', data: { assignmentId: body.assignmentId, newDeadline: body.newDeadline, status: newStatus || 'CLOSED' } });
        }

        case 'update_assignment_status': {
            const s = body.newStatus || 'CLOSED';
            await db.prepare('UPDATE assignments SET status = ? WHERE id = ?').bind(s, body.assignmentId).run();
            return jsonResponse({ status: 'success', data: { assignmentId: body.assignmentId, status: s } });
        }

        case 'start_assignment_attempt': {
            const stu2 = await db.prepare('SELECT * FROM students WHERE id = ?').bind(body.studentId).first<any>();
            if (!stu2) return jsonResponse({ status: 'error', message: 'Student not found' });
            const asn = await db.prepare('SELECT * FROM assignments WHERE id = ?').bind(body.assignmentId).first<any>();
            if (!asn) return jsonResponse({ status: 'error', message: 'Assignment not found' });
            const cnt = await db.prepare(`SELECT COUNT(*) as cnt FROM results WHERE student_name = ? AND quiz_id = ? AND answers != '{"status":"STARTED"}'`).bind(stu2.full_name, asn.quiz_id).first<{ cnt: number }>();
            const attemptCount = cnt?.cnt || 0;
            const maxAttempts = Number(asn.max_attempts) || 1;
            if (attemptCount >= maxAttempts) return jsonResponse({ status: 'error', message: 'Max attempts reached', attemptCount, maxAttempts });
            return jsonResponse({ status: 'success', attemptCount, maxAttempts });
        }

        // --- Gamification ---
        case 'get_pet_data': {
            if (!body.username) return jsonResponse({ status: 'error', message: 'Missing username' });
            let pet = await db.prepare('SELECT * FROM user_pets WHERE username = ?').bind(body.username).first<any>();
            if (!pet) {
                await db.prepare('INSERT INTO user_pets (username, pet_id, pet_name, level, exp, exp_to_next, mood, items, last_active) VALUES (?, ?, ?, 1, 0, 100, ?, ?, ?)').bind(body.username, body.petId || 'cat_01', body.petName || 'Mèo Con', 'happy', '[]', new Date().toISOString()).run();
                pet = { pet_id: body.petId || 'cat_01', pet_name: body.petName || 'Mèo Con', level: 1, exp: 0, exp_to_next: 100, mood: 'happy', items: '[]', last_active: new Date().toISOString(), image_url: '' };
            }
            const stu3 = await db.prepare('SELECT coins FROM students WHERE username = ?').bind(body.username).first<any>();
            const shopItems2 = await db.prepare('SELECT * FROM shop_items').all();
            return jsonResponse({
                status: 'success', data: {
                    pet: { petId: pet.pet_id, petName: pet.pet_name, level: Number(pet.level) || 1, exp: Number(pet.exp) || 0, expToNext: Number(pet.exp_to_next) || 100, mood: pet.mood || 'happy', items: typeof pet.items === 'string' ? JSON.parse(pet.items) : [], lastActive: pet.last_active || '', imageUrl: pet.image_url || '' },
                    coins: stu3 ? Number(stu3.coins) || 0 : 0,
                    shopItems: shopItems2.results.map((i: any) => ({ itemId: i.item_id, name: i.name, price: Number(i.price) || 0, type: i.type || 'ACCESSORY', category: i.category || '', assetUrl: i.asset_url || '' })),
                },
            });
        }

        case 'update_game_state': {
            if (!body.username) return jsonResponse({ status: 'error', message: 'Missing username' });
            const addExp = Number(body.addExp) || 0;
            const addCoins = Number(body.addCoins) || 0;
            await db.prepare('UPDATE students SET coins = coins + ? WHERE username = ?').bind(addCoins, body.username).run();
            const updatedStu = await db.prepare('SELECT coins FROM students WHERE username = ?').bind(body.username).first<any>();
            let petRow = await db.prepare('SELECT * FROM user_pets WHERE username = ?').bind(body.username).first<any>();
            if (!petRow) {
                await db.prepare('INSERT INTO user_pets (username, pet_id, pet_name, level, exp, exp_to_next, mood, items, last_active) VALUES (?, ?, ?, 1, 0, 100, ?, ?, ?)').bind(body.username, 'cat_01', 'Mèo Con', 'happy', '[]', new Date().toISOString()).run();
                return jsonResponse({ status: 'success', data: { newLevel: 1, newExp: addExp, newCoins: updatedStu?.coins || 0, leveledUp: false, mood: 'excited' } });
            }
            let newExp = Number(petRow.exp) + addExp;
            let newLevel = Number(petRow.level);
            let leveledUp = false;
            let newExpToNext = Number(petRow.exp_to_next) || 100;
            while (newExp >= newExpToNext) { newExp -= newExpToNext; newLevel++; leveledUp = true; newExpToNext = 100 + (newLevel - 1) * 20; }
            await db.prepare('UPDATE user_pets SET level = ?, exp = ?, exp_to_next = ?, mood = ?, last_active = ? WHERE username = ?').bind(newLevel, newExp, newExpToNext, 'excited', new Date().toISOString(), body.username).run();
            return jsonResponse({ status: 'success', data: { newLevel, newExp, newExpToNext, newCoins: updatedStu?.coins || 0, leveledUp, mood: 'excited' } });
        }

        case 'buy_shop_item': {
            if (!body.username || !body.itemId) return jsonResponse({ status: 'error', message: 'Missing username or itemId' });
            const item = await db.prepare('SELECT * FROM shop_items WHERE item_id = ?').bind(body.itemId).first<any>();
            if (!item) return jsonResponse({ status: 'error', message: 'Item not found' });
            const stuForBuy = await db.prepare('SELECT coins FROM students WHERE username = ?').bind(body.username).first<any>();
            if (!stuForBuy) return jsonResponse({ status: 'error', message: 'Student not found' });
            const currentCoins = Number(stuForBuy.coins) || 0;
            const price = Number(item.price) || 0;
            if (currentCoins < price) return jsonResponse({ status: 'error', message: `Không đủ vàng! Cần ${price} nhưng chỉ có ${currentCoins}` });
            const petForBuy = await db.prepare('SELECT items FROM user_pets WHERE username = ?').bind(body.username).first<any>();
            let currentItems: string[] = [];
            try { currentItems = JSON.parse(petForBuy?.items || '[]'); } catch { currentItems = []; }
            if (currentItems.includes(body.itemId)) return jsonResponse({ status: 'error', message: 'Bé đã có món đồ này rồi!' });
            await db.prepare('UPDATE students SET coins = coins - ? WHERE username = ?').bind(price, body.username).run();
            currentItems.push(body.itemId);
            await db.prepare('UPDATE user_pets SET items = ? WHERE username = ?').bind(JSON.stringify(currentItems), body.username).run();
            return jsonResponse({ status: 'success', data: { newCoins: currentCoins - price, items: currentItems, purchasedItem: { itemId: body.itemId, name: item.name, price } } });
        }

        case 'get_leaderboard': {
            const pets = await db.prepare(`SELECT p.*, s.full_name, s.avatar FROM user_pets p LEFT JOIN students s ON p.username = s.username ORDER BY p.level DESC, p.exp DESC LIMIT 10`).all();
            const leaderboard = pets.results.map((p: any) => ({ username: p.username, fullName: p.full_name || p.username, petId: p.pet_id, petName: p.pet_name, level: Number(p.level) || 1, exp: Number(p.exp) || 0, avatar: p.avatar || '' }));
            return jsonResponse({ status: 'success', data: leaderboard });
        }

        default:
            return errorResponse('Unknown action: ' + action);
    }
}
