import React, { useEffect, useRef } from 'react';
import { renderMathJax } from '../../../hooks/useMathJax';

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

    useEffect(() => {
        if (!containerRef.current) return;
        // `renderMathJax` handles: loading MathJax if not present,
        // awaiting startup.promise, and then calling typesetPromise.
        renderMathJax(containerRef.current);
    }, [content]);

    return (
        <div
            ref={containerRef}
            className={`math-content ${className} mathjax-skeleton`}
            dangerouslySetInnerHTML={{ __html: content }}
        />
    );
};

export default MathContent;
