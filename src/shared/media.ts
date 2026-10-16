export type MediaKind = 'image' | 'video';
export type MediaSource = 'drop' | 'picker';

export interface MediaFile {
  id: string;
  name: string;
  extension: string;
  kind: MediaKind;
  mimeType: string;
  size: number;
  path: string;
  source: MediaSource;
}

export interface MediaFileInput {
  name: string;
  mimeType?: string;
  path: string;
  size: number;
  source: MediaSource;
}

export const supportedImageExtensions = [
  'arw',
  'avif',
  'bmp',
  'cr2',
  'cr3',
  'dds',
  'dng',
  'exr',
  'gif',
  'hdr',
  'heic',
  'heif',
  'ico',
  'j2c',
  'jp2',
  'jpeg',
  'jpg',
  'jxl',
  'nef',
  'png',
  'orf',
  'pbm',
  'pgm',
  'ppm',
  'raf',
  'raw',
  'rw2',
  'sr2',
  'svg',
  'tga',
  'tif',
  'tiff',
  'webp',
  'xbm',
  'xpm'
] as const;

export const supportedVideoExtensions = [
  '3g2',
  '3gp',
  'amv',
  'asf',
  'avi',
  'divx',
  'dv',
  'f4v',
  'flv',
  'm1v',
  'm2v',
  'm2ts',
  'm4v',
  'mkv',
  'mov',
  'mp4',
  'mpe',
  'mpeg',
  'mpg',
  'mts',
  'mxf',
  'nut',
  'ogv',
  'ogm',
  'rm',
  'rmvb',
  'ts',
  'vob',
  'webm',
  'wmv',
  'y4m',
  'yuv'
] as const;

export const supportedMediaExtensions = [
  ...supportedImageExtensions,
  ...supportedVideoExtensions
];

const imageExtensions = new Set<string>(supportedImageExtensions);
const videoExtensions = new Set<string>(supportedVideoExtensions);

export function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot > -1 && lastDot < fileName.length - 1 ? fileName.slice(lastDot + 1).toLowerCase() : '';
}

export function getFileStem(fileName: string): string {
  const extension = getFileExtension(fileName);
  return extension ? fileName.slice(0, -(extension.length + 1)) : fileName;
}

export function getMediaKind(fileName: string, mimeType = ''): MediaKind | null {
  const extension = getFileExtension(fileName);

  if (imageExtensions.has(extension) || mimeType.startsWith('image/')) {
    return 'image';
  }

  if (videoExtensions.has(extension) || mimeType.startsWith('video/')) {
    return 'video';
  }

  return null;
}

export function createMediaFile(input: MediaFileInput): MediaFile | null {
  const mimeType = input.mimeType ?? '';
  const kind = getMediaKind(input.name, mimeType);

  if (!kind) {
    return null;
  }

  const extension = getFileExtension(input.name);
  const identity = input.path || `${input.source}:${input.name}:${input.size}`;

  return {
    id: identity,
    name: input.name,
    extension,
    kind,
    mimeType,
    size: input.size,
    path: input.path,
    source: input.source
  };
}

export function mergeMediaFiles(current: MediaFile[], incoming: MediaFile[]): MediaFile[] {
  const existingIds = new Set(current.map((file) => file.id));
  const uniqueIncoming = incoming.filter((file) => !existingIds.has(file.id));

  return uniqueIncoming.length > 0 ? [...current, ...uniqueIncoming] : current;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}
