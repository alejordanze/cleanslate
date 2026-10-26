import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { exiftoolPath } from 'exiftool-vendored';

import type { MetadataField, MetadataSnapshot } from '../shared/metadata';

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

function fieldValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(fieldValue).join(', ');
  if (value === null || value === '') return '(empty)';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function fieldsFromExiftool(data: Record<string, unknown>): MetadataField[] {
  return Object.entries(data).flatMap(([key, value]) => {
    if (key === 'SourceFile' || key === 'Error' || key === 'Warning') return [];
    const separator = key.indexOf(':');
    if (separator < 0) return [];
    const group = key.slice(0, separator);
    const location = key.slice(separator + 1);
    const copy = location.match(/^Copy(\d+):/);
    const tag = location.replace(/^Copy\d+:/, '');
    if (excludedGroups.has(group) || (group === 'File' && excludedFileTags.has(tag))) return [];

    return [{ key, group, label: `${fieldLabel(tag)}${copy ? ` (copy ${copy[1]})` : ''}`, value: fieldValue(value) }];
  }).sort((a, b) => a.group.localeCompare(b.group) || a.label.localeCompare(b.label));
}

/** Read local media metadata without exposing filesystem-only fields to the UI. */
export async function inspectMetadata(filePath: string): Promise<MetadataSnapshot> {
  if (!filePath) return { fields: [], error: 'This file has no readable local path.' };

  try {
    const binary = await exiftoolPath();
    const { stdout } = await execFileAsync(binary, ['-json', '-a', '-G1:4', '-s', filePath], {
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true
    });
    const data: unknown = JSON.parse(stdout);
    const first = Array.isArray(data) ? data[0] : null;
    if (!first || typeof first !== 'object' || 'Error' in first) throw new Error('ExifTool could not inspect the file.');

    return { fields: fieldsFromExiftool(first as Record<string, unknown>), error: null };
  } catch {
    return { fields: [], error: 'Could not read metadata from this file.' };
  }
}
