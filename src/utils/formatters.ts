/**
 * Text Formatting Utilities
 * 
 * Shared formatters for displaying text in the quiz app.
 * Follows Single Responsibility Principle - only handles text formatting.
 */

/**
 * Format math text for display.
 * - Replaces multiplication (*) with × symbol
 * - Replaces division (/) with ÷ symbol when surrounded by spaces
 * - Keeps fractions (1/2) intact
 * 
 * @param text - The text to format
 * @returns Formatted text string
 * 
 * @example
 * formatMathText("5 * 7") // "5 x 7"
 * formatMathText("5 / 7") // "5 : 7"
 * formatMathText("1/2") // "1/2" (unchanged)
 */
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

    let result = text;

    // 1. Fix mixed delimiters like $\( ... )$ or $\( ... )
    result = result.replace(/\$\\\(/g, '$'); // Replace $\( with $
    result = result.replace(/\\\)\$/g, '$'); // Replace )$ with $

    // 2. Normalize LaTeX delimiters
    // Replace \( ... \) with $ ... $
    result = result.replace(/\\\((.*?)\\\)/g, '$$$1$$');
    // Replace \[ ... \] with $$ ... $$
    result = result.replace(/\\\[(.*?)\\\]/g, '$$$$$1$$$$');

    // 3. Fix common LaTeX rendering errors (backslash gets stripped or missing)
    // Fix "imes" (from \times)
    result = result.replace(/(\d+)\s*imes\s*(\d+)/gi, '$1 × $2');
    result = result.replace(/imes/gi, '×');

    // Fix "times" standalone 
    result = result.replace(/(\d+)\s*times\s*(\d+)/gi, '$1 × $2');

    // Fix "div" (from \div)
    result = result.replace(/(\d+)\s*div\s*(\d+)/gi, '$1 ÷ $2');

    // Fix "cdot" (from \cdot)
    result = result.replace(/(\d+)\s*cdot\s*(\d+)/gi, '$1 · $2');

    // Fix "pm" (from \pm - plus minus)
    result = result.replace(/pm/g, '±');

    // Fix "leq" and "geq" (from \leq, \geq)
    result = result.replace(/leq/g, '≤');
    result = result.replace(/geq/g, '≥');

    // Fix "neq" (from \neq - not equal)
    result = result.replace(/neq/g, '≠');

    // Fix "sqrt" (from \sqrt) - basic case
    result = result.replace(/sqrt\{([^}]+)\}/g, '√($1)');
    result = result.replace(/sqrt(\d+)/g, '√$1');

    // Fix "frac" (from \frac) - convert to readable format if not in math mode
    // Note: If inside $...$, MathJax handles it. But sometimes it's outside.
    // We'll leave \frac for MathJax if it looks like valid LaTeX, but fix broken ones if needed.

    // 4. Normalize block math to inline math to force single line
    // Replace $$ ... $$ with $ ... $
    result = result.replace(/\$\$([^$]+)\$\$/g, '$$$1$$');
    // Replace \[ ... \] with $ ... $
    result = result.replace(/\\\[(.*?)\\\]/g, '$$$1$$');

    // 5. Standard formatting (newlines, * to x, / to :)
    result = result
        .replace(/\\n/g, ' ') // Replace literal \n
        .replace(/\n/g, ' ')  // Replace actual newlines
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .replace(/([a-zA-Z0-9?]+)\s*\*\s*([a-zA-Z0-9?]+)/g, '$1 x $2')
        .replace(/([a-zA-Z0-9?]+)\s+\/\s+([a-zA-Z0-9?]+)/g, '$1 : $2');

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
