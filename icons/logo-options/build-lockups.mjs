import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));
const options = [
  { name: 'clear-folder', label: 'Clear Folder', note: 'Folder + image + clean sparkle', logoHeight: 192, logoTextY: 160, cardTextY: 170 },
  { name: 'remove-layer', label: 'Remove Layer', note: 'Folder + image + metadata X' },
  { name: 'folder-bin', label: 'Folder Bin', note: 'Folder + small metadata bin' }
];

function markContent(svg) {
  const content = svg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/)?.[1];
  if (!content) throw new Error('Expected a complete SVG mark.');
  return content.replace(/<title[^>]*>[\s\S]*?<\/title>\s*/g, '')
    .replace(/<desc[^>]*>[\s\S]*?<\/desc>\s*/g, '');
}

const marks = await Promise.all(options.map(async (option) => ({
  ...option,
  content: markContent(await readFile(join(directory, `${option.name}.svg`), 'utf8'))
})));

for (const mark of marks) {
  const lockup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 ${mark.logoHeight ?? 228}" role="img" aria-labelledby="title desc">
  <title id="title">CleanSlate ${mark.label} logo</title>
  <desc id="desc">${mark.note} with the CleanSlate wordmark below.</desc>
  <g transform="translate(96 12)">${mark.content}</g>
  <text x="160" y="${mark.logoTextY ?? 191}" text-anchor="middle" fill="#18233c" font-family="Inter, Avenir Next, Avenir, Segoe UI, sans-serif" font-size="34" font-weight="600" letter-spacing="-1">CleanSlate</text>
</svg>
`;
  await writeFile(join(directory, `${mark.name}-logo.svg`), lockup);
}

const cards = marks.map((mark, index) => {
  const x = 32 + index * 340;
  return `<g transform="translate(${x} 32)">
    <rect width="308" height="394" rx="18" fill="#fff" stroke="#dfe4eb"/>
    <g transform="translate(90 28)">${mark.content}</g>
    <text x="154" y="${mark.cardTextY ?? 204}" text-anchor="middle" fill="#18233c" font-family="Inter, Avenir Next, Avenir, Segoe UI, sans-serif" font-size="29" font-weight="600" letter-spacing="-1">CleanSlate</text>
    <path d="M30 236h248" stroke="#e8ebf0"/>
    <text x="30" y="277" fill="#18233c" font-family="Inter, Avenir Next, Avenir, Segoe UI, sans-serif" font-size="18" font-weight="600">${mark.label}</text>
    <text x="30" y="306" fill="#818896" font-family="Inter, Avenir Next, Avenir, Segoe UI, sans-serif" font-size="13">${mark.note}</text>
    <rect x="30" y="335" width="29" height="29" rx="7" fill="#f5f9ff" stroke="#e8ebf0"/>
    <g transform="translate(31 336) scale(.21)">${mark.content}</g>
    <text x="70" y="355" fill="#818896" font-family="Inter, Avenir Next, Avenir, Segoe UI, sans-serif" font-size="12">small icon preview</text>
  </g>`;
}).join('\n');

await writeFile(join(directory, 'comparison.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1044 458" role="img" aria-labelledby="title desc">
  <title id="title">Three CleanSlate logo concepts</title>
  <desc id="desc">Clear Folder, Remove Layer, and Folder Bin, each shown with the wordmark and at a small icon size.</desc>
  <rect width="1044" height="458" fill="#e2e6ee"/>
  ${cards}
</svg>
`);
