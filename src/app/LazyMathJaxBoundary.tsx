import React from 'react';
import MathJaxRuntime from './MathJaxRuntime';

export const LazyMathJaxBoundary: React.FC<React.PropsWithChildren> = ({ children }) => (
    <MathJaxRuntime>{children}</MathJaxRuntime>
);
