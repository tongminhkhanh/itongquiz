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

/**
 * Analyze question difficulty based on student answers
 */
export interface QuestionAnalysis {
    questionId: string;
    questionText: string;
    correctCount: number;
    wrongCount: number;
    correctRate: number; // Percentage
    avgTimeSpent?: number; // Seconds
    difficulty: 'easy' | 'medium' | 'hard';
}

export const analyzeQuestionDifficulty = (
    results: StudentResult[],
    questions: { id: string; question: string }[]
): QuestionAnalysis[] => {
    const questionStats: Record<string, { correct: number; wrong: number; totalTime: number }> = {};

    // Initialize stats for each question
    questions.forEach(q => {
        questionStats[q.id] = { correct: 0, wrong: 0, totalTime: 0 };
    });

    // Aggregate results
    results.forEach(result => {
        if (result.answers) {
            Object.entries(result.answers).forEach(([questionId, answer]) => {
                if (questionStats[questionId]) {
                    if (answer?.isCorrect) {
                        questionStats[questionId].correct++;
                    } else {
                        questionStats[questionId].wrong++;
                    }
                    if (answer?.timeSpent) {
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
