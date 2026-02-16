/**
 * 🚀 Antigravity Rule: React Hooks Best Practices
 * Custom hooks for IOE Quiz functionality
 * Extracted from IoeStudentView for reusability and cleaner component code
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Question, QuestionType } from '../types';

// ============ useQuizTimer Hook ============
interface UseQuizTimerOptions {
    initialMinutes: number;
    onTimeout?: () => void;
    enabled?: boolean;
}

interface UseQuizTimerReturn {
    timeLeft: number;
    formattedTime: string;
    isExpired: boolean;
    resetTimer: () => void;
}

/**
 * 🚀 Custom hook for quiz timer management
 * Follows React Hooks Best Practices:
 * - Single responsibility
 * - Clean side effect handling
 * - Stable callback refs
 */
export function useQuizTimer({
    initialMinutes,
    onTimeout,
    enabled = true
}: UseQuizTimerOptions): UseQuizTimerReturn {
    const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
    const isExpired = timeLeft === 0;

    // Timer effect
    useEffect(() => {
        if (!enabled || timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [enabled, timeLeft]);

    // Trigger onTimeout when expired
    useEffect(() => {
        if (isExpired && onTimeout) {
            onTimeout();
        }
    }, [isExpired, onTimeout]);

    // Format time as MM:SS
    const formattedTime = useMemo(() => {
        const m = Math.floor(timeLeft / 60);
        const s = timeLeft % 60;
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }, [timeLeft]);

    // Reset timer
    const resetTimer = useCallback(() => {
        setTimeLeft(initialMinutes * 60);
    }, [initialMinutes]);

    return { timeLeft, formattedTime, isExpired, resetTimer };
}

// ============ useQuizAnswers Hook ============
interface UseQuizAnswersReturn {
    answers: Record<string, any>;
    setAnswer: (questionId: string, value: any) => void;
    clearAnswers: () => void;
    isAnswered: (question: Question) => boolean;
}

/**
 * 🚀 Custom hook for managing quiz answers
 * Follows React Hooks Best Practices:
 * - useCallback for stable handlers
 * - Clean state management
 */
export function useQuizAnswers(): UseQuizAnswersReturn {
    const [answers, setAnswers] = useState<Record<string, any>>({});

    // Stable callback for setting answers
    const setAnswer = useCallback((questionId: string, value: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    }, []);

    // Clear all answers
    const clearAnswers = useCallback(() => {
        setAnswers({});
    }, []);

    // Check if question is answered
    const isAnswered = useCallback((q: Question): boolean => {
        if (q.type === QuestionType.TRUE_FALSE) {
            const ans = answers[q.id];
            if (!ans) return false;
            return q.items.every((item, idx) => {
                const itemKey = item.id || `item-${idx}`;
                return ans[itemKey] !== undefined;
            });
        }
        if (q.type === QuestionType.ORDERING) {
            const ans = answers[q.id] as number[] | undefined;
            return ans !== undefined && ans.length > 0;
        }
        return answers[q.id] !== undefined && answers[q.id] !== '';
    }, [answers]);

    return { answers, setAnswer, clearAnswers, isAnswered };
}

// ============ useQuizScoring Hook ============
interface ScoreResult {
    score: number;
    correctCount: number;
    totalItems: number;
    percentage: number;
}

/**
 * 🚀 Custom hook for calculating quiz scores
 * Follows React Hooks Best Practices:
 * - useMemo for expensive calculations
 * - Clean separation of scoring logic
 */
export function useQuizScoring(
    questions: Question[],
    answers: Record<string, any>
): ScoreResult {
    return useMemo(() => {
        let correctCount = 0;
        const totalItems = questions.length;

        questions.forEach(q => {
            if (q.type === QuestionType.MCQ || q.type === QuestionType.IMAGE_QUESTION) {
                if (answers[q.id] === (q as any).correctAnswer) correctCount++;
            } else if (q.type === QuestionType.SHORT_ANSWER) {
                const studentAns = (answers[q.id] || '').toString().trim().toLowerCase();
                const correctAns = (q.correctAnswer || '').toString().trim().toLowerCase();
                const correctOptions = correctAns.split('|').map(s => s.trim());
                if (correctOptions.includes(studentAns)) correctCount++;
            } else if (q.type === QuestionType.TRUE_FALSE) {
                let allCorrect = true;
                q.items.forEach((item, idx) => {
                    const itemKey = item.id || `item-${idx}`;
                    if (answers[q.id]?.[itemKey] !== item.isCorrect) allCorrect = false;
                });
                if (allCorrect) correctCount++;
            } else if (q.type === QuestionType.ORDERING) {
                const studentAns = answers[q.id] as number[] || [];
                let correctOrder = (q as any).correctOrder || [];
                // Fallback: if correctOrder is empty, assume DB order is correct
                const orderItems = (q as any).items || [];
                if ((!correctOrder || correctOrder.length === 0) && orderItems.length > 0) {
                    correctOrder = Array.from({ length: orderItems.length }, (_: any, i: number) => i);
                }
                if (studentAns.length === correctOrder.length &&
                    studentAns.every((val: number, idx: number) => Number(val) === Number(correctOrder[idx]))) {
                    correctCount++;
                }
            }
        });

        // IOE Scoring: Each correct = 10 points
        const score = correctCount * 10;
        const percentage = totalItems > 0 ? Math.round((correctCount / totalItems) * 100) : 0;

        return { score, correctCount, totalItems, percentage };
    }, [questions, answers]);
}

// ============ Utility Functions ============

/**
 * Fisher-Yates shuffle algorithm
 * Hoisted to module level as per Performance Optimization rule
 */
export function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Format seconds to MM:SS string
 */
export function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}
