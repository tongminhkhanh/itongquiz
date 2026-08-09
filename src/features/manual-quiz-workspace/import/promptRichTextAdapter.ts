import type {
    RichTextAlign,
    RichTextBlock,
    RichTextDocumentV1,
    RichTextInlineNode,
    RichTextTextNode,
} from '../../rich-text/richText.types';
import { richTextToPlainText } from '../../rich-text/richTextDocument';

type JsonRecord = Record<string, unknown>;

export interface PromptRichTextConversion {
    document?: RichTextDocumentV1;
    issues: string[];
}

const MAX_RICH_TEXT_BYTES = 64 * 1024;
const TEXT_COLORS = new Set(['#0F172A', '#0369A1', '#15803D', '#B45309', '#BE123C', '#6D28D9']);
const HIGHLIGHT_COLORS = new Set(['#FEF3C7', '#DCFCE7', '#DBEAFE', '#FCE7F3', '#EDE9FE']);
const ALIGNMENTS = new Set<RichTextAlign>(['left', 'center', 'right']);

const asRecord = (value: unknown): JsonRecord | null => (
    value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null
);

const comparableText = (value: string): string => value
    .replace(/\r\n?/gu, '\n')
    .replace(/\s+/gu, ' ')
    .trim();

const pushUnique = (issues: string[], message: string): void => {
    if (!issues.includes(message)) issues.push(message);
};

const unexpectedKeys = (
    record: JsonRecord,
    allowed: readonly string[],
    label: string,
    issues: string[],
): void => {
    const allowedSet = new Set(allowed);
    const unexpected = Object.keys(record).filter((key) => !allowedSet.has(key));
    if (unexpected.length > 0) {
        pushUnique(issues, `${label} chứa field không được hỗ trợ: ${unexpected.join(', ')}.`);
    }
};

const readMarks = (value: unknown, issues: string[]): Omit<RichTextTextNode, 'type' | 'text'> => {
    const result: Omit<RichTextTextNode, 'type' | 'text'> = {};
    if (value === undefined) return result;
    if (!Array.isArray(value)) {
        pushUnique(issues, 'questionRichText text.marks phải là một mảng.');
        return result;
    }

    value.forEach((rawMark) => {
        const mark = asRecord(rawMark);
        const type = typeof mark?.type === 'string' ? mark.type : '';
        if (!mark || !type) {
            pushUnique(issues, 'questionRichText chứa mark không hợp lệ.');
            return;
        }
        if (type === 'bold' || type === 'italic' || type === 'underline' || type === 'strike') {
            unexpectedKeys(mark, ['type'], `Mark ${type}`, issues);
            result[type] = true;
            return;
        }
        if (type === 'textStyle' || type === 'highlight') {
            unexpectedKeys(mark, ['type', 'attrs'], `Mark ${type}`, issues);
            const attrs = asRecord(mark.attrs);
            const color = typeof attrs?.color === 'string' ? attrs.color.toUpperCase() : '';
            const palette = type === 'textStyle' ? TEXT_COLORS : HIGHLIGHT_COLORS;
            if (!attrs || !palette.has(color)) {
                pushUnique(issues, `Mark ${type} dùng màu không thuộc palette v3.4.`);
                return;
            }
            unexpectedKeys(attrs, ['color'], `Mark ${type}.attrs`, issues);
            if (type === 'textStyle') result.color = color;
            else result.highlight = color;
            return;
        }
        pushUnique(issues, `questionRichText không hỗ trợ mark ${type || '(trống)'}.`);
    });
    return result;
};

const readInlineNodes = (value: unknown, issues: string[]): RichTextInlineNode[] => {
    if (value === undefined) return [{ type: 'text', text: '' }];
    if (!Array.isArray(value)) {
        pushUnique(issues, 'questionRichText paragraph.content phải là một mảng.');
        return [{ type: 'text', text: '' }];
    }
    const nodes: RichTextInlineNode[] = [];
    value.forEach((rawNode) => {
        const node = asRecord(rawNode);
        const type = typeof node?.type === 'string' ? node.type : '';
        if (type === 'hardBreak' && node) {
            unexpectedKeys(node, ['type'], 'Node hardBreak', issues);
            nodes.push({ type: 'lineBreak' });
            return;
        }
        if (type === 'text' && node) {
            unexpectedKeys(node, ['type', 'text', 'marks'], 'Node text', issues);
            if (typeof node.text !== 'string') {
                pushUnique(issues, 'questionRichText text.text phải là string.');
                return;
            }
            nodes.push({ type: 'text', text: node.text, ...readMarks(node.marks, issues) });
            return;
        }
        pushUnique(issues, `questionRichText paragraph chứa node không được hỗ trợ: ${type || '(trống)'}.`);
    });
    return nodes.length > 0 ? nodes : [{ type: 'text', text: '' }];
};

const readParagraph = (
    value: unknown,
    issues: string[],
    id: string,
    type: RichTextBlock['type'] = 'paragraph',
): RichTextBlock | null => {
    const paragraph = asRecord(value);
    if (!paragraph || paragraph.type !== 'paragraph') {
        pushUnique(issues, 'questionRichText cần paragraph hợp lệ.');
        return null;
    }
    unexpectedKeys(paragraph, ['type', 'attrs', 'content'], 'Node paragraph', issues);
    const attrs = paragraph.attrs === undefined ? null : asRecord(paragraph.attrs);
    if (paragraph.attrs !== undefined && !attrs) {
        pushUnique(issues, 'questionRichText paragraph.attrs phải là object.');
    }
    if (attrs) unexpectedKeys(attrs, ['textAlign'], 'Node paragraph.attrs', issues);
    const requestedAlign = typeof attrs?.textAlign === 'string' ? attrs.textAlign : 'left';
    const align = ALIGNMENTS.has(requestedAlign as RichTextAlign)
        ? requestedAlign as RichTextAlign
        : 'left';
    if (requestedAlign !== align) {
        pushUnique(issues, `questionRichText không hỗ trợ textAlign ${requestedAlign || '(trống)'}.`);
    }
    return { id, type, align, children: readInlineNodes(paragraph.content, issues) };
};

const readList = (
    value: JsonRecord,
    issues: string[],
    sequence: { value: number },
): RichTextBlock[] => {
    const ordered = value.type === 'orderedList';
    unexpectedKeys(value, ordered ? ['type', 'attrs', 'content'] : ['type', 'content'], `Node ${String(value.type)}`, issues);
    const attrs = ordered && value.attrs !== undefined ? asRecord(value.attrs) : null;
    if (ordered && value.attrs !== undefined && !attrs) {
        pushUnique(issues, 'questionRichText orderedList.attrs phải là object.');
    }
    if (attrs) unexpectedKeys(attrs, ['start'], 'Node orderedList.attrs', issues);
    const rawStart = attrs?.start === undefined ? 1 : Number(attrs.start);
    const start = Number.isInteger(rawStart) && rawStart >= 1 && rawStart <= 999 ? rawStart : 1;
    if (rawStart !== start) pushUnique(issues, 'questionRichText orderedList.attrs.start phải từ 1 đến 999.');
    if (!Array.isArray(value.content)) {
        pushUnique(issues, `questionRichText ${String(value.type)}.content phải là một mảng.`);
        return [];
    }

    const blocks: RichTextBlock[] = [];
    value.content.forEach((rawItem, itemIndex) => {
        const item = asRecord(rawItem);
        if (!item || item.type !== 'listItem' || !Array.isArray(item.content)) {
            pushUnique(issues, `questionRichText ${String(value.type)} chỉ được chứa listItem.`);
            return;
        }
        unexpectedKeys(item, ['type', 'content'], 'Node listItem', issues);
        const paragraphs = item.content
            .map((paragraph, paragraphIndex) => readParagraph(
                paragraph,
                issues,
                `prompt-rt-${sequence.value++}-${paragraphIndex}`,
                ordered ? 'orderedList' : 'bulletList',
            ))
            .filter((paragraph): paragraph is RichTextBlock => Boolean(paragraph));
        if (paragraphs.length === 0) return;
        const children = paragraphs.flatMap((paragraph, paragraphIndex) => (
            paragraphIndex === 0 ? paragraph.children : [{ type: 'lineBreak' as const }, ...paragraph.children]
        ));
        blocks.push({
            id: `prompt-rt-${sequence.value++}`,
            type: ordered ? 'orderedList' : 'bulletList',
            align: paragraphs[0].align,
            children,
            ...(ordered && itemIndex === 0 ? { listStart: start } : {}),
        });
    });
    return blocks;
};

export const convertPromptQuestionRichText = (
    value: unknown,
    fallbackText: string,
): PromptRichTextConversion => {
    if (value === undefined || value === null) return { issues: [] };
    const issues: string[] = [];
    let serialized = '';
    try {
        serialized = JSON.stringify(value);
    } catch {
        return { issues: ['questionRichText không thể serialize thành JSON.'] };
    }
    if (new TextEncoder().encode(serialized).byteLength > MAX_RICH_TEXT_BYTES) {
        return { issues: ['questionRichText vượt quá giới hạn 64 KiB.'] };
    }

    const envelope = asRecord(value);
    const doc = asRecord(envelope?.doc);
    if (!envelope || envelope.schemaVersion !== 1 || !doc || doc.type !== 'doc' || !Array.isArray(doc.content)) {
        return { issues: ['questionRichText phải có schemaVersion 1 và doc hợp lệ.'] };
    }
    unexpectedKeys(envelope, ['schemaVersion', 'doc'], 'questionRichText', issues);
    unexpectedKeys(doc, ['type', 'content'], 'questionRichText.doc', issues);

    const blocks: RichTextBlock[] = [];
    const sequence = { value: 0 };
    doc.content.forEach((rawBlock) => {
        const block = asRecord(rawBlock);
        if (!block) {
            pushUnique(issues, 'questionRichText.doc.content chứa node không hợp lệ.');
            return;
        }
        if (block.type === 'paragraph') {
            const parsed = readParagraph(block, issues, `prompt-rt-${sequence.value++}`);
            if (parsed) blocks.push(parsed);
            return;
        }
        if (block.type === 'bulletList' || block.type === 'orderedList') {
            blocks.push(...readList(block, issues, sequence));
            return;
        }
        pushUnique(issues, `questionRichText.doc chứa node không được hỗ trợ: ${String(block.type || '(trống)')}.`);
    });

    if (blocks.length === 0) {
        pushUnique(issues, 'questionRichText không có nội dung có thể hiển thị.');
        return { issues };
    }
    const document: RichTextDocumentV1 = { version: 1, blocks };
    if (comparableText(richTextToPlainText(document)) !== comparableText(fallbackText)) {
        pushUnique(issues, 'questionRichText không tương đương với nội dung plain của question.');
    }
    return { document, issues };
};
