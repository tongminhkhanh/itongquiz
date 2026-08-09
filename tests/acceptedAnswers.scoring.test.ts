import { describe, expect, it } from 'vitest';
import { calculateStudentScore } from '../src/features/quiz-player/utils/quizScoring';
import { handleValidateAnswers, mapQuestionForSave } from '../workers/src/utils/helpers';

describe('multiple accepted answers across scoring boundaries', () => {
    it('persists all acceptedAnswers in the existing correct_answer column', () => {
        const mapped = mapQuestionForSave({
            id: 'short-1',
            type: 'SHORT_ANSWER',
            question: 'Tên cũ của Hà Nội?',
            correctAnswer: 'Hà Nội',
            acceptedAnswers: ['Hà Nội', 'Thăng Long'],
        } as any, 'quiz-accepted-answers');

        expect(mapped[5]).toBe('Hà Nội|Thăng Long');
    });

    it('scores alternate SHORT_ANSWER and RIDDLE answers in the quiz player', () => {
        const quiz = {
            id: 'quiz-accepted-answers',
            title: 'Accepted answers',
            classLevel: '5',
            timeLimit: 10,
            createdAt: new Date(0).toISOString(),
            questions: [
                {
                    id: 'short-1',
                    type: 'SHORT_ANSWER',
                    question: 'Tên cũ của Hà Nội?',
                    correctAnswer: 'Hà Nội|Thăng Long',
                    acceptedAnswers: ['Hà Nội', 'Thăng Long'],
                },
                {
                    id: 'riddle-1',
                    type: 'RIDDLE',
                    question: 'Con gì có cánh?',
                    correctAnswer: 'chim|con chim',
                },
            ],
        } as any;

        expect(calculateStudentScore(quiz, {
            'short-1': 'thăng long',
            'riddle-1': 'Con chim',
        })).toMatchObject({ score: 10, correctCount: 2, totalItems: 2 });
    });

    it('scores alternate answers after acceptedAnswers has been persisted as a pipe-separated value', async () => {
        const rows = [
            { id: 'short-1', type: 'SHORT_ANSWER', correct_answer: 'Hà Nội|Thăng Long' },
            { id: 'riddle-1', type: 'RIDDLE', correct_answer: 'chim|con chim' },
        ];
        const db = {
            prepare: () => ({
                bind: () => ({
                    all: async () => ({ results: rows }),
                }),
            }),
        } as any;

        const response = await handleValidateAnswers(db, {
            quizId: 'quiz-accepted-answers',
            answers: {
                'short-1': 'THĂNG LONG',
                'riddle-1': 'Con chim',
            },
        });

        expect(await response.json()).toMatchObject({
            status: 'success',
            score: 10,
            correctCount: 2,
            total: 2,
        });
    });
});
