import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { Quiz, QuestionType } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorksheetFormat = 'pdf' | 'docx';
export type WorksheetPaperStyle = 'grid-5mm' | 'lined-wide' | 'blank';
export type WorksheetAnswerKey = 'none' | 'separate';

export interface WorksheetExportOptions {
    quiz: Quiz;
    format: WorksheetFormat;
    paperStyle: WorksheetPaperStyle;
    answerKey: WorksheetAnswerKey;
    schoolName?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const MARGIN = 15;           // mm
const GRID_SIZE = 5;         // mm — 5×5mm grid
const LINE_SPACING_WIDE = 8; // mm — wide line spacing

// ─── PDF Helpers ───────────────────────────────────────────────────────────────

/** Draw the full-page grid background (light gray, print-friendly) */
function drawGridBackground(doc: jsPDF, style: WorksheetPaperStyle): void {
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    doc.setDrawColor(190, 190, 190); // #BEBEBE — light grey, easy on toner
    doc.setLineWidth(0.15);

    if (style === 'grid-5mm') {
        // Vertical lines
        for (let x = 0; x <= pageW; x += GRID_SIZE) {
            doc.line(x, 0, x, pageH);
        }
        // Horizontal lines
        for (let y = 0; y <= pageH; y += GRID_SIZE) {
            doc.line(0, y, pageW, y);
        }
    } else if (style === 'lined-wide') {
        // Horizontal ruled lines only
        for (let y = MARGIN + 40; y <= pageH - MARGIN; y += LINE_SPACING_WIDE) {
            doc.line(MARGIN, y, pageW - MARGIN, y);
        }
    }
    // 'blank' → no grid
}

/** Draw the school header on a jsPDF document */
function drawPdfHeader(doc: jsPDF, quiz: Quiz, schoolName: string, pageLabel: string): number {
    const pageW = doc.internal.pageSize.getWidth();
    let y = MARGIN;

    // School name — top center
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(schoolName.toUpperCase(), pageW / 2, y, { align: 'center' });
    y += 6;

    // Page label (e.g. "BÀI KIỂM TRA" / "ĐÁP ÁN")
    doc.setFontSize(14);
    doc.text(pageLabel, pageW / 2, y, { align: 'center' });
    y += 6;

    // Quiz title
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const titleLines = doc.splitTextToSize(quiz.title, pageW - MARGIN * 2);
    doc.text(titleLines, pageW / 2, y, { align: 'center' });
    y += titleLines.length * 5 + 3;

    // Info line — class, questions, time
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(
        `Lớp ${quiz.classLevel}  •  ${quiz.questions.length} câu  •  ${quiz.timeLimit} phút`,
        pageW / 2, y, { align: 'center' }
    );
    y += 6;

    // Student info row
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    const infoY = y;
    doc.text('Họ và tên: ___________________________', MARGIN, infoY);
    doc.text(`Lớp: ________  Ngày: ________`, pageW / 2 + 5, infoY);
    y += 7;

    // Separator line
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y, pageW - MARGIN, y);
    y += 5;

    return y;
}

/** Add a new page with grid bg + header continuation */
function addNewPdfPage(doc: jsPDF, opts: WorksheetExportOptions): number {
    doc.addPage();
    drawGridBackground(doc, opts.paperStyle);
    return MARGIN + 5; // small top margin on continuation pages
}

/** Strip LaTeX markers for plain-text export */
function cleanMath(text: string): string {
    if (!text) return '';
    return text
        .replace(/\$\$(.*?)\$\$/gs, '$1')
        .replace(/\$(.*?)\$/g, '$1')
        .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2')
        .replace(/\\times/g, '×')
        .replace(/\\div/g, '÷')
        .replace(/\\pm/g, '±')
        .replace(/\\sqrt\{([^}]*)\}/g, '√$1')
        .replace(/\\\\/g, ' ')
        .trim();
}

// ─── Question Renderers (PDF) ──────────────────────────────────────────────────

interface RenderContext {
    doc: jsPDF;
    opts: WorksheetExportOptions;
    yPos: number;
}

function checkNewPage(ctx: RenderContext, needed = 20): void {
    const pageH = ctx.doc.internal.pageSize.getHeight();
    if (ctx.yPos + needed > pageH - MARGIN) {
        ctx.yPos = addNewPdfPage(ctx.doc, ctx.opts);
    }
}

/** Render a single question on the PDF worksheet */
function renderQuestionPdf(ctx: RenderContext, q: any, index: number): void {
    const doc = ctx.doc;
    const pageW = doc.internal.pageSize.getWidth();
    const contentW = pageW - MARGIN * 2;

    checkNewPage(ctx, 30);

    // Question number + type tag
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const typeTag = getTypeLabelPdf(q.type);
    const qText = cleanMath((q as any).question || (q as any).mainQuestion || '');
    const questionHeader = `Câu ${index + 1} [${typeTag}]: `;
    doc.text(questionHeader, MARGIN, ctx.yPos);

    doc.setFont('helvetica', 'normal');
    const headerW = doc.getTextWidth(questionHeader);
    const firstLineW = contentW - headerW;
    const wrappedQ = doc.splitTextToSize(qText, firstLineW);
    doc.text(wrappedQ[0] || '', MARGIN + headerW, ctx.yPos);
    ctx.yPos += 5;

    if (wrappedQ.length > 1) {
        const rest = wrappedQ.slice(1).join('\n');
        const restLines = doc.splitTextToSize(rest, contentW);
        doc.text(restLines, MARGIN + 4, ctx.yPos);
        ctx.yPos += restLines.length * 5;
    }

    ctx.yPos += 2;

    // Per-type answer area
    switch (q.type) {
        case QuestionType.MCQ:
        case QuestionType.MULTIPLE_SELECT:
        case QuestionType.IMAGE_QUESTION: {
            const options: string[] = (q as any).options || [];
            const letters = ['A', 'B', 'C', 'D'];
            const cols = options.length <= 2 ? 1 : 2;
            const colW = contentW / cols;
            options.forEach((opt, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const xOpt = MARGIN + col * colW;
                const yOpt = ctx.yPos + row * 7;
                checkNewPage(ctx, 10);
                // Checkbox square
                doc.setDrawColor(60, 60, 60);
                doc.setLineWidth(0.4);
                doc.rect(xOpt, yOpt - 3.5, 4, 4);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.text(`${letters[i]}.`, xOpt + 6, yOpt);
                doc.setFont('helvetica', 'normal');
                const cleanOpt = cleanMath(opt.replace(/^[A-Da-d][.)]\s*/, ''));
                const optLines = doc.splitTextToSize(cleanOpt, colW - 14);
                doc.text(optLines[0] || '', xOpt + 14, yOpt);
            });
            const rows = Math.ceil(options.length / cols);
            ctx.yPos += rows * 7 + 4;
            break;
        }

        case QuestionType.TRUE_FALSE: {
            const items: any[] = (q as any).items || [];
            checkNewPage(ctx, items.length * 8 + 10);
            // Header row
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('Nội dung', MARGIN + 2, ctx.yPos);
            doc.text('Đ', pageW - MARGIN - 14, ctx.yPos, { align: 'center' });
            doc.text('S', pageW - MARGIN - 6, ctx.yPos, { align: 'center' });
            ctx.yPos += 4;
            doc.setLineWidth(0.3);
            doc.line(MARGIN, ctx.yPos, pageW - MARGIN, ctx.yPos);
            ctx.yPos += 4;
            doc.setFont('helvetica', 'normal');
            items.forEach((item) => {
                checkNewPage(ctx, 10);
                const stmtLines = doc.splitTextToSize(cleanMath(item.statement || ''), contentW - 22);
                doc.text(stmtLines, MARGIN + 2, ctx.yPos);
                // Checkboxes for Đ/S
                doc.rect(pageW - MARGIN - 16, ctx.yPos - 3.5, 4, 4);
                doc.rect(pageW - MARGIN - 8, ctx.yPos - 3.5, 4, 4);
                ctx.yPos += Math.max(stmtLines.length * 5, 6) + 2;
            });
            ctx.yPos += 2;
            break;
        }

        case QuestionType.SHORT_ANSWER:
        case QuestionType.RIDDLE: {
            // 3 writing lines
            checkNewPage(ctx, 18);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text('Trả lời:', MARGIN, ctx.yPos);
            ctx.yPos += 6;
            for (let li = 0; li < 2; li++) {
                doc.setDrawColor(160, 160, 160);
                doc.setLineWidth(0.3);
                doc.line(MARGIN + 4, ctx.yPos, pageW - MARGIN, ctx.yPos);
                ctx.yPos += 6;
            }
            doc.setTextColor(0, 0, 0);
            ctx.yPos += 2;
            break;
        }

        case QuestionType.MATCHING: {
            const pairs: any[] = (q as any).pairs || [];
            const shuffledRight = [...pairs.map(p => p.right)].sort(() => Math.random() - 0.5);
            checkNewPage(ctx, pairs.length * 8 + 12);
            const colW2 = (contentW - 20) / 2;
            // Header
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('Cột A', MARGIN + 2, ctx.yPos);
            doc.text('Cột B', MARGIN + colW2 + 22, ctx.yPos);
            ctx.yPos += 5;
            doc.setFont('helvetica', 'normal');
            pairs.forEach((pair, i) => {
                checkNewPage(ctx, 8);
                doc.text(`${i + 1}. ${cleanMath(pair.left)}`, MARGIN + 2, ctx.yPos);
                const letter = String.fromCharCode(65 + i);
                doc.text(`${letter}. ${cleanMath(shuffledRight[i] || '')}`, MARGIN + colW2 + 22, ctx.yPos);
                ctx.yPos += 7;
            });
            // Answer blanks
            doc.setFontSize(8);
            doc.setTextColor(80, 80, 80);
            const ansLine = pairs.map((_, i) => `${i + 1}.__`).join('  ');
            doc.text(`Kết quả nối: ${ansLine}`, MARGIN + 2, ctx.yPos);
            doc.setTextColor(0, 0, 0);
            ctx.yPos += 7;
            break;
        }

        case QuestionType.DRAG_DROP: {
            const blanks: string[] = (q as any).blanks || [];
            const distractors: string[] = (q as any).distractors || [];
            const wordBank = [...blanks, ...distractors].sort(() => Math.random() - 0.5);
            checkNewPage(ctx, 20);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('Từ cho sẵn: ', MARGIN, ctx.yPos);
            doc.setFont('helvetica', 'normal');
            const bankText = wordBank.join('  /  ');
            const bankLines = doc.splitTextToSize(bankText, contentW - 30);
            doc.text(bankLines, MARGIN + 25, ctx.yPos);
            ctx.yPos += bankLines.length * 5 + 3;
            const ddText = cleanMath(((q as any).text || '').replace(/\[([^\]]+)\]/g, '___'));
            const ddLines = doc.splitTextToSize(ddText, contentW);
            doc.text(ddLines, MARGIN, ctx.yPos);
            ctx.yPos += ddLines.length * 5 + 4;
            break;
        }

        case QuestionType.ORDERING: {
            const items: string[] = (q as any).items || [];
            checkNewPage(ctx, items.length * 7 + 14);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text('Sắp xếp các ý sau theo thứ tự đúng:', MARGIN, ctx.yPos);
            ctx.yPos += 5;
            items.forEach((item, i) => {
                checkNewPage(ctx, 8);
                // Small order box
                doc.rect(MARGIN, ctx.yPos - 3.5, 5, 5);
                const itemLines = doc.splitTextToSize(`${i + 1}. ${cleanMath(item)}`, contentW - 10);
                doc.text(itemLines, MARGIN + 8, ctx.yPos);
                ctx.yPos += Math.max(itemLines.length * 5, 7) + 1;
            });
            ctx.yPos += 3;
            break;
        }

        case QuestionType.CATEGORIZATION: {
            const categories: any[] = (q as any).categories || [];
            const catItems: any[] = (q as any).items || [];
            checkNewPage(ctx, 20);
            // Category headers
            const catW = contentW / Math.max(categories.length, 1);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            categories.forEach((cat, i) => {
                const xCat = MARGIN + i * catW;
                doc.setFillColor(230, 230, 230);
                doc.rect(xCat, ctx.yPos - 4, catW - 2, 6, 'F');
                doc.text(cat.name, xCat + 2, ctx.yPos);
            });
            ctx.yPos += 8;
            // Blank rows for student to fill
            const rowsNeeded = Math.ceil(catItems.length / categories.length);
            doc.setFont('helvetica', 'normal');
            for (let r = 0; r < rowsNeeded + 1; r++) {
                checkNewPage(ctx, 8);
                categories.forEach((_, i) => {
                    const xCat = MARGIN + i * catW;
                    doc.setDrawColor(180, 180, 180);
                    doc.setLineWidth(0.2);
                    doc.line(xCat + 2, ctx.yPos, xCat + catW - 4, ctx.yPos);
                });
                ctx.yPos += 7;
            }
            // Word bank
            doc.setFontSize(8);
            doc.setTextColor(80, 80, 80);
            const bankCat = catItems.map(it => it.content).sort(() => Math.random() - 0.5).join('  |  ');
            const bankLines = doc.splitTextToSize(`Từ để phân loại: ${bankCat}`, contentW);
            doc.text(bankLines, MARGIN, ctx.yPos);
            doc.setTextColor(0, 0, 0);
            ctx.yPos += bankLines.length * 5 + 3;
            break;
        }

        case QuestionType.WORD_SCRAMBLE: {
            const letters: string[] = (q as any).letters || [];
            checkNewPage(ctx, 16);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            // Render each letter in a box
            let xL = MARGIN + 2;
            letters.forEach(letter => {
                doc.setDrawColor(80, 80, 80);
                doc.setLineWidth(0.4);
                doc.rect(xL, ctx.yPos - 5, 8, 9);
                doc.text(letter, xL + 4, ctx.yPos, { align: 'center' });
                xL += 11;
            });
            ctx.yPos += 8;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text('Từ đúng: _ _ _ _ _ _ _ _ _ _ _', MARGIN, ctx.yPos);
            ctx.yPos += 7;
            break;
        }

        case QuestionType.UNDERLINE: {
            const sentence = cleanMath((q as any).sentence || '');
            checkNewPage(ctx, 14);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            doc.text('Câu: ', MARGIN, ctx.yPos);
            doc.setTextColor(0, 0, 0);
            const senLines = doc.splitTextToSize(sentence, contentW - 14);
            doc.text(senLines, MARGIN + 12, ctx.yPos);
            ctx.yPos += senLines.length * 5 + 3;
            doc.setTextColor(80, 80, 80);
            doc.text('(Dùng bút gạch chân từ/cụm từ đúng)', MARGIN + 2, ctx.yPos);
            doc.setTextColor(0, 0, 0);
            ctx.yPos += 6;
            break;
        }

        case QuestionType.ERROR_CORRECTION: {
            const passage = cleanMath((q as any).passage || '');
            checkNewPage(ctx, 22);
            const passLines = doc.splitTextToSize(passage, contentW);
            doc.text(passLines, MARGIN, ctx.yPos);
            ctx.yPos += passLines.length * 5 + 3;
            doc.setTextColor(80, 80, 80);
            doc.setFontSize(9);
            doc.text('Từ sai: ________________   Từ đúng: ________________', MARGIN, ctx.yPos);
            doc.setTextColor(0, 0, 0);
            ctx.yPos += 7;
            break;
        }

        default: {
            // Fallback: 2 blank lines
            checkNewPage(ctx, 14);
            for (let li = 0; li < 2; li++) {
                doc.setDrawColor(160, 160, 160);
                doc.line(MARGIN + 4, ctx.yPos, doc.internal.pageSize.getWidth() - MARGIN, ctx.yPos);
                ctx.yPos += 6;
            }
        }
    }

    ctx.yPos += 3; // gap between questions
}

/** Render the answer key page(s) as a new PDF section */
function renderAnswerKeyPdf(doc: jsPDF, quiz: Quiz, schoolName: string): void {
    doc.addPage();
    const pageW = doc.internal.pageSize.getWidth();
    let y = MARGIN;

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(schoolName.toUpperCase(), pageW / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(13);
    doc.text('ĐÁP ÁN', pageW / 2, y, { align: 'center' });
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(quiz.title, pageW / 2, y, { align: 'center' });
    y += 6;
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y, pageW - MARGIN, y);
    y += 5;
    doc.setTextColor(0, 0, 0);

    quiz.questions.forEach((q: any, i) => {
        if (y > doc.internal.pageSize.getHeight() - MARGIN - 10) {
            doc.addPage();
            y = MARGIN + 5;
        }
        const answer = getAnswerText(q);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(`Câu ${i + 1}:`, MARGIN, y);
        doc.setFont('helvetica', 'normal');
        const ansLines = doc.splitTextToSize(answer, pageW - MARGIN * 2 - 20);
        doc.text(ansLines, MARGIN + 18, y);
        y += Math.max(ansLines.length * 5, 6) + 2;
    });
}

/** Extract human-readable answer for a question */
function getAnswerText(q: any): string {
    switch (q.type) {
        case QuestionType.MCQ:
        case QuestionType.IMAGE_QUESTION: {
            const letters = ['A', 'B', 'C', 'D'];
            const idx = letters.indexOf(q.correctAnswer);
            const optText = q.options?.[idx] ? `${q.correctAnswer}. ${cleanMath(q.options[idx])}` : q.correctAnswer;
            return optText;
        }
        case QuestionType.MULTIPLE_SELECT:
            return (q.correctAnswers || []).join(', ');
        case QuestionType.TRUE_FALSE:
            return (q.items || []).map((it: any, i: number) => `${i + 1}. ${it.isCorrect ? 'Đúng' : 'Sai'}`).join('  |  ');
        case QuestionType.SHORT_ANSWER:
        case QuestionType.RIDDLE:
            return cleanMath(q.correctAnswer || '');
        case QuestionType.MATCHING:
            return (q.pairs || []).map((p: any, i: number) => `${i + 1}→${String.fromCharCode(65 + i)}`).join('  ');
        case QuestionType.DRAG_DROP:
            return (q.blanks || []).join(' / ');
        case QuestionType.ORDERING:
            return (q.correctOrder || []).map((idx: number, pos: number) => `${pos + 1}=(${idx + 1})`).join('  ');
        case QuestionType.WORD_SCRAMBLE:
            return cleanMath(q.correctWord || '');
        case QuestionType.UNDERLINE:
            return (q.correctWordIndexes || []).map((i: number) => `"${(q.words || [])[i] || i}"`).join(', ');
        case QuestionType.CATEGORIZATION:
            return (q.categories || []).map((cat: any) => {
                const catItems = (q.items || []).filter((it: any) => it.categoryId === cat.id).map((it: any) => it.content);
                return `${cat.name}: ${catItems.join(', ')}`;
            }).join(' | ');
        case QuestionType.ERROR_CORRECTION:
            return `Sai: "${cleanMath(q.wrongWord)}"  →  Đúng: "${cleanMath(q.correctWord)}"`;
        default:
            return cleanMath(q.correctAnswer || '');
    }
}

function getTypeLabelPdf(type: QuestionType): string {
    const map: Record<string, string> = {
        MCQ: 'Trắc nghiệm',
        TRUE_FALSE: 'Đúng/Sai',
        SHORT_ANSWER: 'Tự luận',
        MATCHING: 'Nối cột',
        MULTIPLE_SELECT: 'Chọn nhiều',
        DRAG_DROP: 'Điền khuyết',
        ORDERING: 'Sắp xếp',
        CATEGORIZATION: 'Phân loại',
        WORD_SCRAMBLE: 'Ghép chữ',
        UNDERLINE: 'Gạch chân',
        ERROR_CORRECTION: 'Sửa lỗi',
        RIDDLE: 'Câu đố',
        IMAGE_QUESTION: 'Hình ảnh',
        DROPDOWN: 'Điền dropdown',
    };
    return map[type] || type;
}

// ─── PDF Export ──────────────────────────────────────────────────────────────

async function exportPdf(opts: WorksheetExportOptions): Promise<void> {
    const { quiz, paperStyle, answerKey } = opts;
    const schoolName = opts.schoolName || 'Trường Tiểu học Ít Ong';

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Page 1: grid + header
    drawGridBackground(doc, paperStyle);
    const startY = drawPdfHeader(doc, quiz, schoolName, 'BÀI KIỂM TRA');

    const ctx: RenderContext = { doc, opts, yPos: startY };

    // Render all questions
    quiz.questions.forEach((q, i) => renderQuestionPdf(ctx, q, i));

    // Footer on all content pages
    const totalContentPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalContentPages; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
            `Trang ${p} / ${totalContentPages}  —  ${schoolName}  —  iTong Quiz`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 7,
            { align: 'center' }
        );
    }

    // Answer key section (separate pages)
    if (answerKey === 'separate') {
        renderAnswerKeyPdf(doc, quiz, schoolName);
    }

    const safeTitle = quiz.title.replace(/[^a-zA-Z0-9\u00C0-\u024F\s]/g, '-').trim();
    doc.save(`vo-bai-tap-${safeTitle}.pdf`);
}

// ─── DOCX Export ─────────────────────────────────────────────────────────────

async function exportDocx(opts: WorksheetExportOptions): Promise<void> {
    const { quiz } = opts;
    const schoolName = opts.schoolName || 'Trường Tiểu học Ít Ong';
    const children: any[] = [];

    // Header
    children.push(
        new Paragraph({
            children: [new TextRun({ text: schoolName.toUpperCase(), bold: true, size: 22 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
        }),
        new Paragraph({
            children: [new TextRun({ text: 'BÀI KIỂM TRA', bold: true, size: 28 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
        }),
        new Paragraph({
            children: [new TextRun({ text: quiz.title, size: 22 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
        }),
        new Paragraph({
            children: [new TextRun({ text: `Lớp ${quiz.classLevel}  •  ${quiz.questions.length} câu  •  ${quiz.timeLimit} phút`, size: 18, color: '555555' })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
        }),
        // Student info row
        new Table({
            rows: [new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Họ và tên: ___________________________', size: 20 })] })], width: { size: 60, type: WidthType.PERCENTAGE }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Lớp: ________  Ngày: ________', size: 20 })] })], width: { size: 40, type: WidthType.PERCENTAGE }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
                ],
            })],
            width: { size: 100, type: WidthType.PERCENTAGE },
        }),
        new Paragraph({ text: '', spacing: { after: 160 } }),
    );

    // Questions
    quiz.questions.forEach((q: any, i) => {
        const qText = cleanMath(q.question || q.mainQuestion || '');
        const typeLabel = getTypeLabelPdf(q.type);

        children.push(
            new Paragraph({
                children: [
                    new TextRun({ text: `Câu ${i + 1} [${typeLabel}]: `, bold: true, size: 20 }),
                    new TextRun({ text: qText, size: 20 }),
                ],
                spacing: { before: 160, after: 80 },
            })
        );

        // Per-type rendering
        switch (q.type) {
            case QuestionType.MCQ:
            case QuestionType.MULTIPLE_SELECT:
            case QuestionType.IMAGE_QUESTION: {
                const opts2 = (q.options || []) as string[];
                const letters2 = ['A', 'B', 'C', 'D'];
                const cells = opts2.map((opt: string, j: number) =>
                    new TableCell({
                        children: [new Paragraph({
                            children: [
                                new TextRun({ text: `□ ${letters2[j]}. `, bold: true, size: 18 }),
                                new TextRun({ text: cleanMath(opt.replace(/^[A-Da-d][.)]\s*/, '')), size: 18 }),
                            ],
                        })],
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    })
                );
                // Pair cells into rows of 2
                for (let j = 0; j < cells.length; j += 2) {
                    const rowCells = [cells[j]];
                    if (cells[j + 1]) rowCells.push(cells[j + 1]);
                    children.push(new Table({
                        rows: [new TableRow({ children: rowCells })],
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
                    }));
                }
                break;
            }
            case QuestionType.TRUE_FALSE: {
                const items2: any[] = q.items || [];
                const tfRows = [
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Nội dung', bold: true, size: 18 })] })], width: { size: 70, type: WidthType.PERCENTAGE } }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Đ', bold: true, size: 18 })], alignment: AlignmentType.CENTER })], width: { size: 15, type: WidthType.PERCENTAGE } }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'S', bold: true, size: 18 })], alignment: AlignmentType.CENTER })], width: { size: 15, type: WidthType.PERCENTAGE } }),
                        ],
                    }),
                    ...items2.map(item =>
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: cleanMath(item.statement || ''), size: 18 })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '□', size: 18 })], alignment: AlignmentType.CENTER })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '□', size: 18 })], alignment: AlignmentType.CENTER })] }),
                            ],
                        })
                    ),
                ];
                children.push(new Table({ rows: tfRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
                break;
            }
            case QuestionType.SHORT_ANSWER:
            case QuestionType.RIDDLE:
                children.push(new Paragraph({ children: [new TextRun({ text: 'Trả lời: _____________________________________________________________________________', size: 18 })] }));
                children.push(new Paragraph({ children: [new TextRun({ text: '          _____________________________________________________________________________', size: 18 })] }));
                break;
            case QuestionType.MATCHING: {
                const pairs2: any[] = q.pairs || [];
                const shuffledRight2 = [...pairs2.map((p: any) => p.right)].sort(() => Math.random() - 0.5);
                const matchRows2 = [
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Cột A', bold: true, size: 18 })] })], width: { size: 45, type: WidthType.PERCENTAGE } }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Nối', bold: true, size: 18 })], alignment: AlignmentType.CENTER })], width: { size: 10, type: WidthType.PERCENTAGE } }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Cột B', bold: true, size: 18 })] })], width: { size: 45, type: WidthType.PERCENTAGE } }),
                        ],
                    }),
                    ...pairs2.map((pair: any, idx: number) =>
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${idx + 1}. ${cleanMath(pair.left)}`, size: 18 })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '___', size: 18 })], alignment: AlignmentType.CENTER })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${String.fromCharCode(65 + idx)}. ${cleanMath(shuffledRight2[idx] || '')}`, size: 18 })] })] }),
                            ],
                        })
                    ),
                ];
                children.push(new Table({ rows: matchRows2, width: { size: 100, type: WidthType.PERCENTAGE } }));
                break;
            }
            case QuestionType.DRAG_DROP: {
                const blanks3: string[] = q.blanks || [];
                const distractors3: string[] = q.distractors || [];
                const bank3 = [...blanks3, ...distractors3].sort(() => Math.random() - 0.5);
                children.push(new Paragraph({ children: [new TextRun({ text: `Từ cho sẵn: ${bank3.join('  /  ')}`, bold: true, size: 18 })] }));
                const ddText3 = cleanMath((q.text || '').replace(/\[([^\]]+)\]/g, '____'));
                children.push(new Paragraph({ children: [new TextRun({ text: ddText3, size: 18 })] }));
                break;
            }
            default:
                children.push(new Paragraph({ children: [new TextRun({ text: 'Trả lời: _____________________________________________________________________________', size: 18 })] }));
        }

        children.push(new Paragraph({ text: '', spacing: { after: 80 } }));
    });

    // Answer key
    if (opts.answerKey === 'separate') {
        children.push(
            new Paragraph({ children: [new TextRun({ text: '', break: 1 })], pageBreakBefore: true }),
            new Paragraph({ children: [new TextRun({ text: '═══ ĐÁP ÁN ═══', bold: true, size: 26 })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
        );
        quiz.questions.forEach((q: any, i) => {
            children.push(new Paragraph({
                children: [
                    new TextRun({ text: `Câu ${i + 1}: `, bold: true, size: 20 }),
                    new TextRun({ text: getAnswerText(q), size: 20 }),
                ],
                spacing: { after: 60 },
            }));
        });
    }

    const doc2 = new Document({ sections: [{ properties: {}, children }] });
    const blob = await Packer.toBlob(doc2);
    const safeTitle = quiz.title.replace(/[^a-zA-Z0-9\u00C0-\u024F\s]/g, '-').trim();
    saveAs(blob, `vo-bai-tap-${safeTitle}.docx`);
}

// ─── Public Entry Point ──────────────────────────────────────────────────────

/**
 * Export a quiz as a printable worksheet (PDF or DOCX).
 * Answer key is optionally included as a separate section.
 */
export async function exportWorksheet(opts: WorksheetExportOptions): Promise<void> {
    if (opts.format === 'pdf') {
        await exportPdf(opts);
    } else {
        await exportDocx(opts);
    }
}
