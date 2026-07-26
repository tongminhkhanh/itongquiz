import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import { installChunkRecovery } from './src/utils/chunkRecovery';
import { cleanupLegacyAuthStorage } from './src/services/api/auth';

cleanupLegacyAuthStorage();
installChunkRecovery();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
