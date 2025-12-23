import Papa from 'papaparse';
import { Quiz, Question, QuestionType, MCQQuestion, TrueFalseQuestion, ShortAnswerQuestion, Teacher } from './types';

// Helper to fetch CSV data
const fetchCSV = async (url: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(url, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
            error: (error) => reject(error),
        });
    });
};

export const fetchTeachersFromSheets = async (sheetId: string, gid: string): Promise<Teacher[]> => {
    try {
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
        const data = await fetchCSV(url);

        return data.map((row: any) => ({
            username: row.username,
            password: row.password,
            fullName: row.fullName
        }));
    } catch (error) {
        console.error("Error fetching teachers:", error);
        return [];
    }
};

export const fetchQuizzesFromSheets = async (sheetId: string, quizGid: string, questionGid: string): Promise<Quiz[]> => {
    try {
        const quizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${quizGid}`;
        const questionUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${questionGid}`;

        const [quizData, questionData] = await Promise.all([
            fetchCSV(quizUrl),
            fetchCSV(questionUrl)
        ]);

        // Map Questions
        const questionsByQuizId: Record<string, Question[]> = {};

        questionData.forEach((row: any) => {
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
            classLevel: row.classLevel,
            timeLimit: parseInt(row.timeLimit, 10) || 15,
            createdAt: row.createdAt || new Date().toISOString(),
            questions: questionsByQuizId[row.id] || [],
            accessCode: row.accessCode || "",
            requireCode: row.requireCode === "TRUE" || row.requireCode === true
        }));

        return quizzes;

    } catch (error) {
        console.error("Error fetching data from Google Sheets:", error);
        return [];
    }
};

export const saveQuizToSheet = async (quiz: Quiz, scriptUrl: string): Promise<boolean> => {
    try {
        const payload = {
            ...quiz,
            type: 'quiz' // Explicitly set type
        };

        const response = await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        return true;
    } catch (error) {
        console.error("Error saving to Google Sheets:", error);
        return false;
    }
};

export const saveResultToSheet = async (result: any, scriptUrl: string): Promise<boolean> => {
    try {
        const payload = {
            type: 'result',
            studentName: result.studentName,
            className: result.studentClass,
            quizTitle: result.quizTitle || "Unknown Quiz",
            score: result.score,
            totalQuestions: result.totalQuestions,
            submittedAt: result.submittedAt
        };

        await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return true;
    } catch (error) {
        console.error("Error saving result to Google Sheets:", error);
        return false;
    }
};

export const deleteQuizFromSheet = async (quizId: string, scriptUrl: string): Promise<boolean> => {
    try {
        const payload = {
            action: 'delete',
            quizId: quizId
        };

        await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return true;
    } catch (error) {
        console.error("Error deleting quiz:", error);
        return false;
    }
};

export const updateQuizInSheet = async (quiz: Quiz, scriptUrl: string): Promise<boolean> => {
    try {
        const payload = {
            ...quiz,
            action: 'update'
        };

        await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return true;
    } catch (error) {
        console.error("Error updating quiz:", error);
        return false;
    }
};
