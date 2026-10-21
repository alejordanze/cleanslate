import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { render } from '../dist/server/entry-server.js';

const outputDir = path.resolve('dist/client');
const template = await readFile(path.join(outputDir, 'index.html'), 'utf8');
const pages = [
  {
    pathname: '/',
    file: 'index.html',
    title: 'CleanSlate — Share files, keep the details private',
    description: 'CleanSlate is a simple macOS app that removes embedded metadata from images and videos locally before you share them.'
  },
  {
    pathname: '/download/',
    file: 'download/index.html',
    title: 'Download CleanSlate for macOS — Versions and changelogs',
    description: 'Download CleanSlate for Apple silicon or Intel Macs. Browse past versions, changelogs, and installation steps.'
  },
  {
    pathname: '/not-found/',
    file: '404.html',
    title: 'Page not found — CleanSlate',
    description: 'The CleanSlate page you requested could not be found.'
  }
];

for (const page of pages) {
  const html = template
    .replace('<!--app-html-->', render(page.pathname))
    .replace('__PAGE_TITLE__', page.title)
    .replace('__PAGE_DESCRIPTION__', page.description);
  if (html.includes('<!--app-html-->') || html.includes('__PAGE_TITLE__')) {
    throw new Error(`Could not prerender ${page.pathname}`);
  }
  const destination = path.join(outputDir, page.file);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, html);
  console.log(`Prerendered ${page.pathname} → ${page.file}`);
}
