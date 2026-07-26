import React, { Suspense } from 'react';

const MathJaxRuntime = React.lazy(() => import('./MathJaxRuntime'));

export const LazyMathJaxBoundary: React.FC<React.PropsWithChildren> = ({ children }) => (
    <Suspense fallback={children}>
        <MathJaxRuntime>{children}</MathJaxRuntime>
    </Suspense>
);
