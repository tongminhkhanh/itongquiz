import React from 'react';
import { MathJax } from 'better-react-mathjax';
import { formatHtmlText } from '../../../../../utils/formatters';

interface MathSpanProps {
    content: any;
    className?: string;
}

/**
 * MathSpan: Component to render math content without React DOM reconciliation conflicts.
 * Supports LaTeX via MathJax and safe HTML tags (u, b, i).
 */
const MathSpan: React.FC<MathSpanProps> = React.memo(({ content, className }) => {
    if (content === null || content === undefined) return null;
    
    // Ensure content is processed through our math/html formatters
    const htmlContent = formatHtmlText(content);
    
    return (
        <span className={className} style={{ whiteSpace: 'pre-line' }}>
            <MathJax inline dynamic>
                <span dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </MathJax>
        </span>
    );
});

export default MathSpan;
