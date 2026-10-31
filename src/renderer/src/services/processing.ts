import type { MediaFile } from '../../../shared/media';
import type {
  MetadataProcessResponse,
  MetadataProcessResult,
  MetadataSaveMode,
} from '../../../shared/metadata';
import { getMetadataBridge } from './bridge';
import type { Notice } from '../types';
import { plural, t, type Language } from '../../../shared/i18n';

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

export function processingNotice(result: MetadataProcessResponse, language: Language = 'en'): Notice {
  if (result.failed === 0) {
    const count = plural(language, 'fileCountOne', 'fileCountOther', result.succeeded);
    return {
      tone: 'success',
      text: result.mode === 'new'
        ? t(language, 'cleanedCopiesSuccess', { count })
        : t(language, 'originalsSuccess', { count }),
    };
  }

  const firstError = result.results.find((fileResult) => !fileResult.ok)?.error;
  const summary = result.succeeded > 0
    ? t(language, 'cleanedCount', { count: plural(language, 'fileCountOne', 'fileCountOther', result.succeeded) })
    : '';
  const detail = result.failed === 1 && firstError
    ? firstError
    : t(language, 'couldNotProcessCount', { count: result.failed });
  return { tone: 'warning', text: `${summary}${detail}` };
}
