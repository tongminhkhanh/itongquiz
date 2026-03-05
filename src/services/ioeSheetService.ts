// ============ IOE SHEET SERVICE ============
// Service for IOE system - now routes through Cloudflare Workers D1

import { Quiz, Question, QuestionType, StudentResult } from '../types';
import { callApi } from './apiAdapter';

// Helper to fix "Reorder the words" questions
// Normalizes ALL separators (colons and slashes) to format: "word1 /word2 /word3"
const fixReorderQuestion = (text: string): string => {
    if (!text) return text;
    // Check if it's a "Reorder" question
    const reorderMatch = text.match(/^(Reorder(?:\s+the\s+words)?)\s*[:/]\s*/i);
    if (reorderMatch) {
        const prefix = reorderMatch[1];
        let wordsPartRaw = text.substring(reorderMatch[0].length);

        // Replace ALL colons AND slashes with " /" (space before, no space after)
        let wordsPart = wordsPartRaw.replace(/\s*[:/]\s*/g, ' /');

        // Normalize multiple spaces to single space
        wordsPart = wordsPart.replace(/\s+/g, ' ');

        // Trim and ensure clean formatting
        wordsPart = wordsPart.trim();

        return `${prefix}: ${wordsPart}`;
    }
    return text;
};

// Helper to call IOE API through Cloudflare Workers
const callIoeGasApi = async (action: string, payload: any = {}, _timeoutMs: number = 120000): Promise<any> => {
    console.log(`[IOE D1] Calling API: ${action}`);
    try {
        const data = await callApi(action, payload);
        if (data && !Array.isArray(data) && (data as any).status === 'error') {
            console.error(`[IOE D1] API Error [${action}]:`, (data as any).message);
            return null;
        }
        return data;
    } catch (error) {
        console.error(`[IOE D1] Network Error [${action}]:`, error);
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

// 🚀 Agent Skill: Stale-While-Revalidate pattern
// Get stale cache for immediate return, regardless of TTL
const getStaleCachedQuizzes = (): Quiz[] | null => {
    try {
        const cached = localStorage.getItem(CACHE_KEY_QUIZZES);
        if (cached) {
            const timestamp = localStorage.getItem(CACHE_KEY_TIMESTAMP);
            const age = timestamp ? Date.now() - parseInt(timestamp) : Infinity;
            console.log(`[IOE Cache] Returning stale cache (${Math.round(age / 1000)}s old)`);
            return JSON.parse(cached);
        }
    } catch (e) {
        console.warn('[IOE Cache] Error reading stale cache:', e);
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

// 🚀 Agent Skill: Background revalidation helper
// Fetches fresh data in background and updates cache without blocking UI
const revalidateInBackground = async (onRefresh?: (quizzes: Quiz[]) => void): Promise<void> => {
    console.log('[IOE SWR] Starting background revalidation...');
    try {
        const [quizData, questionData] = await Promise.all([
            callIoeGasApi('get_quizzes'),
            callIoeGasApi('get_questions')
        ]);

        if (quizData && questionData) {
            const quizzes = parseQuizzesFromData(quizData, questionData);
            setCachedQuizzes(quizzes);
            console.log('[IOE SWR] Background refresh completed, updated cache');
            if (onRefresh) {
                onRefresh(quizzes);
            }
        }
    } catch (error) {
        console.warn('[IOE SWR] Background revalidation failed:', error);
    }
};

// Helper to parse quizzes from API data
const parseQuizzesFromData = (quizData: any[], questionData: any[]): Quiz[] => {
    // Helper to normalize snake_case (from D1) to camelCase (expected by frontend/GAS)
    const normalizeRow = (row: any) => {
        if (!row) return row;
        return {
            ...row,
            quizId: row.quizId || row.quiz_id,
            classLevel: row.classLevel || row.class_level,
            timeLimit: row.timeLimit || row.time_limit,
            createdAt: row.createdAt || row.created_at,
            createdBy: row.createdBy || row.created_by,
            accessCode: row.accessCode || row.access_code,
            requireCode: row.requireCode !== undefined ? row.requireCode : row.require_code,
            showOnHome: row.showOnHome !== undefined ? row.showOnHome : row.show_on_home,
            correctAnswer: row.correctAnswer || row.correct_answer,
            text: row.text || row.text_field,
            correctWordIndexes: row.correctWordIndexes || row.correct_word_indexes,
        };
    };

    const normalizedQuizData = quizData.map(normalizeRow);
    const normalizedQuestionData = questionData.map(normalizeRow);

    return normalizedQuizData
        .filter((row: any) => row.category === 'ioe')
        .map((row: any) => {
            const quizId = row.id;
            const quizQuestions = normalizedQuestionData
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
                requireCode: row.requireCode === 'TRUE' || row.requireCode === true,
                questions: quizQuestions,
            };
        });
};

/**
 * 🚀 Agent Skill: Stale-While-Revalidate
 * Fetch IOE quizzes with SWR caching strategy:
 * 1. Return cached data immediately if available (for instant UI)
 * 2. If cache is stale, trigger background refresh and still return stale data
 * 3. Optional onRefresh callback to update UI when fresh data arrives
 */
export const fetchIoeQuizzes = async (
    forceRefresh = false,
    onRefresh?: (quizzes: Quiz[]) => void
): Promise<Quiz[]> => {
    console.log('[IOE] Fetching quizzes...', forceRefresh ? '(force refresh)' : '');

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
        const cached = getCachedQuizzes();
        if (cached) {
            return cached;
        }

        // SWR: If cache expired, return stale immediately and refresh in background
        const stale = getStaleCachedQuizzes();
        if (stale) {
            // Trigger background refresh (fire and forget)
            revalidateInBackground(onRefresh);
            return stale;
        }
    }

    try {
        // 🚀 Agent Skill: Promise.all() for Independent Operations
        // Fetch quizzes and questions in parallel instead of sequential
        const [quizData, questionData] = await Promise.all([
            callIoeGasApi('get_quizzes'),
            callIoeGasApi('get_questions')
        ]);

        if (!quizData || !questionData) {
            console.error('[IOE] Failed to fetch quiz or question data');
            // Return stale cache if network fails
            const staleCache = getStaleCachedQuizzes();
            if (staleCache) {
                console.log('[IOE Cache] Returning stale cache due to network error');
                return staleCache;
            }
            return [];
        }

        // Parse quizzes and attach questions
        const quizzes = parseQuizzesFromData(quizData, questionData);

        // Save to cache
        setCachedQuizzes(quizzes);

        console.log(`[IOE] Fetched ${quizzes.length} quizzes:`, quizzes.map(q => ({ id: q.id, title: q.title, classLevel: q.classLevel })));
        return quizzes;
    } catch (error) {
        console.error('[IOE] Error fetching quizzes:', error);
        // Return stale cache if available
        const staleCache = getStaleCachedQuizzes();
        if (staleCache) {
            console.log('[IOE Cache] Returning stale cache due to error');
            return staleCache;
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
            question.question = fixReorderQuestion(row.question);
            question.options = row.options ? row.options.split('|') : [];
            question.correctAnswer = row.correctAnswer;
            break;

        case QuestionType.IMAGE_QUESTION:
            question.question = fixReorderQuestion(row.question);
            question.options = row.options ? row.options.split('|') : [];
            try { question.optionImages = row.distractors ? JSON.parse(row.distractors) : []; } catch { question.optionImages = []; }
            question.correctAnswer = row.correctAnswer;
            break;

        case QuestionType.TRUE_FALSE:
            question.mainQuestion = fixReorderQuestion(row.question);
            question.items = row.items ? JSON.parse(row.items) : [];
            break;

        case QuestionType.SHORT_ANSWER:
            question.question = fixReorderQuestion(row.question);
            question.correctAnswer = row.correctAnswer;
            break;

        case QuestionType.ORDERING:
            question.question = fixReorderQuestion(row.question);
            question.items = row.items ? JSON.parse(row.items) : [];
            // correctOrder stored in correctAnswer column
            let correctOrder: any[] = [];
            if (row.correctAnswer) {
                try { correctOrder = JSON.parse(row.correctAnswer); } catch { correctOrder = []; }
            }
            // Normalize: if correctOrder contains strings, convert to item indices
            if (correctOrder.length > 0 && typeof correctOrder[0] === 'string') {
                // Extract text from items (items might be strings or objects with content/text)
                const getItemText = (item: any): string => {
                    if (typeof item === 'string') return item;
                    if (typeof item === 'object' && item) return item.content || item.text || String(item);
                    return String(item);
                };
                const itemTexts = question.items.map(getItemText);
                correctOrder = correctOrder.map((str: string) => {
                    // Try exact match first
                    let idx = itemTexts.indexOf(str);
                    if (idx === -1) {
                        // Try trimmed match
                        idx = itemTexts.findIndex((t: string) => t.trim() === str.trim());
                    }
                    return idx;
                }).filter((idx: number) => idx !== -1);
            }
            // If correctOrder is still empty after parsing, default to natural order [0, 1, 2...]
            if (correctOrder.length === 0 && question.items.length > 0) {
                correctOrder = Array.from({ length: question.items.length }, (_: any, i: number) => i);
            }
            question.correctOrder = correctOrder;
            break;

        case QuestionType.MULTIPLE_SELECT:
            question.question = fixReorderQuestion(row.question);
            question.options = row.options ? row.options.split('|') : [];
            question.correctAnswers = row.correctAnswer ? JSON.parse(row.correctAnswer) : [];
            break;

        default:
            question.question = fixReorderQuestion(row.question);
    }

    if (row.image) {
        question.image = row.image;
    }

    return question as Question;
};

// ============ SAVE FUNCTIONS ============

export const saveIoeQuiz = async (quiz: Quiz): Promise<boolean> => {
    console.log('[IOE] Saving quiz:', quiz.id, 'with', quiz.questions.length, 'questions');

    try {
        // Use longer timeout (180s) for large quiz saves (100 questions)
        const result = await callIoeGasApi('create_quiz', {
            id: quiz.id,
            title: quiz.title,
            classLevel: quiz.classLevel,
            category: quiz.category || 'ioe',
            examCode: quiz.examCode || '',
            timeLimit: quiz.timeLimit,
            createdAt: quiz.createdAt,
            accessCode: quiz.accessCode || undefined,
            requireCode: quiz.requireCode || false,
            questions: quiz.questions,
        }, 180000); // 3 minute timeout for 100 questions

        if (result && result.status === 'success') {
            console.log('[IOE] Quiz saved successfully');
            clearIoeCache(); // Invalidate cache after save
            return true;
        }

        // Log detailed error info
        const errorMsg = result?.message || 'Không nhận được phản hồi từ server';
        console.error('[IOE] Failed to save quiz:', result);
        console.error('[IOE] Error message:', errorMsg);

        // Throw with specific message for UI
        throw new Error(`Lỗi từ IOE Sheet: ${errorMsg}`);
    } catch (error: any) {
        console.error('[IOE] Error saving quiz:', error);
        // Re-throw with detailed message
        throw new Error(error.message || 'Lỗi kết nối đến IOE Sheet');
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
            accessCode: quiz.accessCode || undefined,
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
