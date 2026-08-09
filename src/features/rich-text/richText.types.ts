/** A small, serialisable rich-text contract shared by editor, API and renderers. */
export type RichTextAlign = 'left' | 'center' | 'right' | 'justify';
export type RichTextBlockType = 'paragraph' | 'bulletList' | 'orderedList';

export interface RichTextTextNode {
  type: 'text';
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  highlight?: string;
}

export interface RichTextMathNode {
  type: 'math';
  latex: string;
}

export interface RichTextLineBreakNode {
  type: 'lineBreak';
}

export type RichTextInlineNode = RichTextTextNode | RichTextMathNode | RichTextLineBreakNode;

export interface RichTextBlock {
  id: string;
  type: RichTextBlockType;
  align: RichTextAlign;
  children: RichTextInlineNode[];
  /** Starting number imported from an ordered-list contract. */
  listStart?: number;
}

export interface RichTextDocumentV1 {
  version: 1;
  blocks: RichTextBlock[];
}
