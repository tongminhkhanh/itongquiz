import { GOOGLE_SCRIPT_URL, WORKERS_API_URL, USE_D1 } from '../config/constants';

// Lấy API Token từ env (dùng chung cho cả 2 backend)
const API_SECRET_TOKEN = import.meta.env.VITE_API_SECRET_TOKEN || '';

/**
 * The API Adapter that switches between Google Apps Script and Cloudflare Workers (D1)
 * Currently, the Workers API mirrors the GAS POST endpoint interface (legacy compatibility mode).
 * Meaning the request payload format remains identical.
 */
export const callApi = async <T = any>(action: string, payload: Record<string, any> = {}): Promise<T> => {
    // 1. Nếu dùng GAS (Legacy MODE)
    if (!USE_D1) {
        try {
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ ...payload, action, token: API_SECRET_TOKEN }),
            });
            if (!response.ok) {
                if (response.status === 401) throw new Error('Không có quyền truy cập API (Authentication failed)');
                throw new Error(`Lỗi kết nối Server: ${response.statusText}`);
            }
            return (await response.json()) as T;
        } catch (error: any) {
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') throw new Error('Không thể kết nối mạng (GAS).');
            throw error;
        }
    }

    // 2. Nếu dùng D1 (RESTful MODE)
    // Tự động map từ "action" sang REST method & URL
    let method = 'POST';
    let path = '/';
    let urlParams = new URLSearchParams();

    switch (action) {
        // --- Teachers ---
        case 'get_teachers': method = 'GET'; path = '/api/teachers'; break;
        case 'login': method = 'POST'; path = '/api/login'; break;

        // --- Quizzes ---
        case 'get_quizzes': method = 'GET'; path = '/api/quizzes'; break;
        case 'create_quiz': method = 'POST'; path = '/api/quizzes'; break;
        case 'update_quiz': method = 'PUT'; path = `/api/quizzes/${payload.id || payload.quizId}`; break;
        case 'delete_quiz': method = 'DELETE'; path = `/api/quizzes/${payload.id || payload.quizId}`; break;
        case 'get_questions': method = 'GET'; path = '/api/questions'; if (payload.quizId) urlParams.append('quizId', payload.quizId); break;

        // --- Results ---
        case 'get_results': method = 'GET'; path = '/api/results'; break;
        case 'submit_result': method = 'POST'; path = '/api/results'; break;
        case 'delete_result': method = 'DELETE'; path = `/api/results/${payload.resultId}`; break;
        case 'validate_answers': method = 'POST'; path = '/api/validate'; break;

        // --- Classroom ---
        case 'get_classes': method = 'GET'; path = '/api/classes'; if (payload.teacherUsername) urlParams.append('teacherUsername', payload.teacherUsername); break;
        case 'create_class': method = 'POST'; path = '/api/classes'; break;
        case 'delete_class': method = 'DELETE'; path = `/api/classes/${payload.classId}`; break;

        // --- Students ---
        case 'get_students': method = 'GET'; path = '/api/students'; urlParams.append('classId', payload.classId); if (payload.role) urlParams.append('role', payload.role); break;
        case 'add_student': method = 'POST'; path = '/api/students'; break;
        case 'delete_student': method = 'DELETE'; path = `/api/students/${payload.studentId}`; break;
        case 'reset_student_password': method = 'POST'; path = `/api/students/${payload.studentId}/reset-password`; break;
        case 'student_login': method = 'POST'; path = '/api/student-login'; break;
        case 'update_student_avatar': method = 'PUT'; path = `/api/students/${payload.studentId}/avatar`; break;

        // --- Assignments ---
        case 'get_assignments': method = 'GET'; path = '/api/assignments'; urlParams.append('classId', payload.classId); break;
        case 'get_teacher_assignments': method = 'GET'; path = '/api/assignments'; urlParams.append('teacherUsername', payload.teacherUsername); break;
        case 'get_all_assignments': method = 'GET'; path = '/api/assignments'; urlParams.append('all', 'true'); break;
        case 'get_student_assignments': method = 'GET'; path = '/api/assignments'; urlParams.append('studentId', payload.studentId); break;
        case 'create_assignment': method = 'POST'; path = '/api/assignments'; break;
        case 'delete_assignment': method = 'DELETE'; path = `/api/assignments/${payload.assignmentId}`; break;
        case 'update_assignment_deadline': method = 'PUT'; path = `/api/assignments/${payload.assignmentId}/deadline`; break;
        case 'update_assignment_status': method = 'PUT'; path = `/api/assignments/${payload.assignmentId}/status`; break;
        case 'start_assignment_attempt': method = 'POST'; path = `/api/assignments/${payload.assignmentId}/start`; break;

        // --- Gamification ---
        case 'get_pet_data': method = 'GET'; path = `/api/pets`; urlParams.append('username', payload.username); break;
        case 'update_game_state': method = 'POST'; path = '/api/game-state'; break;
        case 'buy_shop_item': method = 'POST'; path = '/api/shop/buy'; break;
        case 'get_leaderboard': method = 'GET'; path = '/api/leaderboard'; break;

        // --- Announcements ---
        case 'get_announcement': method = 'GET'; path = '/api/announcements'; break;
        case 'save_announcement': method = 'POST'; path = '/api/announcements'; break;

        default: break; // Fallback to root path for undefined actions (though they shouldn't occur)
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
            if (response.status === 401) throw new Error('Không có quyền truy cập API (Authentication failed)');
            throw new Error(`Lỗi kết nối Server: ${response.statusText}`);
        }

        return (await response.json()) as T;
    } catch (error: any) {
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            throw new Error('Không thể kết nối mạng hoặc lỗi CORS. Vui lòng kiểm tra kết nối.');
        }
        throw error;
    }
};
