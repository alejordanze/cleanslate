import { useEffect, useState } from "react";
import type { MetadataSaveMode } from "../../../shared/metadata";
import { saveOutputPreference } from "../services/outputPreference";
import type { Notice } from "../types";
import { isLanguage, languageNames, languages } from "../../../shared/i18n";
import { useI18n } from "../i18n";

type PreferencesProps = {
  savedMode: MetadataSaveMode | null;
  preferenceLoading: boolean;
  onSavedMode: (mode: MetadataSaveMode | null) => void;
  onBack: () => void;
};

const Preferences = ({
  savedMode,
  preferenceLoading,
  onSavedMode,
  onBack,
}: PreferencesProps) => {
  const { choice, language, changeLanguage, t } = useI18n();
  const [draftMode, setDraftMode] = useState<MetadataSaveMode | null>(savedMode);
  const [settingsNotice, setSettingsNotice] = useState<Notice | null>(null);
  const [isSavingPreference, setIsSavingPreference] = useState(false);
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  const [languageNotice, setLanguageNotice] = useState<'saved' | 'failed' | null>(null);

  useEffect(() => {
    setDraftMode(savedMode);
  }, [savedMode]);

  useEffect(() => {
    setSettingsNotice(null);
  }, [language]);

  async function saveOutputSetting() {
    setIsSavingPreference(true);
    setSettingsNotice(null);
    try {
      await saveOutputPreference(draftMode);
      onSavedMode(draftMode);
      setSettingsNotice({
        tone: "success",
        text:
          draftMode === null
            ? t('outputSavedAsk')
            : t('outputSavedAutomatic'),
      });
    } catch {
      setSettingsNotice({
        tone: "warning",
        text: t('outputSaveFailed'),
      });
    } finally {
      setIsSavingPreference(false);
    }
  }

  async function selectLanguage(value: string) {
    if (value !== 'system' && !isLanguage(value)) return;
    setIsSavingLanguage(true);
    setLanguageNotice(null);
    try {
      await changeLanguage(value);
      setLanguageNotice('saved');
    } catch {
      setLanguageNotice('failed');
    } finally {
      setIsSavingLanguage(false);
    }
  }
  return (
    <>
      <section className="page-heading">
        <h1 id="settings-title" className="settings-title">
          {t('preferencesTitle')}
        </h1>
        <span className="section-kicker">
          {t('preferencesKickerLead')} <em>{t('preferencesKickerEm')}</em>
        </span>
      </section>
      <section className="settings-section" aria-labelledby="settings-title">
        <div className="settings-items">
          <div>
            <span className="section-kicker">{t('defaultSaveOption')}</span>
          </div>
          <p className="settings-copy">
            {t('settingsCopy')}
          </p>
          <div className="save-options settings-options">
            <label
              className={`save-option${draftMode === "new" ? " is-selected" : ""}`}
            >
              <input
                type="radio"
                name="preferred-mode"
                value="new"
                checked={draftMode === "new"}
                onChange={() => {
                  setDraftMode("new");
                  setSettingsNotice(null);
                }}
                disabled={preferenceLoading || isSavingPreference}
              />
              <span>
                <strong>{t('saveNewCopies')}</strong>
                <small>{t('saveNewCopiesDescription')}</small>
              </span>
            </label>
            <label
              className={`save-option${draftMode === "replace" ? " is-selected" : ""}`}
            >
              <input
                type="radio"
                name="preferred-mode"
                value="replace"
                checked={draftMode === "replace"}
                onChange={() => {
                  setDraftMode("replace");
                  setSettingsNotice(null);
                }}
                disabled={preferenceLoading || isSavingPreference}
              />
              <span>
                <strong>{t('replaceOriginals')}</strong>
                <small>{t('replaceOriginalsDescription')}</small>
              </span>
            </label>
            <label
              className={`save-option${draftMode === null ? " is-selected" : ""}`}
            >
              <input
                type="radio"
                name="preferred-mode"
                value="ask"
                checked={draftMode === null}
                onChange={() => {
                  setDraftMode(null);
                  setSettingsNotice(null);
                }}
                disabled={preferenceLoading || isSavingPreference}
              />
              <span>
                <strong>{t('askEachTime')}</strong>
                <small>{t('askEachTimeDescription')}</small>
              </span>
            </label>
          </div>
          <div className="language-setting">
            <label htmlFor="language-choice" className="section-kicker">{t('language')}</label>
            <p className="settings-copy">{t('languageDescription')}</p>
            <select
              id="language-choice"
              value={choice}
              disabled={isSavingLanguage}
              onChange={(event) => void selectLanguage(event.target.value)}
            >
              <option value="system">{t('systemDefault')}</option>
              {languages.map((option) => <option key={option} value={option}>{languageNames[option]}</option>)}
            </select>
            {languageNotice && <span className={`settings-notice settings-notice--${languageNotice === 'saved' ? 'success' : 'warning'}`} role="status">
              {t(languageNotice === 'saved' ? 'languageSaved' : 'languageSaveFailed')}
            </span>}
          </div>
        </div>
        <div className="settings-actions">
          <button
            className="button button--primary"
            type="button"
            onClick={() => void saveOutputSetting()}
            disabled={
              preferenceLoading || isSavingPreference || draftMode === savedMode
            }
          >
            {isSavingPreference ? t('saving') : t('save')}
          </button>
          <button
            className="button button--secondary"
            type="button"
            onClick={onBack}
            disabled={preferenceLoading || isSavingPreference}
          >
            {t('back')}
          </button>
          {settingsNotice && (
            <span
              className={`settings-notice settings-notice--${settingsNotice.tone}`}
              role="status"
            >
              {settingsNotice.text}
            </span>
          )}
        </div>
      </section>
    </>
  );
};

export default Preferences;
