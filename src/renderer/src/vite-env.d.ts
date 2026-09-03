/// <reference types="vite/client" />

import type { FfmpegCheckResult } from '../../shared/ffmpeg';

declare global {
  interface Window {
    cleanslate: {
      inspectFfmpeg: () => Promise<FfmpegCheckResult>;
    };
  }
}

export {};
