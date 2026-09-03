import { useEffect, useState } from 'react';

import type { FfmpegCheckResult } from '../../shared/ffmpeg';

type StatusState = 'loading' | 'ready' | 'error';

export default function App() {
  const [status, setStatus] = useState<StatusState>('loading');
  const [result, setResult] = useState<FfmpegCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setStatus('loading');
    setError(null);

    try {
      const bridge = window.cleanslate;
      if (!bridge) {
        throw new Error('Electron preload bridge is unavailable. Restart the app with npm run dev.');
      }

      const nextResult = await bridge.inspectFfmpeg();
      setResult(nextResult);
      setStatus(nextResult.available ? 'ready' : 'error');
    } catch (cause) {
      setResult(null);
      setStatus('error');
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const title =
    status === 'loading'
      ? 'Checking bundled FFmpeg...'
      : error
        ? 'Failed to reach the main process'
        : result?.available
          ? 'Bundled FFmpeg is available'
          : 'Bundled FFmpeg is not ready';
  const pillLabel =
    status === 'loading' ? 'Checking' : error ? 'Bridge error' : result?.available ? 'Available' : 'Unavailable';

  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow-row">
          <span className="eyebrow">Electron</span>
          <span className="eyebrow">React</span>
          <span className="eyebrow eyebrow--accent">FFmpeg bundle</span>
        </div>

        <h1>Bundled media tooling, ready for desktop.</h1>

        <p className="lede">
          This starter resolves a static FFmpeg binary from the Electron main process, exposes it
          through a preload bridge, and lets you verify the runtime from the React renderer.
        </p>

        <div className="hero-grid">
          <article className="hero-card">
            <span className="hero-card__label">Architecture</span>
            <strong>Main + preload + renderer</strong>
            <span>Electron services stay isolated from the React UI.</span>
          </article>

          <article className="hero-card">
            <span className="hero-card__label">Binary</span>
            <strong>ffmpeg-static</strong>
            <span>Downloaded per platform and unpacked for packaging.</span>
          </article>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <span className="panel__label">FFmpeg bundle</span>
            <h2>{title}</h2>
          </div>

          <span className="pill" data-state={status}>
            {pillLabel}
          </span>
        </div>

        <div className="actions">
          <button type="button" onClick={() => void refresh()} disabled={status === 'loading'}>
            Re-run check
          </button>

          <div className="runtime">
            <span>{result ? `${result.platform} · ${result.arch}` : 'Waiting for runtime data.'}</span>
            <span>
              {result ? `Electron ${result.electronVersion} · Node ${result.nodeVersion}` : 'Electron runtime pending'}
            </span>
          </div>
        </div>

        <dl className="stats">
          <div>
            <dt>Binary path</dt>
            <dd>{result?.path ?? (error ? 'Renderer bridge unavailable' : 'Waiting for runtime data.')}</dd>
          </div>

          <div>
            <dt>Version line</dt>
            <dd>{result?.versionLine ?? (error ? 'Unavailable' : 'Waiting for runtime data.')}</dd>
          </div>
        </dl>

        <section className="console">
          <header>Raw output</header>
          <pre>{result?.output || error || (status === 'loading' ? 'Running ffmpeg -version...' : 'No output captured.')}</pre>
        </section>
      </section>
    </main>
  );
}
