import { promisify } from 'node:util';
import { execFile as execFileCallback } from 'node:child_process';
import { copyFile, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { app, BrowserWindow } from 'electron';

const execFile = promisify(execFileCallback);
const projectDirectory = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = join(projectDirectory, 'icons/clear-folder.svg');
const outputPath = join(projectDirectory, 'icons/cleanslate.icns');
const sizes = [
  [16, 'icon_16x16.png'],
  [32, 'icon_16x16@2x.png'],
  [32, 'icon_32x32.png'],
  [64, 'icon_32x32@2x.png'],
  [128, 'icon_128x128.png'],
  [256, 'icon_128x128@2x.png'],
  [256, 'icon_256x256.png'],
  [512, 'icon_256x256@2x.png'],
  [512, 'icon_512x512.png'],
  [1024, 'icon_512x512@2x.png']
];

if (process.platform !== 'darwin') {
  throw new Error('The macOS icon must be built on macOS.');
}

console.log('Rendering the Clear Folder SVG with Electron.');

async function buildIcon() {
  let browserWindow;
  let temporaryDirectory;

  try {
    const svg = await readFile(sourcePath, 'utf8');
    const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

    await app.whenReady();
    browserWindow = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
    await browserWindow.loadURL('data:text/html;charset=utf-8,<html><body></body></html>');

    const rendered = await browserWindow.webContents.executeJavaScript(`(async () => {
    const image = new Image();
    image.src = ${JSON.stringify(svgUrl)};
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return {
      cornerAlpha: context.getImageData(0, 0, 1, 1).data[3],
      markAlpha: context.getImageData(512, 700, 1, 1).data[3],
      png: canvas.toDataURL('image/png').split(',')[1]
    };
    })()`);

    if (rendered.cornerAlpha !== 0 || rendered.markAlpha !== 255) {
      throw new Error('The rendered logo did not have a transparent canvas and an opaque mark.');
    }

    temporaryDirectory = await mkdtemp(join(tmpdir(), 'cleanslate-icon-'));
    const iconset = join(temporaryDirectory, 'cleanslate.iconset');
    await mkdir(iconset);
    const masterPng = join(temporaryDirectory, 'master.png');
    await writeFile(masterPng, Buffer.from(rendered.png, 'base64'));

    for (const [size, name] of sizes) {
      await execFile('sips', ['-z', String(size), String(size), masterPng, '--out', join(iconset, name)]);
    }

    const temporaryIcon = join(temporaryDirectory, 'cleanslate.icns');
    await execFile('iconutil', ['-c', 'icns', iconset, '-o', temporaryIcon]);
    await copyFile(temporaryIcon, outputPath);
    console.log(`Built transparent CleanSlate icon: ${outputPath}`);
  } finally {
    browserWindow?.destroy();
    if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
    app.quit();
  }
}

void buildIcon().catch((error) => {
  console.error(error);
  app.exit(1);
});
