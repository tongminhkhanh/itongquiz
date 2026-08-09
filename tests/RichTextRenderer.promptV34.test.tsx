import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import RichTextRenderer from '../src/features/rich-text/RichTextRenderer';

describe('RichTextRenderer prompt v3.4 compatibility', () => {
  it('renders imported list structure, strike, text color and highlight', () => {
    const html = renderToStaticMarkup(
      <RichTextRenderer value={{
        version: 1,
        blocks: [
          {
            id: 'ordered-1',
            type: 'orderedList',
            align: 'left',
            listStart: 2,
            children: [{
              type: 'text',
              text: 'Mục hai',
              strike: true,
              color: '#0369A1',
              highlight: '#FEF3C7',
            }],
          },
          {
            id: 'ordered-2',
            type: 'orderedList',
            align: 'left',
            children: [{ type: 'text', text: 'Mục ba' }],
          },
        ],
      }} />,
    );

    expect(html).toContain('<ol');
    expect(html).toContain('start="2"');
    expect(html.match(/<li/g)).toHaveLength(2);
    expect(html).toContain('<s>');
    expect(html).toContain('color:#0369A1');
    expect(html).toContain('background-color:#FEF3C7');
  });
});
