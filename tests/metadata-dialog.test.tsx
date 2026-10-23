import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import MetadataDialog from '../src/renderer/src/components/MetadataDialog';
import { createMediaFile } from '../src/shared/media';
import type { MetadataComparison } from '../src/shared/metadata';

const file = createMediaFile({
  name: 'portrait.jpg', path: '/photos/portrait.jpg', size: 128, source: 'picker'
})!;

const comparison: MetadataComparison = {
  before: { fields: [
    { key: 'EXIF:Artist', group: 'EXIF', label: 'Artist', value: 'Alice' },
    { key: 'EXIF:Orientation', group: 'EXIF', label: 'Orientation', value: '1' }
  ], error: null },
  after: { fields: [
    { key: 'EXIF:Orientation', group: 'EXIF', label: 'Orientation', value: '1' }
  ], error: null }
};

describe('metadata dialog', () => {
  it('shows an inspection loading state before the metadata bridge returns', () => {
    const html = renderToStaticMarkup(<MetadataDialog file={file} comparison={null} onClose={vi.fn()} />);
    expect(html).toContain('File metadata');
    expect(html).toContain('Reading metadata');
    expect(html).toContain('Close metadata dialog');
  });

  it('shows removed and kept fields side by side after cleaning', () => {
    const html = renderToStaticMarkup(<MetadataDialog file={file} comparison={comparison} onClose={vi.fn()} />);
    expect(html).toContain('Metadata comparison');
    expect(html).toContain('Original');
    expect(html).toContain('Cleaned');
    expect(html).toContain('metadata-status--removed');
    expect(html).toContain('metadata-status--kept');
    expect(html).toContain('Alice');
  });
});
