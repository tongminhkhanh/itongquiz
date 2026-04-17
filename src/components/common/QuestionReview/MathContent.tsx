import React, { useMemo, useRef } from 'react';
import { MathJax } from 'better-react-mathjax';
import { formatMathText } from '../../../utils/formatters';
import { renderMathJax } from '../../../utils';

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

    React.useLayoutEffect(() => {
        if (!containerRef.current) return;

        // Set HTML first, then typeset. This avoids races in fast modal/tab mounts.
        containerRef.current.innerHTML = formattedContent;
        renderMathJax(containerRef.current);

        // Retry a couple times for lazy-loaded/late-mounted sections (teacher result modal).
        const t1 = setTimeout(() => {
            if (containerRef.current) renderMathJax(containerRef.current);
        }, 120);
        const t2 = setTimeout(() => {
            if (containerRef.current) renderMathJax(containerRef.current);
        }, 320);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [formattedContent]);

    return (
        <div
            ref={containerRef}
            className={`math-content ${className} mathjax-skeleton`}
            style={{ whiteSpace: 'pre-line' }}
        />
    );
};

export default MathContent;
