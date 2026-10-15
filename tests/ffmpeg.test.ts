import { describe, expect, it } from 'vitest';

import { resolveBundledFfmpegPath } from '../src/shared/ffmpeg';

describe('bundled FFmpeg path', () => {
  it('uses the unpacked executable in a packaged macOS app', () => {
    expect(resolveBundledFfmpegPath('/Applications/CleanSlate.app/Contents/Resources/app.asar/node_modules/ffmpeg-static/ffmpeg'))
      .toBe('/Applications/CleanSlate.app/Contents/Resources/app.asar.unpacked/node_modules/ffmpeg-static/ffmpeg');
  });

  it('supports Windows paths and leaves development paths alone', () => {
    expect(resolveBundledFfmpegPath('C:\\CleanSlate\\resources\\app.asar\\node_modules\\ffmpeg-static\\ffmpeg.exe'))
      .toBe('C:\\CleanSlate\\resources\\app.asar.unpacked\\node_modules\\ffmpeg-static\\ffmpeg.exe');
    expect(resolveBundledFfmpegPath('/project/node_modules/ffmpeg-static/ffmpeg'))
      .toBe('/project/node_modules/ffmpeg-static/ffmpeg');
    expect(resolveBundledFfmpegPath(null)).toBeNull();
  });
});
