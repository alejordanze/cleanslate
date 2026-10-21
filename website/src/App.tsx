import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { getAsset, getChecksum, parseReleases, releasesApi, type Release } from './releases';

interface AppProps {
  pathname: string;
  initialReleases: Release[];
}

const repositoryUrl = 'https://github.com/alejordanze/cleanslate';
const releasesUrl = `${repositoryUrl}/releases`;

function ArrowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M5 12h13m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Brand() {
  return <a className="brand" href="/" aria-label="CleanSlate home"><span className="brand-mark"><img src="/logo.svg" alt="" /></span><span>CleanSlate</span></a>;
}

function Header({ pathname }: { pathname: string }) {
  const download = pathname === '/download/' || pathname === '/download';
  return <header className="site-header">
    <div className="shell header-inner">
      <Brand />
      <nav aria-label="Main navigation">
        <a href="/" aria-current={!download && pathname === '/' ? 'page' : undefined}>Home</a>
        <a href="/download/" aria-current={download ? 'page' : undefined}>Download</a>
      </nav>
      <a className="header-github" href={repositoryUrl} target="_blank" rel="noopener noreferrer">GitHub <span aria-hidden="true">↗</span></a>
    </div>
  </header>;
}

function Footer() {
  return <footer className="site-footer">
    <div className="shell footer-inner">
      <div className="footer-brand"><Brand /><p>Made for sharing with a little more peace of mind.</p></div>
      <div className="footer-links">
        <div><span className="footer-label">Explore</span><a href="/">Home</a><a href="/download/">Download</a><a href={`${repositoryUrl}/releases`} target="_blank" rel="noopener noreferrer">GitHub Releases</a></div>
        <div><span className="footer-label">Creator</span><span>Built by Alejandro Jordan</span><a href="https://www.linkedin.com/in/alejordanze" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a><a href="https://github.com/alejordanze" target="_blank" rel="noopener noreferrer">GitHub ↗</a></div>
      </div>
    </div>
    <div className="shell footer-bottom"><span>© {new Date().getUTCFullYear()} CleanSlate</span><span>Files stay on your Mac.</span></div>
  </footer>;
}

function HomePage() {
  return <main>
    <section className="hero">
      <div className="shell hero-grid">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" />A simpler way to share</span>
          <h1>Share the file.<br /><span>Keep the details.</span></h1>
          <p>Photos and videos can carry information you never meant to post. CleanSlate removes embedded metadata before you share, right on your Mac.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="/download/">Download for macOS <ArrowIcon /></a>
            <a className="text-link" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a>
          </div>
          <div className="hero-caption"><span className="caption-line" />No account. No media upload. Just cleaner files.</div>
        </div>
        <div className="hero-art">
          <div className="preview-glow" />
          <div className="preview-frame"><img src="/app-preview.png" alt="CleanSlate showing example image and video files ready to clean" width="1280" height="800" /></div>
          <span className="preview-label">The CleanSlate app, with example files</span>
        </div>
      </div>
    </section>

    <section className="why-section shell" aria-labelledby="why-title">
      <div className="section-heading"><span className="section-kicker">WHY CLEANSLATE</span><h2 id="why-title">A quiet step before you post.</h2><p>Metadata can describe where, when, and how media was created. CleanSlate gives you a straightforward way to remove what supported formats allow before a file leaves your Mac.</p></div>
      <div className="feature-grid">
        <article className="feature"><span className="feature-number">01</span><h3>Local by design</h3><p>Files are processed on your Mac. CleanSlate has no account or media upload.</p></article>
        <article className="feature"><span className="feature-number">02</span><h3>Made for your formats</h3><p>Clean common photos and videos, including HEIC, SVG, and supported camera RAW files.</p></article>
        <article className="feature"><span className="feature-number">03</span><h3>You choose the result</h3><p>Save cleaned copies beside the originals or replace the files you selected.</p></article>
      </div>
    </section>

    <section className="steps-section" id="how-it-works" aria-labelledby="steps-title">
      <div className="shell steps-layout"><div className="steps-intro"><span className="section-kicker">HOW IT WORKS</span><h2 id="steps-title">From file to ready to share.</h2><p>One small habit can make the next upload feel simpler.</p><a className="text-link" href="/download/">Get CleanSlate <ArrowIcon /></a></div>
        <ol className="steps-list"><li><span>01</span><div><h3>Add your files</h3><p>Drop images and videos into the window or choose them from your Mac.</p></div></li><li><span>02</span><div><h3>Choose where they go</h3><p>Keep new cleaned copies or update the originals. You can remember your choice.</p></div></li><li><span>03</span><div><h3>Share with more confidence</h3><p>CleanSlate shows what it processed and flags files it could not clean.</p></div></li></ol>
      </div>
    </section>

    <section className="final-cta shell"><div><span className="section-kicker">READY WHEN YOU ARE</span><h2>Give your files a clean slate.</h2><p>A small, focused macOS app for the media you share.</p></div><a className="button button-primary" href="/download/">Download CleanSlate <ArrowIcon /></a></section>
  </main>;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(value));
}

function DownloadCard({ release, architecture }: { release: Release; architecture: 'arm64' | 'x64' }) {
  const appleSilicon = architecture === 'arm64';
  const dmg = getAsset(release, architecture);
  const checksum = getChecksum(release, architecture);
  return <article className="download-card">
    <span className="chip">{appleSilicon ? 'APPLE SILICON' : 'INTEL'}</span>
    <div className="download-card-top"><h2>{appleSilicon ? 'M series Macs' : 'Intel Macs'}</h2><p>{appleSilicon ? 'For Macs with an Apple M1 chip or newer.' : 'For Macs with an Intel processor.'}</p></div>
    <a className="button button-primary" href={dmg?.url ?? release.url} target="_blank" rel="noopener noreferrer">{dmg ? 'Download DMG' : 'View release'} <ArrowIcon /></a>
    <div className="download-card-meta"><span>{dmg?.name ?? `Version ${release.version}`}</span>{checksum && <a href={checksum.url} target="_blank" rel="noopener noreferrer">SHA-256 checksum ↗</a>}</div>
  </article>;
}

function ReleaseNotes({ release }: { release: Release }) {
  return <div className="release-notes"><ReactMarkdown components={{
    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
  }}>{release.notes}</ReactMarkdown></div>;
}

function DownloadPage({ releases }: { releases: Release[] }) {
  const latest = releases[0];
  return <main>
    <section className="download-hero"><div className="shell"><span className="eyebrow"><span className="eyebrow-dot" />CleanSlate for macOS</span><h1>Download CleanSlate.</h1><p>Choose the version made for your Mac, then clean files locally before you share them.</p>{latest && <div className="release-stamp"><span className="stamp-dot" />Latest release <strong>v{latest.version}</strong><span className="stamp-divider" />{dateLabel(latest.publishedAt)}</div>}</div></section>

    {latest && <section className="shell download-grid" aria-label="Download the latest version"><DownloadCard release={latest} architecture="arm64" /><DownloadCard release={latest} architecture="x64" /></section>}

    <section className="shell install-section" aria-labelledby="install-title"><div className="section-heading"><span className="section-kicker">INSTALLATION</span><h2 id="install-title">On your Mac in three steps.</h2></div><ol className="install-steps"><li><span>1</span><p>Download the DMG that matches your Mac.</p></li><li><span>2</span><p>Open it and drag CleanSlate into Applications.</p></li><li><span>3</span><p>Open CleanSlate and add the files you want to clean.</p></li></ol><div className="install-note"><div><h3>About the macOS security prompt</h3><p>CleanSlate is currently unsigned and not notarized, so macOS may block it the first time you open it. If you trust your download, use <strong>System Settings → Privacy & Security → Open Anyway</strong>.</p><p>If macOS says the app is damaged, verify the downloaded DMG against its checksum first. The <a href={`${repositoryUrl}#if-macos-says-cleanslate-is-damaged`} target="_blank" rel="noopener noreferrer">README has the local test steps</a>.</p></div><a href="https://support.apple.com/en-us/102445" target="_blank" rel="noopener noreferrer">Apple’s guidance ↗</a></div></section>

    <section className="shell versions-section" id="versions" aria-labelledby="versions-title"><div className="versions-heading"><div><span className="section-kicker">RELEASE HISTORY</span><h2 id="versions-title">Versions & changelogs</h2><p>Browse what changed and download an earlier build when you need one.</p></div><a className="text-link" href={releasesUrl} target="_blank" rel="noopener noreferrer">All releases on GitHub <span aria-hidden="true">↗</span></a></div><div className="release-list">{releases.map((release, index) => <details className="release-item" key={release.version} open={index === 0}><summary><span className="release-item-title">v{release.version}{index === 0 && <em>Latest</em>}</span><span className="release-item-date">{dateLabel(release.publishedAt)}</span><span className="release-chevron" aria-hidden="true">⌄</span></summary><div className="release-content"><ReleaseNotes release={release} /><div className="release-actions"><a href={getAsset(release, 'arm64')?.url ?? release.url} target="_blank" rel="noopener noreferrer">Apple silicon DMG ↗</a><a href={getAsset(release, 'x64')?.url ?? release.url} target="_blank" rel="noopener noreferrer">Intel DMG ↗</a><a href={release.url} target="_blank" rel="noopener noreferrer">GitHub release ↗</a></div></div></details>)}</div><p className="release-fallback">Release details come from <a href={releasesUrl} target="_blank" rel="noopener noreferrer">GitHub Releases</a>. If a newer version is missing here, check GitHub directly.</p></section>
  </main>;
}

function NotFoundPage() {
  return <main className="not-found shell"><span className="section-kicker">PAGE NOT FOUND</span><h1>That page has gone missing.</h1><p>The link may have moved. You can head back home or find the latest CleanSlate release.</p><div className="hero-actions"><a className="button button-primary" href="/">Go home <ArrowIcon /></a><a className="text-link" href="/download/">Download CleanSlate ↗</a></div></main>;
}

export default function App({ pathname, initialReleases }: AppProps) {
  const isDownload = pathname === '/download/' || pathname === '/download';
  const [releases, setReleases] = useState(initialReleases);

  useEffect(() => {
    if (!isDownload) return;
    const controller = new AbortController();
    fetch(releasesApi, { headers: { Accept: 'application/vnd.github+json' }, signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
        return response.json();
      })
      .then((value: unknown) => {
        const current = parseReleases(value);
        if (current.length > 0) setReleases(current);
      })
      .catch(() => {
        // The pre-rendered release list stays available when GitHub is unreachable.
      });
    return () => controller.abort();
  }, [isDownload]);

  const content = pathname === '/' ? <HomePage /> : isDownload ? <DownloadPage releases={releases} /> : <NotFoundPage />;
  return <div className="site-frame"><Header pathname={pathname} />{content}<Footer /></div>;
}
