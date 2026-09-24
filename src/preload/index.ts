import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { FfmpegCheckResult } from '../shared/ffmpeg';
import type { MediaFile } from '../shared/media';
import type {
  MetadataProcessRequest,
  MetadataProcessResponse
} from '../shared/metadata';

const api = {
  inspectFfmpeg: () => ipcRenderer.invoke('ffmpeg:inspect') as Promise<FfmpegCheckResult>,
  pickMediaFiles: () => ipcRenderer.invoke('media:pick') as Promise<MediaFile[]>,
  removeMetadata: (request: MetadataProcessRequest) => ipcRenderer.invoke('metadata:remove', request) as Promise<MetadataProcessResponse>,
  getPathForFile: (file: File) => webUtils.getPathForFile(file)
};

contextBridge.exposeInMainWorld('cleanslate', api);
