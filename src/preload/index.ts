import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { FfmpegCheckResult } from '../shared/ffmpeg';
import type { MediaFile } from '../shared/media';
import type { AvailableUpdate } from '../shared/update';
import type { LanguageChoice, LanguageSettings } from '../shared/i18n';
import type {
  MetadataProcessRequest,
  MetadataProcessResponse,
  MetadataSaveMode,
  MetadataSnapshot
} from '../shared/metadata';

const api = {
  inspectFfmpeg: () => ipcRenderer.invoke('ffmpeg:inspect') as Promise<FfmpegCheckResult>,
  getOutputPreference: () => ipcRenderer.invoke('preferences:get-output') as Promise<MetadataSaveMode | null>,
  saveOutputPreference: (mode: MetadataSaveMode | null) => ipcRenderer.invoke('preferences:save-output', mode) as Promise<void>,
  getLanguageSettings: () => ipcRenderer.invoke('preferences:get-language') as Promise<LanguageSettings>,
  saveLanguageChoice: (choice: LanguageChoice) => ipcRenderer.invoke('preferences:save-language', choice) as Promise<LanguageSettings>,
  onLanguageChanged: (callback: (settings: LanguageSettings) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, settings: LanguageSettings) => callback(settings);
    ipcRenderer.on('language:changed', listener);
    return () => ipcRenderer.removeListener('language:changed', listener);
  },
  onOpenPreferences: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('menu:preferences', listener);
    if (pendingPreferences) {
      pendingPreferences = false;
      queueMicrotask(callback);
    }
    return () => ipcRenderer.removeListener('menu:preferences', listener);
  },
  checkForUpdates: () => ipcRenderer.invoke('updates:check') as Promise<AvailableUpdate | null>,
  markUpdateNoticeShown: () => ipcRenderer.invoke('updates:shown') as Promise<void>,
  openLatestRelease: () => ipcRenderer.invoke('updates:open-release') as Promise<void>,
  closeWindow: () => ipcRenderer.send('window:close'),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('window:toggle-maximize') as Promise<boolean>,
  isWindowMaximized: () => ipcRenderer.invoke('window:is-maximized') as Promise<boolean>,
  onWindowMaximized: (callback: (maximized: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, maximized: boolean) => callback(maximized);
    ipcRenderer.on('window:maximized', listener);
    return () => ipcRenderer.removeListener('window:maximized', listener);
  },
  pickMediaFiles: () => ipcRenderer.invoke('media:pick') as Promise<MediaFile[]>,
  removeMetadata: (request: MetadataProcessRequest) => ipcRenderer.invoke('metadata:remove', request) as Promise<MetadataProcessResponse>,
  inspectMetadata: (filePath: string) => ipcRenderer.invoke('metadata:inspect', filePath) as Promise<MetadataSnapshot>,
  getPathForFile: (file: File) => webUtils.getPathForFile(file)
};

let pendingPreferences = false;
ipcRenderer.on('menu:preferences', () => {
  if (ipcRenderer.listenerCount('menu:preferences') === 1) pendingPreferences = true;
});

contextBridge.exposeInMainWorld('cleanslate', api);
