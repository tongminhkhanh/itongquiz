/**
 * Quiz Validation Service
 * Server-side answer validation via Google Apps Script
 * Prevents students from seeing answers in DevTools
 */

import { GOOGLE_SCRIPT_URL } from '../config/constants';

const API_SECRET_TOKEN = import.meta.env.VITE_API_SECRET_TOKEN || '';

interface ValidationResult {
    success: boolean;
    score: number;
    correctCount: number;
    total: number;
    details?: {
        questionId: string;
        isCorrect: boolean;
        correctAnswer?: any; // Only returned after submission
    }[];
    error?: string;
}

interface SubmitAnswersPayload {
    quizId: string;
    answers: Record<string, any>; // questionId -> student's answer
    studentName: string;
    studentClass: string;
}

/**
 * Submit answers to server for validation
 * Server will check answers against stored correct answers
 * @returns ValidationResult with score (answers only revealed after submit)
 */
export const validateAnswersOnServer = async (
    payload: SubmitAnswersPayload
): Promise<ValidationResult> => {
    if (!GOOGLE_SCRIPT_URL) {
        console.error("GOOGLE_SCRIPT_URL is not defined");
        return {
            success: false,
            score: 0,
            correctCount: 0,
            total: 0,
            error: "Server URL not configured"
        };
    }

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'validate_answers',
                token: API_SECRET_TOKEN,
                quizId: payload.quizId,
                answers: payload.answers,
                studentName: payload.studentName,
                studentClass: payload.studentClass
            }),
        });

        const data = await response.json();

        if (data.status === 'error') {
            console.error('Validation API Error:', data.message);
            return {
                success: false,
                score: 0,
                correctCount: 0,
                total: 0,
                error: data.message || 'Validation failed'
            };
        }

        return {
            success: true,
            score: data.score || 0,
            correctCount: data.correctCount || 0,
            total: data.total || 0,
            details: data.details || []
        };

    } catch (error) {
        console.error('Network Error in validation:', error);
        return {
            success: false,
            score: 0,
            correctCount: 0,
            total: 0,
            error: 'Network error during validation'
        };
    }
};

/**
 * Get quiz data WITHOUT correct answers (safe for client)
 * Correct answers are stored only on server (Google Sheet)
 */
export const getQuizWithoutAnswers = async (quizId: string): Promise<any> => {
    if (!GOOGLE_SCRIPT_URL) {
        return null;
    }

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'get_quiz_safe',
                token: API_SECRET_TOKEN,
                quizId
            }),
        });

        const data = await response.json();

        if (data.status === 'error') {
            console.error('Get Quiz Safe Error:', data.message);
            return null;
        }

        return data.quiz || null;

    } catch (error) {
        console.error('Network Error:', error);
        return null;
    }
};
