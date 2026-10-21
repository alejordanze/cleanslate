export interface ReleaseAsset {
  name: string;
  url: string;
}

export interface Release {
  version: string;
  publishedAt: string;
  url: string;
  notes: string;
  assets: ReleaseAsset[];
}

interface GitHubAsset {
  name?: unknown;
  browser_download_url?: unknown;
}

interface GitHubRelease {
  tag_name?: unknown;
  published_at?: unknown;
  html_url?: unknown;
  body?: unknown;
  draft?: unknown;
  prerelease?: unknown;
  assets?: unknown;
}

export const releasesApi = 'https://api.github.com/repos/alejordanze/cleanslate/releases?per_page=30';

export function parseReleases(value: unknown): Release[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((raw: unknown) => {
    if (!raw || typeof raw !== 'object') return [];
    const item = raw as GitHubRelease;
    if (item.draft || item.prerelease || typeof item.tag_name !== 'string' ||
      !/^v\d+\.\d+\.\d+$/.test(item.tag_name) ||
      typeof item.published_at !== 'string' || typeof item.html_url !== 'string') return [];

    const assets = Array.isArray(item.assets)
      ? item.assets.flatMap((rawAsset: unknown): ReleaseAsset[] => {
        if (!rawAsset || typeof rawAsset !== 'object') return [];
        const asset = rawAsset as GitHubAsset;
        if (typeof asset.name !== 'string' || typeof asset.browser_download_url !== 'string' ||
          !/^(CleanSlate-.*\.dmg|SHA256SUMS-.*\.txt)$/.test(asset.name)) return [];
        return [{ name: asset.name, url: asset.browser_download_url }];
      })
      : [];

    return [{
      version: item.tag_name.slice(1),
      publishedAt: item.published_at,
      url: item.html_url,
      notes: typeof item.body === 'string' ? item.body : '',
      assets
    }];
  }).sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
}

export function getAsset(release: Release, architecture: 'arm64' | 'x64') {
  return release.assets.find((asset) => asset.name === `CleanSlate-${release.version}-${architecture}.dmg`);
}

export function getChecksum(release: Release, architecture: 'arm64' | 'x64') {
  return release.assets.find((asset) => asset.name === `SHA256SUMS-${architecture}.txt`);
}
