import { useEffect, useState } from "react";

import type {
  MetadataProcessResult,
  MetadataSaveMode,
} from "../../shared/metadata";
import cleanSlateMark from "../../../icons/clear-folder.svg";
import { mergeMediaFiles, type MediaFile } from "../../shared/media";
import OutputDialog from "./components/OutputDialog";
import Home from "./components/Home";
import Preferences from "./components/Preferences";
import { WindowBar } from "./components/WindowBar";
import { loadOutputPreference, saveOutputPreference } from "./outputPreference";
import { processingNotice, removeMetadata, updateFileSizes } from "./processing";
import type { Notice } from "./types";

function App() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [view, setView] = useState<"files" | "settings">("files");
  const [savedMode, setSavedMode] = useState<MetadataSaveMode | null>(null);
  const [preferenceLoading, setPreferenceLoading] = useState(true);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [message, setMessage] = useState<Notice | null>(null);
  const [fileResults, setFileResults] = useState<
    Map<string, MetadataProcessResult>
  >(() => new Map());
  useEffect(() => {
    if (!window.cleanslate) {
      setPreferenceLoading(false);
      return;
    }

    let active = true;
    void (async () => {
      try {
        const mode = await loadOutputPreference();

        if (active) {
          setSavedMode(mode);
        }
      } catch {
        if (active)
          setMessage({
            tone: "warning",
            text: "Could not load your output setting. Choose one before cleaning.",
          });
      } finally {
        if (active) setPreferenceLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function handleRemoveMetadata(
    mode: MetadataSaveMode,
    remember = false,
  ) {
    if (files.length === 0 || isProcessing) {
      return;
    }

    setIsProcessing(true);
    setMessage(null);
    setDialogError(null);

    try {
      if (remember) {
        try {
          await saveOutputPreference(mode);
          setSavedMode(mode);
        } catch {
          setDialogError(
            "Could not remember your choice. Try again or uncheck the box to continue.",
          );
          return;
        }
      }

      setFileResults(new Map());
      const result = await removeMetadata(files, mode);

      const resultById = new Map(
        result.results.map((fileResult) => [fileResult.id, fileResult]),
      );
      setFileResults(resultById);
      setFiles((current) => updateFileSizes(current, resultById));
      setMessage(processingNotice(result));

      setIsSaveDialogOpen(false);
    } catch {
      setMessage({
        tone: "warning",
        text: "Could not remove metadata. Please try again.",
      });
      setIsSaveDialogOpen(false);
    } finally {
      setIsProcessing(false);
    }
  }

  function addFiles(incoming: MediaFile[]) {
    if (incoming.length === 0) return;
    setFiles((current) => mergeMediaFiles(current, incoming));
  }

  function removeFile(id: string) {
    setFiles((current) => current.filter((file) => file.id !== id));
    setFileResults((current) => {
      const next = new Map(current);
      next.delete(id);
      return next;
    });
  }

  function clearFiles() {
    setFiles([]);
    setFileResults(new Map());
  }

  function openSettings() {
    if (view === "settings") {
      setView("files");
      return;
    }
    setView("settings");
  }

  function startCleaning() {
    setMessage(null);
    if (savedMode !== null) {
      void handleRemoveMetadata(savedMode);
      return;
    }
    setDialogError(null);
    setIsSaveDialogOpen(true);
  }

  return (
    <div className="window-root">
      <WindowBar view={view} onSettingsToggle={openSettings} />
      <main className="app-shell">
        <header className="app-header">
          <div className="brand">
            <img className="brand-mark" src={cleanSlateMark} alt="" />
            <span className="brand-name">CleanSlate</span>
            <span className="brand-tag">media privacy</span>
          </div>
        </header>

        {view === "files" ? (
          <Home
            files={files}
            savedMode={savedMode}
            fileResults={fileResults}
            isProcessing={isProcessing}
            startCleaning={startCleaning}
            preferenceLoading={preferenceLoading}
            message={message}
            onMessage={setMessage}
            onAddFiles={addFiles}
            onRemoveFile={removeFile}
            onClearFiles={clearFiles}
          />
        ) : (
          <Preferences
            savedMode={savedMode}
            preferenceLoading={preferenceLoading}
            onSavedMode={setSavedMode}
            onBack={openSettings}
          />
        )}

        {isSaveDialogOpen && (
          <OutputDialog
            error={dialogError}
            isProcessing={isProcessing}
            onCancel={() => setIsSaveDialogOpen(false)}
            onClean={handleRemoveMetadata}
          />
        )}
      </main>
    </div>
  );
}

export default App;
