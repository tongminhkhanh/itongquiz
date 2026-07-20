import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MathJaxContext } from 'better-react-mathjax';
import App from './App';
import MathRenderTelemetryObserver from './src/components/common/MathRenderTelemetryObserver';
import { installChunkRecovery } from './src/utils/chunkRecovery';
import { cleanupLegacyAuthStorage } from './src/services/api/auth';

cleanupLegacyAuthStorage();
installChunkRecovery();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const mathJaxConfig = {
  loader: {
    load: ['input/tex', 'output/chtml', '[tex]/ams', '[tex]/noerrors', '[tex]/noundefined'],
  },
  tex: {
    packages: { '[+]': ['ams', 'noerrors', 'noundefined'] },
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']],
    processEscapes: true,
  },
  options: {
    ignoreHtmlClass: 'tex2jax_ignore',
    processHtmlClass: 'tex2jax_process',
  },
};

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <MathJaxContext config={mathJaxConfig}>
        <MathRenderTelemetryObserver />
        <App />
      </MathJaxContext>
    </BrowserRouter>
  </React.StrictMode>
);