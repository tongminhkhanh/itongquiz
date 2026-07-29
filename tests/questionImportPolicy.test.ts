import { describe, expect, it } from 'vitest';
import {
    enforceQuestionImportCount,
    normalizeImportKey,
    parseQuizImportMetadataPairs,
    QUESTION_IMPORT_MAX_QUESTIONS,
    QuestionImportPolicyError,
    validateQuestionImportFile,
} from '../src/features/manual-quiz-workspace/import/questionImportPolicy';
import { createEmptyQuestionImportResult } from '../src/features/manual-quiz-workspace/import/questionImport.types';
import { QuestionType } from '../src/types';

describe('question import policy', () => {
    it('normalizes accented template headers and parses metadata', () => {
        expect(normalizeImportKey('Đáp án đúng')).toBe('dap_an_dung');
        expect(parseQuizImportMetadataPairs([
            ['Tên đề', 'Ôn tập'],
            ['Khối lớp', '4'],
            ['Thời gian', '30 phút'],
            ['Thẻ', 'toán, phân số'],
        ])).toEqual({
            title: 'Ôn tập',
            classLevel: '4',
            timeLimit: 30,
            tags: ['toán', 'phân số'],
        });
    });

    it('rejects unsupported and oversized files before parsing', () => {
        expect(() => validateQuestionImportFile(new File(['x'], 'questions.txt'))).toThrow(
            QuestionImportPolicyError,
        );
        const oversized = new File(
            [new Uint8Array(10 * 1024 * 1024 + 1)],
            'questions.xlsx',
        );
        expect(() => validateQuestionImportFile(oversized)).toThrow('10 MB');
    });

    it('keeps only the first 200 candidates and reports a warning', () => {
        const result = createEmptyQuestionImportResult();
        result.accepted = Array.from({ length: QUESTION_IMPORT_MAX_QUESTIONS + 2 }, (_, index) => ({
            id: `candidate-${index}`,
            sourceRow: index + 2,
            sourceLabel: `Dòng ${index + 2}`,
            status: 'accepted' as const,
            issues: [],
            question: {
                id: `question-${index}`,
                type: QuestionType.SHORT_ANSWER,
                question: `Câu ${index + 1}`,
                correctAnswer: 'Đáp án',
                difficulty: 1 as const,
                points: 1,
            },
        }));

        const limited = enforceQuestionImportCount(result);
        expect(limited.accepted).toHaveLength(QUESTION_IMPORT_MAX_QUESTIONS);
        expect(limited.warnings[0]).toContain('200');
    });
});
