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

// ============ FETCH FUNCTIONS ============

export const fetchIoeQuizzes = async (): Promise<Quiz[]> => {
    console.log('[IOE] Fetching quizzes...');

    try {
        const quizData = await callIoeGasApi('get_quizzes');
        const questionData = await callIoeGasApi('get_questions');

        if (!quizData || !questionData) {
            console.error('[IOE] Failed to fetch quiz or question data');
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
                timeLimit: parseInt(row.timeLimit) || 15,
                createdAt: row.createdAt,
                accessCode: row.accessCode || undefined,
                requireCode: row.requireCode === 'TRUE',
                questions: quizQuestions,
            };
        });

        console.log(`[IOE] Fetched ${quizzes.length} quizzes:`, quizzes.map(q => ({ id: q.id, title: q.title, classLevel: q.classLevel })));
        return quizzes;
    } catch (error) {
        console.error('[IOE] Error fetching quizzes:', error);
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
            timeLimit: quiz.timeLimit,
            createdAt: quiz.createdAt,
            accessCode: quiz.accessCode || '',
            requireCode: quiz.requireCode || false,
            questions: quiz.questions,
        });

        if (result && result.status === 'success') {
            console.log('[IOE] Quiz saved successfully');
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
            timeLimit: quiz.timeLimit,
            createdAt: quiz.createdAt,
            accessCode: quiz.accessCode || '',
            requireCode: quiz.requireCode || false,
            questions: quiz.questions,
        });

        if (result && result.status === 'success') {
            console.log('[IOE] Quiz updated successfully');
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
        return result && result.status === 'success';
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
