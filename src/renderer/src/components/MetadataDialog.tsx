import { useEffect, useRef, useState } from 'react';

import type { MetadataComparison, MetadataField, MetadataSnapshot } from '../../../shared/metadata';
import type { MediaFile } from '../../../shared/media';

type MetadataDialogProps = {
  file: MediaFile;
  comparison: MetadataComparison | null;
  onClose: () => void;
};

type FieldStatus = 'removed' | 'changed' | 'added' | 'kept';
type FieldFilter = 'all' | FieldStatus;

type ComparedField = {
  key: string;
  before?: MetadataField;
  after?: MetadataField;
  status: FieldStatus;
};

const statusOrder: FieldStatus[] = ['removed', 'changed', 'added', 'kept'];
const statusLabels: Record<FieldStatus, string> = {
  removed: 'Removed', changed: 'Modified', added: 'Added', kept: 'Unchanged'
};
const keyTags = [
  'GPSPosition', 'GPSLatitude', 'GPSLongitude', 'Location', 'City', 'State', 'Country',
  'Artist', 'Author', 'Creator', 'OwnerName', 'CameraOwnerName',
  'DateTimeOriginal', 'CreateDate', 'CreationDate', 'MediaCreateDate', 'ContentCreateDate',
  'Make', 'Model', 'DeviceModelName', 'SerialNumber', 'BodySerialNumber',
  'Title', 'Description', 'ImageDescription', 'Comment', 'UserComment', 'Copyright',
  'Software', 'ImageWidth', 'ImageHeight', 'Duration'
];

function fieldPriority(field: MetadataField): number {
  const tag = field.key.slice(field.key.lastIndexOf(':') + 1);
  const priority = keyTags.indexOf(tag);
  return priority < 0 ? keyTags.length : priority;
}

function compareFields(comparison: MetadataComparison): ComparedField[] {
  const before = new Map(comparison.before.fields.map((field) => [field.key, field]));
  const after = new Map(comparison.after.fields.map((field) => [field.key, field]));

  return [...new Set([...before.keys(), ...after.keys()])]
    .map((key): ComparedField => {
      const original = before.get(key);
      const cleaned = after.get(key);
      const status = !cleaned ? 'removed' : !original ? 'added' : original.value === cleaned.value ? 'kept' : 'changed';
      return { key, before: original, after: cleaned, status };
    })
    .sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status) || a.key.localeCompare(b.key));
}

function matchesSearch(field: MetadataField, query: string): boolean {
  return `${field.group} ${field.label} ${field.value} ${field.key}`.toLocaleLowerCase().includes(query);
}

function groupedFields(fields: MetadataField[]): [string, MetadataField[]][] {
  const groups = new Map<string, MetadataField[]>();
  for (const field of fields) {
    const group = groups.get(field.group) ?? [];
    group.push(field);
    groups.set(field.group, group);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b));
}

function MetadataValue({ field }: { field?: MetadataField }) {
  return field
    ? <span className="metadata-value">{field.value}</span>
    : <span className="metadata-value metadata-value--absent">Not present</span>;
}

function SnapshotFields({ snapshot, query = '' }: { snapshot: MetadataSnapshot; query?: string }) {
  if (snapshot.error) return <p className="metadata-empty" role="alert">{snapshot.error}</p>;
  if (snapshot.fields.length === 0) return <p className="metadata-empty">No readable embedded metadata was found.</p>;

  const groups = groupedFields(snapshot.fields.filter((field) => matchesSearch(field, query)));
  if (groups.length === 0) return <p className="metadata-empty">No fields match your search.</p>;

  return <div className="metadata-groups">{groups.map(([group, fields]) => (
    <section className="metadata-group" key={group}>
      <h3 className="metadata-group__heading"><span>{group}</span><small>{fields.length}</small></h3>
      {fields.map((field) => <div className="metadata-field" key={field.key}>
        <span className="metadata-field__name">{field.label}</span>
        <MetadataValue field={field} />
      </div>)}
    </section>
  ))}</div>;
}

function ComparisonRow({ row, showStatus = false }: { row: ComparedField; showStatus?: boolean }) {
  const field = row.before ?? row.after!;
  return <div className="metadata-comparison__row">
    <div className="metadata-comparison__label">
      <small>{field.group}{showStatus && <span className={`metadata-comparison__status metadata-status--${row.status}`}>{statusLabels[row.status]}</span>}</small>
      <strong>{field.label}</strong>
    </div>
    <div className="metadata-comparison__cell"><small>Original</small><MetadataValue field={row.before} /></div>
    <div className="metadata-comparison__cell"><small>Cleaned</small><MetadataValue field={row.after} /></div>
  </div>;
}

function ComparisonFields({ rows }: { rows: ComparedField[] }) {
  return <>
    <div className="metadata-columns-heading" aria-hidden="true"><span>Field</span><span>Original</span><span>Cleaned</span></div>
    <div className="metadata-groups">{statusOrder.map((status) => {
      const groupRows = rows.filter((row) => row.status === status);
      if (groupRows.length === 0) return null;
      return <section className="metadata-group" key={status}>
        <h3 className={`metadata-group__heading metadata-status--${status}`}><span>{statusLabels[status]}</span><small>{groupRows.length}</small></h3>
        {groupRows.map((row) => <ComparisonRow row={row} key={row.key} />)}
      </section>;
    })}</div>
  </>;
}

export default function MetadataDialog({ file, comparison, onClose }: MetadataDialogProps) {
  const [snapshot, setSnapshot] = useState<MetadataSnapshot | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FieldFilter>('all');
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.querySelector<HTMLElement>('.metadata-dialog__close')?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const controls = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), summary')].filter(
        (control) => !control.closest('details:not([open])') || control.tagName === 'SUMMARY'
      );
      if (controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    setSearch('');
    setFilter('all');
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
  const counts = Object.fromEntries(statusOrder.map((status) => [status, rows?.filter((row) => row.status === status).length ?? 0])) as Record<FieldStatus, number>;
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleRows = rows?.filter((row) =>
    (filter === 'all' || row.status === filter) &&
    (!normalizedSearch || matchesSearch(row.before ?? row.after!, normalizedSearch) ||
      (!!row.after && matchesSearch(row.after, normalizedSearch)))
  );
  const fieldCount = snapshot?.fields.length ?? 0;
  const groupCount = snapshot ? new Set(snapshot.fields.map((field) => field.group)).size : 0;
  const changedRows = rows?.filter((row) => row.status !== 'kept') ?? [];
  const highlightedRows = rows ? [...(changedRows.length ? changedRows : rows)].sort((a, b) =>
    fieldPriority(a.before ?? a.after!) - fieldPriority(b.before ?? b.after!)
  ).slice(0, 4) : [];
  const highlightedFields = snapshot ? [...snapshot.fields].sort((a, b) =>
    fieldPriority(a) - fieldPriority(b)
  ).slice(0, 4) : [];
  const hasFields = rows ? rows.length > 0 : !comparison && !!snapshot && !snapshot.error && fieldCount > 0;
  const format = file.extension.toUpperCase() || file.kind;
  const cameraRaw = /^(?:arw|cr2|cr3|dng|nef|orf|raf|raw|rw2|sr2)$/.test(file.extension);

  return <div className="modal-backdrop">
    <section className="metadata-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="metadata-dialog-title" aria-describedby="metadata-dialog-note">
      <div className="metadata-dialog__header">
        <div className="metadata-dialog__identity">
          <span className="metadata-dialog__eyebrow">{comparison ? 'Cleaning report' : 'File inspection'}</span>
          <h2 id="metadata-dialog-title">{comparison ? 'Metadata comparison' : 'File metadata'}</h2>
          <p title={file.name}><span className={`metadata-dialog__file-type metadata-dialog__file-type--${file.kind}`}>{file.kind}</span><span className="metadata-dialog__filename">{file.name}</span></p>
        </div>
        <button className="metadata-dialog__close" type="button" onClick={onClose} aria-label="Close metadata dialog">×</button>
      </div>

      {rows && <div className="metadata-overview metadata-overview--comparison" aria-label="Comparison summary">
        <div className="metadata-overview__lead"><strong>{counts.removed}</strong><span>of {comparison!.before.fields.length} original fields removed</span></div>
        <div className="metadata-overview__detail">
          <span><i className="metadata-dot metadata-dot--removed" />{counts.removed} removed</span>
          <span><i className="metadata-dot metadata-dot--changed" />{counts.changed} modified</span>
          <span><i className="metadata-dot metadata-dot--added" />{counts.added} added</span>
          <span><i className="metadata-dot metadata-dot--kept" />{counts.kept} unchanged</span>
        </div>
      </div>}
      {!comparison && snapshot && !snapshot.error && <div className="metadata-overview metadata-overview--snapshot">
        <strong>{fieldCount}</strong>
        <span>readable {fieldCount === 1 ? 'field' : 'fields'} across {groupCount} {groupCount === 1 ? 'group' : 'groups'}</span>
      </div>}
      {comparison && !rows && <p className="metadata-dialog__warning" role="status">The comparison could not be completed. The available results are shown below.</p>}

      {hasFields ? <>
        <p className="metadata-dialog__section-label">{comparison && changedRows.length ? 'Key changes' : 'Key fields'}</p>
        <div className="metadata-dialog__body metadata-dialog__body--highlights">
          {comparison ? <>
            <div className="metadata-columns-heading" aria-hidden="true"><span>Field</span><span>Original</span><span>Cleaned</span></div>
            {highlightedRows.map((row) => <ComparisonRow row={row} key={row.key} showStatus />)}
          </> : highlightedFields.map((field) => <div className="metadata-field" key={field.key}>
            <span className="metadata-field__name">{field.group} · {field.label}</span>
            <MetadataValue field={field} />
          </div>)}
        </div>
        <details className="metadata-details">
          <summary>More info <span>{comparison ? `${rows?.length} fields` : `${fieldCount} fields`}</span></summary>
          <div className="metadata-toolbar">
            <label className="metadata-search">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.7" cy="8.7" r="5.6" stroke="currentColor" strokeWidth="1.6"/><path d="m13 13 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search fields or values" aria-label="Search metadata fields or values" />
            </label>
            {rows && <div className="metadata-filters" role="group" aria-label="Filter comparison fields">
              {(['all', ...statusOrder] as FieldFilter[]).map((status) => <button
                className={`metadata-filter${filter === status ? ' is-active' : ''}`}
                type="button"
                key={status}
                aria-pressed={filter === status}
                onClick={() => setFilter(status)}
              >{status === 'all' ? 'All' : statusLabels[status]} <span>{status === 'all' ? rows.length : counts[status]}</span></button>)}
            </div>}
          </div>
          <div className="metadata-dialog__body">
            {rows ? visibleRows?.length ? <ComparisonFields rows={visibleRows} /> : <p className="metadata-empty">No fields match this filter or search.</p>
              : <SnapshotFields snapshot={snapshot!} query={normalizedSearch} />}
          </div>
        </details>
      </> : <div className="metadata-dialog__body">
        {comparison ? rows ? <p className="metadata-empty">No readable embedded metadata was found in either file.</p>
          : <div className="metadata-error-columns">
            <section><h3>Original</h3><SnapshotFields snapshot={comparison.before} /></section>
            <section><h3>Cleaned</h3><SnapshotFields snapshot={comparison.after} /></section>
          </div>
          : snapshot ? <SnapshotFields snapshot={snapshot} query={normalizedSearch} /> : <p className="metadata-empty" role="status">Reading metadata…</p>}
      </div>}
      <p className={`metadata-dialog__note${comparison ? ' metadata-dialog__note--retained' : ''}`} id="metadata-dialog-note">
        {comparison ? <>
          <strong>Why some {format} fields remain:</strong>{' '}
          {file.kind === 'video' ? 'Container, track, and codec details help it play in its original format. Hidden data inside copied video streams may also remain.'
            : cameraRaw ? 'Image structure and sometimes camera make and model help RAW software render it.'
              : file.extension === 'heic' || file.extension === 'heif' ? 'Image container, codec, and color details help it open correctly.'
                : file.extension === 'svg' ? 'Drawing and geometry are needed to display the image.'
                  : 'Image dimensions, encoding, and color details help it display correctly.'}
          {' '}Finder and filesystem details are not shown.
        </> : 'Finder and filesystem details are not shown.'}
      </p>
    </section>
  </div>;
}
