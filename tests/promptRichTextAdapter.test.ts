import { describe, expect, it } from 'vitest';
import { convertPromptQuestionRichText } from '../src/features/manual-quiz-workspace/import/promptRichTextAdapter';

describe('prompt v3.4 rich-text adapter', () => {
  it('flattens canonical ordered lists into renderable frontend list blocks', () => {
    const result = convertPromptQuestionRichText({
      schemaVersion: 1,
      doc: {
        type: 'doc',
        content: [{
          type: 'orderedList',
          attrs: { start: 2 },
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bước hai' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bước ba' }] }] },
          ],
        }],
      },
    }, 'Bước hai\nBước ba');

    expect(result.issues).toEqual([]);
    expect(result.document?.blocks).toHaveLength(2);
    expect(result.document?.blocks[0]).toMatchObject({ type: 'orderedList', listStart: 2 });
    expect(result.document?.blocks[1]).toMatchObject({ type: 'orderedList' });
  });

  it('keeps a safe document but reports non-canonical marks for review', () => {
    const result = convertPromptQuestionRichText({
      schemaVersion: 1,
      doc: {
        type: 'doc',
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: 'Nội dung', marks: [{ type: 'textStyle', attrs: { color: '#FFFFFF' } }] }],
        }],
      },
    }, 'Nội dung');

    expect(result.document).toBeDefined();
    expect(result.issues.join(' ')).toContain('palette');
  });
});
