import type { MediaKind } from './media';

export type MetadataSaveMode = 'replace' | 'new';

export interface MetadataProcessTarget {
  id: string;
  name: string;
  path: string;
  kind: MediaKind;
}

export interface MetadataProcessRequest {
  files: MetadataProcessTarget[];
  mode: MetadataSaveMode;
}

export interface MetadataProcessResult {
  id: string;
  inputPath: string;
  outputPath: string | null;
  size: number | null;
  ok: boolean;
  error: string | null;
}

export interface MetadataProcessResponse {
  mode: MetadataSaveMode;
  results: MetadataProcessResult[];
  succeeded: number;
  failed: number;
}
