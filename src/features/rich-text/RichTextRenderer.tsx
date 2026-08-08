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

  const children = blocks.map((block) => {
    const blockClass = block.type === 'bulletList'
      ? 'list-disc pl-6'
      : block.type === 'orderedList'
        ? 'list-decimal pl-6'
        : '';
    return (
      <div
        key={block.id}
        className={blockClass}
        style={{ textAlign: block.align }}
        data-rich-text-block={block.type}
      >
        {block.children.map((node, index) => <InlineNode key={`${block.id}-${index}`} node={node} />)}
      </div>
    );
  });

  return <Root className={className} data-rich-text-document="v1">{children}</Root>;
};

export default RichTextRenderer;
