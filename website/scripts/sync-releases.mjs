import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const sourceFile = process.argv[2] === '--file' ? process.argv[3] : null;
const api = 'https://api.github.com/repos/alejordanze/cleanslate/releases?per_page=30';
const response = sourceFile
  ? JSON.parse(await readFile(sourceFile, 'utf8'))
  : await (async () => {
    const result = await fetch(api, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'CleanSlate-website'
      },
      signal: AbortSignal.timeout(10000)
    });
    if (!result.ok) throw new Error(`GitHub Releases returned HTTP ${result.status}`);
    return result.json();
  })();

if (!Array.isArray(response)) throw new Error('Expected a GitHub Releases array');

const releases = response
  .filter((item) => !item.draft && !item.prerelease && /^v\d+\.\d+\.\d+$/.test(item.tag_name))
  .map((item) => ({
    version: item.tag_name.slice(1),
    publishedAt: item.published_at,
    url: item.html_url,
    notes: item.body ?? '',
    assets: item.assets
      .filter((asset) => /^(CleanSlate-.*\.(?:dmg)|SHA256SUMS-.*\.txt)$/.test(asset.name))
      .map((asset) => ({ name: asset.name, url: asset.browser_download_url }))
  }))
  .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));

if (releases.length === 0) throw new Error('No published CleanSlate releases found');

const destination = fileURLToPath(new URL('../src/data/releases.json', import.meta.url));
await mkdir(fileURLToPath(new URL('../src/data/', import.meta.url)), { recursive: true });
await writeFile(destination, `${JSON.stringify(releases, null, 2)}\n`);
console.log(`Saved ${releases.length} releases to ${destination}`);
