import { describe, expect, it } from 'vitest';
import { importQuestionJson } from '../src/features/manual-quiz-workspace/import/jsonQuestionImporter';

const question = (question_type: string, extra: Record<string, unknown> = {}) => ({
    id: `Q-${question_type}`,
    question_type,
    difficulty: 'NHAN_BIET',
    points: 1,
    question: 'Nội dung câu hỏi',
    ...extra,
});

describe('importQuestionJson', () => {
    it('converts the 13 prompt types into the internal authoring types', () => {
        const result = importQuestionJson(JSON.stringify([
            question('SINGLE_CHOICE', { options: [{ id: 'A1', text: 'Một' }, { id: 'B1', text: 'Hai' }], correct_answer: 'B1' }),
            question('TRUE_FALSE', { items: [1, 2, 3, 4].map((n) => ({ id: `S${n}`, statement: `Mệnh đề ${n}`, correct_answer: n % 2 === 0 })) }),
            question('SHORT_ANSWER', { accepted_answers: ['Hà Nội'], case_sensitive: false }),
            question('MATCHING', { left_items: [{ id: 'L1', text: '1' }, { id: 'L2', text: '2' }], right_items: [{ id: 'R1', text: 'Một' }, { id: 'R2', text: 'Hai' }], matches: [{ left: 'L1', right: 'R1' }, { left: 'L2', right: 'R2' }] }),
            question('MULTIPLE_CHOICE', { options: [{ id: 'A', text: 'A' }, { id: 'B', text: 'B' }, { id: 'C', text: 'C' }], correct_answers: ['A', 'C'] }),
            question('DRAG_DROP_FILL', { content: 'Bầu trời có {{blank1}}.', drag_items: [{ id: 'D1', text: 'màu xanh' }, { id: 'D2', text: 'màu đỏ' }], answers: [{ blank: 'blank1', item: 'D1' }] }),
            question('ORDERING', { items: [{ id: 'I1', text: 'Bước 1' }, { id: 'I2', text: 'Bước 2' }], correct_order: ['I1', 'I2'] }),
            question('IMAGE_QUESTION', { image_description: 'Hình vuông', image_url: 'https://example.com/a.png', options: [{ id: 'A', text: 'Vuông' }, { id: 'B', text: 'Tròn' }], correct_answer: 'A' }),
            question('DROPDOWN', { content: 'Thủ đô là {{select1}}.', dropdowns: [{ id: 'select1', options: ['Hà Nội', 'Huế'], correct_answer: 'Hà Nội' }] }),
            question('UNDERLINE', { content: 'Bông hoa đỏ nở.', selectable_parts: [{ id: 'P1', text: 'Bông hoa' }, { id: 'P2', text: 'đỏ' }], correct_answers: ['P2'] }),
            question('CATEGORIZATION', { groups: [{ id: 'G1', name: 'Động vật' }, { id: 'G2', name: 'Đồ vật' }], items: [{ id: 'I1', text: 'Con mèo' }, { id: 'I2', text: 'Cái bàn' }], answers: [{ item: 'I1', group: 'G1' }, { item: 'I2', group: 'G2' }] }),
            question('WORD_ASSEMBLY', { parts: [{ id: 'W1', text: 'H' }, { id: 'W2', text: 'O' }, { id: 'W3', text: 'A' }], correct_order: ['W1', 'W2', 'W3'], correct_text: 'HOA' }),
            question('RIDDLE', { riddle: 'Cánh gì bay lượn trên trời?', accepted_answers: ['chim'], hint: 'Một loài vật' }),
        ]));

        expect(result.accepted).toHaveLength(13);
        expect(result.rejected).toHaveLength(0);
        expect(result.accepted.map((item) => item.question.type)).toEqual([
            'MCQ', 'TRUE_FALSE', 'SHORT_ANSWER', 'MATCHING', 'MULTIPLE_SELECT', 'DRAG_DROP',
            'ORDERING', 'IMAGE_QUESTION', 'DROPDOWN', 'UNDERLINE', 'CATEGORIZATION', 'WORD_SCRAMBLE', 'RIDDLE',
        ]);
    });

    it('rejects wrappers, duplicate source IDs, invalid JSON and unsupported types', () => {
        expect(() => importQuestionJson('{"questions":[]}')).toThrow('mảng câu hỏi');
        expect(() => importQuestionJson('[{"id":"Q1"}, {"id":"Q1"}]')).not.toThrow();
        const duplicate = importQuestionJson('[{"id":"Q1","question_type":"SINGLE_CHOICE"},{"id":"Q1","question_type":"SINGLE_CHOICE"}]');
        expect(duplicate.rejected).toHaveLength(1);
        expect(() => importQuestionJson('{')).toThrow('JSON không hợp lệ');
        const unsupported = importQuestionJson('[{"id":"Q1","question_type":"UNKNOWN","difficulty":"NHAN_BIET","points":1}]');
        expect(unsupported.rejected).toHaveLength(1);
    });

    it('keeps ambiguous answer semantics in needsReview instead of silently dropping them', () => {
        const result = importQuestionJson(JSON.stringify([question('SHORT_ANSWER', {
            accepted_answers: ['một', '1'],
            case_sensitive: true,
        })]));
        expect(result.needsReview).toHaveLength(1);
        expect(result.needsReview[0].issues.join(' ')).toContain('accepted_answers');
    });

    it('preserves LaTeX braces when drag-drop placeholders are fraction arguments', () => {
        const wrapped = importQuestionJson(JSON.stringify([question('DRAG_DROP_FILL', {
            content: 'Điền phân số $\\frac{{blank2}}{{blank3}}$ vào chỗ trống.',
            drag_items: [
                { id: 'D2', text: '2' },
                { id: 'D3', text: '5' },
            ],
            answers: [
                { blank: 'blank2', item: 'D2' },
                { blank: 'blank3', item: 'D3' },
            ],
        })]));

        expect(wrapped.accepted).toHaveLength(1);
        expect(wrapped.needsReview).toHaveLength(0);
        expect((wrapped.accepted[0].question as any).text).toBe('Điền phân số $\\frac{[blank2]}{[blank3]}$ vào chỗ trống.');
        expect((wrapped.accepted[0].question as any).blanks).toEqual(['2', '5']);

        const explicitlyGrouped = importQuestionJson(JSON.stringify([question('DRAG_DROP_FILL', {
            content: 'Điền phân số $\\frac{{{blank2}}}{{{blank3}}}$.',
            drag_items: [{ id: 'D2', text: '2' }, { id: 'D3', text: '5' }],
            answers: [{ blank: 'blank2', item: 'D2' }, { blank: 'blank3', item: 'D3' }],
        })]));
        expect(explicitlyGrouped.accepted).toHaveLength(1);
        expect((explicitlyGrouped.accepted[0].question as any).text).toBe('Điền phân số $\\frac{[blank2]}{[blank3]}$.');
    });

    it('does not accept more than 200 questions', () => {
        const payload = Array.from({ length: 201 }, (_, index) => question('RIDDLE', {
            id: `Q${index}`,
            riddle: 'Câu đố',
            accepted_answers: ['đáp án'],
        }));
        expect(() => importQuestionJson(JSON.stringify(payload))).toThrow('tối đa 200');
    });
});
