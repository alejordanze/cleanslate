/// <reference types="vite/client" />

import type { FfmpegCheckResult } from '../../shared/ffmpeg';
import type { MediaFile } from '../../shared/media';

declare global {
  interface Window {
    cleanslate?: {
      inspectFfmpeg: () => Promise<FfmpegCheckResult>;
      pickMediaFiles: () => Promise<MediaFile[]>;
      getPathForFile: (file: File) => string;
    };
  }
}

export {};
