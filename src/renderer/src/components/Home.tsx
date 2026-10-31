import { useState, type DragEvent } from "react";
import { createMediaFile, type MediaFile } from "../../../shared/media";
import type { MetadataComparison, MetadataProcessResult, MetadataSaveMode } from "../../../shared/metadata";
import { FileRow } from "./FileRow";
import { getBridge } from "../services/bridge";
import type { Notice } from "../types";
import folderOpenIcon from "../../../../icons/open-folder.svg";
import removeAllIcon from "../../../../icons/remove-all.svg";
import rightArrowIcon from "../../../../icons/right-arrow.svg";
import { useI18n } from "../i18n";

type HomeProps = {
  files: MediaFile[];
  savedMode: MetadataSaveMode | null;
  preferenceLoading: boolean;
  isProcessing: boolean;
  startCleaning: () => void;
  fileResults: Map<string, MetadataProcessResult>;
  message: Notice | null;
  onMessage: (message: Notice | null) => void;
  onAddFiles: (files: MediaFile[]) => void;
  onRemoveFile: (id: string) => void;
  onClearFiles: () => void;
  onOpenMetadata: (file: MediaFile, comparison: MetadataComparison | null) => void;
};
const Home = ({
  files,
  savedMode,
  isProcessing,
  preferenceLoading,
  startCleaning,
  fileResults,
  onMessage,
  onAddFiles,
  onRemoveFile,
  onClearFiles,
  onOpenMetadata,
  message,
}: HomeProps) => {
  const { t, plural } = useI18n();
  const [isDragging, setIsDragging] = useState(false);
  const [isPicking, setIsPicking] = useState(false);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    onMessage(null);

    const bridge = window.cleanslate;
    const droppedFiles = Array.from(event.dataTransfer.files);

    if (!bridge) {
      onMessage({
        tone: "warning",
        text: t('fileBridgeUnavailable'),
      });
      return;
    }

    const mediaFiles = droppedFiles.flatMap((file) => {
      let path = "";

      try {
        path = bridge.getPathForFile(file);
      } catch {
        // The file can still be listed if the runtime cannot expose its local path.
      }

      const mediaFile = createMediaFile({
        name: file.name,
        mimeType: file.type,
        path,
        size: file.size,
        source: "drop",
      });

      return mediaFile ? [mediaFile] : [];
    });

    if (mediaFiles.length !== droppedFiles.length) {
      onMessage({
        tone: "warning",
        text: t('unsupportedFiles'),
      });
    }

    onAddFiles(mediaFiles);
  }

  async function handlePickFiles() {
    setIsPicking(true);
    onMessage(null);

    try {
      onAddFiles(await getBridge().pickMediaFiles());
    } catch {
      onMessage({
        tone: "warning",
        text: t('filePickerFailed'),
      });
    } finally {
      setIsPicking(false);
    }
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragging(false);
    }
  }

  return (
    <>
      <section className="page-heading">
        <h1>
          {t('homeHeadingLead')} <em>{t('homeHeadingEm')}</em>
        </h1>
        <p>
          {t('homeSubtitle')}
        </p>
      </section>

      <section className="file-section" aria-live="polite">
        <div className="section-heading">
          <h2>
            {files.length === 0
              ? t('yourFiles')
              : plural('filesReadyOne', 'filesReadyOther', files.length)}
          </h2>
          {files.length > 0 && (
            <button
              className="remove-all-button"
              type="button"
              onClick={onClearFiles}
              aria-label={t('removeAllAria')}
            >
              <img src={removeAllIcon} alt="" />
              <span>{t('removeAll')}</span>
            </button>
          )}
        </div>

        <div
          className={`file-board${isDragging ? " is-dragging" : ""}`}
          onDragEnter={() => setIsDragging(true)}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {files.length === 0 ? (
            <div className="empty-state">
              <div className="drop-orbit" aria-hidden="true">
                <img className="drop-orbit__icon" src={folderOpenIcon} alt="" />
              </div>
              <strong>
                {isDragging ? t('releaseToAdd') : t('dropFilesHere')}
              </strong>
              <span>{t('supportedMediaHint')}</span>
            </div>
          ) : (
            <div className="file-list">
              <span className="file-list-hint">
                {t('dropMoreFiles')}
              </span>
              {files.map((file) => (
                <FileRow
                  key={file.id}
                  file={file}
                  result={fileResults.get(file.id)}
                  onRemove={onRemoveFile}
                  onOpenMetadata={onOpenMetadata}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="process-bar">
        <div className="process-info">
          <button
            className="button button--secondary"
            type="button"
            onClick={() => void handlePickFiles()}
            disabled={isPicking}
          >
            <span className="attach-mark" aria-hidden="true">
              +
            </span>
            {isPicking ? t('opening') : t('attachFiles')}
          </button>
          {message ? (
            <span
              className={`process-note process-note--${message.tone}`}
              role="status"
            >
              {message.tone === "warning" && (
                <svg
                  className="notice-icon"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="10"
                    cy="10"
                    r="8"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                  <path
                    d="M10 9v4m0-7h.01"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              <span>{message.text}</span>
            </span>
          ) : (
            <div className="process-copy">
              <span className="process-label">{t('readyWhenYouAre')}</span>
              <span className="process-note">
                {files.length === 0
                  ? t('addFilePrompt')
                  : savedMode === "new"
                    ? t('copiesSavedHint')
                    : savedMode === "replace"
                      ? t('originalsReplacedHint')
                      : t('chooseOutputHint')}
              </span>
            </div>
          )}
        </div>
        <button
          className="button button--primary"
          type="button"
          onClick={startCleaning}
          disabled={files.length === 0 || isProcessing || preferenceLoading}
        >
          {isProcessing ? t('cleaning') : t('removeMetadata')}
          <img className="button-arrow" src={rightArrowIcon} alt="" />
        </button>
      </footer>
    </>
  );
};

export default Home;
