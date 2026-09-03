import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

export interface FfmpegCheckResult {
  available: boolean;
  path: string | null;
  versionLine: string | null;
  output: string;
  error: string | null;
  electronVersion: string;
  nodeVersion: string;
  platform: NodeJS.Platform;
  arch: string;
}

interface RunResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

function runBinary(file: string, args: string[]): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, {
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';

    if (child.stdout) {
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
      });
    }

    if (child.stderr) {
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
      });
    }

    child.once('error', reject);
    child.once('close', (code, signal) => {
      resolve({ code, signal, stdout, stderr });
    });
  });
}

function firstMeaningfulLine(output: string): string | null {
  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

function runtimeInfo() {
  return {
    electronVersion: process.versions.electron ?? 'unknown',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  };
}

export async function inspectBundledFfmpeg(): Promise<FfmpegCheckResult> {
  const runtime = runtimeInfo();

  if (!ffmpegPath) {
    return {
      ...runtime,
      available: false,
      path: null,
      versionLine: null,
      output: '',
      error: 'ffmpeg-static did not provide a binary for this platform.'
    };
  }

  try {
    const result = await runBinary(ffmpegPath, ['-version']);
    const output = [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join('\n');
    const versionLine = firstMeaningfulLine(output);

    return {
      ...runtime,
      available: result.code === 0,
      path: ffmpegPath,
      versionLine,
      output,
      error:
        result.code === 0
          ? null
          : `ffmpeg exited with code ${result.code ?? 'unknown'}${result.signal ? ` (${result.signal})` : ''}`
    };
  } catch (error) {
    return {
      ...runtime,
      available: false,
      path: ffmpegPath,
      versionLine: null,
      output: '',
      error: error instanceof Error ? error.message : 'Unknown FFmpeg error'
    };
  }
}
