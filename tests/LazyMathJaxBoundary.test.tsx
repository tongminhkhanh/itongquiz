import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('better-react-mathjax', async () => {
    const ReactModule = await import('react');
    const RuntimeContext = ReactModule.createContext(false);

    return {
        MathJaxContext: ({ children }: { children: React.ReactNode }) => (
            <RuntimeContext.Provider value>{children}</RuntimeContext.Provider>
        ),
        MathJax: ({ children }: { children: React.ReactNode }) => {
            if (!ReactModule.useContext(RuntimeContext)) {
                throw new Error('MathJax rendered outside MathJaxContext');
            }
            return <span data-testid="mathjax">{children}</span>;
        },
    };
});

import { LazyMathJaxBoundary } from '../src/app/LazyMathJaxBoundary';
import MathSpan from '../src/components/common/MathSpan';

describe('LazyMathJaxBoundary', () => {
    it('never renders math children before MathJaxContext is mounted', () => {
        expect(() => render(
            <LazyMathJaxBoundary>
                <MathSpan content="$x+1$" />
            </LazyMathJaxBoundary>,
        )).not.toThrow();

        expect(screen.getByTestId('mathjax')).toHaveTextContent('$x+1$');
    });
});
