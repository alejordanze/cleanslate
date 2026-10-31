import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { exiftoolPath } from 'exiftool-vendored';

import type { MetadataField, MetadataSnapshot } from '../shared/metadata';
import { t, type Language } from '../shared/i18n';

const execFileAsync = promisify(execFile);
const excludedGroups = new Set(['ExifTool', 'System', 'Composite']);
const excludedFileTags = new Set([
  'FileName', 'Directory', 'FileSize', 'FileType', 'FileTypeExtension', 'MIMEType',
  'FileModifyDate', 'FileAccessDate', 'FileInodeChangeDate', 'FilePermissions'
]);

function fieldLabel(tag: string): string {
  return tag
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\bId\b/g, 'ID');
}

function fieldValue(value: unknown, language: Language): string {
  if (Array.isArray(value)) return value.map((item) => fieldValue(item, language)).join(', ');
  if (value === null || value === '') return t(language, 'emptyValue');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function fieldsFromExiftool(data: Record<string, unknown>, language: Language): MetadataField[] {
  return Object.entries(data).flatMap(([key, value]) => {
    if (key === 'SourceFile' || key === 'Error' || key === 'Warning') return [];
    const separator = key.indexOf(':');
    if (separator < 0) return [];
    const group = key.slice(0, separator);
    const location = key.slice(separator + 1);
    const copy = location.match(/^Copy(\d+):/);
    const tag = location.replace(/^Copy\d+:/, '');
    if (excludedGroups.has(group) || (group === 'File' && excludedFileTags.has(tag))) return [];

    const label = fieldLabel(tag);
    return [{ key, group, label: copy ? t(language, 'copyLabel', { label, count: copy[1] }) : label, value: fieldValue(value, language) }];
  }).sort((a, b) => a.group.localeCompare(b.group) || a.label.localeCompare(b.label));
}

/** Read local media metadata without exposing filesystem-only fields to the UI. */
export async function inspectMetadata(filePath: string, language: Language = 'en'): Promise<MetadataSnapshot> {
  if (!filePath) return { fields: [], error: t(language, 'noReadablePath') };

  try {
    const binary = await exiftoolPath();
    const { stdout } = await execFileAsync(binary, ['-json', '-a', '-G1:4', '-s', filePath], {
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true
    });
    const data: unknown = JSON.parse(stdout);
    const first = Array.isArray(data) ? data[0] : null;
    if (!first || typeof first !== 'object' || 'Error' in first) throw new Error('ExifTool could not inspect the file.');

    return { fields: fieldsFromExiftool(first as Record<string, unknown>, language), error: null };
  } catch {
    return { fields: [], error: t(language, 'metadataReadFailed') };
  }
}
