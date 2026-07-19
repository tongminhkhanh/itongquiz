import type { QuestionSnapshot, StudentResult } from '../../../../../types';

export interface NormalizedAnswer {
    selectedAnswer: any;
    isCorrect?: boolean;
    timeSpent?: number;
    snapshot?: QuestionSnapshot;
}

export const isAnswerSkipped = (value: any): boolean => (
    value === undefined || value === null || value === '' ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === 'object' && value !== null && !Array.isArray(value)
        && Object.keys(value).length === 0)
);

export const normalizeResultAnswer = (
    result: StudentResult,
    questionId: string,
    answerData: any
): NormalizedAnswer => {
    if (answerData && typeof answerData === 'object'
        && ('selectedAnswer' in answerData || 'questionSnapshot' in answerData)) {
        return {
            selectedAnswer: answerData.selectedAnswer,
            isCorrect: typeof answerData.isCorrect === 'boolean'
                ? answerData.isCorrect
                : undefined,
            timeSpent: answerData.timeSpent,
            snapshot: answerData.questionSnapshot,
        };
    }
    const validation = result.validationDetails?.find(
        (item) => item.questionId === questionId
    );
    return {
        selectedAnswer: answerData,
        isCorrect: typeof validation?.isCorrect === 'boolean'
            ? validation.isCorrect
            : undefined,
    };
};
