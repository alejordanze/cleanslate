import { useEffect, useState, type DragEvent } from 'react';

import type { FfmpegCheckResult } from '../../shared/ffmpeg';
import type { MetadataSaveMode } from '../../shared/metadata';
import folderOpenIcon from '../../../open-folder.svg';
import cleanSlateMark from '../../../icons/logo-options/clear-folder.svg';
import {
  createMediaFile,
  formatFileSize,
  getFileStem,
  mergeMediaFiles,
  type MediaFile
} from '../../shared/media';

type RuntimeStatus = 'loading' | 'ready' | 'error';

function getBridge() {
  const bridge = window.cleanslate;

  if (!bridge) {
    throw new Error('Electron preload bridge is unavailable. Restart the app with npm run dev.');
  }

  return bridge;
}

function getMetadataBridge() {
  const bridge = getBridge();

  if (typeof bridge.removeMetadata !== 'function') {
    throw new Error('The CleanSlate bridge is out of date. Fully quit and restart the app to load the latest version.');
  }

  return bridge;
}

function App() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveMode, setSaveMode] = useState<MetadataSaveMode>('new');
  const [message, setMessage] = useState<string | null>(null);
  const [ffmpegStatus, setFfmpegStatus] = useState<RuntimeStatus>('loading');
  const [ffmpegResult, setFfmpegResult] = useState<FfmpegCheckResult | null>(null);

  useEffect(() => {
    async function checkFfmpeg() {
      try {
        const result = await getBridge().inspectFfmpeg();
        setFfmpegResult(result);
        setFfmpegStatus(result.available ? 'ready' : 'error');
      } catch {
        setFfmpegStatus('error');
      }
    }

    void checkFfmpeg();
  }, []);

  function addFiles(incoming: MediaFile[]) {
    if (incoming.length === 0) {
      return;
    }

    setFiles((current) => mergeMediaFiles(current, incoming));
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    setMessage(null);

    const bridge = window.cleanslate;
    const droppedFiles = Array.from(event.dataTransfer.files);

    if (!bridge) {
      setMessage('The Electron file bridge is unavailable. Restart the app and try again.');
      return;
    }

    const mediaFiles = droppedFiles.flatMap((file) => {
      let path = '';

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
        source: 'drop'
      });

      return mediaFile ? [mediaFile] : [];
    });

    if (mediaFiles.length !== droppedFiles.length) {
      setMessage('Only image and video files can be added. Unsupported files were skipped.');
    }

    addFiles(mediaFiles);
  }

  async function handlePickFiles() {
    setIsPicking(true);
    setMessage(null);

    try {
      addFiles(await getBridge().pickMediaFiles());
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Could not open the media picker.');
    } finally {
      setIsPicking(false);
    }
  }

  async function handleRemoveMetadata() {
    if (files.length === 0 || isProcessing) {
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      const result = await getMetadataBridge().removeMetadata({
        mode: saveMode,
        files: files.map(({ id, name, path, kind }) => ({ id, name, path, kind }))
      });

      const resultById = new Map(result.results.map((fileResult) => [fileResult.id, fileResult]));

      setFiles((current) => current.map((file) => {
        const fileResult = resultById.get(file.id);

        return fileResult?.ok && fileResult.size !== null && fileResult.outputPath === file.path
          ? { ...file, size: fileResult.size }
          : file;
      }));

      if (result.failed === 0) {
        setMessage(
          saveMode === 'new'
            ? `Metadata removed from ${result.succeeded} file${result.succeeded === 1 ? '' : 's'}. Cleaned copies were saved beside the originals.`
            : `Metadata removed from ${result.succeeded} file${result.succeeded === 1 ? '' : 's'}. The original files were updated.`
        );
      } else {
        const errors = result.results
          .filter((fileResult) => !fileResult.ok && fileResult.error)
          .map((fileResult) => fileResult.error)
          .slice(0, 2)
          .join(' ');
        setMessage(`${result.succeeded} cleaned, ${result.failed} failed. ${errors}`.trim());
      }

      setIsSaveDialogOpen(false);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Could not remove metadata.');
      setIsSaveDialogOpen(false);
    } finally {
      setIsProcessing(false);
    }
  }

  function removeFile(id: string) {
    setFiles((current) => current.filter((file) => file.id !== id));
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragging(false);
    }
  }

  const runtimeLabel =
    ffmpegStatus === 'loading'
      ? 'Checking FFmpeg'
      : ffmpegStatus === 'ready'
        ? 'FFmpeg ready'
        : 'FFmpeg unavailable';

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand">
          <img className="brand-mark" src={cleanSlateMark} alt="" />
          <span className="brand-name">CleanSlate</span>
          <span className="brand-tag">media privacy</span>
        </div>

        <span className="runtime-pill" data-state={ffmpegStatus}>
          <span className="runtime-dot" />
          {runtimeLabel}
        </span>
      </header>

      <section className="page-heading">
        <div>
          <span className="section-kicker">01 / Add media</span>
          <h1>Make your files <em>quietly private.</em></h1>
        </div>
      </section>

      <section className="file-section" aria-live="polite">
        <div className="section-heading">
          <div>
            <span className="section-kicker">02 / Review</span>
            <h2>{files.length === 0 ? 'Nothing added yet' : `${files.length} file${files.length === 1 ? '' : 's'} ready`}</h2>
          </div>
          {files.length > 0 && (
            <button className="text-button" type="button" onClick={() => setFiles([])}>
              Clear all
            </button>
          )}
        </div>

        <div
          className={`file-board${isDragging ? ' is-dragging' : ''}`}
          onDragEnter={() => setIsDragging(true)}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
          }}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {files.length === 0 ? (
            <div className="empty-state">
              <div className="drop-orbit" aria-hidden="true">
                <img className="drop-orbit__icon" src={folderOpenIcon} alt="" />
              </div>
              <strong>{isDragging ? 'Release to add files' : 'Drop files here'}</strong>
              <span>Images and videos, one or many at a time</span>
            </div>
          ) : (
            <div className="file-list">
              <span className="file-list-hint">Drop more files anywhere in this queue</span>
              {files.map((file) => (
                <article className="file-row" key={file.id}>
                  <span className={`file-kind file-kind--${file.kind}`} aria-hidden="true">
                    {file.kind === 'image' ? 'IMG' : 'VID'}
                  </span>
                  <div className="file-details">
                    <strong title={file.name}>{getFileStem(file.name)}</strong>
                    <span>
                      {file.extension ? `.${file.extension}` : 'Media file'}
                      <span className="file-meta-separator">/</span>
                      {formatFileSize(file.size)}
                      <span className="file-meta-separator">/</span>
                      {file.source === 'drop' ? 'Dropped' : 'Attached'}
                    </span>
                  </div>
                  <button className="remove-button" type="button" onClick={() => removeFile(file.id)} aria-label={`Remove ${file.name}`}>
                    Remove
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="process-bar">
        <div className="process-info">
          <button className="button button--secondary" type="button" onClick={() => void handlePickFiles()} disabled={isPicking}>
            <span className="attach-mark" aria-hidden="true">+</span>
            {isPicking ? 'Opening...' : 'Attach files'}
          </button>
          {message ? (
            <span className="process-note process-note--warning" role="status">{message}</span>
          ) : (
            <div className="process-copy">
              <span className="process-label">Ready when you are</span>
              <span className="process-note">
                {files.length === 0 ? 'Add at least one image or video to begin.' : 'Metadata removal will be available in the next step.'}
              </span>
            </div>
          )}
        </div>
        <button
          className="button button--primary"
          type="button"
          onClick={() => {
            setMessage(null);
            setIsSaveDialogOpen(true);
          }}
          disabled={files.length === 0 || isProcessing}
        >
          {isProcessing ? 'Cleaning...' : 'Remove metadata'}
          <span className="button-arrow">-&gt;</span>
        </button>
      </footer>

      {isSaveDialogOpen && (
        <div className="modal-backdrop">
          <section className="save-dialog" role="dialog" aria-modal="true" aria-labelledby="save-dialog-title">
            <span className="section-kicker">03 / Clean export</span>
            <h2 id="save-dialog-title">Where should the cleaned files go?</h2>
            <p className="save-dialog-copy">
              Choose whether CleanSlate should update the originals or make new copies beside them.
              Images are re-encoded to remove embedded EXIF; video streams are copied without re-encoding.
            </p>

            <div className="save-options">
              <label className={`save-option${saveMode === 'new' ? ' is-selected' : ''}`}>
                <input
                  type="radio"
                  name="save-mode"
                  value="new"
                  checked={saveMode === 'new'}
                  onChange={() => setSaveMode('new')}
                />
                <span>
                  <strong>Save new cleaned copies</strong>
                  <small>Adds <code>_cleaned</code> to each filename and saves it beside the original.</small>
                </span>
              </label>

              <label className={`save-option${saveMode === 'replace' ? ' is-selected' : ''}`}>
                <input
                  type="radio"
                  name="save-mode"
                  value="replace"
                  checked={saveMode === 'replace'}
                  onChange={() => setSaveMode('replace')}
                />
                <span>
                  <strong>Replace the original files</strong>
                  <small>Updates each attached file in place. This cannot be undone.</small>
                </span>
              </label>
            </div>

            <div className="save-dialog-actions">
              <button className="text-button" type="button" onClick={() => setIsSaveDialogOpen(false)} disabled={isProcessing}>
                Cancel
              </button>
              <button className="button button--primary" type="button" onClick={() => void handleRemoveMetadata()} disabled={isProcessing}>
                {isProcessing ? 'Cleaning...' : 'Clean files'}
                <span className="button-arrow">-&gt;</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {ffmpegResult && <span className="sr-only">{ffmpegResult.versionLine}</span>}
    </main>
  );
}

export default App;
