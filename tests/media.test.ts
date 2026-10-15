import { describe, expect, it } from 'vitest';

import {
  createMediaFile,
  formatFileSize,
  getFileExtension,
  getFileStem,
  getMediaKind,
  mergeMediaFiles
} from '../src/shared/media';

describe('media intake', () => {
  it('recognizes image and video extensions regardless of case', () => {
    expect(getMediaKind('photo.JPEG')).toBe('image');
    expect(getMediaKind('clip.MP4')).toBe('video');
    expect(getFileExtension('photo.JPEG')).toBe('jpeg');
    expect(getFileStem('photo.JPEG')).toBe('photo');
  });

  it('uses MIME type when an extension is unavailable and rejects unsupported files', () => {
    expect(getMediaKind('camera-export', 'image/png')).toBe('image');
    expect(getMediaKind('notes.txt', 'text/plain')).toBeNull();
    expect(createMediaFile({ name: 'notes.txt', path: '/tmp/notes.txt', size: 3, source: 'drop' })).toBeNull();
  });

  it('gives the same local file one stable identity across picker and drop', () => {
    const fromPicker = createMediaFile({ name: 'photo.png', path: '/tmp/photo.png', size: 10, source: 'picker' });
    const fromDrop = createMediaFile({ name: 'photo.png', path: '/tmp/photo.png', size: 10, source: 'drop' });

    expect(fromPicker?.id).toBe('/tmp/photo.png');
    expect(fromDrop?.id).toBe(fromPicker?.id);
  });

  it('appends only new files and preserves the queue when nothing new arrives', () => {
    const first = createMediaFile({ name: 'first.png', path: '/tmp/first.png', size: 10, source: 'picker' })!;
    const second = createMediaFile({ name: 'second.mp4', path: '/tmp/second.mp4', size: 20, source: 'drop' })!;
    const current = [first];

    expect(mergeMediaFiles(current, [first, second])).toEqual([first, second]);
    expect(mergeMediaFiles(current, [first])).toBe(current);
  });

  it('formats file sizes for the queue', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(12 * 1024 * 1024)).toBe('12 MB');
  });
});
