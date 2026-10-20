import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { readOutputPreference, writeOutputPreference } from '../src/main/outputPreference';

let directory: string | undefined;

afterEach(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
  directory = undefined;
});

async function preferencePath(): Promise<string> {
  directory = await mkdtemp(join(tmpdir(), 'cleanslate-pref-'));
  return join(directory, 'nested', 'preferences.json');
}

describe('saved output preference', () => {
  it('distinguishes an unset choice from saved new and replace choices', async () => {
    const path = await preferencePath();
    expect(await readOutputPreference(path)).toBeNull();

    await writeOutputPreference(path, 'replace');
    expect(await readOutputPreference(path)).toBe('replace');

    await writeOutputPreference(path, 'new');
    expect(await readOutputPreference(path)).toBe('new');
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({ outputMode: 'new' });

    await writeOutputPreference(path, null);
    expect(await readOutputPreference(path)).toBeNull();
  });

  it('does not treat a damaged settings file as a saved choice', async () => {
    const path = await preferencePath();
    await writeOutputPreference(path, 'new');
    await writeFile(path, '{broken');
    await expect(readOutputPreference(path)).rejects.toThrow();
  });
});
