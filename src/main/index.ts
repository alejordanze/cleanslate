import { app, BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron';
import { stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectBundledFfmpeg } from '../shared/ffmpeg';
import { removeMetadata } from './metadata';
import { inspectBundledExiftool } from '../shared/exiftool';
import {
  createMediaFile,
  supportedMediaExtensions,
  type MediaFile
} from '../shared/media';
import type { MetadataProcessRequest } from '../shared/metadata';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rendererUrl = app.isPackaged
  ? ''
  : process.env.ELECTRON_RENDERER_URL ?? process.env.VITE_DEV_SERVER_URL ?? '';
let mainWindow: BrowserWindow | null = null;

function assertAppSender(event: IpcMainInvokeEvent): void {
  if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) {
    throw new Error('This request must come from the CleanSlate window.');
  }
}

function createWindow(show = true) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 680,
    backgroundColor: '#e2e6ee',
    show,
    title: 'CleanSlate',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: join(__dirname, '../preload/index.cjs')
    }
  });

  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));

  if (rendererUrl) {
    void mainWindow.loadURL(rendererUrl);
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

ipcMain.handle('ffmpeg:inspect', async (event) => {
  assertAppSender(event);
  return inspectBundledFfmpeg();
});

ipcMain.handle('metadata:remove', async (event, request: MetadataProcessRequest) => {
  assertAppSender(event);
  if (request.mode !== 'replace' && request.mode !== 'new') {
    throw new Error('Choose whether to replace the original or save a new cleaned file.');
  }

  if (!Array.isArray(request.files) || request.files.length === 0) {
    throw new Error('Add at least one image or video before removing metadata.');
  }

  return removeMetadata(request, mainWindow);
});

ipcMain.handle('media:pick', async (event): Promise<MediaFile[]> => {
  assertAppSender(event);
  const options: Electron.OpenDialogOptions = {
    title: 'Choose media to clean',
    buttonLabel: 'Add media',
    properties: ['openFile', 'multiSelections'],
    filters: [
      {
        name: 'Images and videos',
        extensions: supportedMediaExtensions
      }
    ]
  };
  const selection = mainWindow
    ? await dialog.showOpenDialog(mainWindow, options)
    : await dialog.showOpenDialog(options);

  if (selection.canceled) {
    return [];
  }

  const files = await Promise.all(
    selection.filePaths.map(async (filePath) => {
      const fileStats = await stat(filePath);
      return createMediaFile({
        name: filePath.split(/[\\/]/).pop() ?? filePath,
        path: filePath,
        size: fileStats.size,
        source: 'picker'
      });
    })
  );

  return files.filter((file): file is MediaFile => file !== null);
});

app.whenReady().then(() => {
  if (process.argv.includes('--smoke-test')) {
    const window = createWindow(false);
    const fail = (message: string) => {
      console.error(`Smoke test failed: ${message}`);
      app.exit(1);
    };

    window.webContents.once('did-fail-load', (_event, _code, description) => fail(description));
    window.webContents.once('render-process-gone', (_event, details) => fail(details.reason));
    window.webContents.once('did-finish-load', async () => {
      try {
        const rendered = await window.webContents.executeJavaScript('Boolean(document.querySelector(".app-shell"))');
        const bridgeReady = await window.webContents.executeJavaScript(
          '(async () => { const bridge = window.cleanslate; return bridge ? (await bridge.inspectFfmpeg()).available : false; })()'
        );
        const cspPresent = await window.webContents.executeJavaScript(
          'Boolean(document.querySelector("meta[http-equiv=Content-Security-Policy]"))'
        );
        const ffmpeg = await inspectBundledFfmpeg();
        await inspectBundledExiftool();

        if (!rendered || !bridgeReady || !cspPresent || !ffmpeg.available) {
          fail(!rendered
            ? 'renderer did not mount'
            : !bridgeReady
              ? 'sandboxed preload bridge could not inspect FFmpeg'
              : !cspPresent
                ? 'production content security policy is missing'
                : ffmpeg.error ?? 'FFmpeg is unavailable');
          return;
        }

        console.log('Smoke test passed: renderer, preload bridge, content policy, FFmpeg, and ExifTool are ready.');
        app.exit(0);
      } catch (error) {
        fail(error instanceof Error ? error.message : String(error));
      }
    });
    return;
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
