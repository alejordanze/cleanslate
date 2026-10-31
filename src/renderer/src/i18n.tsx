import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { plural, t, type LanguageChoice, type LanguageSettings, type MessageKey } from '../../shared/i18n';

type I18nContextValue = {
  settings: LanguageSettings;
  changeLanguage: (choice: LanguageChoice) => Promise<void>;
};

const defaultSettings: LanguageSettings = { choice: 'system', language: 'en' };
const I18nContext = createContext<I18nContextValue>({
  settings: defaultSettings,
  changeLanguage: async () => undefined
});

export function I18nProvider({ initialSettings, children }: { initialSettings: LanguageSettings; children: ReactNode }) {
  const [settings, setSettings] = useState(initialSettings);

  useEffect(() => {
    document.documentElement.lang = settings.language;
  }, [settings.language]);

  useEffect(() => window.cleanslate?.onLanguageChanged(setSettings), []);

  async function changeLanguage(choice: LanguageChoice): Promise<void> {
    const bridge = window.cleanslate;
    if (!bridge) throw new Error('The CleanSlate bridge is unavailable.');
    setSettings(await bridge.saveLanguageChoice(choice));
  }

  return <I18nContext.Provider value={{ settings, changeLanguage }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const { settings, changeLanguage } = useContext(I18nContext);
  return {
    ...settings,
    changeLanguage,
    t: (key: MessageKey, values?: Record<string, string | number>) => t(settings.language, key, values),
    plural: (one: MessageKey, other: MessageKey, count: number) => plural(settings.language, one, other, count),
    formatNumber: (value: number) => new Intl.NumberFormat(settings.language).format(value)
  };
}
