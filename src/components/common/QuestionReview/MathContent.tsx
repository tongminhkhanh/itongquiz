import React, { useEffect, useMemo, useRef } from 'react';
import { renderMathJax } from '../../../hooks/useMathJax';
import { formatMathText } from '../../../utils/formatters';

interface MathContentProps {
    content: string;
    className?: string;
}

/**
 * Component to safely render text with MathJax formulas.
 * Uses the shared `renderMathJax` utility which handles lazy loading of MathJax
 * and waits for `startup.promise`, ensuring correct rendering even when MathJax
 * is not yet loaded (e.g. when this component mounts inside a modal).
 */
const MathContent: React.FC<MathContentProps> = ({ content, className = '' }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const formattedContent = useMemo(() => formatMathText(content), [content]);

    useEffect(() => {
        if (!containerRef.current) return;
        // `renderMathJax` handles: loading MathJax if not present,
        // awaiting startup.promise, and then calling typesetPromise.
        renderMathJax(containerRef.current);
    }, [formattedContent]);

    return (
        <div
            ref={containerRef}
            className={`math-content ${className} mathjax-skeleton`}
            dangerouslySetInnerHTML={{ __html: formattedContent }}
        />
    );
};

export default MathContent;
