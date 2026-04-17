import React from 'react';
import { MathJax } from 'better-react-mathjax';
import { formatMathText } from '../../utils/formatters';

/**
 * MathSpan: Component to render math content seamlessly with better-react-mathjax.
 * This component:
 * 1. Wraps content with <MathJax>
 * 2. Pre-processes text with formatMathText to fix AI output
 */
const MathSpan: React.FC<{ content: string; className?: string }> = React.memo(({ content, className }) => {
    return (
        <span className={className} style={{ whiteSpace: 'pre-line' }}>
            <MathJax>{formatMathText(content)}</MathJax>
        </span>
    );
});

export default MathSpan;

