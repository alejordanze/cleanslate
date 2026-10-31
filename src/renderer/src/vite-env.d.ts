/// <reference types="vite/client" />

import type { FfmpegCheckResult } from '../../shared/ffmpeg';
import type { MediaFile } from '../../shared/media';
import type { AvailableUpdate } from '../../shared/update';
import type { LanguageChoice, LanguageSettings } from '../../shared/i18n';
import type {
  MetadataProcessRequest,
  MetadataProcessResponse,
  MetadataSaveMode,
  MetadataSnapshot
} from '../../shared/metadata';

declare global {
  interface Window {
    cleanslate?: {
      inspectFfmpeg: () => Promise<FfmpegCheckResult>;
      getOutputPreference: () => Promise<MetadataSaveMode | null>;
      saveOutputPreference: (mode: MetadataSaveMode | null) => Promise<void>;
      getLanguageSettings: () => Promise<LanguageSettings>;
      saveLanguageChoice: (choice: LanguageChoice) => Promise<LanguageSettings>;
      onLanguageChanged: (callback: (settings: LanguageSettings) => void) => () => void;
      onOpenPreferences: (callback: () => void) => () => void;
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
      inspectMetadata: (filePath: string) => Promise<MetadataSnapshot>;
      getPathForFile: (file: File) => string;
    };
  }
}

export {};
