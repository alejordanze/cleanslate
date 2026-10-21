import type { MediaFile } from '../../shared/media';
import type {
  MetadataProcessResponse,
  MetadataProcessResult,
  MetadataSaveMode,
} from '../../shared/metadata';
import { getMetadataBridge } from './bridge';
import type { Notice } from './types';

export function removeMetadata(files: MediaFile[], mode: MetadataSaveMode): Promise<MetadataProcessResponse> {
  return getMetadataBridge().removeMetadata({
    mode,
    files: files.map(({ id, name, path, kind }) => ({ id, name, path, kind })),
  });
}

export function updateFileSizes(
  files: MediaFile[],
  results: Map<string, MetadataProcessResult>,
): MediaFile[] {
  return files.map((file) => {
    const result = results.get(file.id);
    return result?.ok && result.size !== null && result.outputPath === file.path
      ? { ...file, size: result.size }
      : file;
  });
}

export function processingNotice(result: MetadataProcessResponse): Notice {
  if (result.failed === 0) {
    const count = `${result.succeeded} file${result.succeeded === 1 ? '' : 's'}`;
    return {
      tone: 'success',
      text: result.mode === 'new'
        ? `Metadata removed from ${count}. Cleaned copies were saved beside the originals.`
        : `Metadata removed from ${count}. The original files were updated.`,
    };
  }

  const firstError = result.results.find((fileResult) => !fileResult.ok)?.error;
  const summary = result.succeeded > 0
    ? `Cleaned ${result.succeeded} file${result.succeeded === 1 ? '' : 's'}. `
    : '';
  const detail = result.failed === 1 && firstError
    ? firstError
    : `Could not process ${result.failed} files. Check that they open normally and try again.`;
  return { tone: 'warning', text: `${summary}${detail}` };
}
