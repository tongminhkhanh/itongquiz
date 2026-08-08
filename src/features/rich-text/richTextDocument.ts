import type {
  RichTextAlign,
  RichTextBlock,
  RichTextDocumentV1,
  RichTextInlineNode,
} from './richText.types';

const ALIGNMENTS: RichTextAlign[] = ['left', 'center', 'right', 'justify'];
let blockSequence = 0;

export const createRichTextBlock = (
  text = '',
  type: RichTextBlock['type'] = 'paragraph',
  align: RichTextAlign = 'left',
): RichTextBlock => ({
  id: `rt-block-${Date.now()}-${blockSequence++}`,
  type,
  align,
  children: text
    ? [{ type: 'text', text }]
    : [{ type: 'text', text: '' }],
});

export const createRichTextDocument = (text = ''): RichTextDocumentV1 => ({
  version: 1,
  blocks: String(text ?? '').split(/\r?\n/u).map((line) => createRichTextBlock(line)),
});

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isInline = (value: unknown): value is RichTextInlineNode => {
  if (!isRecord(value) || typeof value.type !== 'string') return false;
  if (value.type === 'text') return typeof value.text === 'string';
  if (value.type === 'math') return typeof value.latex === 'string';
  return value.type === 'lineBreak';
};

const normalizeInline = (value: unknown): RichTextInlineNode | null => {
  if (!isInline(value)) return null;
  if (value.type === 'text') {
    return {
      type: 'text',
      text: value.text,
      ...(value.bold ? { bold: true } : {}),
      ...(value.italic ? { italic: true } : {}),
      ...(value.underline ? { underline: true } : {}),
    };
  }
  if (value.type === 'math') return { type: 'math', latex: value.latex };
  return { type: 'lineBreak' };
};

const mergeTextNodes = (children: RichTextInlineNode[]): RichTextInlineNode[] => {
  const result: RichTextInlineNode[] = [];
  children.forEach((child) => {
    const previous = result[result.length - 1];
    if (
      child.type === 'text' && previous?.type === 'text'
      && Boolean(child.bold) === Boolean(previous.bold)
      && Boolean(child.italic) === Boolean(previous.italic)
      && Boolean(child.underline) === Boolean(previous.underline)
    ) {
      previous.text += child.text;
    } else {
      result.push(child);
    }
  });
  return result.length > 0 ? result : [{ type: 'text', text: '' }];
};

export const normalizeRichTextDocument = (
  value: unknown,
  fallbackText = '',
): RichTextDocumentV1 => {
  let candidate = value;
  if (typeof candidate === 'string') {
    try { candidate = JSON.parse(candidate); } catch { candidate = undefined; }
  }
  if (!isRecord(candidate) || candidate.version !== 1 || !Array.isArray(candidate.blocks)) {
    return createRichTextDocument(fallbackText);
  }

  const blocks = candidate.blocks.map((rawBlock, index): RichTextBlock => {
    const block = isRecord(rawBlock) ? rawBlock : {};
    const type = block.type === 'bulletList' || block.type === 'orderedList'
      ? block.type
      : 'paragraph';
    const align = ALIGNMENTS.includes(block.align as RichTextAlign)
      ? block.align as RichTextAlign
      : 'left';
    const children = Array.isArray(block.children)
      ? block.children.map(normalizeInline).filter((item): item is RichTextInlineNode => Boolean(item))
      : [];
    return {
      id: typeof block.id === 'string' && block.id ? block.id : `rt-block-${index}`,
      type,
      align,
      children: mergeTextNodes(children),
    };
  });

  return { version: 1, blocks: blocks.length > 0 ? blocks : [createRichTextBlock()] };
};

export const richTextToPlainText = (document: RichTextDocumentV1 | null | undefined): string => {
  if (!document?.blocks?.length) return '';
  return document.blocks
    .map((block) => block.children.map((child) => {
      if (child.type === 'text') return child.text;
      if (child.type === 'math') return `$${child.latex}$`;
      return '\n';
    }).join(''))
    .join('\n');
};

export const richTextDocumentToJson = (document: RichTextDocumentV1 | null | undefined): string => (
  JSON.stringify(normalizeRichTextDocument(document, richTextToPlainText(document)))
);

export const richTextDocumentIsEmpty = (document: RichTextDocumentV1 | null | undefined): boolean => (
  !richTextToPlainText(document).trim()
);

