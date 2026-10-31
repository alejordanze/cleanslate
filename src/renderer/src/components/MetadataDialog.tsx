import { useEffect, useRef, useState } from 'react';

import type { MetadataComparison, MetadataField, MetadataSnapshot } from '../../../shared/metadata';
import type { MediaFile } from '../../../shared/media';
import type { MessageKey } from '../../../shared/i18n';
import { useI18n } from '../i18n';

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
const statusKeys: Record<FieldStatus, MessageKey> = {
  removed: 'statusRemoved', changed: 'statusModified', added: 'statusAdded', kept: 'statusUnchanged'
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
  const { t } = useI18n();
  return field
    ? <span className="metadata-value">{field.value}</span>
    : <span className="metadata-value metadata-value--absent">{t('notPresent')}</span>;
}

function SnapshotFields({ snapshot, query = '' }: { snapshot: MetadataSnapshot; query?: string }) {
  const { t, formatNumber } = useI18n();
  if (snapshot.error) return <p className="metadata-empty" role="alert">{snapshot.error}</p>;
  if (snapshot.fields.length === 0) return <p className="metadata-empty">{t('noMetadata')}</p>;

  const groups = groupedFields(snapshot.fields.filter((field) => matchesSearch(field, query)));
  if (groups.length === 0) return <p className="metadata-empty">{t('noMatches')}</p>;

  return <div className="metadata-groups">{groups.map(([group, fields]) => (
    <section className="metadata-group" key={group}>
      <h3 className="metadata-group__heading"><span>{group}</span><small>{formatNumber(fields.length)}</small></h3>
      {fields.map((field) => <div className="metadata-field" key={field.key}>
        <span className="metadata-field__name">{field.label}</span>
        <MetadataValue field={field} />
      </div>)}
    </section>
  ))}</div>;
}

function ComparisonRow({ row, showStatus = false }: { row: ComparedField; showStatus?: boolean }) {
  const { t } = useI18n();
  const field = row.before ?? row.after!;
  return <div className="metadata-comparison__row">
    <div className="metadata-comparison__label">
      <small>{field.group}{showStatus && <span className={`metadata-comparison__status metadata-status--${row.status}`}>{t(statusKeys[row.status])}</span>}</small>
      <strong>{field.label}</strong>
    </div>
    <div className="metadata-comparison__cell"><small>{t('original')}</small><MetadataValue field={row.before} /></div>
    <div className="metadata-comparison__cell"><small>{t('cleaned')}</small><MetadataValue field={row.after} /></div>
  </div>;
}

function ComparisonFields({ rows }: { rows: ComparedField[] }) {
  const { t, formatNumber } = useI18n();
  return <>
    <div className="metadata-columns-heading" aria-hidden="true"><span>{t('field')}</span><span>{t('original')}</span><span>{t('cleaned')}</span></div>
    <div className="metadata-groups">{statusOrder.map((status) => {
      const groupRows = rows.filter((row) => row.status === status);
      if (groupRows.length === 0) return null;
      return <section className="metadata-group" key={status}>
        <h3 className={`metadata-group__heading metadata-status--${status}`}><span>{t(statusKeys[status])}</span><small>{formatNumber(groupRows.length)}</small></h3>
        {groupRows.map((row) => <ComparisonRow row={row} key={row.key} />)}
      </section>;
    })}</div>
  </>;
}

export default function MetadataDialog({ file, comparison, onClose }: MetadataDialogProps) {
  const { language, t, plural, formatNumber } = useI18n();
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
      if (active) setSnapshot(result ?? { fields: [], error: t('inspectionUnavailable') });
    }).catch(() => {
      if (active) setSnapshot({ fields: [], error: t('metadataReadFailed') });
    });
    return () => { active = false; };
  }, [file.path, comparison, language]);

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
  const format = file.extension.toUpperCase() || t(file.kind);
  const cameraRaw = /^(?:arw|cr2|cr3|dng|nef|orf|raf|raw|rw2|sr2)$/.test(file.extension);

  return <div className="modal-backdrop">
    <section className="metadata-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="metadata-dialog-title" aria-describedby="metadata-dialog-note">
      <div className="metadata-dialog__header">
        <div className="metadata-dialog__identity">
          <span className="metadata-dialog__eyebrow">{comparison ? t('cleaningReport') : t('fileInspection')}</span>
          <h2 id="metadata-dialog-title">{comparison ? t('metadataComparison') : t('fileMetadata')}</h2>
          <p title={file.name}><span className={`metadata-dialog__file-type metadata-dialog__file-type--${file.kind}`}>{t(file.kind)}</span><span className="metadata-dialog__filename">{file.name}</span></p>
        </div>
        <button className="metadata-dialog__close" type="button" onClick={onClose} aria-label={t('closeMetadataDialog')}>×</button>
      </div>

      {rows && <div className="metadata-overview metadata-overview--comparison" aria-label={t('comparisonSummary')}>
        <div className="metadata-overview__lead"><strong>{formatNumber(counts.removed)}</strong><span>{t('removedOfOriginal', { count: formatNumber(comparison!.before.fields.length) })}</span></div>
        <div className="metadata-overview__detail">
          <span><i className="metadata-dot metadata-dot--removed" />{t('statusCountRemoved', { count: formatNumber(counts.removed) })}</span>
          <span><i className="metadata-dot metadata-dot--changed" />{t('statusCountModified', { count: formatNumber(counts.changed) })}</span>
          <span><i className="metadata-dot metadata-dot--added" />{t('statusCountAdded', { count: formatNumber(counts.added) })}</span>
          <span><i className="metadata-dot metadata-dot--kept" />{t('statusCountUnchanged', { count: formatNumber(counts.kept) })}</span>
        </div>
      </div>}
      {!comparison && snapshot && !snapshot.error && <div className="metadata-overview metadata-overview--snapshot">
        <strong>{formatNumber(fieldCount)}</strong>
        <span>{t('readableAcrossGroups', {
          fields: plural('readableFieldCountOne', 'readableFieldCountOther', fieldCount),
          groups: plural('groupCountOne', 'groupCountOther', groupCount)
        })}</span>
      </div>}
      {comparison && !rows && <p className="metadata-dialog__warning" role="status">{t('comparisonUnavailable')}</p>}

      {hasFields ? <>
        <p className="metadata-dialog__section-label">{comparison && changedRows.length ? t('keyChanges') : t('keyFields')}</p>
        <div className="metadata-dialog__body metadata-dialog__body--highlights">
          {comparison ? <>
            <div className="metadata-columns-heading" aria-hidden="true"><span>{t('field')}</span><span>{t('original')}</span><span>{t('cleaned')}</span></div>
            {highlightedRows.map((row) => <ComparisonRow row={row} key={row.key} showStatus />)}
          </> : highlightedFields.map((field) => <div className="metadata-field" key={field.key}>
            <span className="metadata-field__name">{field.group} · {field.label}</span>
            <MetadataValue field={field} />
          </div>)}
        </div>
        <details className="metadata-details">
          <summary>{t('moreInfo')} <span>{plural('fieldsCountOne', 'fieldsCountOther', comparison ? rows?.length ?? 0 : fieldCount)}</span></summary>
          <div className="metadata-toolbar">
            <label className="metadata-search">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.7" cy="8.7" r="5.6" stroke="currentColor" strokeWidth="1.6"/><path d="m13 13 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('searchPlaceholder')} aria-label={t('searchMetadata')} />
            </label>
            {rows && <div className="metadata-filters" role="group" aria-label={t('filterComparison')}>
              {(['all', ...statusOrder] as FieldFilter[]).map((status) => <button
                className={`metadata-filter${filter === status ? ' is-active' : ''}`}
                type="button"
                key={status}
                aria-pressed={filter === status}
                onClick={() => setFilter(status)}
              >{status === 'all' ? t('all') : t(statusKeys[status])} <span>{formatNumber(status === 'all' ? rows.length : counts[status])}</span></button>)}
            </div>}
          </div>
          <div className="metadata-dialog__body">
            {rows ? visibleRows?.length ? <ComparisonFields rows={visibleRows} /> : <p className="metadata-empty">{t('noFilterMatches')}</p>
              : <SnapshotFields snapshot={snapshot!} query={normalizedSearch} />}
          </div>
        </details>
      </> : <div className="metadata-dialog__body">
        {comparison ? rows ? <p className="metadata-empty">{t('noMetadataEither')}</p>
          : <div className="metadata-error-columns">
            <section><h3>{t('original')}</h3><SnapshotFields snapshot={comparison.before} /></section>
            <section><h3>{t('cleaned')}</h3><SnapshotFields snapshot={comparison.after} /></section>
          </div>
          : snapshot ? <SnapshotFields snapshot={snapshot} query={normalizedSearch} /> : <p className="metadata-empty" role="status">{t('readingMetadata')}</p>}
      </div>}
      <p className={`metadata-dialog__note${comparison ? ' metadata-dialog__note--retained' : ''}`} id="metadata-dialog-note">
        {comparison ? <>
          <strong>{t('whyFieldsRemain', { format })}</strong>{' '}
          {file.kind === 'video' ? t('videoRetained')
            : cameraRaw ? t('rawRetained')
              : file.extension === 'heic' || file.extension === 'heif' ? t('heicRetained')
                : file.extension === 'svg' ? t('svgRetained')
                  : t('imageRetained')}
          {' '}{t('finderNote')}
        </> : t('finderNote')}
      </p>
    </section>
  </div>;
}
