/**
 * MathJax Utility Functions
 * Helper functions for rendering LaTeX math formulas using MathJax
 */

// Extend Window interface for MathJax
declare global {
    interface Window {
        MathJax?: {
            typeset: (elements?: HTMLElement[]) => Promise<void>;
            typesetPromise: (elements?: HTMLElement[]) => Promise<void>;
            startup: {
                promise: Promise<void>;
                defaultReady: () => void;
            };
            tex2svg: (input: string) => HTMLElement;
            tex2chtml: (input: string) => HTMLElement;
        };
    }
}

/**
 * Render all math formulas on the page or in specific elements
 * Supports LaTeX syntax: $...$ (inline), $$...$$ (block)
 * 
 * @param elements - Optional array of specific elements to process
 * @returns Promise that resolves when rendering is complete
 */
export const renderMath = async (elements?: HTMLElement[]): Promise<void> => {
    // Wait a bit for DOM to update
    await new Promise(resolve => setTimeout(resolve, 50));

    if (window.MathJax?.typesetPromise) {
        try {
            await window.MathJax.typesetPromise(elements);
            console.log('MathJax rendering complete');
        } catch (err) {
            console.warn('MathJax rendering error:', err);
        }
    } else if (window.MathJax?.typeset) {
        try {
            await window.MathJax.typeset(elements);
        } catch (err) {
            console.warn('MathJax typeset error:', err);
        }
    } else {
        console.log('MathJax not loaded yet, will render when ready');
    }
};

/**
 * Re-render math formulas after content changes
 * Useful when React updates the DOM
 */
export const refreshMath = (): void => {
    requestAnimationFrame(() => {
        renderMath();
    });
};

/**
 * Custom React hook-compatible function for triggering MathJax
 * Call this in useEffect after content updates
 */
export const useMathJax = (dependencies?: any[]): void => {
    // This is a simple trigger function
    // In React components, use it like:
    // useEffect(() => { useMathJax(); }, [content]);
    refreshMath();
};

/**
 * Check if MathJax is loaded and ready
 */
export const isMathJaxReady = (): boolean => {
    return !!window.MathJax?.typeset;
};

/**
 * Wait for MathJax to be fully loaded
 * @returns Promise that resolves when MathJax is ready
 */
export const waitForMathJax = async (): Promise<void> => {
    if (window.MathJax?.startup?.promise) {
        await window.MathJax.startup.promise;
    } else {
        // Polling fallback
        return new Promise((resolve) => {
            const check = () => {
                if (window.MathJax?.typeset) {
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }
};

export default { renderMath, refreshMath, useMathJax, isMathJaxReady, waitForMathJax };
