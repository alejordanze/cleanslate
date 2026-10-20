import { execFile as execFileCallback } from 'node:child_process';
import { copyFile, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { DOMParser } from '@xmldom/xmldom';
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
  const { stdout } = await execFile(binary, ['-json', '-FileType', '-Artist', '-Comment', '-Title', '-Description', path]);
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

  it.each(['new', 'replace'] as const)('cleans SVG metadata in %s mode while preserving the drawing', async (mode) => {
    testDirectory = await mkdtemp(join(tmpdir(), 'cleanslate-svg-'));
    const input = join(testDirectory, 'sample.svg');
    await copyFile(join(fixtureDirectory, 'photo.svg'), input);
    const original = await readFile(input, 'utf8');

    const result = await removeMetadata({ mode, files: [
      { id: 'svg', name: 'sample.svg', path: input, kind: 'image' }
    ] }, null);

    expect(result.results[0]).toMatchObject({ ok: true, error: null });
    const cleaned = await readFile(result.results[0].outputPath!, 'utf8');
    const document = new DOMParser().parseFromString(cleaned, 'image/svg+xml');
    expect(document.documentElement.localName).toBe('svg');
    expect(document.getElementsByTagName('rect').length).toBe(1);
    expect(document.getElementsByTagName('rect')[0].getAttribute('fill')).toBe('#0866ed');
    expect((await tags(result.results[0].outputPath!)).FileType).toBe('SVG');
    expect((await tags(result.results[0].outputPath!)).Title).toBeUndefined();
    expect((await tags(result.results[0].outputPath!)).Description).toBeUndefined();
    expect(cleaned).not.toContain('CleanSlateFixture');
    expect(cleaned).not.toMatch(/<metadata|<title|<desc|inkscape:|data-owner|<!--/);
    if (mode === 'new') expect(await readFile(input, 'utf8')).toBe(original);
    else expect(cleaned).not.toBe(original);
  });

  it('keeps the original SVG when it is malformed', async () => {
    testDirectory = await mkdtemp(join(tmpdir(), 'cleanslate-svg-'));
    const input = join(testDirectory, 'invalid.svg');
    const invalid = '<svg xmlns="http://www.w3.org/2000/svg"><path></svg>';
    await writeFile(input, invalid);

    const result = await removeMetadata({ mode: 'replace', files: [
      { id: 'svg', name: 'invalid.svg', path: input, kind: 'image' }
    ] }, null);

    expect(result.results[0]).toMatchObject({
      ok: false,
      error: 'Could not process this SVG image. Check that it is a valid SVG file.'
    });
    expect(await readFile(input, 'utf8')).toBe(invalid);
  });
});
