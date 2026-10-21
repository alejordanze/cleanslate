import { app, BrowserWindow, dialog, ipcMain, shell, type IpcMainInvokeEvent } from 'electron';
import { mkdtempSync, rmSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
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
import type { MetadataProcessRequest, MetadataSaveMode } from '../shared/metadata';
import { readOutputPreference, writeOutputPreference } from './outputPreference';
import { checkForUpdate, createUpdateSession } from './updateCheck';
import type { AvailableUpdate } from '../shared/update';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const smokeUserData = process.argv.includes('--smoke-test') ? mkdtempSync(join(tmpdir(), 'cleanslate-smoke-')) : null;
if (smokeUserData) {
  app.setPath('userData', smokeUserData);
  app.on('will-quit', () => rmSync(smokeUserData, { recursive: true, force: true }));
}

const rendererUrl = app.isPackaged
  ? ''
  : process.env.ELECTRON_RENDERER_URL ?? process.env.VITE_DEV_SERVER_URL ?? '';
let mainWindow: BrowserWindow | null = null;
const updateSession = createUpdateSession(() => checkForUpdate(app.getVersion()));

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
    frame: false,
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

  mainWindow.on('maximize', () => mainWindow?.webContents.send('window:maximized', true));
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window:maximized', false));

  return mainWindow;
}

ipcMain.handle('ffmpeg:inspect', async (event) => {
  assertAppSender(event);
  return inspectBundledFfmpeg();
});

ipcMain.handle('preferences:get-output', async (event): Promise<MetadataSaveMode | null> => {
  assertAppSender(event);
  return readOutputPreference(join(app.getPath('userData'), 'preferences.json'));
});

ipcMain.handle('preferences:save-output', async (event, mode: MetadataSaveMode | null): Promise<void> => {
  assertAppSender(event);
  if (mode !== null && mode !== 'new' && mode !== 'replace') throw new Error('Choose a valid output setting.');
  await writeOutputPreference(join(app.getPath('userData'), 'preferences.json'), mode);
});

ipcMain.handle('updates:check', async (event): Promise<AvailableUpdate | null> => {
  assertAppSender(event);
  if (!app.isPackaged || process.platform !== 'darwin' || smokeUserData) return null;
  return updateSession.check();
});

ipcMain.handle('updates:shown', (event): void => {
  assertAppSender(event);
  updateSession.markNoticeShown();
});

ipcMain.handle('updates:open-release', async (event): Promise<void> => {
  assertAppSender(event);
  await shell.openExternal('https://github.com/alejordanze/cleanslate/releases/latest');
});

ipcMain.on('window:close', (event) => {
  assertAppSender(event);
  mainWindow?.close();
});

ipcMain.on('window:minimize', (event) => {
  assertAppSender(event);
  mainWindow?.minimize();
});

ipcMain.handle('window:toggle-maximize', (event): boolean => {
  assertAppSender(event);
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
  return mainWindow.isMaximized();
});

ipcMain.handle('window:is-maximized', (event): boolean => {
  assertAppSender(event);
  return mainWindow?.isMaximized() ?? false;
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
  if (process.platform === 'darwin' && !app.isPackaged) {
    app.dock?.setIcon(join(__dirname, '../../icons/cleanslate.png'));
  }

  if (process.argv.includes('--smoke-test')) {
    const checkControls = process.argv.includes('--smoke-controls');
    const window = createWindow(checkControls);
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
        const customBarReady = await window.webContents.executeJavaScript(`(async () => {
          const bar = document.querySelector('.window-bar');
          const controls = ['Close window', 'Minimize window', 'Maximize window']
            .every(label => bar?.querySelector('button[aria-label="' + label + '"]'));
          const gear = bar?.querySelector('.settings-icon-button img');
          if (!(gear instanceof HTMLImageElement)) return false;
          await gear.decode();
          const dragRegion = bar && getComputedStyle(bar).getPropertyValue('-webkit-app-region');
          return Boolean(controls && dragRegion === 'drag' && gear.naturalWidth > 0 && !document.querySelector('.runtime-pill'));
        })()`);
        const simplifiedScreenReady = await window.webContents.executeJavaScript(`(() => {
          const heading = document.querySelector('.page-heading');
          const brandMark = document.querySelector('.brand-mark');
          return Boolean(heading?.querySelector('h1') && heading.querySelector('p') &&
            !heading.querySelector('.section-kicker') &&
            !document.querySelector('.file-section .section-kicker') &&
            brandMark && getComputedStyle(brandMark).backgroundColor === 'rgb(220, 234, 255)');
        })()`);
        if (!simplifiedScreenReady) return fail('the simplified file screen or rounded brand icon did not render');
        const settingsReady = await window.webContents.executeJavaScript(`(async () => {
          const settingsButton = document.querySelector('button[aria-label="Open settings"]');
          settingsButton?.click();
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const ready = Boolean(document.querySelector('#settings-title') && document.querySelector('input[name="preferred-mode"]:checked') && document.querySelector('.settings-actions button'));
          const backButton = document.querySelector('button[aria-label="Back to files"]');
          backButton?.click();
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          return ready;
        })()`);
        const arrowReady = await window.webContents.executeJavaScript(`(async () => {
          const arrow = document.querySelector('.button-arrow');
          if (!(arrow instanceof HTMLImageElement)) return false;
          await arrow.decode();
          return arrow.naturalWidth > 0;
        })()`);
        window.setSize(960, 680);
        const longWarningFits = await window.webContents.executeJavaScript(`(() => {
          const bar = document.querySelector('.process-bar');
          const info = document.querySelector('.process-info');
          const copy = document.querySelector('.process-copy');
          const action = bar?.querySelector(':scope > .button');
          if (!bar || !info || !copy || !action) return false;
          const warning = document.createElement('span');
          warning.className = 'process-note process-note--warning';
          warning.textContent = 'Could not process this image. '.repeat(12);
          copy.replaceWith(warning);
          const barBounds = bar.getBoundingClientRect();
          const actionBounds = action.getBoundingClientRect();
          const result = bar.scrollWidth <= bar.clientWidth &&
            actionBounds.left > info.getBoundingClientRect().left &&
            actionBounds.right <= barBounds.right &&
            action.querySelector('.button-arrow')?.getBoundingClientRect().width > 0;
          warning.replaceWith(copy);
          return result;
        })()`);
        const preferenceBridgeReady = await window.webContents.executeJavaScript(`(async () => {
          const mode = await window.cleanslate.getOutputPreference();
          return mode === null || mode === 'new' || mode === 'replace';
        })()`);
        const updateBridgeReady = await window.webContents.executeJavaScript(`(async () =>
          typeof window.cleanslate.openLatestRelease === 'function' &&
          await window.cleanslate.checkForUpdates() === null
        )()`);
        if (!updateBridgeReady) return fail('the update check bridge is unavailable in the packaged app');
        const ffmpeg = await inspectBundledFfmpeg();
        await inspectBundledExiftool();

        if (!rendered || !bridgeReady || !cspPresent || !customBarReady || !settingsReady || !arrowReady || !longWarningFits || !preferenceBridgeReady || !ffmpeg.available) {
          fail(!rendered
            ? 'renderer did not mount'
            : !bridgeReady
              ? 'sandboxed preload bridge could not inspect FFmpeg'
              : !cspPresent
                ? 'production content security policy is missing'
                : !customBarReady
                  ? 'custom title bar or gear icon did not load'
                : !settingsReady
                  ? 'settings view did not open'
                  : !arrowReady
                    ? 'button arrow icon did not load'
                    : !longWarningFits
                      ? 'long warning broke the action bar layout'
                      : !preferenceBridgeReady
                        ? 'saved output preference bridge is unavailable'
                : ffmpeg.error ?? 'FFmpeg is unavailable');
          return;
        }

        const outputSettingSaved = await window.webContents.executeJavaScript(`(async () => {
          document.querySelector('button[aria-label="Open settings"]')?.click();
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const choice = document.querySelector('input[name="preferred-mode"][value="new"]');
          const save = document.querySelector('.settings-actions button');
          if (!(choice instanceof HTMLInputElement) || !(save instanceof HTMLButtonElement)) return false;
          choice.click();
          save.click();
          for (let attempt = 0; attempt < 40; attempt += 1) {
            if (await window.cleanslate.getOutputPreference() === 'new') return true;
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          return false;
        })()`);
        if (!outputSettingSaved) return fail('Settings did not save the output choice');

        await new Promise<void>((resolve) => {
          window.webContents.once('did-finish-load', () => resolve());
          window.reload();
        });
        const savedChoiceSkipsDialog = await window.webContents.executeJavaScript(`(async () => {
          document.querySelector('button[aria-label="Open settings"]')?.click();
          for (let attempt = 0; attempt < 40; attempt += 1) {
            if (document.querySelector('input[name="preferred-mode"][value="new"]:checked')) break;
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          if (!document.querySelector('input[name="preferred-mode"][value="new"]:checked')) return false;
          document.querySelector('button[aria-label="Back to files"]')?.click();
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const board = document.querySelector('.file-board');
          if (!board) return false;
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], 'smoke.svg', { type: 'image/svg+xml' }));
          board.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer }));
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const action = document.querySelector('.process-bar > .button--primary');
          if (!(action instanceof HTMLButtonElement) || action.disabled) return false;
          if (!document.querySelector('.process-note')?.textContent?.includes('Cleaned copies will be saved')) return false;
          document.querySelector('button[aria-label="Open settings"]')?.click();
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          document.querySelector('button[aria-label="Back to files"]')?.click();
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          if (!document.querySelector('.file-row')) return false;
          document.querySelector('.process-bar > .button--primary')?.click();
          for (let attempt = 0; attempt < 40; attempt += 1) {
            if (document.querySelector('.file-result')) return !document.querySelector('.save-dialog');
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          return false;
        })()`);
        if (!savedChoiceSkipsDialog) return fail('the file queue did not survive Settings or the saved output choice did not process it');

        const removeAllIconReady = await window.webContents.executeJavaScript(`(async () => {
          const button = document.querySelector('.remove-all-button');
          const icon = button?.querySelector('img');
          if (!(button instanceof HTMLButtonElement) || !(icon instanceof HTMLImageElement)) return false;
          await icon.decode();
          return button.getAttribute('aria-label') === 'Remove all files from queue' &&
            icon.naturalWidth > 0 && button.textContent?.includes('Remove all');
        })()`);
        if (!removeAllIconReady) return fail('the remove-all icon did not render');

        if (checkControls) {
          const removeAllBounds = await window.webContents.executeJavaScript(`(() => {
            const bounds = document.querySelector('.remove-all-button')?.getBoundingClientRect();
            return bounds ? { x: bounds.x, y: bounds.y, height: bounds.height } : null;
          })()`);
          if (!removeAllBounds) return fail('the remove-all control is missing');
          window.webContents.sendInputEvent({ type: 'mouseMove', x: Math.round(removeAllBounds.x + 18), y: Math.round(removeAllBounds.y + removeAllBounds.height / 2) });
          let removeAllRevealed = false;
          for (let attempt = 0; attempt < 40; attempt += 1) {
            removeAllRevealed = await window.webContents.executeJavaScript(`(() => {
              const button = document.querySelector('.remove-all-button');
              const label = button?.querySelector('span');
              return Boolean(button?.matches(':hover') && label &&
                parseFloat(getComputedStyle(button).width) >= 118 &&
                parseFloat(getComputedStyle(label).opacity) >= .95);
            })()`);
            if (removeAllRevealed) break;
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
          if (!removeAllRevealed) return fail('the remove-all label did not appear on hover');
        }

        await window.webContents.executeJavaScript('window.cleanslate.saveOutputPreference(null)');
        await new Promise<void>((resolve) => {
          window.webContents.once('did-finish-load', () => resolve());
          window.reload();
        });
        const rememberedChoiceSaved = await window.webContents.executeJavaScript(`(async () => {
          const board = document.querySelector('.file-board');
          if (!board) return false;
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], 'remember.svg', { type: 'image/svg+xml' }));
          board.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer }));
          for (let attempt = 0; attempt < 40; attempt += 1) {
            const action = document.querySelector('.process-bar > .button--primary');
            if (action instanceof HTMLButtonElement && !action.disabled) {
              action.click();
              break;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const dialog = document.querySelector('.save-dialog');
          const choice = dialog?.querySelector('input[name="save-mode"][value="replace"]');
          const remember = dialog?.querySelector('.remember-option input');
          const clean = dialog?.querySelector('.save-dialog-actions .button--primary');
          if (!(choice instanceof HTMLInputElement) || !(remember instanceof HTMLInputElement) || !(clean instanceof HTMLButtonElement)) return false;
          choice.click();
          remember.click();
          clean.click();
          for (let attempt = 0; attempt < 40; attempt += 1) {
            if (await window.cleanslate.getOutputPreference() === 'replace') return true;
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          return false;
        })()`);
        if (!rememberedChoiceSaved) return fail('Remember this choice did not save the selected output');

        if (checkControls) {
          const waitUntil = async (condition: () => boolean): Promise<boolean> => {
            for (let attempt = 0; attempt < 40; attempt += 1) {
              if (condition()) return true;
              await new Promise((resolve) => setTimeout(resolve, 50));
            }
            return condition();
          };

          await window.webContents.executeJavaScript('document.querySelector(".window-control--maximize").click()');
          if (!(await waitUntil(() => window.isMaximized()))) return fail('maximize control did not work');
          await window.webContents.executeJavaScript('document.querySelector(".window-control--maximize").click()');
          if (!(await waitUntil(() => !window.isMaximized()))) return fail('restore control did not work');

          await window.webContents.executeJavaScript('document.querySelector(".window-control--minimize").click()');
          if (!(await waitUntil(() => window.isMinimized()))) return fail('minimize control did not work');
          window.restore();

          let closed = false;
          window.once('closed', () => { closed = true; });
          void window.webContents.executeJavaScript('document.querySelector(".window-control--close").click()').catch(() => undefined);
          if (!(await waitUntil(() => closed))) return fail('close control did not work');
        }

        console.log('Smoke test passed: simplified screen, rounded icon, remove-all control, custom title bar, settings, warning layout, arrow icon, saved and remembered output choices, preload bridge, content policy, FFmpeg, and ExifTool are ready.');
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
