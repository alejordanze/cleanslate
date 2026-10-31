import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { I18nProvider } from './i18n';
import type { LanguageSettings } from '../../shared/i18n';
import './style.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Renderer root element is missing.');
}

const fallback: LanguageSettings = { choice: 'system', language: 'en' };
void (window.cleanslate?.getLanguageSettings() ?? Promise.resolve(fallback))
  .catch(() => fallback)
  .then((settings) => {
    createRoot(rootElement).render(
      <StrictMode>
        <I18nProvider initialSettings={settings}><App /></I18nProvider>
      </StrictMode>
    );
  });
