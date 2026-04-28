import { WORKERS_API_URL } from '../config/constants';

// API Token for authentication
const API_SECRET_TOKEN = import.meta.env.VITE_API_SECRET_TOKEN || '';

/**
 * The API Adapter - routes all requests to Cloudflare Workers (D1)
 */
export const callApi = async <T = any>(action: string, payload: Record<string, any> = {}): Promise<T> => {
    let method = 'POST';
    let path = '/';
    let urlParams = new URLSearchParams();

    switch (action) {
        // --- Teachers ---
        case 'get_teachers': method = 'GET'; path = '/api/teachers'; break;
        case 'create_teacher': method = 'POST'; path = '/api/teachers'; break;
        case 'update_teacher': method = 'PUT'; path = `/api/teachers/${encodeURIComponent(payload.username)}`; break;
        case 'delete_teacher':
            method = 'DELETE';
            path = `/api/teachers/${encodeURIComponent(payload.username)}`;
            if (payload.actorUsername) urlParams.append('actorUsername', payload.actorUsername);
            break;
        case 'login': method = 'POST'; path = '/api/login'; break;

        // --- Quizzes ---
        case 'get_quizzes': method = 'GET'; path = '/api/quizzes'; break;
        case 'create_quiz': method = 'POST'; path = '/api/quizzes'; break;
        case 'update_quiz': method = 'PUT'; path = `/api/quizzes/${payload.id || payload.quizId}`; break;
        case 'delete_quiz': method = 'DELETE'; path = `/api/quizzes/${payload.id || payload.quizId}`; break;
        case 'duplicate_quiz': method = 'POST'; path = `/api/quizzes/${payload.quizId}/duplicate`; break;
        case 'get_questions': method = 'GET'; path = '/api/questions'; if (payload.quizId) urlParams.append('quizId', payload.quizId); break;

        // --- Results ---
        case 'get_results': method = 'GET'; path = '/api/results'; break;
        case 'get_result_answers': method = 'GET'; path = `/api/results/${payload.resultId}/answers`; break;
        case 'get_result_skill_breakdown': method = 'GET'; path = `/api/results/${payload.resultId}/skill-breakdown`; break;
        case 'get_result_weakness_profile': method = 'GET'; path = `/api/results/${payload.resultId}/weakness-profile`; break;
        case 'submit_result': method = 'POST'; path = '/api/results'; break;
        case 'delete_result': method = 'DELETE'; path = `/api/results/${payload.resultId}`; break;
        case 'validate_answers': method = 'POST'; path = '/api/validate'; break;

        // --- AI Tutor ---
        case 'ai_tutor_diagnose': method = 'POST'; path = '/api/ai-tutor/diagnose'; break;
        case 'ai_chat': method = 'POST'; path = '/api/ai/chat'; break;
        case 'ask_help_rag': method = 'POST'; path = '/api/help/ask'; break;

        // --- Practice Library ---
        case 'get_practice_topics': method = 'GET'; path = '/api/practice/topics'; break;
        case 'get_practice_quiz': method = 'GET'; path = '/api/practice'; if (payload.topic) urlParams.append('topic', payload.topic); if (payload.limit) urlParams.append('limit', payload.limit); break;

        // --- Classroom ---
        case 'get_classes': method = 'GET'; path = '/api/classes'; if (payload.teacherUsername) urlParams.append('teacherUsername', payload.teacherUsername); break;
        case 'create_class': method = 'POST'; path = '/api/classes'; break;
        case 'transfer_class_teacher': method = 'PATCH'; path = `/api/classes/${encodeURIComponent(payload.classId)}/teacher`; break;
        case 'delete_class': method = 'DELETE'; path = `/api/classes/${payload.classId}`; break;

        // --- Students ---
        case 'get_students': method = 'GET'; path = '/api/students'; urlParams.append('classId', payload.classId); if (payload.role) urlParams.append('role', payload.role); break;
        case 'add_student': method = 'POST'; path = '/api/students'; break;
        case 'add_students_batch': method = 'POST'; path = '/api/students/batch'; break;
        case 'delete_student': method = 'DELETE'; path = `/api/students/${payload.studentId}`; break;
        case 'reset_student_password': method = 'POST'; path = `/api/students/${payload.studentId}/reset-password`; break;
        case 'change_student_password': method = 'POST'; path = `/api/students/${payload.studentId}/change-password`; break;
        case 'student_login': method = 'POST'; path = '/api/student-login'; break;
        case 'update_student_avatar': method = 'PUT'; path = `/api/students/${payload.studentId}/avatar`; break;

        // --- Assignments ---
        case 'get_assignments': method = 'GET'; path = '/api/assignments'; urlParams.append('classId', payload.classId); break;
        case 'get_teacher_assignments': method = 'GET'; path = '/api/assignments'; urlParams.append('teacherUsername', payload.teacherUsername); break;
        case 'get_all_assignments': method = 'GET'; path = '/api/assignments'; urlParams.append('all', 'true'); break;
        case 'get_student_assignments': method = 'GET'; path = '/api/assignments'; urlParams.append('studentId', payload.studentId); break;
        case 'create_assignment': method = 'POST'; path = '/api/assignments'; break;
        case 'get_smart_assignment_preview': method = 'POST'; path = '/api/assignments/smart-preview'; break;
        case 'delete_assignment': method = 'DELETE'; path = `/api/assignments/${payload.assignmentId}`; break;
        case 'update_assignment_deadline': method = 'PUT'; path = `/api/assignments/${payload.assignmentId}/deadline`; break;
        case 'update_assignment_status': method = 'PUT'; path = `/api/assignments/${payload.assignmentId}/status`; break;
        case 'start_assignment_attempt': method = 'POST'; path = `/api/assignments/${payload.assignmentId}/start`; break;

        // --- Gamification ---
        case 'get_pet_data': method = 'GET'; path = `/api/pets`; urlParams.append('username', payload.username); break;
        case 'update_game_state': method = 'POST'; path = '/api/game-state'; break;
        case 'get_attendance_status': method = 'GET'; path = '/api/game-state/attendance-status'; urlParams.append('username', payload.username); break;
        case 'claim_daily_attendance': method = 'POST'; path = '/api/game-state/attendance-claim'; break;
        case 'buy_shop_item': method = 'POST'; path = '/api/shop/buy'; break;
        case 'get_leaderboard': method = 'GET'; path = '/api/leaderboard'; break;
        case 'get_top_gold_leaderboard': method = 'GET'; path = '/api/leaderboard/top-gold'; break;

        // --- Gift Shop ---
        case 'get_gift_shop_catalog': method = 'GET'; path = '/api/gift-shop/catalog'; break;
        case 'create_gift_shop_catalog_item': method = 'POST'; path = '/api/gift-shop/catalog'; break;
        case 'update_gift_shop_catalog_item': method = 'PUT'; path = `/api/gift-shop/catalog/${encodeURIComponent(payload.id)}`; break;
        case 'delete_gift_shop_catalog_item':
            method = 'DELETE';
            path = `/api/gift-shop/catalog/${encodeURIComponent(payload.id)}`;
            if (typeof payload.actorIsAdmin !== 'undefined') {
                urlParams.append('actorIsAdmin', String(payload.actorIsAdmin));
            }
            if (payload.actorUsername) {
                urlParams.append('actorUsername', String(payload.actorUsername));
            }
            break;
        case 'purchase_gift_shop_item': method = 'POST'; path = '/api/gift-shop/purchase'; break;
        case 'get_gift_shop_orders':
            method = 'GET';
            path = '/api/gift-shop/orders';
            if (payload.studentId) urlParams.append('studentId', payload.studentId);
            if (payload.classId) urlParams.append('classId', payload.classId);
            if (payload.status) urlParams.append('status', payload.status);
            if (payload.actorUsername) urlParams.append('actorUsername', payload.actorUsername);
            if (payload.actorTeacherClass) urlParams.append('actorTeacherClass', payload.actorTeacherClass);
            if (typeof payload.actorIsAdmin !== 'undefined') {
                urlParams.append('actorIsAdmin', String(payload.actorIsAdmin));
            }
            break;
        case 'deliver_gift_shop_order': method = 'PATCH'; path = `/api/gift-shop/orders/${encodeURIComponent(payload.orderId)}/deliver`; break;
        case 'cancel_gift_shop_order': method = 'PATCH'; path = `/api/gift-shop/orders/${encodeURIComponent(payload.orderId)}/cancel`; break;
        case 'get_gift_shop_event_logs': method = 'GET'; path = '/api/gift-shop/events'; break;

        // --- Announcements ---
        case 'get_announcement': method = 'GET'; path = '/api/announcements'; break;
        case 'save_announcement': method = 'POST'; path = '/api/announcements'; break;
        case 'get_system_settings': method = 'GET'; path = '/api/system-settings'; break;
        case 'save_system_settings': method = 'POST'; path = '/api/system-settings'; break;

        default: 
            // Fallback for legacy actions (like hw_assignments)
            method = 'POST';
            path = '/api/gas';
            // Legacy workers endpoint expects 'action' and 'token' inside the body
            payload = { ...payload, action, token: API_SECRET_TOKEN };
            break;
    }

    try {
        const urlStr = urlParams.toString() ? `${WORKERS_API_URL}${path}?${urlParams.toString()}` : `${WORKERS_API_URL}${path}`;
        const fetchOptions: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Token': API_SECRET_TOKEN,
            },
        };
        // GET và DELETE thường không có body
        if (method !== 'GET' && method !== 'DELETE') {
            fetchOptions.body = JSON.stringify(payload);
        }

        const response = await fetch(urlStr, fetchOptions);

        if (!response.ok) {
            let errorMessage = `Lỗi kết nối Server: ${response.statusText}`;
            try {
                // Thử parse body JSON để lấy lỗi chi tiết từ Workers
                const errData = await response.json();
                if (errData && (errData as any).message) {
                    errorMessage = (errData as any).message;
                }
            } catch (e) {
                const text = await response.text().catch(() => '');
                if (text) errorMessage += ` - ${text.substring(0, 100)}`;
            }
            if (response.status === 401) throw new Error('Không có quyền truy cập API (Authentication failed)');
            throw new Error(errorMessage);
        }

        return (await response.json()) as T;
    } catch (error: unknown) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        if (normalizedError.name === 'TypeError' && normalizedError.message === 'Failed to fetch') {
            throw new Error('Không thể kết nối mạng hoặc lỗi CORS. Vui lòng kiểm tra kết nối.');
        }
        throw error;
    }
};
