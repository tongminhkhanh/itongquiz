/**
 * MathJax Integration Hook
 * 
 * Custom hook to trigger MathJax rendering when content changes.
 * Uses MathJax.typesetPromise() to render LaTeX formulas in specified elements.
 */
import { useEffect, useRef, useCallback } from 'react';

// Extend Window interface to include MathJax
declare global {
    interface Window {
        MathJax?: {
            typesetPromise: (elements?: (HTMLElement | null)[] | null) => Promise<void>;
            startup?: {
                promise: Promise<void>;
            };
        };
    }
}

/**
 * Hook to automatically render MathJax in a container when dependencies change.
 * 
 * @param dependencies - Array of values that trigger re-render when changed
 * @returns ref - Ref to attach to the container element
 * 
 * @example
 * const mathRef = useMathJax([question.text]);
 * return <div ref={mathRef}>{question.text}</div>;
 */
export const useMathJax = <T extends HTMLElement = HTMLDivElement>(
    dependencies: any[] = []
): React.RefObject<T | null> => {
    const containerRef = useRef<T | null>(null);

    useEffect(() => {
        const renderMath = async () => {
            if (!containerRef.current || !window.MathJax) return;

            try {
                // Wait for MathJax to be ready
                if (window.MathJax.startup?.promise) {
                    await window.MathJax.startup.promise;
                }

                // Typeset the container
                await window.MathJax.typesetPromise([containerRef.current]);
            } catch (error) {
                console.warn('[MathJax] Render error:', error);
            }
        };

        // Small delay to ensure DOM is updated
        const timeoutId = setTimeout(renderMath, 50);

        return () => clearTimeout(timeoutId);
    }, dependencies);

    return containerRef;
};

/**
 * Function to manually trigger MathJax rendering on a specific element.
 * Useful for dynamic content or after API responses.
 * 
 * @param element - HTMLElement to render math in (optional - renders whole page if not provided)
 * @returns Promise that resolves when rendering is complete
 * 
 * @example
 * await renderMathJax(document.getElementById('answer-container'));
 */
export const renderMathJax = async (element?: HTMLElement | null): Promise<void> => {
    if (!window.MathJax) {
        console.warn('[MathJax] Not loaded yet');
        return;
    }

    try {
        // Wait for MathJax to be ready
        if (window.MathJax.startup?.promise) {
            await window.MathJax.startup.promise;
        }

        // Typeset
        if (element) {
            await window.MathJax.typesetPromise([element]);
        } else {
            await window.MathJax.typesetPromise(null);
        }
    } catch (error) {
        console.warn('[MathJax] Render error:', error);
    }
};

/**
 * Hook that provides a callback to manually trigger MathJax rendering.
 * Useful when you need to control when rendering happens.
 * 
 * @returns Object with ref and render function
 * 
 * @example
 * const { ref, render } = useMathJaxManual();
 * const handleDataLoad = async (data) => {
 *   setContent(data);
 *   await render();
 * };
 */
export const useMathJaxManual = <T extends HTMLElement = HTMLDivElement>() => {
    const containerRef = useRef<T | null>(null);

    const render = useCallback(async () => {
        if (!containerRef.current) return;
        await renderMathJax(containerRef.current);
    }, []);

    return { ref: containerRef, render };
};

export default useMathJax;
