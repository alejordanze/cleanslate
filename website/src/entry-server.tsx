import { renderToString } from 'react-dom/server';
import App from './App';
import releaseSnapshot from './data/releases.json';
import type { Release } from './releases';

export function render(pathname: string): string {
  return renderToString(<App pathname={pathname} initialReleases={releaseSnapshot as Release[]} />);
}
