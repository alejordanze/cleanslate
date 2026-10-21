import { describe, expect, it, vi } from 'vitest';
import { checkForUpdate, createUpdateSession, isNewerVersion } from '../src/main/updateCheck';

describe('release version comparison', () => {
  it('compares numeric version parts instead of text order', () => {
    expect(isNewerVersion('v0.1.10', '0.1.9')).toBe(true);
    expect(isNewerVersion('v0.2.0', '0.1.99')).toBe(true);
    expect(isNewerVersion('v0.1.2', '0.1.2')).toBe(false);
    expect(isNewerVersion('v0.1.1', '0.1.2')).toBe(false);
    expect(isNewerVersion('latest', '0.1.2')).toBe(false);
  });
});

describe('update check', () => {
  it('returns a newer published version from the public release endpoint', async () => {
    const fetchRelease = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: 'v0.1.3' })
    }) as unknown as typeof fetch;

    await expect(checkForUpdate('0.1.2', fetchRelease)).resolves.toEqual({ version: '0.1.3' });
    expect(fetchRelease).toHaveBeenCalledWith(
      'https://api.github.com/repos/alejordanze/cleanslate/releases/latest',
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: 'application/vnd.github+json' })
      })
    );
  });

  it('ignores a release that is not newer', async () => {
    const fetchRelease = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: 'v0.1.2' })
    }) as unknown as typeof fetch;

    await expect(checkForUpdate('0.1.2', fetchRelease)).resolves.toBeNull();
  });

  it('reports a failed request so the caller can leave the app usable', async () => {
    const fetchRelease = vi.fn().mockResolvedValue({ ok: false, status: 403 }) as unknown as typeof fetch;
    await expect(checkForUpdate('0.1.2', fetchRelease)).rejects.toThrow('HTTP 403');
  });
});

describe('update notice session', () => {
  it('shows once during a process and returns after a fresh process starts', async () => {
    const checkLatest = vi.fn().mockResolvedValue({ version: '0.1.2' });
    const firstSession = createUpdateSession(checkLatest);

    await expect(firstSession.check()).resolves.toEqual({ version: '0.1.2' });
    await expect(firstSession.check()).resolves.toEqual({ version: '0.1.2' });
    expect(checkLatest).toHaveBeenCalledTimes(1);

    firstSession.markNoticeShown();
    await expect(firstSession.check()).resolves.toBeNull();
    expect(checkLatest).toHaveBeenCalledTimes(1);

    const nextSession = createUpdateSession(checkLatest);
    await expect(nextSession.check()).resolves.toEqual({ version: '0.1.2' });
    expect(checkLatest).toHaveBeenCalledTimes(2);
  });

  it('can retry a failed check while the app remains open', async () => {
    const checkLatest = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ version: '0.1.2' });
    const session = createUpdateSession(checkLatest);

    await expect(session.check()).rejects.toThrow('offline');
    await expect(session.check()).resolves.toEqual({ version: '0.1.2' });
  });
});
