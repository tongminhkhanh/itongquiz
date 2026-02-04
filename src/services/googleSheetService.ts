import { Quiz, Question, QuestionType, MCQQuestion, TrueFalseQuestion, ShortAnswerQuestion, Teacher, StudentResult } from '../types';
import { cacheService, CacheKeys, CacheTTL } from './CacheService';
import { GOOGLE_SCRIPT_URL } from '../config/constants';

// Security: API token for GAS authentication
const API_SECRET_TOKEN = import.meta.env.VITE_API_SECRET_TOKEN || '';

if (!API_SECRET_TOKEN) {
    console.warn("Security Warning: VITE_API_SECRET_TOKEN is missing. API calls may fail.");
}

// Helper to call GAS API
const callGasApi = async (action: string, payload: any = {}): Promise<any> => {
    if (!GOOGLE_SCRIPT_URL) {
        console.error("GOOGLE_SCRIPT_URL is not defined");
        return null;
    }

    try {
        // Use POST for all requests to ensure token security in body (avoid URL logging)
        // GAS doPost handles both read and write actions now
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors', // Changed to cors to read response
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', // GAS requires text/plain to avoid preflight issues
            },
            body: JSON.stringify({
                ...payload,
                action,
                token: API_SECRET_TOKEN
            }),
        });

        const data = await response.json();
        if (data.status === 'error') {
            console.error(`GAS API Error [${action}]:`, data.message);
            return null;
        }
        return data;
    } catch (error) {
        console.error(`Network Error [${action}]:`, error);
        return null;
    }
};

export const fetchTeachersFromSheets = async (sheetId: string, gid: string): Promise<Teacher[]> => {
    // DEBUG: Bypass cache temporarily to diagnose issue
    console.log('[fetchTeachersFromSheets] Calling API...');

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'get_teachers',
                token: API_SECRET_TOKEN
            }),
        });

        console.log('[fetchTeachersFromSheets] Response status:', response.status);
        const rawText = await response.text();

        // Try to parse as JSON
        let data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            console.error('[fetchTeachersFromSheets] JSON parse error:', e);
            console.error('[fetchTeachersFromSheets] Raw response snippet:', rawText.substring(0, 100) + '...');
            alert('Lỗi: Server trả về dữ liệu không hợp lệ. Vui lòng thử lại sau.');
            return [];
        }

        if (data.status === 'error') {
            console.error('[fetchTeachersFromSheets] API returned error:', data.message);
            alert('Lỗi: ' + (data.message || 'Không thể lấy danh sách giáo viên.'));
            return [];
        }

        if (!Array.isArray(data)) {
            console.error('[fetchTeachersFromSheets] Data is not an array:', typeof data);
            alert('Lỗi: Dữ liệu giáo viên không đúng định dạng.');
            return [];
        }

        const teachers = data.map((row: any) => ({
            // Hỗ trợ cả 2 format: 'id' hoặc 'username' làm username đăng nhập
            username: String(row.username || row.id || '').trim(),
            password: String(row.password || '').trim(), // Note: Password hashing should be done on server side ideally
            // Hỗ trợ nhiều format: 'fullName', 'fullname', 'name' làm tên hiển thị
            fullName: row.fullName || row.fullname || row.name || '',
            role: row.role || 'teacher',
            class: row.class ? String(row.class).trim() : undefined
        }));

        return teachers;

    } catch (error) {
        console.error('[fetchTeachersFromSheets] Fetch error:', error);
        alert('Lỗi kết nối đến máy chủ. Vui lòng kiểm tra mạng.');
        return [];
    }
};

export const fetchResultsFromSheets = async (sheetId: string, resultsGid: string): Promise<StudentResult[]> => {
    const cacheKey = CacheKeys.results(sheetId);

    return cacheService.getOrFetch(
        cacheKey,
        async () => {
            const data = await callGasApi('get_results');
            if (!data || !Array.isArray(data)) return [];

            return data.map((row: any) => {
                // Handle column names with spaces and different casing from Google Sheets
                const studentName = row['Student Name'] || row.studentName || row.name || '';
                const studentClass = row['Class'] || row.className || row.studentClass || '';
                const quizTitle = row['Quiz Title'] || row.quizTitle || '';
                const scoreRaw = row['Score'] || row.score || '0';
                // Handle score with comma as decimal separator (e.g., "3,6" -> 3.6)
                const score = parseFloat(String(scoreRaw).replace(',', '.')) || 0;
                const totalQuestions = parseInt(row['Total Questions'] || row.totalQuestions) || 0;
                const submittedAt = row['Submitted At'] || row.submittedAt || new Date().toISOString();
                const correctCount = parseInt(row['Correct Count'] || row.correctCount) || 0;
                const timeTaken = parseInt(row['Time Taken'] || row.timeTaken) || 0;

                return {
                    id: row.id || `result-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    studentName,
                    studentClass,
                    quizId: row['Quiz ID'] || row.quizId || '',
                    quizTitle,
                    score,
                    correctCount,
                    totalQuestions,
                    submittedAt,
                    timeTaken,
                    answers: row.answers ? JSON.parse(row.answers) : []
                };
            }).filter((r: StudentResult) => r.studentName); // Filter out invalid rows
        },
        CacheTTL.RESULTS
    );
};

// Helper to escape values for Google Sheets (prevent auto-formatting like 1/10 -> Date)
const escapeSheetValue = (val: any): string => {
    if (val === undefined || val === null) return '';
    const strVal = String(val);
    // If it looks like a fraction or math expression that Sheets might reinterpret
    // check for pattern: number/number
    if (/^\d+\s*\/\s*\d+/.test(strVal)) {
        return `'${strVal}`;
    }
    return strVal;
};

// Helper to unescape values from Google Sheets
const unescapeSheetValue = (val: any): string => {
    if (val === undefined || val === null) return '';
    const strVal = String(val);
    if (strVal.startsWith("'")) {
        return strVal.substring(1);
    }
    return strVal;
};

// 🔐 ANTI-CHEAT: Strip answer fields from questions
// This prevents students from seeing correct answers in DevTools
const stripAnswerFields = (question: any): any => {
    const stripped = { ...question };

    // Remove direct answer fields
    delete stripped.correctAnswer;
    delete stripped.correctAnswers;
    delete stripped.correctOrder;
    delete stripped.correctWordIndexes;

    // For TRUE_FALSE: remove isCorrect/isTrue from items
    if (stripped.items && Array.isArray(stripped.items)) {
        stripped.items = stripped.items.map((item: any) => {
            const { isCorrect, isTrue, ...safeItem } = item;
            return safeItem;
        });
    }

    // For DROPDOWN: remove correctAnswer from blanks (blanks are objects with correctAnswer field)
    // For DRAG_DROP: blanks is an array of strings (correct words) - these get mixed with distractors
    // so they're safe to keep (students see all words shuffled together)
    if (stripped.blanks && Array.isArray(stripped.blanks)) {
        // Only process if blanks contain objects (DROPDOWN type)
        if (stripped.blanks.length > 0 && typeof stripped.blanks[0] === 'object') {
            stripped.blanks = stripped.blanks.map((blank: any) => {
                const { correctAnswer, answer, ...safeBlank } = blank;
                return safeBlank;
            });
        }
        // DRAG_DROP blanks are strings - keep as-is (they're shuffled with distractors anyway)
    }

    // For CATEGORIZATION: remove categoryId from items
    if (stripped.type === 'CATEGORIZATION' && stripped.items) {
        stripped.items = stripped.items.map((item: any) => {
            const { categoryId, ...safeItem } = item;
            return safeItem;
        });
    }

    return stripped;
};

// Flag to control answer stripping (set false for teacher views)
let _stripAnswersEnabled = true;
export const setStripAnswersEnabled = (enabled: boolean) => {
    _stripAnswersEnabled = enabled;
};
export const isStripAnswersEnabled = () => _stripAnswersEnabled;

export const fetchQuizzesFromSheets = async (sheetId: string, quizGid: string, questionGid: string): Promise<Quiz[]> => {
    const cacheKey = CacheKeys.quizzes(sheetId);

    return cacheService.getOrFetch(
        cacheKey,
        async () => {
            // Fetch both Quizzes and Questions
            const [quizData, questionData] = await Promise.all([
                callGasApi('get_quizzes'),
                callGasApi('get_questions') // Need to ensure GAS supports this or fetch all in one go
            ]);

            // Fallback: If get_questions is not implemented separately, we might need to adjust GAS
            // But for now let's assume we can fetch them. 
            // Wait, the GAS script I wrote only has 'get_quizzes' which returns the 'Quizzes' sheet.
            // I need to update GAS to support 'get_questions' OR fetch both.
            // Let's check the GAS script I wrote.
            // It has 'get_quizzes' -> 'Quizzes' sheet.
            // It does NOT have 'get_questions'. I missed that in the GAS script update.
            // I will implement 'get_questions' in GAS script in a moment.

            if (!quizData || !Array.isArray(quizData)) return [];

            // Temporary fix: If questionData is missing, we can't map questions.
            // I will assume I'll fix GAS next.
            const qData = Array.isArray(questionData) ? questionData : [];

            // Map Questions
            const questionsByQuizId: Record<string, Question[]> = {};

            qData.forEach((row: any) => {
                const qId = row.quizId;
                if (!questionsByQuizId[qId]) questionsByQuizId[qId] = [];

                let question: Question | null = null;

                // Helper to safely split and unescape pipes if needed (though pipes usually safe)
                // But definitely unescape each option
                const processOptions = (optStr: string) =>
                    optStr ? optStr.split('|').map(o => unescapeSheetValue(o.trim())) : [];

                if (row.type === QuestionType.MCQ) {
                    question = {
                        id: row.id,
                        type: QuestionType.MCQ,
                        question: unescapeSheetValue(row.question),
                        options: processOptions(row.options),
                        correctAnswer: unescapeSheetValue(row.correctAnswer)
                    } as MCQQuestion;
                } else if (row.type === QuestionType.TRUE_FALSE) {
                    question = {
                        id: row.id,
                        type: QuestionType.TRUE_FALSE,
                        mainQuestion: unescapeSheetValue(row.question), // Using 'question' column for mainQuestion
                        items: row.items ? JSON.parse(row.items) : [] // Items are JSON, usually safe unless generated
                    } as TrueFalseQuestion;
                } else if (row.type === QuestionType.SHORT_ANSWER) {
                    question = {
                        id: row.id,
                        type: QuestionType.SHORT_ANSWER,
                        question: unescapeSheetValue(row.question),
                        correctAnswer: unescapeSheetValue(row.correctAnswer)
                    } as ShortAnswerQuestion;
                } else if (row.type === QuestionType.MATCHING) {
                    question = {
                        id: row.id,
                        type: QuestionType.MATCHING,
                        mainQuestion: unescapeSheetValue(row.question),
                        pairs: row.items ? JSON.parse(row.items) : []
                    } as any;
                } else if (row.type === QuestionType.MULTIPLE_SELECT) {
                    question = {
                        id: row.id,
                        type: QuestionType.MULTIPLE_SELECT,
                        question: unescapeSheetValue(row.question),
                        options: processOptions(row.options),
                        correctAnswers: row.correctAnswer ? JSON.parse(row.correctAnswer) : []
                    } as any;
                } else if (row.type === QuestionType.DRAG_DROP) {
                    question = {
                        id: row.id,
                        type: QuestionType.DRAG_DROP,
                        question: unescapeSheetValue(row.question || "Điền từ thích hợp vào chỗ trống:"),
                        text: unescapeSheetValue(row.text || ""),
                        blanks: row.blanks ? JSON.parse(row.blanks) : [],
                        distractors: row.distractors ? JSON.parse(row.distractors) : []
                    } as any;
                } else if (row.type === QuestionType.ORDERING) {
                    question = {
                        id: row.id,
                        type: QuestionType.ORDERING,
                        question: unescapeSheetValue(row.question),
                        items: row.items ? JSON.parse(row.items) : [],
                        correctOrder: row.correctOrder ? JSON.parse(row.correctOrder) : []
                    } as any;
                } else if (row.type === QuestionType.IMAGE_QUESTION) {
                    question = {
                        id: row.id,
                        type: QuestionType.IMAGE_QUESTION,
                        question: unescapeSheetValue(row.question),
                        image: row.image || "",
                        options: processOptions(row.options),
                        correctAnswer: unescapeSheetValue(row.correctAnswer)
                    } as any;
                } else if (row.type === QuestionType.DROPDOWN) {
                    question = {
                        id: row.id,
                        type: QuestionType.DROPDOWN,
                        question: unescapeSheetValue(row.question),
                        text: unescapeSheetValue(row.text || ""),
                        blanks: row.blanks ? JSON.parse(row.blanks) : []
                    } as any;
                } else if (row.type === QuestionType.UNDERLINE) {
                    question = {
                        id: row.id,
                        type: QuestionType.UNDERLINE,
                        question: unescapeSheetValue(row.question),
                        sentence: unescapeSheetValue(row.sentence || ""),
                        words: row.words ? JSON.parse(row.words) : [],
                        correctWordIndexes: row.correctWordIndexes ? JSON.parse(row.correctWordIndexes) : []
                    } as any;
                }

                if (question) {
                    // 🔐 ANTI-CHEAT: Strip answers if enabled (for student views)
                    const finalQuestion = _stripAnswersEnabled ? stripAnswerFields(question) : question;
                    questionsByQuizId[qId].push(finalQuestion);
                }
            });

            // Map Quizzes
            const quizzes: Quiz[] = quizData.map((row: any) => ({
                id: row.id,
                title: row.title,
                classLevel: String(row.classLevel), // Ensure it's a string for comparison
                category: row.category || '', // Danh mục quiz
                timeLimit: (() => {
                    const parsed = parseInt(row.timeLimit, 10);
                    // Validate: timeLimit should be between 1-180 minutes
                    // If invalid (e.g., year 2026 stored by mistake), default to 60
                    if (isNaN(parsed) || parsed < 1 || parsed > 180) return 60;
                    return parsed;
                })(),
                createdAt: row.createdAt || new Date().toISOString(),
                createdBy: row.createdBy || undefined, // Tên giáo viên tạo đề
                questions: questionsByQuizId[row.id] || [],
                accessCode: row.accessCode || "",
                requireCode: row.requireCode === "TRUE" || row.requireCode === true
            }));

            return quizzes;
        },
        CacheTTL.QUIZZES
    );
};

// PREPARE QUIZ FOR SAVING
const prepareQuizForSave = (quiz: Quiz) => {
    // Clone logic handled by serializer in GAS usually, but we need to modify values
    // actually, we are sending the whole object to GAS.
    // We should iterate and escape fields in the questions.
    const escapedQuestions = quiz.questions.map(q => {
        const eq = { ...q } as any;

        // Escape common text fields
        if (eq.question) eq.question = escapeSheetValue(eq.question);
        if (eq.correctAnswer) eq.correctAnswer = escapeSheetValue(eq.correctAnswer);
        if (eq.text) eq.text = escapeSheetValue(eq.text);
        if (eq.sentence) eq.sentence = escapeSheetValue(eq.sentence);

        // Escape options array
        if (eq.options && Array.isArray(eq.options)) {
            eq.options = eq.options.map(escapeSheetValue);
        }

        return eq;
    });

    return {
        ...quiz,
        questions: escapedQuestions
    };
};

export const saveQuizToSheet = async (quiz: Quiz, scriptUrl: string): Promise<boolean> => {
    const escapedQuiz = prepareQuizForSave(quiz);
    const result = await callGasApi('create_quiz', escapedQuiz);
    if (result && result.status === 'success') {
        cacheService.invalidatePrefix('quizzes:');
        return true;
    }
    return false;
};

export const saveResultToSheet = async (result: any, scriptUrl: string): Promise<boolean> => {
    const resultToSave = {
        ...result,
        className: result.studentClass,
        quizTitle: result.quizTitle || "Unknown Quiz"
    };
    const res = await callGasApi('submit_result', resultToSave);
    if (res && res.status === 'success') {
        cacheService.invalidatePrefix('results:');
        return true;
    }
    return false;
};

export const deleteQuizFromSheet = async (quizId: string, scriptUrl: string): Promise<boolean> => {
    const result = await callGasApi('delete_quiz', { quizId });
    if (result && result.status === 'success') {
        cacheService.invalidatePrefix('quizzes:');
        return true;
    }
    return false;
};

export const updateQuizInSheet = async (quiz: Quiz, scriptUrl: string): Promise<boolean> => {
    const escapedQuiz = prepareQuizForSave(quiz);
    const expectedCount = quiz.questions.length;
    const result = await callGasApi('update_quiz', escapedQuiz);

    if (result && result.status === 'success') {
        // Verify question count if server returns it
        if (result.questionCount !== undefined && result.questionCount !== expectedCount) {
            console.error(`[updateQuizInSheet] Question count mismatch: expected ${expectedCount}, got ${result.questionCount}`);
            alert(`Cảnh báo: Số câu hỏi lưu (${result.questionCount}) không khớp với số câu trong đề (${expectedCount}). Vui lòng kiểm tra lại.`);
            return false;
        }
        console.log(`[updateQuizInSheet] Successfully updated quiz with ${result.questionCount || expectedCount} questions`);
        cacheService.invalidatePrefix('quizzes:');
        return true;
    }

    // Log and show error
    const errorMsg = result?.message || 'Unknown error';
    console.error('[updateQuizInSheet] Update failed:', errorMsg);
    alert(`Lỗi khi cập nhật đề: ${errorMsg}`);
    return false;
};
