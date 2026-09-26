import { useCallback, useEffect, useRef, useState } from 'react';
import { formatBytes, validateFile } from '../lib/validateFile';
import styles from './FileUpload.module.css';

export type UploadStatus = 'pending' | 'uploading' | 'done' | 'error';

export interface UploadContext {
  /** Report upload progress as a percentage from 0 to 100. */
  onProgress: (percent: number) => void;
  /** Aborted when the user removes the file or the component unmounts. */
  signal: AbortSignal;
}

export interface UploadItem {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
}

export interface FileUploadProps {
  /** Comma-separated list of extensions and MIME types, e.g. `"image/*,.pdf"`. */
  accept?: string;
  /** Maximum size per file, in megabytes. */
  maxSizeMb?: number;
  /** Allow selecting more than one file. */
  multiple?: boolean;
  disabled?: boolean;
  /** Prompt shown inside the drop zone. */
  label?: string;
  /**
   * Sends one file. Omit to let the component collect files without uploading —
   * useful when a parent form submits them later.
   */
  onUpload?: (file: File, context: UploadContext) => Promise<void>;
  /** Called with the files that passed validation, before uploading starts. */
  onFilesAccepted?: (files: File[]) => void;
}

const clampPercent = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

const STATUS_LABEL: Record<UploadStatus, string> = {
  pending: 'Ready',
  uploading: 'Uploading',
  done: 'Uploaded',
  error: 'Failed',
};

export function FileUpload({
  accept,
  maxSizeMb,
  multiple = false,
  disabled = false,
  label = 'Drag and drop, or click to choose a file',
  onUpload,
  onFilesAccepted,
}: FileUploadProps) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const controllers = useRef(new Map<string, AbortController>());
  // Drag events fire per descendant, so track depth instead of toggling a boolean.
  const dragDepth = useRef(0);

  useEffect(() => {
    const pending = controllers.current;
    return () => {
      pending.forEach((controller) => controller.abort());
      pending.clear();
    };
  }, []);

  const patchItem = useCallback((id: string, changes: Partial<UploadItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  }, []);

  const runUpload = useCallback(
    async (item: UploadItem) => {
      if (!onUpload) return;

      const controller = new AbortController();
      controllers.current.set(item.id, controller);
      patchItem(item.id, { status: 'uploading', progress: 0, error: undefined });

      try {
        await onUpload(item.file, {
          signal: controller.signal,
          onProgress: (percent) => patchItem(item.id, { progress: clampPercent(percent) }),
        });
        patchItem(item.id, { status: 'done', progress: 100 });
      } catch (error) {
        // A removed file is already gone from the list; nothing to report.
        if (controller.signal.aborted) return;
        patchItem(item.id, {
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed.',
        });
      } finally {
        controllers.current.delete(item.id);
      }
    },
    [onUpload, patchItem],
  );

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const selected = Array.from(incoming);
      if (selected.length === 0) return;

      const next = (multiple ? selected : selected.slice(0, 1)).map<UploadItem>((file) => {
        const error = validateFile(file, { accept, maxSizeMb });
        return {
          id: crypto.randomUUID(),
          file,
          status: error ? 'error' : 'pending',
          progress: 0,
          error: error ?? undefined,
        };
      });

      if (multiple) {
        setItems((prev) => [...prev, ...next]);
      } else {
        // Single-file mode replaces the selection, so stop whatever was in flight.
        controllers.current.forEach((controller) => controller.abort());
        controllers.current.clear();
        setItems(next);
      }

      const accepted = next.filter((item) => item.status !== 'error');
      if (accepted.length > 0) {
        onFilesAccepted?.(accepted.map((item) => item.file));
        accepted.forEach(runUpload);
      }
    },
    [accept, maxSizeMb, multiple, onFilesAccepted, runUpload],
  );

  const removeItem = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleDragEnter = (event: React.DragEvent) => {
    event.preventDefault();
    if (disabled) return;
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    if (!disabled) addFiles(event.dataTransfer.files);
  };

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={`${styles.dropzone} ${isDragging ? styles.dragging : ''}`}
        onClick={openPicker}
        onDragEnter={handleDragEnter}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={disabled}
        aria-describedby={accept || maxSizeMb ? 'file-upload-hint' : undefined}
      >
        <span className={styles.icon} aria-hidden="true">
          &#8593;
        </span>
        <span className={styles.label}>{label}</span>
        {(accept || maxSizeMb !== undefined) && (
          <span id="file-upload-hint" className={styles.hint}>
            {[accept, maxSizeMb !== undefined ? `up to ${maxSizeMb} MB` : null]
              .filter(Boolean)
              .join(' · ')}
          </span>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        className={styles.input}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => {
          if (event.target.files) addFiles(event.target.files);
          // Reset so picking the same file again still fires a change event.
          event.target.value = '';
        }}
      />

      {items.length > 0 && (
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.id} className={styles.item} data-status={item.status}>
              <div className={styles.itemHeader}>
                <span className={styles.name} title={item.file.name}>
                  {item.file.name}
                </span>
                <span className={styles.size}>{formatBytes(item.file.size)}</span>
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => removeItem(item.id)}
                  aria-label={`Remove ${item.file.name}`}
                >
                  &times;
                </button>
              </div>

              {item.status === 'uploading' && (
                <progress
                  className={styles.progress}
                  max={100}
                  value={item.progress}
                  aria-label={`Uploading ${item.file.name}`}
                />
              )}

              <span className={styles.status} role={item.status === 'error' ? 'alert' : undefined}>
                {item.error ?? STATUS_LABEL[item.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
