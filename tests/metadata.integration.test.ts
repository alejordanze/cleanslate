import { execFile as execFileCallback } from 'node:child_process';
import { copyFile, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { DOMParser } from '@xmldom/xmldom';
import { exiftoolPath } from 'exiftool-vendored';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { removeMetadata } from '../src/main/metadata';
import { runFfmpeg } from '../src/shared/ffmpeg';

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
    const comparison = result.results[0].metadata!;
    expect(comparison.before.error).toBeNull();
    expect(comparison.after.error).toBeNull();
    expect(comparison.before.fields.some((field) => field.key.endsWith(`:${tag}`) && field.value === 'CleanSlateFixture')).toBe(true);
    expect(comparison.after.fields.some((field) => field.key.endsWith(`:${tag}`))).toBe(false);
    expect(comparison.after.fields.some((field) => [
      'File:Comment', 'IFD0:Software', 'ItemList:Encoder', 'UserData:SoftwareVersion'
    ].includes(field.key))).toBe(false);
    if (extension === 'mov') {
      expect(comparison.before.fields.some((field) =>
        field.key === 'Track1:Copy1:HandlerType' && field.label === 'Handler Type (copy 1)'
      )).toBe(true);
    }
    const cleaned = result.results[0].outputPath!;
    expect((await tags(cleaned)).FileType).toBe(fileType);
    expect((await tags(cleaned))[tag]).toBeUndefined();
    expect(await readFile(input)).toEqual(original);
    expect((await stat(cleaned)).size).toBeGreaterThan(0);
    if (extension !== 'heic') {
      expect((await runFfmpeg(['-v', 'error', '-i', cleaned, '-f', 'null', '-'])).code).toBe(0);
    } else if (process.platform === 'darwin') {
      const { stdout } = await execFile('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', cleaned]);
      expect(stdout).toContain('pixelWidth: 16');
      expect(stdout).toContain('pixelHeight: 16');
    }
  }, 15_000);

  it('replaces a real HEIC file after removing its artist tag', async () => {
    testDirectory = await mkdtemp(join(tmpdir(), 'cleanslate-real-'));
    const input = join(testDirectory, 'sample.heic');
    await copyFile(join(fixtureDirectory, 'photo.heic'), input);
    const binary = await exiftoolPath();
    await execFile(binary, ['-Make=BrandX', '-Model=ModelY', '-overwrite_original', input]);

    const result = await removeMetadata({ mode: 'replace', files: [
      { id: 'heic', name: 'sample.heic', path: input, kind: 'image' }
    ] }, null);

    expect(result.results[0]).toMatchObject({ ok: true, outputPath: input });
    expect(result.results[0].metadata?.before.fields.some((field) => field.key.endsWith(':Artist') && field.value === 'CleanSlateFixture')).toBe(true);
    expect(result.results[0].metadata?.after.fields.some((field) => field.key.endsWith(':Artist'))).toBe(false);
    expect(result.results[0].metadata?.after.fields.some((field) => /:(Make|Model)$/.test(field.key))).toBe(false);
    expect((await tags(input)).FileType).toBe('HEIC');
    expect((await tags(input)).Artist).toBeUndefined();
  }, 15_000);

  it('removes optional IFD0 and location fields from DNG while keeping its image', async () => {
    testDirectory = await mkdtemp(join(tmpdir(), 'cleanslate-real-'));
    const input = join(testDirectory, 'sample.dng');
    await copyFile(join(fixtureDirectory, 'photo.dng'), input);
    const binary = await exiftoolPath();
    await execFile(binary, [
      '-XPTitle=Private title', '-XPAuthor=Alice', '-GPSLatitude=16', '-GPSLatitudeRef=S',
      '-GPSLongitude=68', '-GPSLongitudeRef=W', '-Rating=5', '-overwrite_original', input
    ]);

    const result = await removeMetadata({ mode: 'new', files: [
      { id: 'dng-extra', name: 'sample.dng', path: input, kind: 'image' }
    ] }, null);

    expect(result.results[0]).toMatchObject({ ok: true, error: null });
    expect(result.results[0].metadata?.before.fields.some((field) => field.key === 'IFD0:XPAuthor')).toBe(true);
    expect(result.results[0].metadata?.after.fields.some((field) =>
      /^(IFD0:XP|GPS:|XMP-xmp:Rating)/.test(field.key)
    )).toBe(false);
    expect((await tags(result.results[0].outputPath!)).FileType).toBe('DNG');
  }, 15_000);

  it.each([
    ['jpg', 'image', ['-GPSLatitude=16', '-GPSLatitudeRef=S', '-GPSLongitude=68', '-GPSLongitudeRef=W', '-XMP-dc:Creator=Alice'], /^(GPS:|XMP-dc:Creator$)/],
    ['mov', 'video', ['-Keys:GPSCoordinates=+16.5-68.1/', '-Title=PrivateTitle'], /^(Keys:GPSCoordinates|ItemList:Title|XMP-dc:Title)$/]
  ] as const)('removes location and descriptive fields from .%s', async (extension, kind, extraTags, privateField) => {
    testDirectory = await mkdtemp(join(tmpdir(), 'cleanslate-real-'));
    const input = join(testDirectory, `sample.${extension}`);
    await copyFile(join(fixtureDirectory, `${kind === 'video' ? 'clip' : 'photo'}.${extension}`), input);
    const binary = await exiftoolPath();
    await execFile(binary, [...extraTags, '-overwrite_original', input]);
    const original = await readFile(input);

    const result = await removeMetadata({ mode: 'new', files: [
      { id: extension, name: `sample.${extension}`, path: input, kind }
    ] }, null);

    expect(result.results[0]).toMatchObject({ ok: true, error: null });
    expect(result.results[0].metadata?.before.fields.some((field) => privateField.test(field.key))).toBe(true);
    expect(result.results[0].metadata?.after.fields.some((field) => privateField.test(field.key))).toBe(false);
    expect(await readFile(input)).toEqual(original);
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
