import { useState, type DragEvent } from "react";
import { createMediaFile, type MediaFile } from "../../../shared/media";
import type { MetadataProcessResult, MetadataSaveMode } from "../../../shared/metadata";
import { FileRow } from "./FileRow";
import { getBridge } from "../services/bridge";
import type { Notice } from "../types";
import folderOpenIcon from "../../../../icons/open-folder.svg";
import removeAllIcon from "../../../../icons/remove-all.svg";
import rightArrowIcon from "../../../../icons/right-arrow.svg";

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
  message,
}: HomeProps) => {
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
        text: "The file bridge is unavailable. Restart the app and try again.",
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
        text: "Only image and video files can be added. Unsupported files were skipped.",
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
        text: "Could not open the file picker. Please try again.",
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
          Make your files <em>quietly private.</em>
        </h1>
        <p>
          Remove hidden metadata from photos and videos before you share them.
        </p>
      </section>

      <section className="file-section" aria-live="polite">
        <div className="section-heading">
          <h2>
            {files.length === 0
              ? "Your files"
              : `${files.length} file${files.length === 1 ? "" : "s"} ready`}
          </h2>
          {files.length > 0 && (
            <button
              className="remove-all-button"
              type="button"
              onClick={onClearFiles}
              aria-label="Remove all files from queue"
            >
              <img src={removeAllIcon} alt="" />
              <span>Remove all</span>
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
                {isDragging ? "Release to add files" : "Drop files here"}
              </strong>
              <span>Images and videos, one or many at a time</span>
            </div>
          ) : (
            <div className="file-list">
              <span className="file-list-hint">
                Drop more files anywhere in this queue
              </span>
              {files.map((file) => (
                <FileRow
                  key={file.id}
                  file={file}
                  result={fileResults.get(file.id)}
                  onRemove={onRemoveFile}
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
            {isPicking ? "Opening..." : "Attach files"}
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
              <span className="process-label">Ready when you are</span>
              <span className="process-note">
                {files.length === 0
                  ? "Add at least one image or video to begin."
                  : savedMode === "new"
                    ? "Cleaned copies will be saved beside the originals. Change this in Settings."
                    : savedMode === "replace"
                      ? "Original files will be replaced. Change this in Settings."
                      : "You’ll choose where to save the cleaned files before cleaning."}
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
          {isProcessing ? "Cleaning..." : "Remove metadata"}
          <img className="button-arrow" src={rightArrowIcon} alt="" />
        </button>
      </footer>
    </>
  );
};

export default Home;
