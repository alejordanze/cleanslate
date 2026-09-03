import './style.css';

import type { FfmpegCheckResult } from '../../shared/ffmpeg';

type StatusState = 'loading' | 'ready' | 'error';

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Renderer shell is missing ${selector}.`);
  }
  return element;
}

const statusTitle = requireElement<HTMLElement>('#statusTitle');
const statusPill = requireElement<HTMLElement>('#statusPill');
const refreshButton = requireElement<HTMLButtonElement>('#refreshButton');
const platformText = requireElement<HTMLElement>('#platformText');
const runtimeText = requireElement<HTMLElement>('#runtimeText');
const pathValue = requireElement<HTMLElement>('#pathValue');
const versionValue = requireElement<HTMLElement>('#versionValue');
const outputValue = requireElement<HTMLPreElement>('#outputValue');

document.title = 'CleanSlate | FFmpeg Starter';

function setStatus(state: StatusState, label: string) {
  statusPill.dataset.state = state;
  statusPill.textContent = label;
}

function renderResult(result: FfmpegCheckResult) {
  platformText.textContent = `${result.platform} · ${result.arch}`;
  runtimeText.textContent = `Electron ${result.electronVersion} · Node ${result.nodeVersion}`;
  pathValue.textContent = result.path ?? 'No bundled path available';
  versionValue.textContent = result.versionLine ?? (result.available ? 'No version line captured.' : 'Unavailable');
  outputValue.textContent = result.output || result.error || 'No output captured.';

  if (result.available) {
    setStatus('ready', 'Available');
    statusTitle.textContent = 'Bundled FFmpeg is available';
  } else {
    setStatus('error', result.error ? 'Error' : 'Unavailable');
    statusTitle.textContent = 'Bundled FFmpeg is not ready';
  }
}

async function refresh() {
  console.log('Refreshing FFmpeg check...');
  refreshButton.disabled = true;
  setStatus('loading', 'Checking');
  statusTitle.textContent = 'Checking bundled FFmpeg...';
  outputValue.textContent = 'Running ffmpeg -version...';

  try {
    const result = await window.cleanslate.inspectFfmpeg();
    renderResult(result);
  } catch (error) {
    setStatus('error', 'Bridge error');
    statusTitle.textContent = 'Failed to reach the main process';
    pathValue.textContent = 'Renderer bridge unavailable';
    versionValue.textContent = 'Unavailable';
    outputValue.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener('click', () => {
  void refresh();
});

void refresh();
