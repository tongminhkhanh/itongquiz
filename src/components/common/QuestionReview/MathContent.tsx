import React from 'react';
import MathSpan from '../MathSpan';
import RichTextRenderer from '../../../features/rich-text/RichTextRenderer';
import type { RichTextDocumentV1 } from '../../../features/rich-text/richText.types';

interface MathContentProps {
    content: string;
    richContent?: RichTextDocumentV1 | string | null;
    className?: string;
}

/** Result review uses the same renderer as player and teacher preview. */
const MathContent: React.FC<MathContentProps> = ({ content, richContent, className = '' }) => (
    richContent
        ? <RichTextRenderer value={richContent} fallbackText={content} className={`math-content ${className} mathjax-skeleton`} />
        : <MathSpan content={content} as="div" className={`math-content ${className} mathjax-skeleton`} />
);

export default MathContent;
