import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { FfmpegCheckResult } from '../shared/ffmpeg';
import type { MediaFile } from '../shared/media';
import type {
  MetadataProcessRequest,
  MetadataProcessResponse,
  MetadataSaveMode
} from '../shared/metadata';

const api = {
  inspectFfmpeg: () => ipcRenderer.invoke('ffmpeg:inspect') as Promise<FfmpegCheckResult>,
  getOutputPreference: () => ipcRenderer.invoke('preferences:get-output') as Promise<MetadataSaveMode | null>,
  saveOutputPreference: (mode: MetadataSaveMode | null) => ipcRenderer.invoke('preferences:save-output', mode) as Promise<void>,
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
  getPathForFile: (file: File) => webUtils.getPathForFile(file)
};

contextBridge.exposeInMainWorld('cleanslate', api);
