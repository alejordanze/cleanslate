import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { dialog } from 'electron';
import { runFfmpeg } from '../src/shared/ffmpeg';
import { runExiftool } from '../src/shared/exiftool';
import { removeMetadata } from '../src/main/metadata';
import { supportedImageExtensions, supportedVideoExtensions } from '../src/shared/media';
import { createMediaFile } from '../src/shared/media';

vi.mock('electron', () => ({ dialog: { showMessageBox: vi.fn() } }));
vi.mock('../src/shared/ffmpeg', () => ({ runFfmpeg: vi.fn() }));
vi.mock('../src/shared/exiftool', () => ({ runExiftool: vi.fn() }));

const ffmpeg = vi.mocked(runFfmpeg);
const exiftool = vi.mocked(runExiftool);
const showMessageBox = vi.mocked(dialog.showMessageBox);
let testDirectory: string;

beforeEach(async () => {
  vi.resetAllMocks();
  testDirectory = await mkdtemp(join(tmpdir(), 'cleanslate-metadata-'));
});

afterEach(async () => {
  await rm(testDirectory, { recursive: true, force: true });
});

function successfulFfmpeg() {
  ffmpeg.mockImplementation(async (args) => {
    await writeFile(args.at(-1)!, 'cleaned data');
    return { code: 0, signal: null, stdout: '', stderr: '' };
  });
}

describe('metadata removal', () => {
  it.each([
    ...supportedImageExtensions.map((extension) => [extension, 'image'] as const),
    ...supportedVideoExtensions.map((extension) => [extension, 'video'] as const)
  ])('loads a dummy .%s file and saves a cleaned copy', async (extension, kind) => {
    const input = join(testDirectory, `sample.${extension}`);
    await writeFile(input, 'dummy original');
    const file = createMediaFile({ name: `sample.${extension}`, path: input, size: 14, source: 'picker' });
    expect(file?.kind).toBe(kind);
    successfulFfmpeg();
    exiftool.mockImplementation(async (path) => { await writeFile(path, 'dummy cleaned'); });

    const result = await removeMetadata({ mode: 'new', files: [
      { id: file!.id, name: file!.name, path: file!.path, kind: file!.kind }
    ] }, null);

    expect(result).toMatchObject({ succeeded: 1, failed: 0 });
    expect(result.results[0].outputPath).toBe(join(testDirectory, `sample_cleaned.${extension}`));
    expect(await readFile(input, 'utf8')).toBe('dummy original');
    expect(await readFile(result.results[0].outputPath!, 'utf8')).toBe(
      exiftool.mock.calls.length ? 'dummy cleaned' : 'cleaned data'
    );
    expect(ffmpeg.mock.calls.length + exiftool.mock.calls.length).toBe(1);
  });

  it('creates an image copy and strips metadata without changing the original', async () => {
    const input = join(testDirectory, 'photo.jpg');
    await writeFile(input, 'original data');
    successfulFfmpeg();

    const result = await removeMetadata({ mode: 'new', files: [
      { id: 'photo', name: 'photo.jpg', path: input, kind: 'image' }
    ] }, null);

    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.results[0].outputPath).toBe(join(testDirectory, 'photo_cleaned.jpg'));
    expect(await readFile(input, 'utf8')).toBe('original data');
    expect(await readFile(join(testDirectory, 'photo_cleaned.jpg'), 'utf8')).toBe('cleaned data');
    const args = ffmpeg.mock.calls[0][0];
    expect(args).toContain('-map_metadata');
    expect(args).toContain('-map_chapters');
    expect(args).toContain('0:v:0');
    expect(args).not.toContain('copy');
  });

  it('replaces a video in place while copying its streams', async () => {
    const input = join(testDirectory, 'clip.mp4');
    await writeFile(input, 'original data');
    successfulFfmpeg();

    const result = await removeMetadata({ mode: 'replace', files: [
      { id: 'clip', name: 'clip.mp4', path: input, kind: 'video' }
    ] }, null);

    expect(result.results[0]).toMatchObject({ ok: true, outputPath: input, size: 12 });
    expect(await readFile(input, 'utf8')).toBe('cleaned data');
    const args = ffmpeg.mock.calls[0][0];
    expect(args).toContain('0:v?');
    expect(args).toContain('0:a?');
    expect(args).toContain('0:s?');
    expect(args.slice(args.indexOf('-c'), args.indexOf('-c') + 2)).toEqual(['-c', 'copy']);
  });

  it('keeps an existing cleaned copy when overwrite is declined', async () => {
    const input = join(testDirectory, 'photo.png');
    const existing = join(testDirectory, 'photo_cleaned.png');
    await writeFile(input, 'original data');
    await writeFile(existing, 'keep this');
    showMessageBox.mockResolvedValue({ response: 0, checkboxChecked: false });

    const result = await removeMetadata({ mode: 'new', files: [
      { id: 'photo', name: 'photo.png', path: input, kind: 'image' }
    ] }, null);

    expect(result.failed).toBe(1);
    expect(result.results[0].error).toBe('Skipped photo_cleaned.png.');
    expect(await readFile(existing, 'utf8')).toBe('keep this');
    expect(ffmpeg).not.toHaveBeenCalled();
  });

  it('removes a partial temporary file after FFmpeg fails', async () => {
    const input = join(testDirectory, 'photo.jpg');
    await writeFile(input, 'original data');
    ffmpeg.mockImplementation(async (args) => {
      await writeFile(args.at(-1)!, 'partial data');
      return { code: 1, signal: null, stdout: '', stderr: 'conversion failed\n' };
    });

    const result = await removeMetadata({ mode: 'new', files: [
      { id: 'photo', name: 'photo.jpg', path: input, kind: 'image' }
    ] }, null);

    expect(result.failed).toBe(1);
    expect(result.results[0].error).toBe('conversion failed');
    expect(await readFile(input, 'utf8')).toBe('original data');
    expect(await readdir(testDirectory)).toEqual(['photo.jpg']);
  });

  it('preserves a HEIC original and removes the temporary copy when ExifTool fails', async () => {
    const input = join(testDirectory, 'photo.heic');
    await writeFile(input, 'original data');
    exiftool.mockRejectedValue(new Error('Invalid HEIC data'));

    const result = await removeMetadata({ mode: 'replace', files: [
      { id: 'photo', name: 'photo.heic', path: input, kind: 'image' }
    ] }, null);

    expect(result.results[0]).toMatchObject({ ok: false, error: 'Invalid HEIC data' });
    expect(await readFile(input, 'utf8')).toBe('original data');
    expect(await readdir(testDirectory)).toEqual(['photo.heic']);
    expect(ffmpeg).not.toHaveBeenCalled();
  });

  it('reports a missing file while continuing with the rest of the batch', async () => {
    const valid = join(testDirectory, 'valid.jpg');
    await writeFile(valid, 'original data');
    successfulFfmpeg();

    const result = await removeMetadata({ mode: 'new', files: [
      { id: 'missing', name: 'missing.jpg', path: join(testDirectory, 'missing.jpg'), kind: 'image' },
      { id: 'valid', name: 'valid.jpg', path: valid, kind: 'image' }
    ] }, null);

    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.results.map((file) => file.ok)).toEqual([false, true]);
    expect(ffmpeg).toHaveBeenCalledTimes(1);
  });
});
