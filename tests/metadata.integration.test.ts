import { execFile as execFileCallback } from 'node:child_process';
import { copyFile, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { exiftoolPath } from 'exiftool-vendored';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { removeMetadata } from '../src/main/metadata';

vi.mock('electron', () => ({ dialog: { showMessageBox: vi.fn() } }));

const execFile = promisify(execFileCallback);
const fixtureDirectory = join(import.meta.dirname, 'fixtures');
let testDirectory: string | undefined;

afterEach(async () => {
  if (testDirectory) await rm(testDirectory, { recursive: true, force: true });
  testDirectory = undefined;
});

async function tags(path: string): Promise<Record<string, string>> {
  const binary = await exiftoolPath();
  const { stdout } = await execFile(binary, ['-json', '-FileType', '-Artist', '-Comment', path]);
  return JSON.parse(stdout)[0] as Record<string, string>;
}

describe('real metadata removal', () => {
  it.each([
    ['png', 'image', 'Artist', 'PNG'],
    ['jpg', 'image', 'Artist', 'JPEG'],
    ['heic', 'image', 'Artist', 'HEIC'],
    ['dng', 'image', 'Artist', 'DNG'],
    ['tiff', 'image', 'Artist', 'TIFF'],
    ['mp4', 'video', 'Comment', 'MP4'],
    ['mov', 'video', 'Comment', 'MOV']
  ] as const)('cleans real .%s metadata and keeps a readable %s', async (extension, kind, tag, fileType) => {
    testDirectory = await mkdtemp(join(tmpdir(), 'cleanslate-real-'));
    const input = join(testDirectory, `sample.${extension}`);
    await copyFile(join(fixtureDirectory, `${kind === 'video' ? 'clip' : 'photo'}.${extension}`), input);
    const original = await readFile(input);
    expect((await tags(input))[tag]).toBe('CleanSlateFixture');

    const result = await removeMetadata({ mode: 'new', files: [
      { id: extension, name: `sample.${extension}`, path: input, kind }
    ] }, null);

    expect(result.results[0]).toMatchObject({ ok: true, error: null });
    const cleaned = result.results[0].outputPath!;
    expect((await tags(cleaned)).FileType).toBe(fileType);
    expect((await tags(cleaned))[tag]).toBeUndefined();
    expect(await readFile(input)).toEqual(original);
    expect((await stat(cleaned)).size).toBeGreaterThan(0);
  }, 15_000);

  it('replaces a real HEIC file after removing its artist tag', async () => {
    testDirectory = await mkdtemp(join(tmpdir(), 'cleanslate-real-'));
    const input = join(testDirectory, 'sample.heic');
    await copyFile(join(fixtureDirectory, 'photo.heic'), input);

    const result = await removeMetadata({ mode: 'replace', files: [
      { id: 'heic', name: 'sample.heic', path: input, kind: 'image' }
    ] }, null);

    expect(result.results[0]).toMatchObject({ ok: true, outputPath: input });
    expect((await tags(input)).FileType).toBe('HEIC');
    expect((await tags(input)).Artist).toBeUndefined();
  }, 15_000);
});
