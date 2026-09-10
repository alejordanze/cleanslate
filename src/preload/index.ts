import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { FfmpegCheckResult } from '../shared/ffmpeg';
import type { MediaFile } from '../shared/media';

const api = {
  inspectFfmpeg: () => ipcRenderer.invoke('ffmpeg:inspect') as Promise<FfmpegCheckResult>,
  pickMediaFiles: () => ipcRenderer.invoke('media:pick') as Promise<MediaFile[]>,
  getPathForFile: (file: File) => webUtils.getPathForFile(file)
};

contextBridge.exposeInMainWorld('cleanslate', api);
