import React, { Suspense } from 'react';
import { PageLoading } from './PageLoading';

const MathJaxRuntime = React.lazy(() => import('./MathJaxRuntime'));

export const LazyMathJaxBoundary: React.FC<React.PropsWithChildren> = ({ children }) => (
    <Suspense fallback={<PageLoading />}>
        <MathJaxRuntime>{children}</MathJaxRuntime>
    </Suspense>
);
