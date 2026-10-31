import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { applicationMenuTemplate } from '../src/main/appMenu';
import { readLanguagePreference, writeLanguagePreference } from '../src/main/languagePreference';
import { catalogs, languages, preferredLanguage, t } from '../src/shared/i18n';

let directory: string | null = null;
afterEach(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });

describe('language selection', () => {
  it('uses the first supported system language and skips Traditional Chinese', () => {
    expect(preferredLanguage(['zh-Hant-TW', 'fr-CA', 'en-US'])).toBe('fr');
    expect(preferredLanguage(['zh-Hans-CN'])).toBe('zh-CN');
    expect(preferredLanguage(['pt-PT'])).toBe('pt-BR');
    expect(preferredLanguage(['ko-KR'])).toBe('en');
  });

  it('persists an explicit choice and removes the override for system default', async () => {
    directory = await mkdtemp(join(tmpdir(), 'cleanslate-language-'));
    const path = join(directory, 'language.json');
    expect(await readLanguagePreference(path)).toBe('system');
    await writeLanguagePreference(path, 'ja');
    expect(await readLanguagePreference(path)).toBe('ja');
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({ language: 'ja' });
    await writeLanguagePreference(path, 'system');
    expect(await readLanguagePreference(path)).toBe('system');
  });

  it('translates native menu labels and checks the selected language', () => {
    const choose = vi.fn();
    const menu = applicationMenuTemplate('fr', 'fr', choose, vi.fn(), vi.fn());
    expect(menu[1].label).toBe(t('fr', 'menuFile'));
    const appItems = menu[0].submenu as Array<{ label?: string; submenu?: Array<{ label?: string; checked?: boolean; click?: () => void }> }>;
    const languageMenu = appItems.find((item) => item.label === t('fr', 'language'))!;
    const french = languageMenu.submenu!.find((item) => item.label === 'Français')!;
    expect(french.checked).toBe(true);
    french.click?.();
    expect(choose).toHaveBeenCalledWith('fr');
  });

  it('has matching interpolation placeholders in every language', () => {
    const placeholders = (message: string) => [...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    for (const key of Object.keys(catalogs.en) as Array<keyof typeof catalogs.en>) {
      for (const language of languages) {
        expect(placeholders(catalogs[language][key]), `${language}.${key}`).toEqual(placeholders(catalogs.en[key]));
      }
    }
  });
});
