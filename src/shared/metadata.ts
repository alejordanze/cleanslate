import type { MediaKind } from './media';

export type MetadataSaveMode = 'replace' | 'new';

export interface MetadataField {
  key: string;
  group: string;
  label: string;
  value: string;
}

export interface MetadataSnapshot {
  fields: MetadataField[];
  error: string | null;
}

export interface MetadataComparison {
  before: MetadataSnapshot;
  after: MetadataSnapshot;
}

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
  skipped?: boolean;
  error: string | null;
  metadata: MetadataComparison | null;
}

export interface MetadataProcessResponse {
  mode: MetadataSaveMode;
  results: MetadataProcessResult[];
  succeeded: number;
  failed: number;
}
