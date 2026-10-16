import { spawn } from 'node:child_process';
import { exiftoolPath } from 'exiftool-vendored';

/** Remove writable metadata in place from an already copied image. */
export async function runExiftool(filePath: string): Promise<void> {
  const binary = await exiftoolPath();

  await new Promise<void>((resolve, reject) => {
    // RAW files keep structural IFD blocks; clear optional tags in those blocks explicitly.
    const child = spawn(binary, [
      '-all=',
      '-Artist=',
      '-Copyright=',
      '-ImageDescription=',
      '-UserComment=',
      '-Software=',
      '-DateTime=',
      '-HostComputer=',
      '-DocumentName=',
      '-CameraOwnerName=',
      '-BodySerialNumber=',
      '-LensSerialNumber=',
      '-overwrite_original',
      filePath
    ], { windowsHide: true });
    let output = '';

    child.stdout?.on('data', (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr?.on('data', (chunk: Buffer) => { output += chunk.toString(); });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(output.trim() || `ExifTool exited with code ${code ?? 'unknown'}.`));
    });
  });
}

export async function inspectBundledExiftool(): Promise<void> {
  const binary = await exiftoolPath();
  await new Promise<void>((resolve, reject) => {
    const child = spawn(binary, ['-ver'], { windowsHide: true });
    let output = '';
    child.stdout?.on('data', (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr?.on('data', (chunk: Buffer) => { output += chunk.toString(); });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0 && output.trim()) resolve();
      else reject(new Error(output.trim() || `ExifTool exited with code ${code ?? 'unknown'}.`));
    });
  });
}
