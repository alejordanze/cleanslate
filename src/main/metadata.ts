import { randomUUID } from 'node:crypto';
import { chmod, copyFile, rename, stat, unlink } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';

import { dialog, type BrowserWindow } from 'electron';

import { runFfmpeg } from '../shared/ffmpeg';
import { runExiftool } from '../shared/exiftool';
import { cleanSvg } from './svg';
import type {
  MetadataProcessRequest,
  MetadataProcessResponse,
  MetadataProcessResult,
  MetadataProcessTarget
} from '../shared/metadata';

type ProcessingStage = 'open' | 'process' | 'save';

function friendlyError(error: unknown, target: MetadataProcessTarget, stage: ProcessingStage): string {
  const kind = target.kind === 'image' ? 'image' : 'video';
  const code = (error as NodeJS.ErrnoException)?.code;

  if (stage === 'open' || code === 'ENOENT') {
    return `Could not open this ${kind}. Check that the file still exists and is readable.`;
  }
  if (stage === 'save' || code === 'EACCES' || code === 'EPERM' || code === 'ENOSPC') {
    return 'Could not save the cleaned file. Check folder permissions and free space.';
  }
  if (extname(target.path).toLowerCase() === '.svg') {
    return 'Could not process this SVG image. Check that it is a valid SVG file.';
  }
  return `Could not process this ${kind}. The file may be damaged or unsupported.`;
}

function cleanedPath(target: MetadataProcessTarget): string {
  const extension = extname(target.path);

  if (!extension) {
    throw new Error(`Could not determine the file format for ${target.name}.`);
  }

  const stem = basename(target.path, extension);
  return join(dirname(target.path), `${stem}_cleaned${extension}`);
}

function temporaryPath(outputPath: string): string {
  const extension = extname(outputPath);
  const stem = basename(outputPath, extension);

  return join(dirname(outputPath), `.${stem}.cleanslate-${randomUUID()}${extension}`);
}

function fileExists(filePath: string): Promise<boolean> {
  return stat(filePath)
    .then(() => true)
    .catch(() => false);
}

function ffmpegArgs(target: MetadataProcessTarget, outputPath: string): string[] {
  const metadataArgs = [
    '-map_metadata',
    '-1',
    '-map_metadata:s:v',
    '-1',
    '-map_metadata:s:a',
    '-1',
    '-map_metadata:s:s',
    '-1',
    '-map_chapters',
    '-1'
  ];

  const streamArgs =
    target.kind === 'image'
      ? ['-map', '0:v:0']
      : ['-map', '0:v?', '-map', '0:a?', '-map', '0:s?', '-c', 'copy'];

  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-nostdin',
    '-y',
    '-i',
    target.path,
    ...streamArgs,
    ...metadataArgs,
    outputPath
  ];
}

const exiftoolImageExtensions = new Set([
  'arw', 'cr2', 'cr3', 'dng', 'heic', 'heif', 'nef', 'orf', 'raf', 'raw', 'rw2', 'sr2'
]);

async function replaceFile(sourcePath: string, destinationPath: string): Promise<void> {
  try {
    await rename(sourcePath, destinationPath);
    return;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    if (code !== 'EEXIST' && code !== 'EPERM' && code !== 'ENOTEMPTY') {
      throw error;
    }
  }

  await unlink(destinationPath);
  await rename(sourcePath, destinationPath);
}

async function confirmOverwrite(owner: BrowserWindow | null, outputPath: string): Promise<boolean> {
  const options: Electron.MessageBoxOptions = {
    type: 'warning',
    title: 'Cleaned file already exists',
    message: `${basename(outputPath)} already exists.`,
    detail: 'Do you want to replace the existing cleaned file?',
    buttons: ['Keep existing', 'Replace'],
    defaultId: 0,
    cancelId: 0,
    noLink: true
  };
  const result = owner
    ? await dialog.showMessageBox(owner, options)
    : await dialog.showMessageBox(options);

  return result.response === 1;
}

async function processOne(
  target: MetadataProcessTarget,
  mode: MetadataProcessRequest['mode'],
  owner: BrowserWindow | null
): Promise<MetadataProcessResult> {
  let outputPath: string | null = mode === 'new' ? null : target.path;
  let tempPath: string | null = null;
  let stage: ProcessingStage = 'open';

  try {
    if (!target.path) {
      throw new Error(`Could not access ${target.name}. Drop or choose the file again.`);
    }

    const inputStats = await stat(target.path);

    if (!inputStats.isFile()) {
      throw new Error(`${target.name} is not a regular file.`);
    }

    outputPath = mode === 'new' ? cleanedPath(target) : target.path;
    stage = 'save';

    if (mode === 'new' && (await fileExists(outputPath)) && !(await confirmOverwrite(owner, outputPath))) {
      return {
        id: target.id,
        inputPath: target.path,
        outputPath: null,
        size: null,
        ok: false,
        error: `Skipped ${basename(outputPath)}.`
      };
    }

    tempPath = temporaryPath(outputPath);
    stage = 'process';
    if (target.kind === 'image' && extname(target.path).toLowerCase() === '.svg') {
      await copyFile(target.path, tempPath);
      await cleanSvg(tempPath);
    } else if (target.kind === 'image' && exiftoolImageExtensions.has(extname(target.path).slice(1).toLowerCase())) {
      await copyFile(target.path, tempPath);
      await runExiftool(tempPath);
    } else {
      const ffmpegResult = await runFfmpeg(ffmpegArgs(target, tempPath));

      if (ffmpegResult.code !== 0) {
        throw new Error(`FFmpeg exited with code ${ffmpegResult.code ?? 'unknown'}: ${ffmpegResult.stderr || ffmpegResult.stdout}`);
      }
    }

    stage = 'save';
    await chmod(tempPath, inputStats.mode & 0o777);
    await replaceFile(tempPath, outputPath);
    tempPath = null;

    const outputStats = await stat(outputPath);

    return {
      id: target.id,
      inputPath: target.path,
      outputPath,
      size: outputStats.size,
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      id: target.id,
      inputPath: target.path,
      outputPath,
      size: null,
      ok: false,
      error: friendlyError(error, target, stage)
    };
  } finally {
    if (tempPath) {
      await unlink(tempPath).catch(() => undefined);
    }
  }
}

export async function removeMetadata(
  request: MetadataProcessRequest,
  owner: BrowserWindow | null
): Promise<MetadataProcessResponse> {
  const results: MetadataProcessResult[] = [];

  for (const target of request.files) {
    results.push(await processOne(target, request.mode, owner));
  }

  return {
    mode: request.mode,
    results,
    succeeded: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length
  };
}
