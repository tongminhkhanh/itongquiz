// ============ IOE SHEET SERVICE ============
// Service riêng cho hệ thống IOE, tách biệt khỏi googleSheetService.ts

import { Quiz, Question, QuestionType, StudentResult } from '../types';
import { IOE_GOOGLE_SCRIPT_URL } from '../config/constants';

// Security: API token for IOE GAS authentication
const IOE_API_SECRET_TOKEN = import.meta.env.VITE_IOE_API_SECRET_TOKEN || 'ioe-4e23be7934269856066e6a3c2062e33ae4cdcc98';

// Helper to call IOE GAS API
const callIoeGasApi = async (action: string, payload: any = {}): Promise<any> => {
    if (!IOE_GOOGLE_SCRIPT_URL) {
        console.error("[IOE] GOOGLE_SCRIPT_URL is not defined");
        return null;
    }

    console.log(`[IOE] Calling API: ${action}`);

    try {
        const response = await fetch(IOE_GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                ...payload,
                action,
                token: IOE_API_SECRET_TOKEN
            }),
        });

        const data = await response.json();

        // Check if response is an error object (not an array)
        if (data && !Array.isArray(data) && data.status === 'error') {
            console.error(`[IOE] GAS API Error [${action}]:`, data.message);
            return null;
        }

        console.log(`[IOE] API ${action} success, got:`, Array.isArray(data) ? `${data.length} items` : data);
        return data;
    } catch (error) {
        console.error(`[IOE] Network Error [${action}]:`, error);
        return null;
    }
};

// ============ CACHING LAYER ============
const CACHE_KEY_QUIZZES = 'ioe_quizzes_cache';
const CACHE_KEY_TIMESTAMP = 'ioe_quizzes_cache_time';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

// Get cached data if valid
const getCachedQuizzes = (): Quiz[] | null => {
    try {
        const cached = localStorage.getItem(CACHE_KEY_QUIZZES);
        const timestamp = localStorage.getItem(CACHE_KEY_TIMESTAMP);

        if (cached && timestamp) {
            const age = Date.now() - parseInt(timestamp);
            if (age < CACHE_TTL_MS) {
                console.log(`[IOE Cache] Using cached data (${Math.round(age / 1000)}s old)`);
                return JSON.parse(cached);
            }
            console.log('[IOE Cache] Cache expired');
        }
    } catch (e) {
        console.warn('[IOE Cache] Error reading cache:', e);
    }
    return null;
};

// Save data to cache
const setCachedQuizzes = (quizzes: Quiz[]) => {
    try {
        localStorage.setItem(CACHE_KEY_QUIZZES, JSON.stringify(quizzes));
        localStorage.setItem(CACHE_KEY_TIMESTAMP, Date.now().toString());
        console.log(`[IOE Cache] Saved ${quizzes.length} quizzes to cache`);
    } catch (e) {
        console.warn('[IOE Cache] Error saving cache:', e);
    }
};

// Clear cache (called after save/update/delete)
export const clearIoeCache = () => {
    localStorage.removeItem(CACHE_KEY_QUIZZES);
    localStorage.removeItem(CACHE_KEY_TIMESTAMP);
    console.log('[IOE Cache] Cache cleared');
};

// ============ FETCH FUNCTIONS ============

/**
 * Fetch IOE quizzes with caching strategy:
 * 1. Return cached data immediately if available (for fast UI)
 * 2. Option to force refresh from server
 */
export const fetchIoeQuizzes = async (forceRefresh = false): Promise<Quiz[]> => {
    console.log('[IOE] Fetching quizzes...', forceRefresh ? '(force refresh)' : '');

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
        const cached = getCachedQuizzes();
        if (cached) {
            return cached;
        }
    }

    try {
        const quizData = await callIoeGasApi('get_quizzes');
        const questionData = await callIoeGasApi('get_questions');

        if (!quizData || !questionData) {
            console.error('[IOE] Failed to fetch quiz or question data');
            // Return stale cache if network fails
            const staleCache = localStorage.getItem(CACHE_KEY_QUIZZES);
            if (staleCache) {
                console.log('[IOE Cache] Returning stale cache due to network error');
                return JSON.parse(staleCache);
            }
            return [];
        }

        // Parse quizzes and attach questions
        const quizzes: Quiz[] = quizData.map((row: any) => {
            const quizId = row.id;
            const quizQuestions = questionData
                .filter((q: any) => q.quizId === quizId)
                .map((q: any) => parseIoeQuestion(q));

            return {
                id: quizId,
                title: row.title,
                classLevel: String(row.classLevel), // Ensure string for filtering
                category: row.category || 'ioe',
                examCode: row.examCode || undefined,
                timeLimit: parseInt(row.timeLimit) || 15,
                createdAt: row.createdAt,
                accessCode: row.accessCode || undefined,
                requireCode: row.requireCode === 'TRUE',
                questions: quizQuestions,
            };
        });

        // Save to cache
        setCachedQuizzes(quizzes);

        console.log(`[IOE] Fetched ${quizzes.length} quizzes:`, quizzes.map(q => ({ id: q.id, title: q.title, classLevel: q.classLevel })));
        return quizzes;
    } catch (error) {
        console.error('[IOE] Error fetching quizzes:', error);
        // Return stale cache if available
        const staleCache = localStorage.getItem(CACHE_KEY_QUIZZES);
        if (staleCache) {
            console.log('[IOE Cache] Returning stale cache due to error');
            return JSON.parse(staleCache);
        }
        return [];
    }
};

// Parse question from sheet row
const parseIoeQuestion = (row: any): Question => {
    const type = row.type as QuestionType;

    let question: any = {
        id: row.id,
        type: type,
    };

    switch (type) {
        case QuestionType.MCQ:
        case QuestionType.IMAGE_QUESTION:
            question.question = row.question;
            question.options = row.options ? row.options.split('|') : [];
            question.correctAnswer = row.correctAnswer;
            break;

        case QuestionType.TRUE_FALSE:
            question.mainQuestion = row.question;
            question.items = row.items ? JSON.parse(row.items) : [];
            break;

        case QuestionType.SHORT_ANSWER:
            question.question = row.question;
            question.correctAnswer = row.correctAnswer;
            break;

        case QuestionType.ORDERING:
            question.question = row.question;
            question.items = row.items ? JSON.parse(row.items) : [];
            // correctOrder stored in correctAnswer column
            let correctOrder = row.correctAnswer ? JSON.parse(row.correctAnswer) : [];
            // Normalize: if correctOrder contains strings, convert to indices
            if (correctOrder.length > 0 && typeof correctOrder[0] === 'string') {
                correctOrder = correctOrder.map((str: string) => question.items.indexOf(str)).filter((idx: number) => idx !== -1);
            }
            question.correctOrder = correctOrder;
            break;

        case QuestionType.MULTIPLE_SELECT:
            question.question = row.question;
            question.options = row.options ? row.options.split('|') : [];
            question.correctAnswers = row.correctAnswer ? JSON.parse(row.correctAnswer) : [];
            break;

        default:
            question.question = row.question;
    }

    return question as Question;
};

// ============ SAVE FUNCTIONS ============

export const saveIoeQuiz = async (quiz: Quiz): Promise<boolean> => {
    console.log('[IOE] Saving quiz:', quiz.id);

    try {
        const result = await callIoeGasApi('create_quiz', {
            id: quiz.id,
            title: quiz.title,
            classLevel: quiz.classLevel,
            category: quiz.category || 'ioe',
            examCode: quiz.examCode || '',
            timeLimit: quiz.timeLimit,
            createdAt: quiz.createdAt,
            accessCode: quiz.accessCode || '',
            requireCode: quiz.requireCode || false,
            questions: quiz.questions,
        });

        if (result && result.status === 'success') {
            console.log('[IOE] Quiz saved successfully');
            clearIoeCache(); // Invalidate cache after save
            return true;
        }
        console.error('[IOE] Failed to save quiz:', result);
        return false;
    } catch (error) {
        console.error('[IOE] Error saving quiz:', error);
        return false;
    }
};

export const updateIoeQuiz = async (quiz: Quiz): Promise<boolean> => {
    console.log('[IOE] Updating quiz:', quiz.id);

    try {
        const result = await callIoeGasApi('update_quiz', {
            id: quiz.id,
            title: quiz.title,
            classLevel: quiz.classLevel,
            category: quiz.category || 'ioe',
            examCode: quiz.examCode || '',
            timeLimit: quiz.timeLimit,
            createdAt: quiz.createdAt,
            accessCode: quiz.accessCode || '',
            requireCode: quiz.requireCode || false,
            questions: quiz.questions,
        });

        if (result && result.status === 'success') {
            console.log('[IOE] Quiz updated successfully');
            clearIoeCache(); // Invalidate cache after update
            return true;
        }
        return false;
    } catch (error) {
        console.error('[IOE] Error updating quiz:', error);
        return false;
    }
};

export const deleteIoeQuiz = async (quizId: string): Promise<boolean> => {
    console.log('[IOE] Deleting quiz:', quizId);

    try {
        const result = await callIoeGasApi('delete_quiz', { quizId });
        if (result && result.status === 'success') {
            clearIoeCache(); // Invalidate cache after delete
            return true;
        }
        return false;
    } catch (error) {
        console.error('[IOE] Error deleting quiz:', error);
        return false;
    }
};

// ============ RESULTS ============

export const fetchIoeResults = async (): Promise<StudentResult[]> => {
    console.log('[IOE] Fetching results...');

    try {
        const data = await callIoeGasApi('get_results');
        if (!data) return [];

        return data.map((row: any) => ({
            studentName: row['Student Name'],
            studentClass: row['Class'],
            quizTitle: row['Quiz Title'],
            score: parseFloat(row['Score']) || 0,
            correctCount: parseInt(row['correctCount']) || 0,
            totalQuestions: parseInt(row['Total Questions']) || 0,
            submittedAt: row['Submitted At'],
        }));
    } catch (error) {
        console.error('[IOE] Error fetching results:', error);
        return [];
    }
};

export const saveIoeResult = async (result: StudentResult): Promise<boolean> => {
    console.log('[IOE] Saving result for:', result.studentName);

    try {
        const response = await callIoeGasApi('submit_result', {
            studentName: result.studentName,
            className: result.studentClass,
            quizTitle: result.quizTitle,
            score: result.score,
            correctCount: result.correctCount,
            totalQuestions: result.totalQuestions,
            submittedAt: result.submittedAt,
        });

        return response && response.status === 'success';
    } catch (error) {
        console.error('[IOE] Error saving result:', error);
        return false;
    }
};
