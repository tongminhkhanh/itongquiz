import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../src/utils/question/scoring.util';

const scoringCases = [
    {
        type: 'MCQ',
        question: { type: 'MCQ', correctAnswer: 'A' },
        correct: 'A.',
        wrong: 'B',
    },
    {
        type: 'SHORT_ANSWER',
        question: { type: 'SHORT_ANSWER', correctAnswer: 'Hà Nội|Thủ đô Hà Nội' },
        correct: '  HÀ NỘI  ',
        wrong: 'Huế',
    },
    {
        type: 'TRUE_FALSE',
        question: { type: 'TRUE_FALSE', items: [{ id: 'a', isCorrect: true }, { id: 'b', isCorrect: false }] },
        correct: { a: true, b: false },
        wrong: { a: true, b: true },
    },
    {
        type: 'MATCHING',
        question: { type: 'MATCHING', pairs: [{ left: '1/2', right: '0.5' }, { left: '1/4', right: '0.25' }] },
        correct: { '1/2': '0.5', '1/4': '0.25' },
        wrong: { '1/2': '0.25', '1/4': '0.5' },
    },
    {
        type: 'MULTIPLE_SELECT',
        question: { type: 'MULTIPLE_SELECT', options: ['Một', 'Hai', 'Ba'], correctAnswers: ['A', 'C'] },
        correct: ['C', 'A'],
        wrong: ['A', 'B'],
    },
    {
        type: 'DRAG_DROP',
        question: { type: 'DRAG_DROP', text: '4/10 + 1/10 = [1]/10 + [2]/10 = [3]/10', blanks: ['4', '1', '5'] },
        correct: { 1: '4', 3: '1', 5: '5' },
        wrong: { 1: '4', 3: '2', 5: '5' },
    },
    {
        type: 'ORDERING',
        question: { type: 'ORDERING', correctOrder: [1, 2, 3] },
        correct: [{ id: 1 }, { id: 2 }, { id: 3 }],
        wrong: [2, 1, 3],
    },
    {
        type: 'IMAGE_QUESTION',
        question: { type: 'IMAGE_QUESTION', correctAnswer: 'C' },
        correct: 'c',
        wrong: 'D',
    },
    {
        type: 'DROPDOWN',
        question: { type: 'DROPDOWN', blanks: [{ id: 'b1', correctAnswer: 'lớn hơn' }, { id: 'b2', correctAnswer: '2' }] },
        correct: { b1: 'lớn hơn', b2: '2' },
        wrong: { b1: 'nhỏ hơn', b2: '2' },
    },
    {
        type: 'UNDERLINE',
        question: { type: 'UNDERLINE', correctWordIndexes: [1, 3] },
        correct: [3, 1],
        wrong: [1, 2],
    },
    {
        type: 'CATEGORIZATION',
        question: { type: 'CATEGORIZATION', items: [{ id: 'x', categoryId: 'even' }, { id: 'y', categoryId: 'odd' }] },
        correct: { x: 'even', y: 'odd' },
        wrong: { x: 'odd', y: 'even' },
    },
    {
        type: 'WORD_SCRAMBLE',
        question: { type: 'WORD_SCRAMBLE', letters: ['T', 'O', 'Á', 'N'], correctWord: 'TOÁN' },
        correct: [0, 1, 2, 3],
        wrong: [0, 2, 1, 3],
    },
    {
        type: 'RIDDLE',
        question: { type: 'RIDDLE', correctAnswer: 'cái bóng' },
        correct: ' CÁI BÓNG ',
        wrong: 'mặt trời',
    },
    {
        type: 'ERROR_CORRECTION',
        question: { type: 'ERROR_CORRECTION', wrongWord: 'goed', correctWord: 'went' },
        correct: { wrongWord: 'GOED', correctWord: 'Went' },
        wrong: { wrongWord: 'goed', correctWord: 'gone' },
    },
] as const;

describe('checkAnswer supports all 14 scored question types', () => {
    it.each(scoringCases)('$type accepts the correct answer', ({ question, correct }) => {
        expect(checkAnswer(question, correct).isCorrect).toBe(true);
        expect(checkAnswer(question, correct).status).toBe('correct');
    });

    it.each(scoringCases)('$type rejects an incorrect answer', ({ question, wrong }) => {
        expect(checkAnswer(question, wrong).isCorrect).toBe(false);
        expect(checkAnswer(question, wrong).status).toBe('wrong');
    });

    it('marks empty answers as skipped', () => {
        expect(checkAnswer({ type: 'MCQ', correctAnswer: 'A' }, '').status).toBe('skipped');
    });

    it('supports multi-blank short answers', () => {
        const question = {
            type: 'SHORT_ANSWER',
            question: '[1] + [2]',
            correctAnswers: ['một|1', 'hai|2'],
        };
        expect(checkAnswer(question, { 0: '1', 1: 'hai' }).isCorrect).toBe(true);
    });
});
