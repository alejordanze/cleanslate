import { rm } from 'node:fs/promises';

import { isLanguage, type LanguageChoice } from '../shared/i18n';
import { readPreferenceFile, writePreferenceFile } from './preferenceFile';

export async function readLanguagePreference(path: string): Promise<LanguageChoice> {
  const saved = await readPreferenceFile(path);
  if (saved === null) return 'system';
  const language = saved && typeof saved === 'object' && 'language' in saved ? saved.language : null;
  if (isLanguage(language)) return language;
  throw new Error('The saved language is invalid.');
}

export async function writeLanguagePreference(path: string, language: LanguageChoice): Promise<void> {
  if (language === 'system') {
    await rm(path, { force: true });
    return;
  }
  if (!isLanguage(language)) throw new Error('Choose a supported language.');

  await writePreferenceFile(path, { language });
}
