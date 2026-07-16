import { describe, expect, it } from 'vitest';
import {
    calculateResultAnswerSummary,
    resolveResultAnswerCorrectness,
} from '../src/features/results/utils/resultAnswerScoring';

describe('historical result scoring', () => {
    it('keeps the persisted submission verdict as the source of truth', () => {
        const answerData = {
            selectedAnswer: 'B',
            isCorrect: true,
            questionSnapshot: { type: 'MCQ', correctAnswer: 'A' },
        };
        expect(resolveResultAnswerCorrectness('q1', answerData)).toBe(true);
    });

    it('falls back to snapshot scoring when old records have no persisted verdict', () => {
        const answerData = {
            selectedAnswer: { 1: '4', 3: '1', 5: '5' },
            questionSnapshot: {
                type: 'DRAG_DROP',
                text: '4/10 + 1/10 = [1]/10 + [2]/10 = [3]/10',
                blanks: ['4', '1', '5'],
            },
        };
        expect(resolveResultAnswerCorrectness('q1', answerData)).toBe(true);
    });

    it('preserves the production 9/10 pattern with two drag-drop questions', () => {
        const correct = (type: string, selectedAnswer: any, questionSnapshot: any = {}) => ({
            selectedAnswer,
            isCorrect: true,
            questionSnapshot: { type, ...questionSnapshot },
        });
        const answers = {
            q1: correct('MCQ', 'C', { correctAnswer: 'C' }),
            q2: correct('SHORT_ANSWER', '3/4', { correctAnswer: '3/4' }),
            q3: correct('TRUE_FALSE', { a: true }, { items: [{ id: 'a', isCorrect: true }] }),
            q4: { selectedAnswer: 'C', isCorrect: false, questionSnapshot: { type: 'MCQ', correctAnswer: 'A' } },
            q5: correct('DRAG_DROP', { 1: '4', 3: '1', 5: '5' }, { text: '[1] [2] [3]', blanks: ['4', '1', '5'] }),
            q6: correct('MULTIPLE_SELECT', ['A', 'B'], { correctAnswers: ['A', 'B'] }),
            q7: correct('SHORT_ANSWER', '1/2', { correctAnswer: '1/2' }),
            q8: correct('MCQ', 'B', { correctAnswer: 'B' }),
            q9: correct('DRAG_DROP', { 1: '3', 3: '2', 5: '1', 7: '6', 9: '1' }, { text: '[1] [2] [3] [4] [5]', blanks: ['3', '2', '1', '6', '1'] }),
            q10: correct('SHORT_ANSWER', '7/10', { correctAnswer: '7/10' }),
        };

        expect(calculateResultAnswerSummary(answers)).toEqual({ correctCount: 9, totalAnswers: 10 });
    });
});
