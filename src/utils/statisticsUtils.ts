/**
 * Statistics Utility Functions
 * 
 * Provides mathematical calculations for results analysis
 */

import { StudentResult } from '../types';

/**
 * Calculate mean (average) of an array
 */
export const calculateMean = (values: number[]): number => {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
};

/**
 * Calculate median of an array
 */
export const calculateMedian = (values: number[]): number => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Calculate standard deviation
 */
export const calculateStdDev = (values: number[]): number => {
    if (values.length === 0) return 0;
    const mean = calculateMean(values);
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    return Math.sqrt(calculateMean(squareDiffs));
};

/**
 * Calculate comprehensive statistics from results
 */
export interface ResultsStatistics {
    totalResults: number;
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
    passRate: number; // Percentage of students with score >= 5
    passCount: number;
    failCount: number;
    scoreDistribution: { range: string; count: number; percentage: number }[];
}

export const calculateResultsStatistics = (results: StudentResult[]): ResultsStatistics => {
    if (results.length === 0) {
        return {
            totalResults: 0,
            mean: 0,
            median: 0,
            stdDev: 0,
            min: 0,
            max: 0,
            passRate: 0,
            passCount: 0,
            failCount: 0,
            scoreDistribution: [],
        };
    }

    const scores = results.map(r => r.score);
    const passCount = scores.filter(s => s >= 5).length;
    const failCount = scores.length - passCount;

    // Score distribution
    const ranges = [
        { label: '0-2', min: 0, max: 2 },
        { label: '3-4', min: 2.01, max: 4 },
        { label: '5-6', min: 4.01, max: 6 },
        { label: '7-8', min: 6.01, max: 8 },
        { label: '9-10', min: 8.01, max: 10 },
    ];

    const scoreDistribution = ranges.map(range => {
        const count = scores.filter(s => s >= range.min && s <= range.max).length;
        return {
            range: range.label,
            count,
            percentage: (count / scores.length) * 100,
        };
    });

    return {
        totalResults: results.length,
        mean: Math.round(calculateMean(scores) * 100) / 100,
        median: Math.round(calculateMedian(scores) * 100) / 100,
        stdDev: Math.round(calculateStdDev(scores) * 100) / 100,
        min: Math.min(...scores),
        max: Math.max(...scores),
        passRate: Math.round((passCount / scores.length) * 100),
        passCount,
        failCount,
        scoreDistribution,
    };
};

export interface QuestionAnalysis {
    questionId: string;
    questionText: string;
    correctCount: number;
    wrongCount: number;
    correctRate: number; // Percentage
    avgTimeSpent?: number; // Seconds
    difficulty: 'easy' | 'medium' | 'hard';
}

// Question with additional fields for fallback calculation
export interface QuestionWithCorrect {
    id: string;
    question: string;
    type?: string;
    correctAnswer?: any;
    correctAnswers?: string[];  // For MULTIPLE_SELECT questions
    items?: any[];
    blanks?: any[];
    pairs?: any[];
    options?: any[];
}

/**
 * Fallback function to calculate isCorrect from answer and question data
 */
const calculateIsCorrectFallback = (
    answer: any,
    question: QuestionWithCorrect
): boolean | undefined => {
    if (answer === undefined || answer === null) return undefined;

    const { correctAnswer, type, items, blanks, pairs } = question;

    // If answer is new format with isCorrect, use it directly
    if (typeof answer === 'object' && typeof answer.isCorrect === 'boolean') {
        return answer.isCorrect;
    }

    // Old format: answer is just the value (e.g., "A", "100", etc.)
    const selectedAnswer = typeof answer === 'object' ? answer.selectedAnswer : answer;

    // MCQ / IMAGE_QUESTION: Compare letters
    if (type === 'MCQ' || type === 'IMAGE_QUESTION') {
        if (correctAnswer === undefined || correctAnswer === null) return undefined;
        const studentVal = String(selectedAnswer).trim().toUpperCase();
        let correctVal = String(correctAnswer).trim().toUpperCase();
        // Handle "B. Answer text" format -> "B"
        const letterMatch = correctVal.match(/^([A-Z])[.)\s]/);
        if (letterMatch) correctVal = letterMatch[1];
        return studentVal === correctVal;
    }

    // SHORT_ANSWER: Case-insensitive
    if (type === 'SHORT_ANSWER') {
        if (correctAnswer === undefined || correctAnswer === null) return undefined;
        return String(selectedAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
    }

    // MULTIPLE_SELECT: Array comparison (use correctAnswers first, fallback to correctAnswer)
    if (type === 'MULTIPLE_SELECT') {
        const correctData = question.correctAnswers || correctAnswer;
        if (correctData === undefined || correctData === null) return undefined;
        try {
            const correctArr = Array.isArray(correctData) ? correctData : JSON.parse(correctData);
            const studentArr = Array.isArray(selectedAnswer) ? selectedAnswer : [];
            return correctArr.length === studentArr.length &&
                correctArr.every((c: string) => studentArr.includes(c));
        } catch { return undefined; }
    }

    // TRUE_FALSE: Check all items
    if (type === 'TRUE_FALSE' && items && Array.isArray(items)) {
        const studentItems = typeof selectedAnswer === 'object' ? selectedAnswer : {};
        return items.every((item: any, i: number) => {
            const itemKey = item.id || `item-${i}`;
            return studentItems[itemKey] === item.isCorrect;
        });
    }

    // MATCHING: Compare pairs
    if (type === 'MATCHING' && pairs && Array.isArray(pairs)) {
        const studentPairs = typeof selectedAnswer === 'object' ? selectedAnswer : {};
        const cleanedPairs = { ...studentPairs };
        delete cleanedPairs.selectedLeft;
        if (Object.keys(cleanedPairs).length !== pairs.length) return false;
        return pairs.every((pair: any) => cleanedPairs[pair.left] === pair.right);
    }

    // DRAG_DROP: Compare blanks
    if (type === 'DRAG_DROP' && blanks && Array.isArray(blanks)) {
        const studentBlanks = typeof selectedAnswer === 'object' ? selectedAnswer : {};
        const studentValues = Object.values(studentBlanks);
        if (studentValues.length !== blanks.length) return false;
        const sortedKeys = Object.keys(studentBlanks).sort((a, b) => Number(a) - Number(b));
        return sortedKeys.every((key, idx) => {
            const studentWord = String(studentBlanks[key]).trim().toLowerCase();
            const correctWord = String(blanks[idx]).trim().toLowerCase();
            return studentWord === correctWord;
        });
    }

    // DROPDOWN: Compare with blanks correctAnswer
    if (type === 'DROPDOWN' && blanks && Array.isArray(blanks)) {
        const studentDropdowns = typeof selectedAnswer === 'object' ? selectedAnswer : {};
        return blanks.every((blank: any) => {
            const studentVal = String(studentDropdowns[blank.id] || '').trim();
            const correctVal = String(blank.correctAnswer || '').trim();
            return studentVal === correctVal;
        });
    }

    return undefined;
};

export const analyzeQuestionDifficulty = (
    results: StudentResult[],
    questions: QuestionWithCorrect[]
): QuestionAnalysis[] => {
    const questionStats: Record<string, { correct: number; wrong: number; totalTime: number }> = {};
    const questionMap = new Map(questions.map(q => [q.id, q]));

    // Initialize stats for each question
    questions.forEach(q => {
        questionStats[q.id] = { correct: 0, wrong: 0, totalTime: 0 };
    });

    // Aggregate results
    results.forEach(result => {
        if (result.answers) {
            Object.entries(result.answers).forEach(([questionId, answer]) => {
                if (questionStats[questionId]) {
                    const question = questionMap.get(questionId);
                    let isCorrect: boolean | undefined;

                    // Try to get isCorrect from answer object first
                    if (typeof answer === 'object' && typeof answer?.isCorrect === 'boolean') {
                        isCorrect = answer.isCorrect;
                    } else if (question) {
                        // Fallback: calculate from correctAnswer
                        isCorrect = calculateIsCorrectFallback(answer, question);
                    }

                    if (isCorrect === true) {
                        questionStats[questionId].correct++;
                    } else if (isCorrect === false) {
                        questionStats[questionId].wrong++;
                    }
                    // If undefined, don't count (unknown)

                    if (typeof answer === 'object' && answer?.timeSpent) {
                        questionStats[questionId].totalTime += answer.timeSpent;
                    }
                }
            });
        }
    });

    // Calculate analysis
    return questions.map(q => {
        const stats = questionStats[q.id] || { correct: 0, wrong: 0, totalTime: 0 };
        const total = stats.correct + stats.wrong;
        const correctRate = total > 0 ? (stats.correct / total) * 100 : 0;

        let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
        if (correctRate >= 80) difficulty = 'easy';
        else if (correctRate < 50) difficulty = 'hard';

        return {
            questionId: q.id,
            questionText: q.question,
            correctCount: stats.correct,
            wrongCount: stats.wrong,
            correctRate: Math.round(correctRate),
            avgTimeSpent: total > 0 ? Math.round(stats.totalTime / total) : undefined,
            difficulty,
        };
    });
};

/**
 * Get top N most missed questions
 */
export const getMostMissedQuestions = (
    analysis: QuestionAnalysis[],
    topN: number = 5
): QuestionAnalysis[] => {
    return [...analysis]
        .sort((a, b) => a.correctRate - b.correctRate)
        .slice(0, topN);
};

/**
 * Filter results by date range
 */
export const filterResultsByDateRange = (
    results: StudentResult[],
    startDate?: Date,
    endDate?: Date
): StudentResult[] => {
    return results.filter(r => {
        const submittedDate = new Date(r.submittedAt);
        if (startDate && submittedDate < startDate) return false;
        if (endDate && submittedDate > endDate) return false;
        return true;
    });
};

/**
 * Filter results by score range
 */
export const filterResultsByScoreRange = (
    results: StudentResult[],
    minScore: number,
    maxScore: number
): StudentResult[] => {
    return results.filter(r => r.score >= minScore && r.score <= maxScore);
};

/**
 * Search results by student name
 */
export const searchResultsByName = (
    results: StudentResult[],
    searchTerm: string
): StudentResult[] => {
    if (!searchTerm.trim()) return results;
    const term = searchTerm.toLowerCase();
    return results.filter(r =>
        r.studentName.toLowerCase().includes(term)
    );
};
