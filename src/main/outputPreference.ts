import { rm } from 'node:fs/promises';

import type { MetadataSaveMode } from '../shared/metadata';
import { readPreferenceFile, writePreferenceFile } from './preferenceFile';

export async function readOutputPreference(path: string): Promise<MetadataSaveMode | null> {
  const saved = await readPreferenceFile(path);
  if (saved === null) return null;
  const mode = saved && typeof saved === 'object' && 'outputMode' in saved ? saved.outputMode : null;
  if (mode === 'new' || mode === 'replace') return mode;
  throw new Error('The saved output setting is invalid.');
}

export async function writeOutputPreference(path: string, mode: MetadataSaveMode | null): Promise<void> {
  if (mode === null) {
    await rm(path, { force: true });
    return;
  }
  if (mode !== 'new' && mode !== 'replace') throw new Error('Choose a valid output setting.');

  await writePreferenceFile(path, { outputMode: mode });
}
