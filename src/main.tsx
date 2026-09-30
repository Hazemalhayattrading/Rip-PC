import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './app/app.css';
import { App } from './app/App';
import { browserUrl } from './app/browser-url';
import { buildStore } from './state/build-store';
import { connectBuildToUrl } from './state/url-sync';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Rig Lab cannot start: index.html has no #root element.');
}

// Read the build from the link before the first render, so the first frame already shows it.
const urlSync = connectBuildToUrl(buildStore, browserUrl);

createRoot(container).render(
  <StrictMode>
    <App onNavigate={urlSync.reconcile} />
  </StrictMode>,
);
