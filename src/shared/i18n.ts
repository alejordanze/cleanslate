import en from './locales/en';
import es from './locales/es';
import fr from './locales/fr';
import zh from './locales/zh-CN';
import de from './locales/de';
import ja from './locales/ja';
import pt from './locales/pt-BR';

export const languages = ['en', 'es', 'fr', 'zh-CN', 'de', 'ja', 'pt-BR'] as const;
export type Language = typeof languages[number];
export type LanguageChoice = Language | 'system';
export type LanguageSettings = { choice: LanguageChoice; language: Language };

export const languageNames: Record<Language, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  'zh-CN': '简体中文',
  de: 'Deutsch',
  ja: '日本語',
  'pt-BR': 'Português (Brasil)'
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (languages as readonly string[]).includes(value);
}

export function preferredLanguage(preferred: readonly string[]): Language {
  for (const value of preferred) {
    const locale = value.toLowerCase().replace('_', '-');
    if (locale === 'zh' || locale.startsWith('zh-hans') || locale.startsWith('zh-cn') || locale.startsWith('zh-sg')) return 'zh-CN';
    if (locale.startsWith('zh-')) continue;
    if (locale.startsWith('pt')) return 'pt-BR';
    for (const language of languages) {
      if (language !== 'zh-CN' && language !== 'pt-BR' && (locale === language || locale.startsWith(`${language}-`))) return language;
    }
  }
  return 'en';
}

export type MessageKey = keyof typeof en;
type Catalog = Record<MessageKey, string>;

export const catalogs: Record<Language, Catalog> = {
  en, es, fr, 'zh-CN': zh, de, ja, 'pt-BR': pt
};

export function t(language: Language, key: MessageKey, values?: Record<string, string | number>): string {
  return catalogs[language][key].replace(/\{(\w+)\}/g, (match, name: string) => values?.[name] === undefined ? match : String(values[name]));
}

export function plural(language: Language, one: MessageKey, other: MessageKey, count: number): string {
  const key = new Intl.PluralRules(language).select(count) === 'one' ? one : other;
  return t(language, key, { count: new Intl.NumberFormat(language).format(count) });
}
