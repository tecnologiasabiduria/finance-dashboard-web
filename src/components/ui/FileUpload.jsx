import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Trash2, ExternalLink, Image } from 'lucide-react';
import { Spinner } from './Spinner';

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({
  files = [],
  onUpload,
  onDelete,
  uploading = false,
  accept = 'application/pdf,image/*',
  maxSize = 10 * 1024 * 1024,
}) {
  const [dragOver, setDragOver] = useState(false);
  const [sizeError, setSizeError] = useState('');
  const inputRef = useRef(null);

  const handleFile = useCallback(
    (file) => {
      setSizeError('');
      if (file.size > maxSize) {
        setSizeError(`El archivo es muy grande. Máximo ${formatFileSize(maxSize)}.`);
        return;
      }
      onUpload?.(file);
    },
    [maxSize, onUpload]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // reset so the same file can be re-selected
    e.target.value = '';
  };

  const handleZoneClick = () => {
    if (!uploading) inputRef.current?.click();
  };

  const isImage = (mimeType) =>
    typeof mimeType === 'string' && mimeType.startsWith('image/');

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Subir archivo"
        onClick={handleZoneClick}
        onKeyDown={(e) => e.key === 'Enter' && handleZoneClick()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={[
          'relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 cursor-pointer transition-all duration-200',
          dragOver
            ? 'border-gold-400 bg-gold-400/5'
            : 'border-dark-700 bg-dark-900 hover:border-gold-400/50 hover:bg-dark-900/80',
          uploading ? 'pointer-events-none opacity-70' : '',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleInputChange}
        />

        {uploading ? (
          <>
            <Spinner size="sm" />
            <span className="text-sm text-dark-300">Subiendo...</span>
          </>
        ) : (
          <>
            <div
              className={[
                'flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-200',
                dragOver ? 'bg-gold-400/20' : 'bg-dark-800',
              ].join(' ')}
            >
              <Upload
                className={['h-5 w-5 transition-colors duration-200', dragOver ? 'text-gold-400' : 'text-dark-400'].join(' ')}
              />
            </div>
            <div className="text-center">
              <p className={['text-sm font-medium transition-colors duration-200', dragOver ? 'text-gold-400' : 'text-dark-200'].join(' ')}>
                Arrastra un archivo o{' '}
                <span className="text-gold-400 underline underline-offset-2">selecciona</span>
              </p>
              <p className="mt-1 text-xs text-dark-500">
                PDF o imagen · Máximo {formatFileSize(maxSize)}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Size error */}
      {sizeError && (
        <p className="text-xs text-red-400">{sizeError}</p>
      )}

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-3 rounded-xl border border-dark-700 bg-dark-900 px-4 py-3"
            >
              {/* Thumbnail / icon */}
              {isImage(doc.mime_type) && doc.signed_url ? (
                <img
                  src={doc.signed_url}
                  alt={doc.file_name}
                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-dark-800">
                  {isImage(doc.mime_type) ? (
                    <Image className="h-5 w-5 text-dark-400" />
                  ) : (
                    <FileText className="h-5 w-5 text-gold-400" />
                  )}
                </div>
              )}

              {/* Name + size */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-dark-100">{doc.file_name}</p>
                {doc.file_size != null && (
                  <p className="text-xs text-dark-500">{formatFileSize(doc.file_size)}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-1">
                {doc.signed_url && (
                  <a
                    href={doc.signed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-dark-400 transition-colors hover:bg-dark-800 hover:text-gold-400"
                    title="Abrir archivo"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => onDelete?.(doc.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-dark-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  title="Eliminar archivo"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
