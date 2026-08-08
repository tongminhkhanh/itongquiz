import { describe, expect, it } from 'vitest';
import {
  createRichTextDocument,
  normalizeRichTextDocument,
  richTextDocumentToJson,
  richTextToPlainText,
} from '../src/features/rich-text/richTextDocument';

describe('rich text question contract', () => {
  it('keeps paragraphs, inline marks, formulas and line breaks serialisable', () => {
    const document = normalizeRichTextDocument({
      version: 1,
      blocks: [{
        id: 'one', type: 'paragraph', align: 'center',
        children: [
          { type: 'text', text: 'Xin chào', bold: true },
          { type: 'lineBreak' },
          { type: 'math', latex: '\\frac{1}{2}' },
        ],
      }],
    });

    expect(richTextToPlainText(document)).toBe('Xin chào\n$\\frac{1}{2}$');
    expect(JSON.parse(richTextDocumentToJson(document))).toMatchObject({ version: 1, blocks: [{ align: 'center' }] });
  });

  it('falls back to legacy plain text for old questions', () => {
    const document = normalizeRichTextDocument(undefined, 'Dòng một\nDòng hai');
    expect(document.blocks).toHaveLength(2);
    expect(richTextToPlainText(document)).toBe('Dòng một\nDòng hai');
  });

  it('creates an empty editable paragraph when content is empty', () => {
    expect(createRichTextDocument().blocks).toHaveLength(1);
  });
});

