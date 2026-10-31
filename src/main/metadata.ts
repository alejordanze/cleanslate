import { randomUUID } from 'node:crypto';
import { chmod, copyFile, rename, stat, unlink } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';

import { dialog, type BrowserWindow } from 'electron';

import { runFfmpeg } from '../shared/ffmpeg';
import { runExiftool } from '../shared/exiftool';
import { cleanSvg } from './svg';
import { inspectMetadata } from './metadataInspection';
import type {
  MetadataProcessRequest,
  MetadataProcessResponse,
  MetadataProcessResult,
  MetadataProcessTarget
} from '../shared/metadata';
import { t, type Language } from '../shared/i18n';

type ProcessingStage = 'open' | 'process' | 'save';

function friendlyError(error: unknown, target: MetadataProcessTarget, stage: ProcessingStage, language: Language): string {
  const kind = t(language, target.kind);
  const code = (error as NodeJS.ErrnoException)?.code;

  if (stage === 'open' || code === 'ENOENT') {
    return t(language, 'couldNotOpenFile', { kind });
  }
  if (stage === 'save' || code === 'EACCES' || code === 'EPERM' || code === 'ENOSPC') {
    return t(language, 'couldNotSaveFile');
  }
  if (extname(target.path).toLowerCase() === '.svg') {
    return t(language, 'invalidSvg');
  }
  return t(language, 'couldNotProcessFile', { kind });
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
    '-bitexact',
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

async function confirmOverwrite(owner: BrowserWindow | null, outputPath: string, language: Language): Promise<boolean> {
  const options: Electron.MessageBoxOptions = {
    type: 'warning',
    title: t(language, 'existingFileTitle'),
    message: t(language, 'existingFileMessage', { name: basename(outputPath) }),
    detail: t(language, 'existingFileDetail'),
    buttons: [t(language, 'keepExisting'), t(language, 'replace')],
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
  owner: BrowserWindow | null,
  language: Language
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

    if (mode === 'new' && (await fileExists(outputPath)) && !(await confirmOverwrite(owner, outputPath, language))) {
      return {
        id: target.id,
        inputPath: target.path,
        outputPath: null,
        size: null,
        ok: false,
        skipped: true,
        error: t(language, 'skipFile', { name: basename(outputPath) }),
        metadata: null
      };
    }

    const before = await inspectMetadata(target.path, language);
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
    const after = await inspectMetadata(outputPath, language);

    return {
      id: target.id,
      inputPath: target.path,
      outputPath,
      size: outputStats.size,
      ok: true,
      error: null,
      metadata: { before, after }
    };
  } catch (error) {
    return {
      id: target.id,
      inputPath: target.path,
      outputPath,
      size: null,
      ok: false,
      error: friendlyError(error, target, stage, language),
      metadata: null
    };
  } finally {
    if (tempPath) {
      await unlink(tempPath).catch(() => undefined);
    }
  }
}

export async function removeMetadata(
  request: MetadataProcessRequest,
  owner: BrowserWindow | null,
  language: Language = 'en'
): Promise<MetadataProcessResponse> {
  const results: MetadataProcessResult[] = [];

  for (const target of request.files) {
    results.push(await processOne(target, request.mode, owner, language));
  }

  return {
    mode: request.mode,
    results,
    succeeded: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length
  };
}
