import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectBundledFfmpeg } from '../shared/ffmpeg';
import {
  createMediaFile,
  supportedMediaExtensions,
  type MediaFile
} from '../shared/media';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rendererUrl = process.env.ELECTRON_RENDERER_URL ?? process.env.VITE_DEV_SERVER_URL ?? '';
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 680,
    backgroundColor: '#09111f',
    title: 'CleanSlate',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, '../preload/index.cjs')
    }
  });

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

ipcMain.handle('ffmpeg:inspect', async () => inspectBundledFfmpeg());

ipcMain.handle('media:pick', async (): Promise<MediaFile[]> => {
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
