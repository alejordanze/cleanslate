import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export async function readPreferenceFile(path: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function writePreferenceFile(path: string, value: object): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = join(dirname(path), `.preferences-${randomUUID()}.json`);
  try {
    await writeFile(temporaryPath, JSON.stringify(value), { mode: 0o600 });
    await rename(temporaryPath, path);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}
