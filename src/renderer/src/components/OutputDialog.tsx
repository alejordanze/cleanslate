import { useState } from "react";
import type { MetadataSaveMode } from "../../../shared/metadata";
import rightArrowIcon from "../../../../icons/right-arrow.svg";
import { useI18n } from "../i18n";

type OutputDialogProps = {
  error: string | null;
  isProcessing: boolean;
  onCancel: () => void;
  onClean: (
    mode: MetadataSaveMode,
    rememberChoice: boolean,
  ) => Promise<void>;
};

const OutputDialog = ({
  error,
  isProcessing,
  onCancel,
  onClean,
}: OutputDialogProps) => {
  const { t } = useI18n();
  const [saveMode, setSaveMode] = useState<MetadataSaveMode>("new");
  const [rememberChoice, setRememberChoice] = useState(false);

  return (
    <div className="modal-backdrop">
      <section
        className="save-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-dialog-title"
      >
        <h2 id="save-dialog-title">{t('outputTitle')}</h2>
        <p className="save-dialog-copy">
          {t('outputDescription')}
        </p>

        <div className="save-options">
          <label
            className={`save-option${saveMode === "new" ? " is-selected" : ""}`}
          >
            <input
              type="radio"
              name="save-mode"
              value="new"
              checked={saveMode === "new"}
              onChange={() => setSaveMode("new")}
              disabled={isProcessing}
            />
            <span>
              <strong>{t('saveNewCopies')}</strong>
              <small>{t('copyOptionDescription')}</small>
            </span>
          </label>

          <label
            className={`save-option${saveMode === "replace" ? " is-selected" : ""}`}
          >
            <input
              type="radio"
              name="save-mode"
              value="replace"
              checked={saveMode === "replace"}
              onChange={() => setSaveMode("replace")}
              disabled={isProcessing}
            />
            <span>
              <strong>{t('replaceOriginals')}</strong>
              <small>{t('replaceOptionDescription')}</small>
            </span>
          </label>
        </div>

        <label className="remember-option">
          <input
            type="checkbox"
            checked={rememberChoice}
            onChange={(event) => setRememberChoice(event.target.checked)}
            disabled={isProcessing}
          />
          {t('rememberChoice')}
        </label>

        {error && (
          <p className="dialog-error" role="alert">
            {error}
          </p>
        )}

        <div className="save-dialog-actions">
          <button
            className="text-button"
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
          >
            {t('cancel')}
          </button>
          <button
            className="button button--primary"
            type="button"
            onClick={() => void onClean(saveMode, rememberChoice)}
            disabled={isProcessing}
          >
            {isProcessing ? t('cleaning') : t('cleanFiles')}
            <img className="button-arrow" src={rightArrowIcon} alt="" />
          </button>
        </div>
      </section>
    </div>
  );
};

export default OutputDialog;
