import { Question } from '../../../../types';

export interface BaseRendererProps {
    question: Question;
    index: number;
    answers: Record<string, any>;
    onAnswerChange: (questionId: string, value: any, subId?: string) => void;
    onMatchingClick?: (questionId: string, item: string, type: 'left' | 'right') => void;
}
