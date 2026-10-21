import type { AvailableUpdate } from '../shared/update';

const latestReleaseApi = 'https://api.github.com/repos/alejordanze/cleanslate/releases/latest';

function parseVersion(value: string): [number, number, number] | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(value);
  if (!match) return null;
  const parts = match.slice(1).map(Number);
  return parts.every(Number.isSafeInteger) ? parts as [number, number, number] : null;
}

export function isNewerVersion(candidate: string, installed: string): boolean {
  const next = parseVersion(candidate);
  const current = parseVersion(installed);
  if (!next || !current) return false;

  for (let part = 0; part < 3; part += 1) {
    if (next[part] !== current[part]) return next[part] > current[part];
  }
  return false;
}

export async function checkForUpdate(
  installedVersion: string,
  fetchRelease: typeof fetch = fetch
): Promise<AvailableUpdate | null> {
  const response = await fetchRelease(latestReleaseApi, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': `CleanSlate/${installedVersion}`
    },
    signal: AbortSignal.timeout(5000)
  });
  if (!response.ok) throw new Error(`Update check failed: HTTP ${response.status}`);

  const release: unknown = await response.json();
  if (!release || typeof release !== 'object' || !('tag_name' in release)) return null;
  const tag = release.tag_name;
  if (typeof tag !== 'string' || !isNewerVersion(tag, installedVersion)) return null;

  return {
    version: tag.replace(/^v/, '')
  };
}

export function createUpdateSession(checkLatest: () => Promise<AvailableUpdate | null>) {
  let checkPromise: Promise<AvailableUpdate | null> | null = null;
  let noticeShown = false;

  return {
    check(): Promise<AvailableUpdate | null> {
      if (noticeShown) return Promise.resolve(null);
      if (!checkPromise) {
        checkPromise = checkLatest().catch((error: unknown) => {
          checkPromise = null;
          throw error;
        });
      }
      return checkPromise;
    },
    markNoticeShown(): void {
      noticeShown = true;
    }
  };
}
