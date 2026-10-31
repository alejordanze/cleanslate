import type { MetadataComparison, MetadataProcessResult } from '../../../shared/metadata';
import { formatFileSize, getFileStem, type MediaFile } from '../../../shared/media';
import trashIcon from '../../../../icons/trash.svg';
import { useI18n } from '../i18n';

interface FileRowProps {
  file: MediaFile;
  result?: MetadataProcessResult;
  onRemove: (id: string) => void;
  onOpenMetadata: (file: MediaFile, comparison: MetadataComparison | null) => void;
}

export function FileRow({ file, result, onRemove, onOpenMetadata }: FileRowProps) {
  const { language, t } = useI18n();
  const resultLabel = result?.ok
    ? result.outputPath === file.path ? `✓ ${t('resultOriginalCleaned')}` : `✓ ${t('resultCopySaved')}`
    : result?.skipped ? t('resultSkipped') : t('resultCouldNotClean');

  return (
    <article className="file-row">
      <span className={`file-kind file-kind--${file.kind}`} aria-hidden="true">
        {file.kind === 'image' ? t('imageBadge') : t('videoBadge')}
      </span>
      <div className="file-details">
        <strong title={file.name}>{getFileStem(file.name)}</strong>
        <span>
          {file.extension ? `.${file.extension}` : t('mediaFile')}
          <span className="file-meta-separator">/</span>
          {formatFileSize(file.size, language)}
          <span className="file-meta-separator">/</span>
          {file.source === 'drop' ? t('dropped') : t('attached')}
        </span>
        {result && (
          <span className={`file-result file-result--${result.ok ? 'success' : 'warning'}`} title={result.error ?? undefined}>
            {resultLabel}
          </span>
        )}
      </div>
      <div className="file-actions">
        <button className="file-action" type="button" onClick={() => onOpenMetadata(file, null)} aria-label={t('viewMetadata', { name: file.name })} title={t('viewMetadataTitle')}>
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7.2" stroke="currentColor" strokeWidth="1.5"/><path d="M10 9v4m0-6h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
        </button>
        {result?.ok && result.metadata && <button className="file-action file-action--compare" type="button" onClick={() => onOpenMetadata(file, result.metadata)} aria-label={t('compareMetadata', { name: file.name })} title={t('compareMetadataTitle')}>
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="2.75" y="4" width="14.5" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M10 4v12m-4-8h2m4 4h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>}
        <button className="remove-button" type="button" onClick={() => onRemove(file.id)} aria-label={t('removeFile', { name: file.name })} title={t('removeFile', { name: file.name })}>
          <img src={trashIcon} alt="" />
        </button>
      </div>
    </article>
  );
}
