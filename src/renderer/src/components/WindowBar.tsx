import { useEffect, useState } from 'react';
import gearIcon from '../../../../icons/gear.svg';
import { getBridge } from '../bridge';

type WindowBarProps = {
  view: 'files' | 'settings';
  onSettingsToggle: () => void;
};

export function WindowBar({ view, onSettingsToggle }: WindowBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const bridge = window.cleanslate;
    if (!bridge) return;

    let active = true;
    void bridge.isWindowMaximized()
      .then((maximized) => {
        if (active) setIsMaximized(maximized);
      })
      .catch(() => undefined);
    const unsubscribe = bridge.onWindowMaximized(setIsMaximized);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return (
    <header className="window-bar" aria-label="Window controls">
      <div className="window-controls">
        <button
          className="window-control window-control--close"
          type="button"
          onClick={() => getBridge().closeWindow()}
          aria-label="Close window"
          title="Close window"
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="m5 5 6 6m0-6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
        <button
          className="window-control window-control--minimize"
          type="button"
          onClick={() => getBridge().minimizeWindow()}
          aria-label="Minimize window"
          title="Minimize window"
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4.5 8h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
        <button
          className="window-control window-control--maximize"
          type="button"
          onClick={() => void getBridge().toggleMaximizeWindow().then(setIsMaximized)}
          aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
          title={isMaximized ? 'Restore window' : 'Maximize window'}
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            {isMaximized ? (
              <path d="M6 4.5h5.5V10M4.5 6H10v5.5H4.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            ) : (
              <rect x="4.5" y="4.5" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
            )}
          </svg>
        </button>
      </div>
      <div className="window-bar__drag" aria-hidden="true" />
      <button
        className={`settings-icon-button${view === 'settings' ? ' is-active' : ''}`}
        type="button"
        onClick={onSettingsToggle}
        aria-label={view === 'settings' ? 'Back to files' : 'Open settings'}
        title={view === 'settings' ? 'Back to files' : 'Settings'}
        aria-pressed={view === 'settings'}
      >
        <img src={gearIcon} alt="" />
      </button>
    </header>
  );
}
