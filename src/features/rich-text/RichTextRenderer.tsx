import React from 'react';
import MathSpan from '../../components/common/MathSpan';
import { normalizeRichTextDocument } from './richTextDocument';
import type { RichTextDocumentV1, RichTextInlineNode } from './richText.types';

interface RichTextRendererProps {
  value?: RichTextDocumentV1 | string | null;
  fallbackText?: string;
  className?: string;
  as?: 'div' | 'p' | 'span';
}

const InlineNode: React.FC<{ node: RichTextInlineNode }> = ({ node }) => {
  if (node.type === 'lineBreak') return <br />;
  const content = node.type === 'math' ? `$${node.latex}$` : node.text;
  const marks = node.type === 'text' ? node : undefined;
  const rendered = (
    <MathSpan
      content={content}
      as="span"
      className="whitespace-pre-wrap"
    />
  );
  let output: React.ReactNode = rendered;
  if (marks?.bold) output = <strong>{output}</strong>;
  if (marks?.italic) output = <em>{output}</em>;
  if (marks?.underline) output = <u>{output}</u>;
  if (marks?.strike) output = <s>{output}</s>;
  if (marks?.color || marks?.highlight) {
    output = (
      <span style={{ color: marks.color, backgroundColor: marks.highlight }}>
        {output}
      </span>
    );
  }
  return output;
};

const RichTextRenderer: React.FC<RichTextRendererProps> = ({
  value,
  fallbackText = '',
  className = '',
  as: Root = 'div',
}) => {
  const document = normalizeRichTextDocument(value, fallbackText);
  const blocks = document.blocks;
  if (!value && !fallbackText) return null;

  const children: React.ReactNode[] = [];
  for (let index = 0; index < blocks.length;) {
    const block = blocks[index];
    if (block.type === 'paragraph') {
      children.push(
        <div key={block.id} style={{ textAlign: block.align }} data-rich-text-block="paragraph">
          {block.children.map((node, childIndex) => <InlineNode key={`${block.id}-${childIndex}`} node={node} />)}
        </div>,
      );
      index += 1;
      continue;
    }

    const listType = block.type;
    const listBlocks = [];
    while (index < blocks.length && blocks[index].type === listType) {
      listBlocks.push(blocks[index]);
      index += 1;
    }
    const ListRoot = listType === 'orderedList' ? 'ol' : 'ul';
    children.push(
      <ListRoot
        key={`list-${listBlocks[0].id}`}
        className={listType === 'orderedList' ? 'list-decimal pl-6' : 'list-disc pl-6'}
        start={listType === 'orderedList' ? listBlocks[0].listStart : undefined}
        data-rich-text-block={listType}
      >
        {listBlocks.map((listBlock) => (
          <li key={listBlock.id} style={{ textAlign: listBlock.align }}>
            {listBlock.children.map((node, childIndex) => (
              <InlineNode key={`${listBlock.id}-${childIndex}`} node={node} />
            ))}
          </li>
        ))}
      </ListRoot>,
    );
  }

  return <Root className={className} data-rich-text-document="v1">{children}</Root>;
};

export default RichTextRenderer;
