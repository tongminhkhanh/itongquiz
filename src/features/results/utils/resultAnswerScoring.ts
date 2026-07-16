import type { StudentResult } from '../../../types';
import { checkAnswer } from '../../../utils/question/scoring.util';

type ValidationDetail = NonNullable<StudentResult['validationDetails']>[number];

export const isResultAnswerSkipped = (value: any): boolean => (
    value === undefined
    || value === null
    || value === ''
    || (Array.isArray(value) && value.length === 0)
    || (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)
);

export const resolveResultAnswerCorrectness = (
    questionId: string,
    answerData: any,
    validationDetails: ValidationDetail[] = [],
): boolean | undefined => {
    if (answerData && typeof answerData === 'object' && ('selectedAnswer' in answerData || 'questionSnapshot' in answerData)) {
        const selectedAnswer = answerData.selectedAnswer;
        if (isResultAnswerSkipped(selectedAnswer)) return false;

        // Historical result flags are immutable grading evidence from submission time.
        if (typeof answerData.isCorrect === 'boolean') return answerData.isCorrect;

        const snapshot = answerData.questionSnapshot;
        return snapshot?.type ? checkAnswer(snapshot, selectedAnswer).isCorrect : undefined;
    }

    if (isResultAnswerSkipped(answerData)) return false;
    return validationDetails.find((detail) => detail.questionId === questionId)?.isCorrect;
};

export const calculateResultAnswerSummary = (
    answers: Record<string, any> = {},
    validationDetails: ValidationDetail[] = [],
): { correctCount: number; totalAnswers: number } => {
    const entries = Object.entries(answers).filter(([key]) => !key.startsWith('_'));
    const correctCount = entries.reduce((count, [questionId, answerData]) => (
        resolveResultAnswerCorrectness(questionId, answerData, validationDetails) === true ? count + 1 : count
    ), 0);
    return { correctCount, totalAnswers: entries.length };
};
