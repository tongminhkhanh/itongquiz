import React from 'react';
import { MathJaxContext } from 'better-react-mathjax';
import MathRenderTelemetryObserver from '../components/common/MathRenderTelemetryObserver';
import { mathJaxConfig } from '../config/mathJaxConfig';

const MathJaxRuntime: React.FC<React.PropsWithChildren> = ({ children }) => (
    <MathJaxContext config={mathJaxConfig}>
        <MathRenderTelemetryObserver />
        {children}
    </MathJaxContext>
);

export default MathJaxRuntime;
