import { useEffect, useState, type DragEvent } from 'react';

import type { MetadataProcessResult, MetadataSaveMode } from '../../shared/metadata';
import folderOpenIcon from '../../../icons/open-folder.svg';
import cleanSlateMark from '../../../icons/clear-folder.svg';
import gearIcon from '../../../icons/gear-svgrepo-com.svg';
import rightArrowIcon from '../../../icons/right-arrow.svg';
import { clearLegacyOutputMode, readLegacyOutputMode } from './preferences';
import { FileRow } from './FileRow';
import {
  createMediaFile,
  mergeMediaFiles,
  type MediaFile
} from '../../shared/media';

type Notice = { tone: 'warning' | 'success'; text: string };

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
  const [view, setView] = useState<'files' | 'settings'>('files');
  const [savedMode, setSavedMode] = useState<MetadataSaveMode | null>(null);
  const [draftMode, setDraftMode] = useState<MetadataSaveMode | null>(null);
  const [saveMode, setSaveMode] = useState<MetadataSaveMode>('new');
  const [rememberChoice, setRememberChoice] = useState(false);
  const [preferenceLoading, setPreferenceLoading] = useState(true);
  const [isSavingPreference, setIsSavingPreference] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<Notice | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [message, setMessage] = useState<Notice | null>(null);
  const [fileResults, setFileResults] = useState<Map<string, MetadataProcessResult>>(() => new Map());
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const bridge = window.cleanslate;
    if (!bridge) return;

    let active = true;
    void bridge.isWindowMaximized().then((maximized) => {
      if (active) setIsMaximized(maximized);
    }).catch(() => undefined);
    const unsubscribe = bridge.onWindowMaximized(setIsMaximized);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const bridge = window.cleanslate;
    if (!bridge) {
      setPreferenceLoading(false);
      return;
    }

    let active = true;
    void (async () => {
      try {
        let mode = await bridge.getOutputPreference();
        if (!active) return;

        if (mode === null) {
          const legacyMode = readLegacyOutputMode();
          if (legacyMode) {
            await bridge.saveOutputPreference(legacyMode);
            clearLegacyOutputMode();
            mode = legacyMode;
          }
        }

        if (active) {
          setSavedMode(mode);
          setDraftMode(mode);
        }
      } catch {
        if (active) setMessage({ tone: 'warning', text: 'Could not load your output setting. Choose one before cleaning.' });
      } finally {
        if (active) setPreferenceLoading(false);
      }
    })();

    return () => { active = false; };
  }, []);

  function addFiles(incoming: MediaFile[]) {
    if (incoming.length === 0) {
      return;
    }

    setFiles((current) => mergeMediaFiles(current, incoming));
  }

  async function saveOutputSetting() {
    setIsSavingPreference(true);
    setSettingsNotice(null);
    try {
      await getBridge().saveOutputPreference(draftMode);
      setSavedMode(draftMode);
      clearLegacyOutputMode();
      setSettingsNotice({
        tone: 'success',
        text: draftMode === null
          ? 'Saved. CleanSlate will ask where to save each time.'
          : 'Saved. CleanSlate will use this option automatically.'
      });
    } catch {
      setSettingsNotice({ tone: 'warning', text: 'Could not save the output setting. Please try again.' });
    } finally {
      setIsSavingPreference(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    setMessage(null);

    const bridge = window.cleanslate;
    const droppedFiles = Array.from(event.dataTransfer.files);

    if (!bridge) {
      setMessage({ tone: 'warning', text: 'The file bridge is unavailable. Restart the app and try again.' });
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
      setMessage({ tone: 'warning', text: 'Only image and video files can be added. Unsupported files were skipped.' });
    }

    addFiles(mediaFiles);
  }

  async function handlePickFiles() {
    setIsPicking(true);
    setMessage(null);

    try {
      addFiles(await getBridge().pickMediaFiles());
    } catch {
      setMessage({ tone: 'warning', text: 'Could not open the file picker. Please try again.' });
    } finally {
      setIsPicking(false);
    }
  }

  async function handleRemoveMetadata(mode: MetadataSaveMode, remember = false) {
    if (files.length === 0 || isProcessing) {
      return;
    }

    setIsProcessing(true);
    setMessage(null);
    setDialogError(null);

    try {
      if (remember) {
        try {
          await getBridge().saveOutputPreference(mode);
          setSavedMode(mode);
          setDraftMode(mode);
          clearLegacyOutputMode();
        } catch {
          setDialogError('Could not remember your choice. Try again or uncheck the box to continue.');
          return;
        }
      }

      setFileResults(new Map());
      const result = await getMetadataBridge().removeMetadata({
        mode,
        files: files.map(({ id, name, path, kind }) => ({ id, name, path, kind }))
      });

      const resultById = new Map(result.results.map((fileResult) => [fileResult.id, fileResult]));
      setFileResults(resultById);

      setFiles((current) => current.map((file) => {
        const fileResult = resultById.get(file.id);

        return fileResult?.ok && fileResult.size !== null && fileResult.outputPath === file.path
          ? { ...file, size: fileResult.size }
          : file;
      }));

      if (result.failed === 0) {
        setMessage({
          tone: 'success',
          text: mode === 'new'
            ? `Metadata removed from ${result.succeeded} file${result.succeeded === 1 ? '' : 's'}. Cleaned copies were saved beside the originals.`
            : `Metadata removed from ${result.succeeded} file${result.succeeded === 1 ? '' : 's'}. The original files were updated.`
        });
      } else {
        const firstError = result.results.find((fileResult) => !fileResult.ok)?.error;
        const summary = result.succeeded > 0
          ? `Cleaned ${result.succeeded} file${result.succeeded === 1 ? '' : 's'}. `
          : '';
        const detail = result.failed === 1 && firstError
          ? firstError
          : `Could not process ${result.failed} files. Check that they open normally and try again.`;
        setMessage({ tone: 'warning', text: `${summary}${detail}` });
      }

      setIsSaveDialogOpen(false);
    } catch {
      setMessage({ tone: 'warning', text: 'Could not remove metadata. Please try again.' });
      setIsSaveDialogOpen(false);
    } finally {
      setIsProcessing(false);
    }
  }

  function removeFile(id: string) {
    setFiles((current) => current.filter((file) => file.id !== id));
    setFileResults((current) => {
      const next = new Map(current);
      next.delete(id);
      return next;
    });
  }

  function openSettings() {
    if (view === 'settings') {
      setView('files');
      return;
    }
    setDraftMode(savedMode);
    setSettingsNotice(null);
    setView('settings');
  }

  function startCleaning() {
    setMessage(null);
    if (savedMode !== null) {
      void handleRemoveMetadata(savedMode);
      return;
    }
    setSaveMode('new');
    setRememberChoice(false);
    setDialogError(null);
    setIsSaveDialogOpen(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragging(false);
    }
  }

  return (
    <div className="window-root">
      <header className="window-bar" aria-label="Window controls">
        <div className="window-controls">
          <button className="window-control window-control--close" type="button" onClick={() => getBridge().closeWindow()} aria-label="Close window" title="Close window">
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m5 5 6 6m0-6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          </button>
          <button className="window-control window-control--minimize" type="button" onClick={() => getBridge().minimizeWindow()} aria-label="Minimize window" title="Minimize window">
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4.5 8h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          </button>
          <button
            className="window-control window-control--maximize"
            type="button"
            onClick={() => void getBridge().toggleMaximizeWindow().then(setIsMaximized)}
            aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
            title={isMaximized ? 'Restore window' : 'Maximize window'}
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              {isMaximized ? <path d="M6 4.5h5.5V10M4.5 6H10v5.5H4.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                : <rect x="4.5" y="4.5" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />}
            </svg>
          </button>
        </div>
        <div className="window-bar__drag" aria-hidden="true" />
        <button
          className={`settings-icon-button${view === 'settings' ? ' is-active' : ''}`}
          type="button"
          onClick={openSettings}
          aria-label={view === 'settings' ? 'Back to files' : 'Open settings'}
          title={view === 'settings' ? 'Back to files' : 'Settings'}
          aria-pressed={view === 'settings'}
        >
          <img src={gearIcon} alt="" />
        </button>
      </header>
    <main className="app-shell">
      <header className="app-header">
        <div className="brand">
          <img className="brand-mark" src={cleanSlateMark} alt="" />
          <span className="brand-name">CleanSlate</span>
          <span className="brand-tag">media privacy</span>
        </div>
      </header>

      {view === 'files' ? <>
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
            <button className="text-button" type="button" onClick={() => { setFiles([]); setFileResults(new Map()); }}>
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
                <FileRow key={file.id} file={file} result={fileResults.get(file.id)} onRemove={removeFile} />
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
            <span className={`process-note process-note--${message.tone}`} role="status">
              {message.tone === 'warning' && (
                <svg className="notice-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M10 9v4m0-7h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              )}
              <span>{message.text}</span>
            </span>
          ) : (
            <div className="process-copy">
              <span className="process-label">Ready when you are</span>
              <span className="process-note">
                {files.length === 0
                  ? 'Add at least one image or video to begin.'
                  : savedMode === 'new'
                    ? 'Cleaned copies will be saved beside the originals. Change this in Settings.'
                    : savedMode === 'replace'
                      ? 'Original files will be replaced. Change this in Settings.'
                      : 'Choose where to save the cleaned files in the next step.'}
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
          {isProcessing ? 'Cleaning...' : 'Remove metadata'}
          <img className="button-arrow" src={rightArrowIcon} alt="" />
        </button>
      </footer>
      </> : <>
        <section className="page-heading">
          <span className="section-kicker">Preferences</span>
          <h1>Keep it <em>your way.</em></h1>
        </section>
        <section className="settings-section" aria-labelledby="settings-title">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Output</span>
              <h2 id="settings-title">Default save option</h2>
            </div>
          </div>
          <p className="settings-copy">Save an output option to use it automatically whenever you clean files.</p>
          <div className="save-options settings-options">
            <label className={`save-option${draftMode === 'new' ? ' is-selected' : ''}`}>
              <input type="radio" name="preferred-mode" value="new" checked={draftMode === 'new'} onChange={() => { setDraftMode('new'); setSettingsNotice(null); }} disabled={preferenceLoading || isSavingPreference} />
              <span>
                <strong>Save new cleaned copies</strong>
                <small>Keep originals and save copies beside them with <code>_cleaned</code> in the filename.</small>
              </span>
            </label>
            <label className={`save-option${draftMode === 'replace' ? ' is-selected' : ''}`}>
              <input type="radio" name="preferred-mode" value="replace" checked={draftMode === 'replace'} onChange={() => { setDraftMode('replace'); setSettingsNotice(null); }} disabled={preferenceLoading || isSavingPreference} />
              <span>
                <strong>Replace the original files</strong>
                <small>Clean each file in place. This cannot be undone.</small>
              </span>
            </label>
            <label className={`save-option${draftMode === null ? ' is-selected' : ''}`}>
              <input type="radio" name="preferred-mode" value="ask" checked={draftMode === null} onChange={() => { setDraftMode(null); setSettingsNotice(null); }} disabled={preferenceLoading || isSavingPreference} />
              <span>
                <strong>Ask me each time</strong>
                <small>Choose where to save each batch when you clean it.</small>
              </span>
            </label>
          </div>
          <div className="settings-actions">
            {settingsNotice && <span className={`settings-notice settings-notice--${settingsNotice.tone}`} role="status">{settingsNotice.text}</span>}
            <button className="button button--primary" type="button" onClick={() => void saveOutputSetting()} disabled={preferenceLoading || isSavingPreference || draftMode === savedMode}>
              {isSavingPreference ? 'Saving...' : 'Save output setting'}
            </button>
          </div>
        </section>
      </>}

      {isSaveDialogOpen && (
        <div className="modal-backdrop">
          <section className="save-dialog" role="dialog" aria-modal="true" aria-labelledby="save-dialog-title">
            <span className="section-kicker">03 / Clean export</span>
            <h2 id="save-dialog-title">Where should the cleaned files go?</h2>
            <p className="save-dialog-copy">
              Choose whether CleanSlate should update the originals or make new copies beside them.
              Most images are re-encoded; HEIC and camera RAW files are cleaned with ExifTool.
              Video streams are copied without re-encoding.
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

            <label className="remember-option">
              <input type="checkbox" checked={rememberChoice} onChange={(event) => setRememberChoice(event.target.checked)} />
              Remember this choice for next time
            </label>

            {dialogError && <p className="dialog-error" role="alert">{dialogError}</p>}

            <div className="save-dialog-actions">
              <button className="text-button" type="button" onClick={() => setIsSaveDialogOpen(false)} disabled={isProcessing}>
                Cancel
              </button>
              <button className="button button--primary" type="button" onClick={() => void handleRemoveMetadata(saveMode, rememberChoice)} disabled={isProcessing}>
                {isProcessing ? 'Cleaning...' : 'Clean files'}
                <img className="button-arrow" src={rightArrowIcon} alt="" />
              </button>
            </div>
          </section>
        </div>
      )}

    </main>
    </div>
  );
}

export default App;
