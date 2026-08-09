import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Italic, List, ListOrdered, Underline } from 'lucide-react';
import {
  createRichTextBlock,
  createRichTextDocument,
  normalizeRichTextDocument,
  richTextToPlainText,
} from './richTextDocument';
import type { RichTextAlign, RichTextBlock, RichTextDocumentV1, RichTextInlineNode } from './richText.types';
import { useMathComposerField } from '../manual-quiz-workspace/math-composer/useMathComposer';

interface RichTextEditorProps {
  value?: RichTextDocumentV1 | string | null;
  fallbackText?: string;
  onChange: (document: RichTextDocumentV1, plainText: string) => void;
  placeholder?: string;
  className?: string;
}

const escapeHtml = (value: string): string => value
  .replace(/&/gu, '&amp;')
  .replace(/</gu, '&lt;')
  .replace(/>/gu, '&gt;')
  .replace(/"/gu, '&quot;');

const inlineToHtml = (node: RichTextInlineNode): string => {
  if (node.type === 'lineBreak') return '<br />';
  const text = escapeHtml(node.type === 'math' ? `$${node.latex}$` : node.text);
  if (node.type === 'math') return text;
  let html = text;
  if (node.bold) html = `<strong>${html}</strong>`;
  if (node.italic) html = `<em>${html}</em>`;
  if (node.underline) html = `<u>${html}</u>`;
  if (node.strike) html = `<s>${html}</s>`;
  if (node.color) html = `<span data-rich-color="${escapeHtml(node.color)}" style="color:${escapeHtml(node.color)}">${html}</span>`;
  if (node.highlight) html = `<span data-rich-highlight="${escapeHtml(node.highlight)}" style="background-color:${escapeHtml(node.highlight)}">${html}</span>`;
  return html;
};

const blockToHtml = (block: RichTextBlock): string => block.children.map(inlineToHtml).join('');

type InlineMarks = Pick<RichTextInlineNode & {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  highlight?: string;
}, 'bold' | 'italic' | 'underline' | 'strike' | 'color' | 'highlight'>;

const marksFromElement = (element: HTMLElement, inherited: InlineMarks): InlineMarks => ({
  bold: inherited.bold || element.tagName === 'B' || element.tagName === 'STRONG',
  italic: inherited.italic || element.tagName === 'I' || element.tagName === 'EM',
  underline: inherited.underline || element.tagName === 'U',
  strike: inherited.strike || element.tagName === 'S' || element.tagName === 'STRIKE' || element.tagName === 'DEL',
  color: element.dataset.richColor || inherited.color,
  highlight: element.dataset.richHighlight || inherited.highlight,
});

const parseInlineNodes = (root: Node, inherited: InlineMarks = {}): RichTextInlineNode[] => {
  const result: RichTextInlineNode[] = [];
  root.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      if (text) result.push({ type: 'text', text, ...inherited });
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.tagName === 'BR') {
      result.push({ type: 'lineBreak' });
      return;
    }
    result.push(...parseInlineNodes(node, marksFromElement(node, inherited)));
  });
  return result;
};

const compactNodes = (nodes: RichTextInlineNode[]): RichTextInlineNode[] => {
  const result: RichTextInlineNode[] = [];
  nodes.forEach((node) => {
    const previous = result[result.length - 1];
    if (node.type === 'text' && previous?.type === 'text'
      && Boolean(node.bold) === Boolean(previous.bold)
      && Boolean(node.italic) === Boolean(previous.italic)
      && Boolean(node.underline) === Boolean(previous.underline)
      && Boolean(node.strike) === Boolean(previous.strike)
      && node.color === previous.color
      && node.highlight === previous.highlight) {
      previous.text += node.text;
    } else result.push(node);
  });
  return result.length ? result : [{ type: 'text', text: '' }];
};

const parseBlock = (element: HTMLElement, current: RichTextBlock): RichTextBlock => ({
  ...current,
  children: compactNodes(parseInlineNodes(element)),
});

const ToolbarButton: React.FC<{
  label: string;
  onMouseDown: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}> = ({ label, onMouseDown, children }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onMouseDown={onMouseDown}
    className="grid h-8 w-8 place-items-center rounded-md text-slate-600 hover:bg-sky-50 hover:text-sky-700"
  >
    {children}
  </button>
);

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  fallbackText = '',
  onChange,
  placeholder = 'Nhập nội dung câu hỏi…',
  className = '',
}) => {
  const initial = useMemo(() => normalizeRichTextDocument(value, fallbackText), [value, fallbackText]);
  const [document, setDocument] = useState<RichTextDocumentV1>(initial);
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const mathFieldRef = useRef<HTMLTextAreaElement>(null);
  const activeBlockId = useRef<string>(initial.blocks[0]?.id ?? '');

  useEffect(() => setDocument(initial), [initial]);

  const emit = (next: RichTextDocumentV1) => {
    setDocument(next);
    onChange(next, richTextToPlainText(next));
  };

  const updateMathValue = (nextValue: string) => {
    const activeId = activeBlockId.current;
    emit({
      ...document,
      blocks: document.blocks.map((block) => block.id === activeId
        ? { ...block, children: [{ type: 'text', text: nextValue }] }
        : block),
    });
  };
  const composerField = useMathComposerField(mathFieldRef, updateMathValue, 'Nội dung câu hỏi');

  const updateBlock = (id: string, updater: (block: RichTextBlock) => RichTextBlock) => {
    emit({ ...document, blocks: document.blocks.map((block) => block.id === id ? updater(block) : block) });
  };

  const command = (name: string, valueArg?: string) => {
    const element = blockRefs.current[activeBlockId.current];
    element?.focus();
    globalThis.document.execCommand(name, false, valueArg);
    if (element) updateBlock(activeBlockId.current, (block) => parseBlock(element, block));
  };

  const setAlignment = (align: RichTextAlign) => updateBlock(activeBlockId.current, (block) => ({ ...block, align }));
  const setList = (type: 'paragraph' | 'bulletList' | 'orderedList') => updateBlock(activeBlockId.current, (block) => ({ ...block, type }));

  const handleInput = (id: string, element: HTMLDivElement, plainTextOverride?: string) => {
    activeBlockId.current = id;
    updateBlock(id, (block) => plainTextOverride !== undefined
      ? { ...block, children: [{ type: 'text', text: plainTextOverride }] }
      : parseBlock(element, block));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, index: number) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    const current = document.blocks[index];
    const nextBlock = createRichTextBlock('', current.type, current.align);
    const next = {
      ...document,
      blocks: [...document.blocks.slice(0, index + 1), nextBlock, ...document.blocks.slice(index + 1)],
    };
    emit(next);
    window.setTimeout(() => blockRefs.current[nextBlock.id]?.focus(), 0);
  };

  const toolbarEvent = (callback: () => void) => (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    callback();
  };

  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}>
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 bg-slate-50 px-2 py-1" role="toolbar" aria-label="Định dạng nội dung câu hỏi">
        <ToolbarButton label="Đậm" onMouseDown={toolbarEvent(() => command('bold'))}><Bold className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton label="Nghiêng" onMouseDown={toolbarEvent(() => command('italic'))}><Italic className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton label="Gạch chân" onMouseDown={toolbarEvent(() => command('underline'))}><Underline className="h-4 w-4" /></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <ToolbarButton label="Căn trái" onMouseDown={toolbarEvent(() => setAlignment('left'))}><AlignLeft className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton label="Căn giữa" onMouseDown={toolbarEvent(() => setAlignment('center'))}><AlignCenter className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton label="Căn phải" onMouseDown={toolbarEvent(() => setAlignment('right'))}><AlignRight className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton label="Căn đều" onMouseDown={toolbarEvent(() => setAlignment('justify'))}><AlignJustify className="h-4 w-4" /></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <ToolbarButton label="Danh sách chấm" onMouseDown={toolbarEvent(() => setList('bulletList'))}><List className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton label="Danh sách số" onMouseDown={toolbarEvent(() => setList('orderedList'))}><ListOrdered className="h-4 w-4" /></ToolbarButton>
        <button
          type="button"
          onMouseDown={toolbarEvent(() => {
            const latex = window.prompt('Nhập công thức LaTeX (không cần dấu $):', 'x^2');
            if (latex?.trim()) command('insertText', `$${latex.trim()}$`);
          })}
          className="ml-1 rounded-md px-2 text-xs font-semibold text-sky-700 hover:bg-sky-50"
          aria-label="Chèn công thức"
        >ƒ(x)</button>
      </div>
      <div className="space-y-1 p-3">
        {document.blocks.map((block, index) => (
          <div
            key={block.id}
            ref={(element) => { blockRefs.current[block.id] = element; }}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label={placeholder}
            data-placeholder={index === 0 && !richTextToPlainText(document).trim() ? placeholder : undefined}
            onFocus={() => { activeBlockId.current = block.id; composerField.activate(); }}
            onInput={(event) => handleInput(block.id, event.currentTarget)}
            onChange={(event) => {
              const target = event.currentTarget as HTMLDivElement & { value?: string };
              handleInput(block.id, target, typeof target.value === 'string' ? target.value : undefined);
            }}
            onKeyDown={(event) => handleKeyDown(event, index)}
            dangerouslySetInnerHTML={{ __html: blockToHtml(block) }}
            className="min-h-8 rounded-md px-2 py-1 outline-none focus:bg-sky-50/50 empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]"
            style={{ textAlign: block.align }}
          />
        ))}
      </div>
      <textarea
        ref={mathFieldRef}
        value={richTextToPlainText(document)}
        onChange={(event) => updateMathValue(event.target.value)}
        placeholder={placeholder}
        aria-hidden="true"
        tabIndex={-1}
        className="sr-only"
      />
    </div>
  );
};

export default RichTextEditor;
