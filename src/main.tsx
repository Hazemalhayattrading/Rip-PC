import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './app/app.css';
import { App } from './app/App';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Rig Lab cannot start: index.html has no #root element.');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
