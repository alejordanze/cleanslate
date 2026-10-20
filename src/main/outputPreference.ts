import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { MetadataSaveMode } from '../shared/metadata';

export async function readOutputPreference(path: string): Promise<MetadataSaveMode | null> {
  let contents: string;
  try {
    contents = await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }

  const saved = JSON.parse(contents) as { outputMode?: unknown };
  if (saved?.outputMode === 'new' || saved?.outputMode === 'replace') return saved.outputMode;
  throw new Error('The saved output setting is invalid.');
}

export async function writeOutputPreference(path: string, mode: MetadataSaveMode | null): Promise<void> {
  if (mode === null) {
    await rm(path, { force: true });
    return;
  }
  if (mode !== 'new' && mode !== 'replace') throw new Error('Choose a valid output setting.');

  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = join(dirname(path), `.preferences-${randomUUID()}.json`);
  try {
    await writeFile(temporaryPath, JSON.stringify({ outputMode: mode }), { mode: 0o600 });
    await rename(temporaryPath, path);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}
