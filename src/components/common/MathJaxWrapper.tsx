import React, { useEffect, useRef } from 'react';

interface MathJaxWrapperProps {
    content: string;
    className?: string;
}

declare global {
    interface Window {
        MathJax: any;
    }
}

const MathJaxWrapper: React.FC<MathJaxWrapperProps> = ({ content, className = '' }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current && window.MathJax) {
            // Clear previous content
            containerRef.current.innerHTML = content;

            // Trigger MathJax typeset
            window.MathJax.typesetPromise([containerRef.current])
                .catch((err: any) => console.error('MathJax typeset failed:', err));
        }
    }, [content]);

    return (
        <span
            ref={containerRef}
            className={className}
            dangerouslySetInnerHTML={{ __html: content }}
        />
    );
};

export default MathJaxWrapper;
