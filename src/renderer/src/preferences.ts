import type { MetadataSaveMode } from '../../shared/metadata';

const outputModeKey = 'cleanslate.output-mode';

/** Read the setting stored by earlier development builds before migrating it to app data. */
export function readLegacyOutputMode(storage?: Pick<Storage, 'getItem'>): MetadataSaveMode | null {
  try {
    const value = (storage ?? window.localStorage).getItem(outputModeKey);
    return value === 'new' || value === 'replace' ? value : null;
  } catch {
    return null;
  }
}

export function clearLegacyOutputMode(storage?: Pick<Storage, 'removeItem'>): void {
  try {
    (storage ?? window.localStorage).removeItem(outputModeKey);
  } catch {
    // The new app-data setting is already saved.
  }
}
