import { useEffect, useState, type DragEvent } from 'react';

import type { FfmpegCheckResult } from '../../shared/ffmpeg';
import {
  createMediaFile,
  formatFileSize,
  getFileStem,
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

function App() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
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

    setFiles((current) => {
      const existingIds = new Set(current.map((file) => file.id));
      const uniqueIncoming = incoming.filter((file) => !existingIds.has(file.id));

      return uniqueIncoming.length > 0 ? [...current, ...uniqueIncoming] : current;
    });
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
          <span className="brand-mark">CS</span>
          <span className="brand-name">CleanSlate</span>
          <span className="brand-tag">media privacy</span>
        </div>

        <span className="runtime-pill" data-state={ffmpegStatus}>
          <span className="runtime-dot" />
          {runtimeLabel}
        </span>
      </header>

      <section className="intro">
        <div>
          <span className="section-kicker">01 / Add media</span>
          <h1>Make your files<br /><em>quietly private.</em></h1>
        </div>
        <p>
          Drop in images and videos to prepare them for a clean export. Your files stay on this
          device while CleanSlate gets them ready for the next step.
        </p>
      </section>

      <section
        className={`drop-zone${isDragging ? ' is-dragging' : ''}`}
        onDragEnter={() => setIsDragging(true)}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="drop-orbit" aria-hidden="true">
          <span className="drop-orbit__inner">+</span>
        </div>
        <div className="drop-copy">
          <strong>{isDragging ? 'Release to add files' : 'Drop files here'}</strong>
          <span>Images and videos, one or many at a time</span>
        </div>
        <span className="drop-divider">or</span>
        <button className="button button--secondary" type="button" onClick={() => void handlePickFiles()} disabled={isPicking}>
          {isPicking ? 'Opening...' : 'Choose from device'}
        </button>
      </section>

      {message && <p className="notice" role="status">{message}</p>}

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

        {files.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__line" />
            <span>Files you add will appear here</span>
            <span className="empty-state__line" />
          </div>
        ) : (
          <div className="file-list">
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
      </section>

      <footer className="process-bar">
        <div>
          <span className="process-label">Ready when you are</span>
          <span className="process-note">
            {files.length === 0 ? 'Add at least one image or video to begin.' : 'Metadata removal will be available in the next step.'}
          </span>
        </div>
        <button className="button button--primary" type="button" disabled={files.length === 0}>
          Remove metadata
          <span className="button-arrow">-&gt;</span>
        </button>
      </footer>

      {ffmpegResult && <span className="sr-only">{ffmpegResult.versionLine}</span>}
    </main>
  );
}

export default App;
