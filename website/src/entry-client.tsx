import '@fontsource-variable/inter/wght.css';
import { hydrateRoot } from 'react-dom/client';
import App from './App';
import releaseSnapshot from './data/releases.json';
import type { Release } from './releases';
import './style.css';

hydrateRoot(
  document.getElementById('root')!,
  <App pathname={window.location.pathname} initialReleases={releaseSnapshot as Release[]} />
);
