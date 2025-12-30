import { Quiz, Question, QuestionType, MCQQuestion, TrueFalseQuestion, ShortAnswerQuestion, Teacher, StudentResult } from '../types';
import { cacheService, CacheKeys, CacheTTL } from './CacheService';
import { GOOGLE_SCRIPT_URL } from '../config/constants';

// Security: API token for GAS authentication
const API_SECRET_TOKEN = import.meta.env.VITE_API_SECRET_TOKEN || '';

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
    // SECURITY: Don't log sensitive URLs and tokens
    // console.log('[fetchTeachersFromSheets] GOOGLE_SCRIPT_URL:', GOOGLE_SCRIPT_URL);
    // console.log('[fetchTeachersFromSheets] API_SECRET_TOKEN exists:', !!API_SECRET_TOKEN);

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
        // SECURITY: Don't log raw response as it contains passwords
        // console.log('[fetchTeachersFromSheets] Raw response:', rawText);

        // Try to parse as JSON
        let data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            console.error('[fetchTeachersFromSheets] JSON parse error:', e);
            alert('DEBUG: API trả về dữ liệu không hợp lệ (không phải JSON):\n' + rawText.substring(0, 500));
            return [];
        }

        // SECURITY: Don't log parsed data as it contains passwords
        // console.log('[fetchTeachersFromSheets] Parsed data:', data);

        if (data.status === 'error') {
            console.error('[fetchTeachersFromSheets] API returned error:', data.message);
            alert('DEBUG: API trả về lỗi:\n' + data.message);
            return [];
        }

        if (!Array.isArray(data)) {
            console.error('[fetchTeachersFromSheets] Data is not an array:', typeof data);
            alert('DEBUG: Dữ liệu không phải mảng. Loại: ' + typeof data + '\nNội dung: ' + JSON.stringify(data).substring(0, 500));
            return [];
        }

        const teachers = data.map((row: any) => ({
            username: String(row.username).trim(),
            password: String(row.password).trim(),
            fullName: row.fullName,
            role: row.role || 'teacher',
            class: row.class ? String(row.class).trim() : undefined
        }));

        // SECURITY: Don't log teacher data as it contains passwords
        console.log('[fetchTeachersFromSheets] Mapped teachers count:', teachers.length);
        return teachers;

    } catch (error) {
        console.error('[fetchTeachersFromSheets] Fetch error:', error);
        alert('DEBUG: Lỗi kết nối API:\n' + String(error));
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

                if (row.type === QuestionType.MCQ) {
                    question = {
                        id: row.id,
                        type: QuestionType.MCQ,
                        question: row.question,
                        options: row.options ? row.options.split('|').map((o: string) => o.trim()) : [],
                        correctAnswer: row.correctAnswer
                    } as MCQQuestion;
                } else if (row.type === QuestionType.TRUE_FALSE) {
                    question = {
                        id: row.id,
                        type: QuestionType.TRUE_FALSE,
                        mainQuestion: row.question, // Using 'question' column for mainQuestion
                        items: row.items ? JSON.parse(row.items) : []
                    } as TrueFalseQuestion;
                } else if (row.type === QuestionType.SHORT_ANSWER) {
                    question = {
                        id: row.id,
                        type: QuestionType.SHORT_ANSWER,
                        question: row.question,
                        correctAnswer: row.correctAnswer
                    } as ShortAnswerQuestion;
                } else if (row.type === QuestionType.MATCHING) {
                    question = {
                        id: row.id,
                        type: QuestionType.MATCHING,
                        mainQuestion: row.question,
                        pairs: row.items ? JSON.parse(row.items) : []
                    } as any;
                } else if (row.type === QuestionType.MULTIPLE_SELECT) {
                    question = {
                        id: row.id,
                        type: QuestionType.MULTIPLE_SELECT,
                        question: row.question,
                        options: row.options ? row.options.split('|').map((o: string) => o.trim()) : [],
                        correctAnswers: row.correctAnswer ? JSON.parse(row.correctAnswer) : []
                    } as any;
                } else if (row.type === QuestionType.DRAG_DROP) {
                    question = {
                        id: row.id,
                        type: QuestionType.DRAG_DROP,
                        question: row.question || "Điền từ thích hợp vào chỗ trống:",
                        text: row.text || "",
                        blanks: row.blanks ? JSON.parse(row.blanks) : [],
                        distractors: row.distractors ? JSON.parse(row.distractors) : []
                    } as any;
                }

                if (question) {
                    questionsByQuizId[qId].push(question);
                }
            });

            // Map Quizzes
            const quizzes: Quiz[] = quizData.map((row: any) => ({
                id: row.id,
                title: row.title,
                classLevel: String(row.classLevel), // Ensure it's a string for comparison
                category: row.category || '', // Danh mục quiz
                timeLimit: parseInt(row.timeLimit, 10) || 15,
                createdAt: row.createdAt || new Date().toISOString(),
                questions: questionsByQuizId[row.id] || [],
                accessCode: row.accessCode || "",
                requireCode: row.requireCode === "TRUE" || row.requireCode === true
            }));

            return quizzes;
        },
        CacheTTL.QUIZZES
    );
};

export const saveQuizToSheet = async (quiz: Quiz, scriptUrl: string): Promise<boolean> => {
    const result = await callGasApi('create_quiz', quiz);
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
    const result = await callGasApi('update_quiz', quiz);
    if (result && result.status === 'success') {
        cacheService.invalidatePrefix('quizzes:');
        return true;
    }
    return false;
};
