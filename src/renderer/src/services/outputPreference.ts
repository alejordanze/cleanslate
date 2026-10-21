import type { MetadataSaveMode } from '../../../shared/metadata';
import { getBridge } from './bridge';
import { clearLegacyOutputMode, readLegacyOutputMode } from './legacyOutputPreference';

export async function loadOutputPreference(): Promise<MetadataSaveMode | null> {
  let mode = await getBridge().getOutputPreference();

  if (mode === null) {
    const legacyMode = readLegacyOutputMode();
    if (legacyMode) {
      await saveOutputPreference(legacyMode);
      mode = legacyMode;
    }
  }

  return mode;
}

export async function saveOutputPreference(mode: MetadataSaveMode | null): Promise<void> {
  await getBridge().saveOutputPreference(mode);
  clearLegacyOutputMode();
}
