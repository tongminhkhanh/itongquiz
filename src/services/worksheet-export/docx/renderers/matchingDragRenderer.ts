import { AlignmentType, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import { normalizeWorksheetMath } from '../../shared/mathNormalizer';

export function renderDocxMatching(question: any): Table {
    const pairs: any[] = question.pairs || [];
    const right = [...pairs.map(pair => pair.right)].sort(() => Math.random() - 0.5);
    const rows = [new TableRow({ children: [
        createHeaderCell('Cột A', 45), createHeaderCell('Nối', 10, true), createHeaderCell('Cột B', 45),
    ] })];
    pairs.forEach((pair, index) => rows.push(new TableRow({ children: [
        createTextCell(`${index + 1}. ${normalizeWorksheetMath(pair.left, true)}`),
        createTextCell('___', true),
        createTextCell(`${String.fromCharCode(65 + index)}. ${normalizeWorksheetMath(right[index] || '', true)}`),
    ] })));
    return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
}

export function renderDocxDragDrop(question: any): Paragraph[] {
    const bank = [...(question.blanks || []), ...(question.distractors || [])].sort(() => Math.random() - 0.5);
    const text = normalizeWorksheetMath((question.text || '').replace(/\[([^\]]+)\]/g, '____'), true);
    return [
        new Paragraph({ children: [new TextRun({ text: `Từ cho sẵn: ${bank.join('  /  ')}`, bold: true, size: 28 })], spacing: { line: 320 } }),
        new Paragraph({ children: [new TextRun({ text, size: 28 })], spacing: { line: 320 } }),
    ];
}

function createHeaderCell(text: string, width: number, centered = false): TableCell {
    return new TableCell({ children: [new Paragraph({
        children: [new TextRun({ text, bold: true, size: 28 })],
        alignment: centered ? AlignmentType.CENTER : undefined,
        spacing: { line: 280 },
    })], width: { size: width, type: WidthType.PERCENTAGE } });
}

function createTextCell(text: string, centered = false): TableCell {
    return new TableCell({ children: [new Paragraph({
        children: [new TextRun({ text, size: 28 })],
        alignment: centered ? AlignmentType.CENTER : undefined,
        spacing: { line: 280 },
    })] });
}
