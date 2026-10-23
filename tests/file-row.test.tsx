import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { FileRow } from '../src/renderer/src/components/FileRow';
import type { MetadataProcessResult } from '../src/shared/metadata';
import { createMediaFile } from '../src/shared/media';

const file = createMediaFile({
  name: 'portrait.svg',
  path: '/photos/portrait.svg',
  size: 128,
  source: 'picker'
})!;

function render(result?: MetadataProcessResult): string {
  return renderToStaticMarkup(<FileRow file={file} result={result} onRemove={vi.fn()} onOpenMetadata={vi.fn()} />);
}

function result(overrides: Partial<MetadataProcessResult>): MetadataProcessResult {
  return {
    id: file.id,
    inputPath: file.path,
    outputPath: null,
    size: null,
    ok: false,
    error: null,
    metadata: null,
    ...overrides
  };
}

describe('file row result', () => {
  it('shows no result before cleaning', () => {
    expect(render()).not.toContain('file-result');
    expect(render()).toContain('View metadata for portrait.svg');
    expect(render()).not.toContain('Compare metadata for portrait.svg');
  });

  it('uses the trash icon for the accessible remove control', () => {
    const html = render();
    expect(html).toContain('aria-label="Remove portrait.svg"');
    expect(html).toContain('<img src="data:image/svg+xml,');
    expect(html).toContain('%23c65656');
    expect(html).not.toContain('>Remove</button>');
  });

  it('shows a green cleaned-copy result beside the source file', () => {
    const html = render(result({ ok: true, outputPath: '/photos/portrait_cleaned.svg', size: 120, metadata: {
      before: { fields: [], error: null }, after: { fields: [], error: null }
    } }));
    expect(html).toContain('file-result--success');
    expect(html).toContain('Cleaned copy saved');
    expect(html).toContain('portrait');
    expect(html).toContain('Compare metadata for portrait.svg');
  });

  it('shows when the original was cleaned in place', () => {
    const html = render(result({ ok: true, outputPath: file.path, size: 120 }));
    expect(html).toContain('file-result--success');
    expect(html).toContain('Original cleaned');
  });

  it('marks a failed file without changing successful rows', () => {
    const html = render(result({ error: 'Could not process this SVG image.' }));
    expect(html).toContain('file-result--warning');
    expect(html).toContain('Could not clean');
    expect(html).not.toContain('Cleaned copy saved');
  });
});
