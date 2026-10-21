import { useState } from "react";
import type { MetadataSaveMode } from "../../../shared/metadata";
import rightArrowIcon from "../../../../icons/right-arrow.svg";

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
        <h2 id="save-dialog-title">Where should the cleaned files go?</h2>
        <p className="save-dialog-copy">
          Choose whether CleanSlate should update the originals or make new
          copies beside them. Most images are re-encoded; HEIC and camera RAW
          files are cleaned with ExifTool. Video streams are copied without
          re-encoding.
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
              <strong>Save new cleaned copies</strong>
              <small>
                Adds <code>_cleaned</code> to each filename and saves it beside
                the original.
              </small>
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
              <strong>Replace the original files</strong>
              <small>
                Updates each attached file in place. This cannot be undone.
              </small>
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
          Remember this choice for next time
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
            Cancel
          </button>
          <button
            className="button button--primary"
            type="button"
            onClick={() => void onClean(saveMode, rememberChoice)}
            disabled={isProcessing}
          >
            {isProcessing ? "Cleaning..." : "Clean files"}
            <img className="button-arrow" src={rightArrowIcon} alt="" />
          </button>
        </div>
      </section>
    </div>
  );
};

export default OutputDialog;
