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

let mathJaxLoadPromise: Promise<void> | null = null;

const waitForMathJaxReady = (timeoutMs: number = 10000): Promise<void> => {
    return new Promise((resolve) => {
        const startedAt = Date.now();

        const check = () => {
            // MathJax fully initialized when runtime methods exist
            if (window.MathJax?.typesetPromise) {
                if (window.MathJax.startup?.promise) {
                    window.MathJax.startup.promise.then(() => resolve()).catch(() => resolve());
                } else {
                    resolve();
                }
                return;
            }

            if (Date.now() - startedAt >= timeoutMs) {
                resolve();
                return;
            }

            setTimeout(check, 50);
        };

        check();
    });
};

/**
 * Ensures MathJax is loaded and configured.
 * Moves configuration from index.html to here for better control.
 */
const ensureMathJaxLoaded = (): Promise<void> => {
    // Fully loaded
    if (window.MathJax?.typesetPromise) {
        return waitForMathJaxReady();
    }

    // Already loading
    if (mathJaxLoadPromise) {
        return mathJaxLoadPromise;
    }

    mathJaxLoadPromise = new Promise((resolve) => {
        // Configure MathJax
        if (!window.MathJax) {
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
        }

        const resolveWhenReady = () => {
            waitForMathJaxReady().then(() => resolve()).catch(() => resolve());
        };

        const existingScript = document.getElementById('MathJax-script') as HTMLScriptElement | null;
        if (existingScript) {
            // Script may already be loaded before listener is attached
            setTimeout(resolveWhenReady, 0);
            existingScript.addEventListener('load', resolveWhenReady, { once: true });
            existingScript.addEventListener('error', () => resolve(), { once: true });
            return;
        }

        // Create script tag
        const script = document.createElement('script');
        script.id = 'MathJax-script';
        script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
        script.async = true;

        script.onload = resolveWhenReady;
        script.onerror = () => resolve();

        document.head.appendChild(script);
    });

    return mathJaxLoadPromise;
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

    if (!window.MathJax?.typesetPromise) {
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

