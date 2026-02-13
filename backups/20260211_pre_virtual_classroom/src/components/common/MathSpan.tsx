import React, { useRef } from 'react';
import { renderMathJax } from '../../hooks/useMathJax';
import { formatMathText } from '../../utils/formatters';

/**
 * MathSpan: Component to render math content without React DOM reconciliation conflicts.
 * This component:
 * 1. Renders an empty span initially
 * 2. Sets innerHTML manually via useLayoutEffect (before paint)
 * 3. Triggers MathJax rendering
 * 4. React has no children to reconcile, so MathJax changes don't cause conflicts
 */
const MathSpan: React.FC<{ content: string; className?: string }> = React.memo(({ content, className }) => {
    const ref = useRef<HTMLSpanElement>(null);

    // Use useLayoutEffect to ensure content is set BEFORE browser paint
    React.useLayoutEffect(() => {
        if (ref.current) {
            ref.current.innerHTML = formatMathText(content);
            // Trigger MathJax after setting innerHTML
            renderMathJax(ref.current);
        }
    }, [content]);

    return <span ref={ref} className={className} />;
});

export default MathSpan;
