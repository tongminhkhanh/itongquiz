import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWorksheetQuiz, worksheetQuestionTypeLabels } from './fixtures/worksheetExportFixture';

const mocks = vi.hoisted(() => ({
    pdfInstances: [] as any[],
    documents: [] as any[],
    savedFiles: [] as Array<{ blob: Blob; name: string }>,
    pageHeight: 297,
}));

vi.mock('jspdf', () => {
    class MockJsPdf {
        pageCount = 1;
        textCalls: string[] = [];
        savedNames: string[] = [];
        unicodeFontReady = false;
        internal = { pageSize: { getWidth: () => 210, getHeight: () => mocks.pageHeight } };
        constructor() { mocks.pdfInstances.push(this); }
        addPage() { this.pageCount += 1; }
        getNumberOfPages() { return this.pageCount; }
        text(value: string | string[]) { this.textCalls.push(...(Array.isArray(value) ? value : [value])); }
        splitTextToSize(value: string, width: number) {
            const text = String(value);
            const chunk = Math.max(1, Math.floor(width / 2));
            return text.length > chunk ? text.match(new RegExp(`.{1,${chunk}}`, 'g')) || [text] : [text];
        }
        getTextWidth(value: string) { return String(value).length * 2; }
        save(name: string) { this.savedNames.push(name); }
        addFileToVFS() {} addFont() {} setFont() {} setFontSize() {} setTextColor() {}
        setDrawColor() {} setLineWidth() {} line() {} rect() {} setFillColor() {} setPage() {}
    }
    return { default: MockJsPdf };
});

vi.mock('docx', () => {
    class Node { constructor(public options: any) {} }
    class Document extends Node { constructor(options: any) { super(options); mocks.documents.push(this); } }
    return {
        Document, Paragraph: Node, TextRun: Node, Table: Node, TableRow: Node, TableCell: Node,
        Packer: { toBlob: vi.fn(async () => new Blob(['docx'])) },
        WidthType: { PERCENTAGE: 'percentage' }, BorderStyle: { NONE: 'none', SINGLE: 'single' },
        AlignmentType: { CENTER: 'center' }, VerticalAlign: { BOTTOM: 'bottom' },
    };
});

vi.mock('file-saver', () => ({
    saveAs: (blob: Blob, name: string) => mocks.savedFiles.push({ blob, name }),
}));

vi.mock('../src/utils/pdfFonts', () => ({ setupUnicodeFont: vi.fn(), FONT_NAME: 'UnicodeFont' }));

import { exportWorksheet } from '../src/services/worksheetExportService';

function collectText(value: any, output: string[] = []): string[] {
    if (typeof value === 'string') output.push(value);
    else if (Array.isArray(value)) value.forEach(item => collectText(item, output));
    else if (value && typeof value === 'object') Object.values(value).forEach(item => collectText(item, output));
    return output;
}

describe('worksheetExportService characterization', () => {
    beforeEach(() => {
        mocks.pdfInstances.length = 0;
        mocks.documents.length = 0;
        mocks.savedFiles.length = 0;
        mocks.pageHeight = 297;
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
    });

    it('preserves the public dispatcher and current sanitized filenames for PDF and DOCX', async () => {
        const quiz = createWorksheetQuiz();
        await exportWorksheet({ quiz, format: 'pdf', paperStyle: 'blank', answerKey: 'none' });
        await exportWorksheet({ quiz, format: 'docx', paperStyle: 'blank', answerKey: 'none' });

        expect(mocks.pdfInstances[0].savedNames).toEqual(['vo-bai-tap-Ôn t-p Toán- Phân s-.pdf']);
        expect(mocks.savedFiles.map(file => file.name)).toEqual(['vo-bai-tap-Ôn t-p Toán- Phân s-.docx']);
    });

    it('keeps Vietnamese text and current math normalization in both formats', async () => {
        const quiz = createWorksheetQuiz();
        await exportWorksheet({ quiz, format: 'pdf', paperStyle: 'grid-5mm', answerKey: 'separate', schoolName: 'Trường Tiểu học Ít Ong' });
        const pdfText = mocks.pdfInstances[0].textCalls.join('\n');
        expect(pdfText).toContain('TRƯỜNG TIỂU HỌC ÍT ONG');
        expect(pdfText).toContain('Ôn tập Toán: Phân số');
        expect(pdfText).toContain('Viết kết quả của 1/2 + 1/4');
        expect(pdfText).toContain('3/4');

        await exportWorksheet({ quiz, format: 'docx', paperStyle: 'blank', answerKey: 'separate', schoolName: 'Trường Tiểu học Ít Ong' });
        const docxText = collectText(mocks.documents[0]).join('\n');
        expect(docxText).toContain('TRƯỜNG TIỂU HỌC ÍT ONG');
        expect(docxText).toContain('Ôn tập Toán: Phân số');
        expect(docxText).toContain('\\frac{1}{2}');
        expect(docxText).toContain('\\frac{3}{4}');
    });

    it('renders every question type and a separate answer key in PDF and DOCX', async () => {
        const quiz = createWorksheetQuiz();
        await exportWorksheet({ quiz, format: 'pdf', paperStyle: 'lined-wide', answerKey: 'separate' });
        const pdfText = mocks.pdfInstances[0].textCalls.join('\n');
        worksheetQuestionTypeLabels.forEach(label => expect(pdfText).toContain(`[${label}]`));
        expect(pdfText).toContain('ĐÁP ÁN');
        expect(pdfText).toContain('B. 2');
        expect(pdfText).toContain('Sai: "trỉ"  →  Đúng: "chỉ"');

        await exportWorksheet({ quiz, format: 'docx', paperStyle: 'blank', answerKey: 'separate' });
        const docxText = collectText(mocks.documents[0]).join('\n');
        quiz.questions.forEach((question: any) => expect(docxText).toContain(question.question || question.mainQuestion));
        expect(docxText).toContain('═══ ĐÁP ÁN ═══');
        expect(docxText).toContain('B. 2');
        expect(docxText).toContain('Sai: "trỉ"  →  Đúng: "chỉ"');
    });

    it('creates continuation pages and page footers when content exceeds the page', async () => {
        const quiz = createWorksheetQuiz();
        quiz.questions = Array.from({ length: 12 }, (_, index) => ({
            ...quiz.questions[0], id: `long-${index}`, question: `Câu hỏi dài ${index} `.repeat(20),
        })) as any;
        mocks.pageHeight = 80;

        await exportWorksheet({ quiz, format: 'pdf', paperStyle: 'grid-5mm', answerKey: 'none' });
        const pdf = mocks.pdfInstances[0];
        expect(pdf.pageCount).toBeGreaterThan(1);
        expect(pdf.textCalls.some((text: string) => text.startsWith('Trang 1 /'))).toBe(true);
    });
});
