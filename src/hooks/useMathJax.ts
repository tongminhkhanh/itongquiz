/**
 * MathJax & TikZJax Integration Hook (Lazy Loading v4)
 * 
 * Custom hook to trigger MathJax/TikZJax rendering when content changes.
 * Automatically loads required scripts if they are not already present.
 */
import { useEffect, useRef, useCallback } from 'react';

// Extend Window interface to include MathJax and TikZJax
declare global {
    interface Window {
        MathJax?: {
            typesetPromise: (elements?: (HTMLElement | null)[] | null) => Promise<void>;
            startup?: {
                promise: Promise<void>;
            };
        };
        tikzjax?: boolean;
    }
}

/**
 * Ensures MathJax is loaded and configured.
 * Moves configuration from index.html to here for better control.
 */
const ensureMathJaxLoaded = (): Promise<void> => {
    return new Promise((resolve) => {
        if (window.MathJax) {
            resolve();
            return;
        }

        // Configure MathJax
        window.MathJax = {
            tex: {
                inlineMath: [['$', '$'], ['\\(', '\\)']],
                displayMath: [['$$', '$$'], ['\\[', '\\]']],
                processEscapes: true
            },
            options: {
                ignoreHtmlClass: 'tex2jax_ignore',
                processHtmlClass: 'tex2jax_process'
            },
            startup: {
                typeset: false
            }
        };

        // Create script tag
        const script = document.createElement('script');
        script.id = 'MathJax-script';
        script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
        script.async = true;

        script.onload = () => {
            if (window.MathJax?.startup?.promise) {
                window.MathJax.startup.promise.then(() => resolve());
            } else {
                resolve();
            }
        };

        document.head.appendChild(script);
    });
};

/**
 * Ensures TikZJax is loaded.
 */
const ensureTikZJaxLoaded = (): Promise<void> => {
    return new Promise((resolve) => {
        if (window.tikzjax || document.getElementById('tikzjax-script')) {
            resolve();
            return;
        }

        // TikZJax requires fonts.css
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = 'https://tikzjax.com/v1/fonts.css';
        document.head.appendChild(link);

        // Create script tag
        const script = document.createElement('script');
        script.id = 'tikzjax-script';
        script.src = 'https://tikzjax.com/v1/tikzjax.js';
        script.async = true;

        script.onload = () => {
            window.tikzjax = true;
            resolve();
        };

        document.head.appendChild(script);
    });
};

/**
 * Hook to automatically render MathJax in a container when dependencies change.
 * Now supports lazy loading.
 */
export const useMathJax = <T extends HTMLElement = HTMLDivElement>(
    dependencies: any[] = []
): React.RefObject<T | null> => {
    const containerRef = useRef<T | null>(null);

    useEffect(() => {
        const renderMath = async () => {
            if (!containerRef.current) return;

            // Ensure loaded
            await ensureMathJaxLoaded();

            if (!window.MathJax) return;

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
 */
export const renderMathJax = async (element?: HTMLElement | null): Promise<void> => {
    // Ensure MathJax is loaded
    await ensureMathJaxLoaded();

    if (!window.MathJax) {
        console.warn('[MathJax] Failed to load');
        return;
    }

    try {
        // Wait for MathJax startup to complete
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
 * Hook to handle TikZJax initialization.
 */
export const useTikZJax = () => {
    useEffect(() => {
        ensureTikZJaxLoaded();
    }, []);
};

/**
 * Hook that provides a callback to manually trigger MathJax rendering.
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

