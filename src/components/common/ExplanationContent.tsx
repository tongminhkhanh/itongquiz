import React, { useRef } from 'react';
import { renderMathJax } from '../../hooks/useMathJax';

/**
 * ExplanationContent: Component để render nội dung giải thích từ AI
 * 
 * Xử lý:
 * - Markdown syntax (###, **, *)
 * - Line breaks (\n) thành bullet points hoặc paragraphs
 * - Công thức toán học (phân số, phép tính)
 * - Emoji và ký tự đặc biệt
 */

interface ExplanationContentProps {
    content: string;
    className?: string;
}

/**
 * Format AI explanation text thành HTML đẹp
 * - Loại bỏ Markdown headers (###, ##, #)
 * - Convert số thứ tự thành bullet points đẹp
 * - Format công thức toán (phân số)
 * - Giữ line breaks thành paragraphs
 */
const formatExplanationHtml = (text: string): string => {
    if (!text) return '';

    let result = text;

    // Step 1: Xử lý phân số dạng a/b thành LaTeX
    // Chỉ convert khi có số/số (ví dụ: 1/2, 3/5, 7/10)
    result = result.replace(/(\d+)\/(\d+)/g, (_, numerator, denominator) => {
        return `$\\frac{${numerator}}{${denominator}}$`;
    });

    // Step 2: Loại bỏ Markdown headers (###, ##, #) 
    // Thay bằng text thường hoặc bold
    result = result.replace(/^#{1,6}\s*/gm, '');

    // Step 3: Convert **bold** thành <strong>
    result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Step 4: Convert *italic* thành <em>
    result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Step 5: Clean up "x x" artifacts (từ escape sequences)
    result = result.replace(/\s*x\s*x\s*/g, '\n\n');

    // Step 6: Xử lý line breaks thành bullet points
    // Split by line, trim, filter empty
    const lines = result.split(/\n+/).map(line => line.trim()).filter(Boolean);

    if (lines.length <= 1) {
        // Single line - return as is
        return result.trim();
    }

    // Multiple lines - format as list or paragraphs
    const formattedLines = lines.map((line, index) => {
        // Check if line starts with number (1., 2., 3.) - convert to bullet
        if (/^\d+\.\s*/.test(line)) {
            const content = line.replace(/^\d+\.\s*/, '');
            return `<div class="explanation-item">
                <span class="item-bullet">${index + 1}.</span>
                <span class="item-content">${content}</span>
            </div>`;
        }

        // Check if line starts with bullet (-, *, •)
        if (/^[-*•]\s*/.test(line)) {
            const content = line.replace(/^[-*•]\s*/, '');
            return `<div class="explanation-item">
                <span class="item-bullet">•</span>
                <span class="item-content">${content}</span>
            </div>`;
        }

        // Regular paragraph
        return `<p class="explanation-paragraph">${line}</p>`;
    });

    return formattedLines.join('');
};

/**
 * Sanitize LaTeX output từ AI
 */
const sanitizeLatex = (text: string): string => {
    if (!text) return text;

    let result = text;

    // Normalize double backslashes
    result = result.replace(/\\\\frac/g, '\\frac');
    result = result.replace(/\\\\times/g, '\\times');
    result = result.replace(/\\\\div/g, '\\div');

    // Fix mismatched delimiters
    result = result.replace(/\$([^$]+)\$\$/g, (_, content) => `$${content}$`);
    result = result.replace(/\$\$([^$]+)\$/g, (_, content) => `$${content}$`);

    // Clean empty $$
    result = result.replace(/\$\s*\$/g, '');

    return result;
};

const ExplanationContent: React.FC<ExplanationContentProps> = React.memo(({ content, className }) => {
    const ref = useRef<HTMLDivElement>(null);

    React.useLayoutEffect(() => {
        if (ref.current && content) {
            // Format content
            let html = formatExplanationHtml(content);
            html = sanitizeLatex(html);

            // Set HTML
            ref.current.innerHTML = html;

            // Render MathJax
            renderMathJax(ref.current);
        }
    }, [content]);

    return (
        <div
            ref={ref}
            className={`explanation-content ${className || ''}`}
        />
    );
});

export default ExplanationContent;
