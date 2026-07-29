import { describe, expect, it } from 'vitest';
import { Document, Packer, Paragraph } from 'docx';
import ExcelJS from 'exceljs';
import { QuestionType } from '../src/types';
import {
    importQuestionSpreadsheet,
    parseQuestionCsvText,
    parseSpreadsheetRows,
} from '../src/features/manual-quiz-workspace/import/spreadsheetQuestionImporter';
import {
    importQuestionDocx,
    parseDocxQuestionText,
} from '../src/features/manual-quiz-workspace/import/docxQuestionImporter';

const officialRows = [
    {
        type: 'MCQ',
        question: '2 + 3 bằng bao nhiêu?',
        optionA: '4',
        optionB: '5',
        optionC: '6',
        optionD: '7',
        correctAnswer: 'B',
        difficulty: '1',
        points: '1.5',
        explanation: 'Hai cộng ba bằng năm.',
        subject: 'toan',
    },
    {
        type: 'SHORT_ANSWER',
        question: 'Thủ đô Việt Nam là gì?',
        correctAnswer: '',
        difficulty: '2',
        points: '1',
        subject: 'lich-su-dia-ly',
    },
    {
        type: 'MCQ',
        question: '',
        optionA: 'A',
        optionB: 'B',
        correctAnswer: 'A',
    },
];

describe('spreadsheet question importer', () => {
    it('maps official rows into accepted, needsReview and rejected groups', () => {
        const result = parseSpreadsheetRows(officialRows);
        expect(result.accepted).toHaveLength(1);
        expect(result.needsReview).toHaveLength(1);
        expect(result.rejected).toHaveLength(1);
        expect(result.accepted[0].question).toEqual(expect.objectContaining({
            type: QuestionType.MCQ,
            question: '2 + 3 bằng bao nhiêu?',
            options: ['4', '5', '6', '7'],
            correctAnswer: 'B',
            difficulty: 1,
            points: 1.5,
            explanation: 'Hai cộng ba bằng năm.',
            subject: 'toan',
        }));
        expect(result.needsReview[0].issues).toContain('Thiếu đáp án đúng.');
        expect(result.rejected[0].issues).toContain('Thiếu nội dung câu hỏi.');
    });

    it('supports Vietnamese CSV headers and reports the source row', () => {
        const csv = [
            'loai,cau_hoi,dap_an_a,dap_an_b,dap_an_dung,do_kho,diem,loi_giai,mon',
            'MCQ,"1 + 1 = ?",1,2,B,1,2,"Một cộng một bằng hai.",toan',
            'MCQ,"Câu thiếu đáp án",A,B,,2,1,,toan',
        ].join('\n');
        const result = parseQuestionCsvText(csv);
        expect(result.accepted[0].sourceRow).toBe(2);
        expect(result.accepted[0].question).toEqual(expect.objectContaining({ correctAnswer: 'B' }));
        expect(result.needsReview[0].sourceRow).toBe(3);
    });

    it('extracts quiz metadata and supports exact option text as the answer', () => {
        const result = parseSpreadsheetRows([{
            title: 'Đề ôn tập Toán 4',
            classLevel: '4',
            category: 'toan',
            timeLimit: '35',
            tags: 'phan-so, on-tap',
            type: 'TRAC_NGHIEM',
            question: 'Phân số nào bằng một phần hai?',
            optionA: '1/2',
            optionB: '2/3',
            correctAnswer: '1/2',
        }]);

        expect(result.metadata).toEqual({
            title: 'Đề ôn tập Toán 4',
            classLevel: '4',
            category: 'toan',
            timeLimit: 35,
            tags: ['phan-so', 'on-tap'],
        });
        expect(result.accepted[0].question).toEqual(expect.objectContaining({
            type: QuestionType.MCQ,
            correctAnswer: 'A',
        }));
    });

    it('imports an XLSX workbook using the same official template', async () => {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Cau hoi');
        sheet.addRow(['type', 'question', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer', 'difficulty', 'points']);
        sheet.addRow(['MCQ', '3 × 4 = ?', '7', '12', '10', '14', 'B', '1', '1']);
        const bytes = await workbook.xlsx.writeBuffer();
        const file = new File([bytes], 'questions.xlsx', {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        const result = await importQuestionSpreadsheet(file);
        expect(result.accepted).toHaveLength(1);
        expect(result.accepted[0].question).toEqual(expect.objectContaining({
            question: '3 × 4 = ?',
            correctAnswer: 'B',
        }));
    });

    it('reads quiz metadata from a dedicated XLSX sheet', async () => {
        const workbook = new ExcelJS.Workbook();
        const metadataSheet = workbook.addWorksheet('ThongTinDe');
        metadataSheet.addRows([
            ['Tên đề', 'Đề giữa học kỳ'],
            ['Khối', '4'],
            ['Môn', 'Toán'],
            ['Thời gian', '45 phút'],
            ['Thẻ', 'giữa kỳ, toán 4'],
        ]);
        const questionSheet = workbook.addWorksheet('CauHoi');
        questionSheet.addRows([
            ['type', 'question', 'optionA', 'optionB', 'correctAnswer'],
            ['MCQ', '8 × 7 = ?', '54', '56', 'B'],
        ]);
        const bytes = await workbook.xlsx.writeBuffer();
        const file = new File([bytes], 'de-giua-ky.xlsx', {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        const result = await importQuestionSpreadsheet(file);
        expect(result.metadata).toEqual({
            title: 'Đề giữa học kỳ',
            classLevel: '4',
            category: 'Toán',
            timeLimit: 45,
            tags: ['giữa kỳ', 'toán 4'],
        });
        expect(result.accepted[0].question).toEqual(expect.objectContaining({
            question: '8 × 7 = ?',
            correctAnswer: 'B',
        }));
    });
});

describe('DOCX question importer', () => {
    const docText = [
        'Câu 1: 5 + 5 bằng bao nhiêu?',
        'A. 8',
        'B. 9',
        'C. 10',
        'D. 11',
        'Đáp án: C',
        'Giải thích: Năm cộng năm bằng mười.',
        '',
        'Câu 2: Từ nào chỉ hoạt động?',
        'A. xanh',
        'B. chạy',
        'C. đẹp',
        'Đáp án:',
    ].join('\n');

    it('parses confident blocks and keeps uncertain blocks for review', () => {
        const result = parseDocxQuestionText(docText);
        expect(result.accepted).toHaveLength(1);
        expect(result.needsReview).toHaveLength(1);
        expect(result.accepted[0].question).toEqual(expect.objectContaining({
            type: QuestionType.MCQ,
            correctAnswer: 'C',
            explanation: 'Năm cộng năm bằng mười.',
        }));
        expect(result.needsReview[0].issues).toContain('Thiếu đáp án đúng.');
    });

    it('extracts DOCX metadata and infers multiple-select answers', () => {
        const result = parseDocxQuestionText([
            'Tên đề: Ôn tập cuối học kỳ',
            'Khối: 5',
            'Môn: Toán',
            'Thời gian: 40 phút',
            'Thẻ: phân số, học kỳ 2',
            '',
            'Câu 1: Chọn các số chẵn.',
            'A. 2',
            'B. 3',
            'C. 4',
            'Đáp án: A, C',
            'Độ khó: 2',
            'Điểm: 1.5',
        ].join('\n'));

        expect(result.metadata).toEqual({
            title: 'Ôn tập cuối học kỳ',
            classLevel: '5',
            category: 'Toán',
            timeLimit: 40,
            tags: ['phân số', 'học kỳ 2'],
        });
        expect(result.accepted[0].question).toEqual(expect.objectContaining({
            type: QuestionType.MULTIPLE_SELECT,
            correctAnswers: ['A', 'C'],
            difficulty: 2,
            points: 1.5,
        }));
    });

    it('extracts raw text from a DOCX file before parsing', async () => {
        const document = new Document({
            sections: [{ children: docText.split('\n').map((line) => new Paragraph(line)) }],
        });
        const buffer = await Packer.toBuffer(document);
        const file = new File([buffer], 'questions.docx', {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        const result = await importQuestionDocx(file);
        expect(result.accepted).toHaveLength(1);
        expect(result.needsReview).toHaveLength(1);
    });
});
