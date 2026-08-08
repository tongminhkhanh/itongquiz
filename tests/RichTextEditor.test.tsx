import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RichTextEditor from '../src/features/rich-text/RichTextEditor';
import { createRichTextDocument } from '../src/features/rich-text/richTextDocument';

describe('RichTextEditor', () => {
  it('creates a new paragraph on Enter and reports the plain-text fallback', () => {
    const onChange = vi.fn();
    render(<RichTextEditor value={createRichTextDocument('Câu hỏi')} onChange={onChange} />);

    const editor = screen.getByRole('textbox');
    fireEvent.keyDown(editor, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ version: 1, blocks: expect.any(Array) }), 'Câu hỏi\n');
    expect(onChange.mock.calls[0][0].blocks).toHaveLength(2);
  });
});

