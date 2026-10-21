import { useEffect, useState } from "react";
import type { MetadataSaveMode } from "../../../shared/metadata";
import { saveOutputPreference } from "../services/outputPreference";
import type { Notice } from "../types";

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
  const [draftMode, setDraftMode] = useState<MetadataSaveMode | null>(savedMode);
  const [settingsNotice, setSettingsNotice] = useState<Notice | null>(null);
  const [isSavingPreference, setIsSavingPreference] = useState(false);

  useEffect(() => {
    setDraftMode(savedMode);
  }, [savedMode]);

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
            ? "Saved. CleanSlate will ask where to save each time."
            : "Saved. CleanSlate will use this option automatically.",
      });
    } catch {
      setSettingsNotice({
        tone: "warning",
        text: "Could not save the output setting. Please try again.",
      });
    } finally {
      setIsSavingPreference(false);
    }
  }
  return (
    <>
      <section className="page-heading">
        <h1 id="settings-title" className="settings-title">
          Preferences
        </h1>
        <span className="section-kicker">
          Keep it <em>your way.</em>
        </span>
      </section>
      <section className="settings-section" aria-labelledby="settings-title">
        <div className="settings-items">
          <div>
            <span className="section-kicker">Default save option</span>
          </div>
          <p className="settings-copy">
            Save an output option to use it automatically whenever you clean
            files.
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
                <strong>Save new cleaned copies</strong>
                <small>
                  Keep originals and save copies beside them with{" "}
                  <code>_cleaned</code> in the filename.
                </small>
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
                <strong>Replace the original files</strong>
                <small>Clean each file in place. This cannot be undone.</small>
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
                <strong>Ask me each time</strong>
                <small>
                  Choose where to save each batch when you clean it.
                </small>
              </span>
            </label>
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
            {isSavingPreference ? "Saving..." : "Save"}
          </button>
          <button
            className="button button--secondary"
            type="button"
            onClick={onBack}
            disabled={preferenceLoading || isSavingPreference}
          >
            Back
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
