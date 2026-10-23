import { useEffect, useState } from 'react';

import type { MetadataComparison, MetadataField, MetadataSnapshot } from '../../../shared/metadata';
import type { MediaFile } from '../../../shared/media';

type MetadataDialogProps = {
  file: MediaFile;
  comparison: MetadataComparison | null;
  onClose: () => void;
};

type ComparedField = {
  key: string;
  before?: MetadataField;
  after?: MetadataField;
  status: 'removed' | 'changed' | 'added' | 'kept';
};

function compareFields(comparison: MetadataComparison): ComparedField[] {
  const before = new Map(comparison.before.fields.map((field) => [field.key, field]));
  const after = new Map(comparison.after.fields.map((field) => [field.key, field]));
  const statusOrder = { removed: 0, changed: 1, added: 2, kept: 3 };

  return [...new Set([...before.keys(), ...after.keys()])]
    .map((key): ComparedField => {
      const original = before.get(key);
      const cleaned = after.get(key);
      const status = !cleaned ? 'removed' : !original ? 'added' : original.value === cleaned.value ? 'kept' : 'changed';
      return { key, before: original, after: cleaned, status };
    })
    .sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || a.key.localeCompare(b.key));
}

function MetadataValue({ field }: { field?: MetadataField }) {
  return <span className="metadata-value">{field?.value ?? '—'}</span>;
}

function SnapshotFields({ snapshot }: { snapshot: MetadataSnapshot }) {
  if (snapshot.error) return <p className="metadata-empty" role="alert">{snapshot.error}</p>;
  if (snapshot.fields.length === 0) return <p className="metadata-empty">No readable embedded metadata was found.</p>;

  return <div className="metadata-fields">{snapshot.fields.map((field) => (
    <div className="metadata-field" key={field.key}>
      <span className="metadata-field__name">{field.group} · {field.label}</span>
      <MetadataValue field={field} />
    </div>
  ))}</div>;
}

export default function MetadataDialog({ file, comparison, onClose }: MetadataDialogProps) {
  const [snapshot, setSnapshot] = useState<MetadataSnapshot | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (comparison) return;
    let active = true;
    setSnapshot(null);
    void Promise.resolve().then(() => window.cleanslate?.inspectMetadata(file.path)).then((result) => {
      if (active) setSnapshot(result ?? { fields: [], error: 'Metadata inspection is unavailable. Restart CleanSlate and try again.' });
    }).catch(() => {
      if (active) setSnapshot({ fields: [], error: 'Could not read metadata from this file.' });
    });
    return () => { active = false; };
  }, [file.path, comparison]);

  const rows = comparison && !comparison.before.error && !comparison.after.error
    ? compareFields(comparison)
    : null;

  return <div className="modal-backdrop">
    <section className="metadata-dialog" role="dialog" aria-modal="true" aria-labelledby="metadata-dialog-title">
      <div className="metadata-dialog__header">
        <div>
          <span className="metadata-dialog__eyebrow">{comparison ? 'After cleaning' : 'Before cleaning'}</span>
          <h2 id="metadata-dialog-title">{comparison ? 'Metadata comparison' : 'File metadata'}</h2>
          <p title={file.name}>{file.name}</p>
        </div>
        <button className="metadata-dialog__close" type="button" onClick={onClose} aria-label="Close metadata dialog" autoFocus>×</button>
      </div>

      <div className="metadata-dialog__body">
        {comparison ? <>
          <div className="metadata-columns-heading" aria-hidden="true"><span>Original</span><span>Cleaned</span></div>
          {rows ? rows.length > 0 ? <div className="metadata-comparison">{rows.map((row) => {
            const field = row.before ?? row.after!;
            return <div className="metadata-comparison__row" key={row.key}>
              <div className="metadata-comparison__label">
                <span>{field.group} · {field.label}</span>
                <small className={`metadata-status metadata-status--${row.status}`}>{row.status}</small>
              </div>
              <div className="metadata-comparison__values">
                <MetadataValue field={row.before} />
                <MetadataValue field={row.after} />
              </div>
            </div>;
          })}</div> : <p className="metadata-empty">No readable embedded metadata was found in either file.</p> : <div className="metadata-error-columns">
            <SnapshotFields snapshot={comparison.before} />
            <SnapshotFields snapshot={comparison.after} />
          </div>}
        </> : snapshot ? <SnapshotFields snapshot={snapshot} /> : <p className="metadata-empty" role="status">Reading metadata…</p>}
      </div>
      <p className="metadata-dialog__note">Some technical fields are needed to keep a file readable. Finder and filesystem details are outside this comparison.</p>
    </section>
  </div>;
}
