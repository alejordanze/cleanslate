import { describe, expect, it } from 'vitest';
import { processingNotice, updateFileSizes } from '../src/renderer/src/services/processing';
import { createMediaFile } from '../src/shared/media';
import type { MetadataProcessResponse, MetadataProcessResult } from '../src/shared/metadata';

const file = createMediaFile({
  name: 'photo.jpg',
  path: '/photos/photo.jpg',
  size: 100,
  source: 'picker',
})!;

function result(overrides: Partial<MetadataProcessResult>): MetadataProcessResult {
  return {
    id: file.id,
    inputPath: file.path,
    outputPath: null,
    size: null,
    ok: false,
    error: null,
    ...overrides,
  };
}

describe('renderer processing results', () => {
  it('updates the listed size only when the original file was cleaned', () => {
    const replaced = result({ ok: true, outputPath: file.path, size: 75 });
    const copy = result({ ok: true, outputPath: '/photos/photo_cleaned.jpg', size: 75 });

    expect(updateFileSizes([file], new Map([[file.id, replaced]]))[0].size).toBe(75);
    expect(updateFileSizes([file], new Map([[file.id, copy]]))[0].size).toBe(100);
    expect(updateFileSizes([file], new Map([[file.id, result({ size: 75 })]]))[0].size).toBe(100);
  });

  it('summarizes a mixed batch while preserving the actionable single error', () => {
    const response: MetadataProcessResponse = {
      mode: 'new',
      results: [result({ ok: true }), result({ id: 'other', error: 'The file could not be opened.' })],
      succeeded: 1,
      failed: 1,
    };

    expect(processingNotice(response)).toEqual({
      tone: 'warning',
      text: 'Cleaned 1 file. The file could not be opened.',
    });
    expect(processingNotice({ ...response, mode: 'replace', failed: 0, results: [response.results[0]] })).toEqual({
      tone: 'success',
      text: 'Metadata removed from 1 file. The original files were updated.',
    });
  });
});
