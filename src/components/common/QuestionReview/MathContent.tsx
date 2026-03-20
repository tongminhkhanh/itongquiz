import React, { useEffect, useRef } from 'react';

interface MathContentProps {
    content: string;
    className?: string;
}

/**
 * Component to safely render text with MathJax formulas
 */
const MathContent: React.FC<MathContentProps> = ({ content, className = '' }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let retryCount = 0;
        const maxRetries = 5;

        // Function to trigger MathJax typesetting with retry logic
        const renderMath = () => {
            if (window.MathJax && window.MathJax.typesetPromise) {
                window.MathJax.typesetPromise([containerRef.current]).catch((err) => {
                    console.error('MathJax rendering error:', err);
                });
            } else if (retryCount < maxRetries) {
                retryCount++;
                setTimeout(renderMath, 500); // Thử lại sau 500ms
            }
        };

        // Render initially
        renderMath();

        // MutationObserver to detect content changes
        const observer = new MutationObserver(renderMath);
        if (containerRef.current) {
            observer.observe(containerRef.current, { childList: true, subtree: true });
        }

        return () => observer.disconnect();
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
