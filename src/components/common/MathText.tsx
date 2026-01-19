/**
 * MathText Component
 * Renders text with LaTeX math formulas using MathJax
 */
import React, { useEffect, useRef } from 'react';
import { formatMathText } from '../../utils/formatters';
import { renderMath } from '../../utils/mathJax';

interface MathTextProps {
    text: string;
    className?: string;
    as?: 'span' | 'div' | 'p';
}

/**
 * Component to render text with LaTeX math formulas.
 * Automatically triggers MathJax rendering after mount.
 * 
 * @example
 * <MathText text="frac12 + frac13" />
 * // Renders: ½ + ⅓ (with proper math formatting)
 */
const MathText: React.FC<MathTextProps> = ({ text, className = '', as = 'span' }) => {
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        if (ref.current) {
            renderMath([ref.current]);
        }
    }, [text]);

    if (!text) return null;

    const formatted = formatMathText(text);
    const Tag = as as keyof JSX.IntrinsicElements;

    return (
        <Tag
            ref={ref as any}
            className={className}
            dangerouslySetInnerHTML={{ __html: formatted }}
        />
    );
};

export default MathText;
