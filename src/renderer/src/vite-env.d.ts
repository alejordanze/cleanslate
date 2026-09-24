/// <reference types="vite/client" />

import type { FfmpegCheckResult } from '../../shared/ffmpeg';
import type { MediaFile } from '../../shared/media';
import type {
  MetadataProcessRequest,
  MetadataProcessResponse
} from '../../shared/metadata';

declare global {
  interface Window {
    cleanslate?: {
      inspectFfmpeg: () => Promise<FfmpegCheckResult>;
      pickMediaFiles: () => Promise<MediaFile[]>;
      removeMetadata: (request: MetadataProcessRequest) => Promise<MetadataProcessResponse>;
      getPathForFile: (file: File) => string;
    };
  }
}

export {};
