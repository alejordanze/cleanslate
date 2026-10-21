/// <reference types="vite/client" />

import type { FfmpegCheckResult } from '../../shared/ffmpeg';
import type { MediaFile } from '../../shared/media';
import type { AvailableUpdate } from '../../shared/update';
import type {
  MetadataProcessRequest,
  MetadataProcessResponse,
  MetadataSaveMode
} from '../../shared/metadata';

declare global {
  interface Window {
    cleanslate?: {
      inspectFfmpeg: () => Promise<FfmpegCheckResult>;
      getOutputPreference: () => Promise<MetadataSaveMode | null>;
      saveOutputPreference: (mode: MetadataSaveMode | null) => Promise<void>;
      checkForUpdates: () => Promise<AvailableUpdate | null>;
      markUpdateNoticeShown: () => Promise<void>;
      openLatestRelease: () => Promise<void>;
      closeWindow: () => void;
      minimizeWindow: () => void;
      toggleMaximizeWindow: () => Promise<boolean>;
      isWindowMaximized: () => Promise<boolean>;
      onWindowMaximized: (callback: (maximized: boolean) => void) => () => void;
      pickMediaFiles: () => Promise<MediaFile[]>;
      removeMetadata: (request: MetadataProcessRequest) => Promise<MetadataProcessResponse>;
      getPathForFile: (file: File) => string;
    };
  }
}

export {};
