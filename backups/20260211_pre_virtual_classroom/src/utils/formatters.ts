/**
 * Text Formatting Utilities
 * 
 * Shared formatters for displaying text in the quiz app.
 * Follows Single Responsibility Principle - only handles text formatting.
 */

/**
 * Sanitize malformed LaTeX from AI output.
 * Strategy: Parse text into segments (inside/outside $), fix each appropriately.
 * 
 * @param text - Raw text from AI
 * @returns Text with properly sanitized LaTeX
 */
export const sanitizeLatex = (text: string): string => {
    if (!text) return text;

    let result = text;

    // Step 1: Normalize double backslashes (from JSON) to single
    result = result.replace(/\\\\frac/g, '\\frac');
    result = result.replace(/\\\\times/g, '\\times');
    result = result.replace(/\\\\div/g, '\\div');
    result = result.replace(/\\\\sqrt/g, '\\sqrt');
    result = result.replace(/\\\\cdot/g, '\\cdot');

    // Step 2: Fix mismatched delimiters $...$$ -> $...$
    // Do this BEFORE splitting to avoid confusion
    // Match: one $ + content + two $$, convert to $content$
    result = result.replace(/\$([^$]+)\$\$/g, (_, content) => `$${content}$`);
    // Match: two $$ + content + one $, convert to $content$
    result = result.replace(/\$\$([^$]+)\$/g, (_, content) => `$${content}$`);

    // Step 3: Split by $ to identify inside/outside segments
    const dollarSplit = result.split('$');

    // Rebuild: odd indexes (1, 3, 5...) are inside $...$
    const rebuiltParts: string[] = [];

    for (let i = 0; i < dollarSplit.length; i++) {
        let segment = dollarSplit[i];

        if (i % 2 === 0) {
            // OUTSIDE $ - convert LaTeX and math symbols
            segment = segment.replace(/\\times/g, 'x');
            segment = segment.replace(/\*/g, ' x ');  // * -> x
            segment = segment.replace(/\\div/g, ':');
            segment = segment.replace(/\\cdot/g, '·');

            // Handle \frac{a}{b} outside $ - wrap with $
            segment = segment.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$\\frac{$1}{$2}$');

            rebuiltParts.push(segment);
        } else {
            // INSIDE $ - keep as is, wrap with $
            rebuiltParts.push('$' + segment + '$');
        }
    }

    result = rebuiltParts.join('');

    // Step 4: Clean up artifacts
    // Remove empty $$ (created when two $ are adjacent with nothing between)
    // But preserve valid display math $$...$$
    result = result.replace(/\$\s*\$/g, '');  // Only remove $$ with optional whitespace between

    // Clean up multiple spaces
    result = result.replace(/\s+/g, ' ');

    return result.trim();
};

export const formatMathText = (text: string | any): string => {
    // Handle non-string inputs: undefined, null, arrays, objects
    if (text === null || text === undefined) return "";
    if (typeof text !== 'string') {
        // If it's an array (like correctAnswers), join with comma
        if (Array.isArray(text)) {
            return text.join(', ');
        }
        // Convert other types to string
        return String(text);
    }
    if (!text) return "";

    // First, sanitize malformed LaTeX from AI
    let sanitized = sanitizeLatex(text);

    // Strategy: Split text into LaTeX and non-LaTeX parts
    // Process ONLY non-LaTeX parts, preserve LaTeX for MathJax

    // Match LaTeX patterns: $...$ (inline) and $$...$$ (block)
    // Also match \(...\) and \[...\]
    const latexPattern = /(\$\$[\s\S]*?\$\$|\$[^$]+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g;

    const parts = sanitized.split(latexPattern);

    const processedParts = parts.map(part => {
        // If this part is a LaTeX expression, preserve it exactly
        if (/^\$\$[\s\S]*\$\$$|^\$[^$]+\$$|^\\\([\s\S]*\\\)$|^\\\[[\s\S]*\\\]$/.test(part)) {
            return part;
        }

        // Process non-LaTeX text
        let result = part;

        // Fix broken LaTeX (missing backslash) - convert to proper LaTeX
        // "frac12" -> "$\\frac{1}{2}$"
        result = result.replace(/\bfrac(\d)(\d+)\b/g, '$\\frac{$1}{$2}$');
        // "frac{1}{2}" -> "$\\frac{1}{2}$"
        result = result.replace(/\bfrac\{([^}]+)\}\{([^}]+)\}/g, '$\\frac{$1}{$2}$');

        // Fix broken math operators (when backslash is stripped)
        result = result.replace(/(\d+)\s*imes\s*(\d+)/gi, '$1 x $2');
        result = result.replace(/\bimes\b/gi, 'x');
        result = result.replace(/(\d+)\s*times\s*(\d+)/gi, '$1 x $2');
        result = result.replace(/(\d+)\s*div\s*(\d+)/gi, '$1 : $2');
        result = result.replace(/(\d+)\s*cdot\s*(\d+)/gi, '$1 · $2');

        // Replace * with × when between numbers/words (outside LaTeX)
        result = result.replace(/([a-zA-Z0-9?]+)\s*\*\s*([a-zA-Z0-9?]+)/g, '$1 x $2');

        // Replace / with : when surrounded by spaces (division, not fraction)
        result = result.replace(/([a-zA-Z0-9?]+)\s+\/\s+([a-zA-Z0-9?]+)/g, '$1 : $2');

        return result;
    });

    let result = processedParts.join('');

    // Clean up: remove literal \n and collapse spaces (but preserve LaTeX)
    result = result.replace(/\\n/g, ' ');
    result = result.replace(/\n/g, ' ');

    // Collapse multiple spaces (outside LaTeX - simple approach)
    result = result.replace(/  +/g, ' ');

    return result.trim();
};

/**
 * @deprecated Use formatMathText instead. Kept for backward compatibility.
 */
export const formatText = formatMathText;

/**
 * Format date to Vietnamese locale string
 * 
 * @param date - Date object or string
 * @returns Formatted date string (e.g., "25/12/2025 10:30")
 */
export const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

/**
 * Format score for display
 * 
 * @param score - Score value (0-10)
 * @param maxScore - Maximum score (default 10)
 * @returns Formatted score string (e.g., "8/10")
 */
export const formatScore = (score: number, maxScore: number = 10): string => {
    return `${score}/${maxScore}`;
};

/**
 * Format time duration from seconds
 * 
 * @param seconds - Duration in seconds
 * @returns Formatted time string (e.g., "05:30")
 */
export const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format percentage
 * 
 * @param value - Numerator
 * @param total - Denominator
 * @param decimals - Number of decimal places (default 0)
 * @returns Formatted percentage string (e.g., "75%")
 */
export const formatPercentage = (value: number, total: number, decimals: number = 0): string => {
    if (total === 0) return '0%';
    const percent = (value / total) * 100;
    return `${percent.toFixed(decimals)}%`;
};

/**
 * Format text with safe HTML rendering for IOE questions
 * Allows only specific safe tags like <u> for underline (used in phonetics questions)
 * 
 * @param text - Raw text that may contain HTML tags like <u>
 * @returns Sanitized HTML string safe to use with dangerouslySetInnerHTML
 */
export const formatHtmlText = (text: string | any): string => {
    if (text === null || text === undefined) return "";
    if (typeof text !== 'string') {
        if (Array.isArray(text)) {
            return text.join(', ');
        }
        return String(text);
    }
    if (!text) return "";

    // First apply math formatting
    let result = formatMathText(text);

    // Already contains HTML tags - no escaping needed for allowed tags
    // Only allow: <u>, </u>, <b>, </b>, <i>, </i>, <em>, </em>, <strong>, </strong>
    // All other tags should be escaped

    // Escape all HTML first
    result = result
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    // Now restore only allowed safe tags
    const allowedTags = ['u', 'b', 'i', 'em', 'strong'];
    allowedTags.forEach(tag => {
        // Opening tag: &lt;u&gt; -> <u>
        const openPattern = new RegExp(`&lt;${tag}&gt;`, 'gi');
        result = result.replace(openPattern, `<${tag}>`);
        // Closing tag: &lt;/u&gt; -> </u>
        const closePattern = new RegExp(`&lt;/${tag}&gt;`, 'gi');
        result = result.replace(closePattern, `</${tag}>`);
    });

    // Convert underscore patterns to underline for IOE phonetics questions
    // Pattern 1: _text_ -> <u>text</u> (e.g., "_o_" -> "<u>o</u>")
    result = result.replace(/_([^_\s]+)_/g, '<u>$1</u>');

    // Pattern 2: letter_X_letter pattern (e.g., "h_o_t" means 'o' is underlined)
    // Match: word_char + underscore + single letter/group + underscore + word_char
    // Convert the middle part to underlined
    result = result.replace(/([a-zA-Z])_([a-zA-Z]+)_([a-zA-Z])/g, '$1<u>$2</u>$3');

    return result;
};
