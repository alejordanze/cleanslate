import type { MetadataProcessResult } from '../../shared/metadata';
import { formatFileSize, getFileStem, type MediaFile } from '../../shared/media';
import trashIcon from '../../../icons/trash.svg';

interface FileRowProps {
  file: MediaFile;
  result?: MetadataProcessResult;
  onRemove: (id: string) => void;
}

export function FileRow({ file, result, onRemove }: FileRowProps) {
  const resultLabel = result?.ok
    ? result.outputPath === file.path ? '✓ Original cleaned' : '✓ Cleaned copy saved'
    : result?.error?.startsWith('Skipped') ? 'Skipped' : 'Could not clean';

  return (
    <article className="file-row">
      <span className={`file-kind file-kind--${file.kind}`} aria-hidden="true">
        {file.kind === 'image' ? 'IMG' : 'VID'}
      </span>
      <div className="file-details">
        <strong title={file.name}>{getFileStem(file.name)}</strong>
        <span>
          {file.extension ? `.${file.extension}` : 'Media file'}
          <span className="file-meta-separator">/</span>
          {formatFileSize(file.size)}
          <span className="file-meta-separator">/</span>
          {file.source === 'drop' ? 'Dropped' : 'Attached'}
        </span>
        {result && (
          <span className={`file-result file-result--${result.ok ? 'success' : 'warning'}`} title={result.error ?? undefined}>
            {resultLabel}
          </span>
        )}
      </div>
      <button className="remove-button" type="button" onClick={() => onRemove(file.id)} aria-label={`Remove ${file.name}`} title={`Remove ${file.name}`}>
        <img src={trashIcon} alt="" />
      </button>
    </article>
  );
}
