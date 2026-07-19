export function normalizeWorksheetMath(text: string, wrapForWord = false): string {
    if (!text) return '';
    let processed = text;

    if (wrapForWord) {
        processed = processed
            .replace(/\\\((.*?)\\\)/g, '$$$1$$')
            .replace(/\\\[(.*?)\\\]/g, '$$$1$$');

        const mathPattern = /(?<![\d$])(\d+[\d\/\s+×÷=\-<>*]*[+×÷=\/<>*][\d\/\s+×÷=\-<>*]*\d+)(?!\$)/g;
        processed = processed.replace(mathPattern, match => {
            let math = match.replace(/(\d+)\/(\d+)/g, '\\frac{$1}{$2}');
            math = math.replace(/×/g, '\\times').replace(/÷/g, '\\div');
            return `$$${math}$$`;
        });
        processed = processed.replace(/(?<![\d/$])(\d+)\/(\d+)(?![\d/$])/g, '$$\\frac{$1}{$2}$$');
        return processed.trim();
    }

    return processed
        .replace(/\$\$(.*?)\$\$/gs, '$1')
        .replace(/\$(.*?)\$/g, '$1')
        .replace(/\\\((.*?)\\\)/g, '$1')
        .replace(/\\\[(.*?)\\\]/g, '$1')
        .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2')
        .replace(/\\times/g, '×')
        .replace(/\\div/g, '÷')
        .replace(/\\pm/g, '±')
        .replace(/\\sqrt\{([^}]*)\}/g, '√$1')
        .replace(/\\\\/g, ' ')
        .trim();
}
