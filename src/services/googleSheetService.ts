import { Quiz, Question, QuestionType, MCQQuestion, TrueFalseQuestion, ShortAnswerQuestion, Teacher, StudentResult } from '../types';
import { cacheService, CacheKeys, CacheTTL } from './CacheService';
// GOOGLE_SCRIPT_URL no longer needed - callGasApi routes through apiAdapter
import { USE_D1 } from '../config/constants';
import { callApi } from './apiAdapter';

// Security: API token for GAS authentication
const API_SECRET_TOKEN = import.meta.env.VITE_API_SECRET_TOKEN || '';

if (!API_SECRET_TOKEN) {
    console.warn("Security Warning: VITE_API_SECRET_TOKEN is missing. API calls may fail.");
}

// Helper to call API (routes through apiAdapter for both GAS and D1 backends)
const callGasApi = async (action: string, payload: any = {}): Promise<any> => {
    try {
        const data = await callApi(action, payload);
        if (data && typeof data === 'object' && (data as any).status === 'error') {
            console.error(`API Error [${action}]:`, (data as any).message);
            return null;
        }
        return data;
    } catch (error) {
        console.error(`Network Error [${action}]:`, error);
        return null;
    }
};

export const fetchTeachersFromSheets = async (sheetId: string, gid: string): Promise<Teacher[]> => {
    try {
        const data = await callApi<any[]>('get_teachers');

        if (!data || !Array.isArray(data)) {
            console.error('[fetchTeachersFromSheets] Data is not an array:', typeof data);
            return [];
        }

        const teachers = data.map((row: any) => ({
            username: String(row.username || row.id || '').trim(),
            password: String(row.password || '').trim(),
            fullName: row.fullName || row.fullname || row.name || '',
            role: row.role || 'teacher',
            class: row.class ? String(row.class).trim() : undefined
        }));

        return teachers;
    } catch (error) {
        console.error('[fetchTeachersFromSheets] Fetch error:', error);
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

                // Parse answers - handle old format (array) vs new format (object)
                let answers: Record<string, any> = {};
                if (row.answers) {
                    try {
                        const parsed = JSON.parse(row.answers);
                        // If parsed is an array (old format), convert to object
                        if (Array.isArray(parsed)) {
                            parsed.forEach((item: any, index: number) => {
                                if (item && typeof item === 'object' && item.questionId) {
                                    answers[item.questionId] = item;
                                }
                            });
                        } else if (typeof parsed === 'object') {
                            answers = parsed;
                        }
                    } catch (e) {
                        console.error('Error parsing answers:', e);
                        answers = {};
                    }
                }

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
                    answers
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
            const qDataArray = Array.isArray(questionData) ? questionData : [];

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
            const qData = qDataArray.map(normalizeRow);

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
                        correctOrder: row.correctAnswer ? JSON.parse(row.correctAnswer) : [] // Fix: correctOrder is stored in correctAnswer column
                    } as any;
                } else if (row.type === QuestionType.IMAGE_QUESTION) {
                    question = {
                        id: row.id,
                        type: QuestionType.IMAGE_QUESTION,
                        question: unescapeSheetValue(row.question),
                        image: row.image || "",
                        options: processOptions(row.options),
                        optionImages: row.distractors ? JSON.parse(row.distractors) : [], // Fix: Map optionImages from distractors column
                        correctAnswer: unescapeSheetValue(row.correctAnswer)
                    } as any;
                } else if (row.type === QuestionType.DROPDOWN) {
                    question = {
                        id: row.id,
                        type: QuestionType.DROPDOWN,
                        question: unescapeSheetValue(row.question),
                        text: unescapeSheetValue(row.text || ""),
                        blanks: row.blanks ? JSON.parse(row.blanks) : [],
                        image: row.image || "" // Fix: Map image field
                    } as any;
                } else if (row.type === QuestionType.UNDERLINE) {
                    question = {
                        id: row.id,
                        type: QuestionType.UNDERLINE,
                        question: unescapeSheetValue(row.question),
                        sentence: unescapeSheetValue(row.sentence || ""),
                        words: row.items ? JSON.parse(row.items) : [], // words stored in items column
                        correctWordIndexes: row.correctAnswer ? JSON.parse(row.correctAnswer) : []
                    } as any;
                } else if (row.type === QuestionType.RIDDLE) {
                    // RIDDLE: riddleLines -> items, answerLabel -> text, hint -> sentence
                    question = {
                        id: row.id,
                        type: QuestionType.RIDDLE,
                        question: unescapeSheetValue(row.question),
                        riddleLines: row.items ? JSON.parse(row.items) : [],
                        answerLabel: unescapeSheetValue(row.text || ""),
                        hint: unescapeSheetValue(row.sentence || ""),
                        correctAnswer: unescapeSheetValue(row.correctAnswer)
                    } as any;
                } else if (row.type === QuestionType.CATEGORIZATION) {
                    // CATEGORIZATION: items stored in 'items' column, categories stored in 'distractors' column
                    question = {
                        id: row.id,
                        type: QuestionType.CATEGORIZATION,
                        question: unescapeSheetValue(row.question),
                        items: row.items ? JSON.parse(row.items) : [],
                        categories: row.distractors ? JSON.parse(row.distractors) : []
                    } as any;
                } else if (row.type === QuestionType.WORD_SCRAMBLE) {
                    // WORD_SCRAMBLE: letters → items, correctWord → correctAnswer, hint → text
                    question = {
                        id: row.id,
                        type: QuestionType.WORD_SCRAMBLE,
                        question: unescapeSheetValue(row.question),
                        letters: row.items ? JSON.parse(row.items) : [],
                        correctWord: unescapeSheetValue(row.correctAnswer),
                        hint: unescapeSheetValue(row.text || ""),
                    } as any;
                } else if (row.type === QuestionType.ERROR_CORRECTION) {
                    // ERROR_CORRECTION: passage → text, wrongWord → distractors, correctWord → correctAnswer
                    question = {
                        id: row.id,
                        type: QuestionType.ERROR_CORRECTION,
                        question: unescapeSheetValue(row.question),
                        passage: unescapeSheetValue(row.text || ""),
                        wrongWord: unescapeSheetValue(row.distractors || ""),
                        correctWord: unescapeSheetValue(row.correctAnswer),
                    } as any;
                }

                if (question) {
                    // Restore image for all question types if exists
                    if (row.image) {
                        question.image = row.image;
                    }

                    // 🔐 ANTI-CHEAT: Strip answers if enabled (for student views)
                    const finalQuestion = _stripAnswersEnabled ? stripAnswerFields(question) : question;
                    questionsByQuizId[qId].push(finalQuestion);
                }
            });

            // Map Quizzes
            const quizzes: Quiz[] = normalizedQuizData
                .filter((row: any) => !USE_D1 || row.category !== 'ioe')
                .map((row: any) => ({
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
                    accessCode: row.accessCode || undefined,
                    requireCode: row.requireCode === "TRUE" || row.requireCode === true,
                    showOnHome: row.showOnHome !== "FALSE" && row.showOnHome !== false // Map explicitly
                }));

            return quizzes;
        },
        CacheTTL.QUIZZES
    );
};

// PREPARE QUIZ FOR SAVING
export const prepareQuizForSave = (quiz: Quiz) => {
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

        // RIDDLE mapping for save
        if (eq.type === QuestionType.RIDDLE) {
            if (eq.riddleLines) eq.items = eq.riddleLines; // Save riddleLines to items column
            if (eq.answerLabel) eq.text = escapeSheetValue(eq.answerLabel); // Save answerLabel to text column
            if (eq.hint) eq.sentence = escapeSheetValue(eq.hint); // Save hint to sentence column
        }

        // IMAGE_QUESTION mapping for save
        if (eq.type === QuestionType.IMAGE_QUESTION) {
            if (eq.optionImages) eq.distractors = eq.optionImages; // Save optionImages to distractors column (GAS handles JSON.stringify)
        }

        // WORD_SCRAMBLE mapping for save
        if (eq.type === QuestionType.WORD_SCRAMBLE) {
            if (eq.letters) eq.items = eq.letters; // Save letters to items column
            if (eq.correctWord) eq.correctAnswer = escapeSheetValue(eq.correctWord); // Save correctWord to correctAnswer column
            if (eq.hint) eq.text = escapeSheetValue(eq.hint); // Save hint to text column
        }

        // ERROR_CORRECTION mapping for save
        if (eq.type === QuestionType.ERROR_CORRECTION) {
            if (eq.passage) eq.text = escapeSheetValue(eq.passage); // Save passage to text column
            if (eq.wrongWord) eq.distractors = eq.wrongWord; // Save wrongWord to distractors column
            if (eq.correctWord) eq.correctAnswer = escapeSheetValue(eq.correctWord); // Save correctWord to correctAnswer column
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

export const deleteResultFromSheet = async (resultId: string, scriptUrl: string): Promise<boolean> => {
    const result = await callGasApi('delete_result', { resultId });
    if (result && result.status === 'success') {
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
