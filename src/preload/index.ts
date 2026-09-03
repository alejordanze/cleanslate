import { contextBridge, ipcRenderer } from 'electron';
import type { FfmpegCheckResult } from '../shared/ffmpeg';

const api = {
  inspectFfmpeg: () => ipcRenderer.invoke('ffmpeg:inspect') as Promise<FfmpegCheckResult>
};

contextBridge.exposeInMainWorld('cleanslate', api);
