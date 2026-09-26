import { useId, useRef, useState } from 'react';
import {
  ACCEPT_ATTRIBUTE,
  MAX_SIZE_MB,
  formatBytes,
  validateResume,
} from '../lib/validateResume';
import './ResumeUpload.css';

export type ResumeUploadState = 'idle' | 'dragging' | 'success' | 'error';

export interface ResumeUploadProps {
  /** Receives the validated file, or `null` when the selection is cleared. */
  onFileSelected?: (file: File | null) => void;
  /** Overrides the generated input id, for pages rendering more than one. */
  id?: string;
  disabled?: boolean;
}

export function ResumeUpload({ onFileSelected, id, disabled = false }: ResumeUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const generatedId = useId();
  const inputId = id ?? `resume-upload-${generatedId}`;
  const errorId = `${inputId}-error`;

  const inputRef = useRef<HTMLInputElement>(null);
  // `dragleave` fires for every descendant, so a plain boolean flickers as the
  // cursor crosses child elements. Track depth instead.
  const dragDepth = useRef(0);

  // Dragging is transient, so it outranks the persistent states visually.
  const state: ResumeUploadState = isDragging
    ? 'dragging'
    : error
      ? 'error'
      : file
        ? 'success'
        : 'idle';

  const selectFile = (candidate: File | undefined) => {
    if (!candidate) return;

    const reason = validateResume(candidate);
    if (reason) {
      setFile(null);
      setError(reason);
      return;
    }

    setFile(candidate);
    setError(null);
    onFileSelected?.(candidate);
  };

  const clearFile = () => {
    setFile(null);
    setError(null);
    // Reset so re-picking the same file still fires a change event.
    if (inputRef.current) inputRef.current.value = '';
    onFileSelected?.(null);
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
    if (!disabled) selectFile(event.dataTransfer.files[0]);
  };

  return (
    <div className="resume-upload">
      {/* Visually hidden but still focusable, so Tab reaches it and Enter or
          Space opens the picker natively. The label below is its drop zone. */}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="resume-upload__input"
        accept={ACCEPT_ATTRIBUTE}
        disabled={disabled}
        aria-describedby={errorId}
        aria-invalid={error !== null}
        onChange={(event) => selectFile(event.target.files?.[0])}
      />

      <label
        htmlFor={inputId}
        className="resume-upload__zone"
        data-state={state}
        data-disabled={disabled || undefined}
        onDragEnter={handleDragEnter}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span className="resume-upload__icon" aria-hidden="true">
          &#8593;
        </span>
        <span className="resume-upload__prompt">
          Upload your resume &mdash; drag and drop, or click to browse
        </span>
        <span className="resume-upload__hint">
          PDF, DOC, or DOCX &middot; up to {MAX_SIZE_MB}MB
        </span>
      </label>

      {file && (
        <div className="resume-upload__file">
          <span className="resume-upload__filename">
            {file.name} ({formatBytes(file.size)})
          </span>
          <button
            type="button"
            className="resume-upload__remove"
            onClick={clearFile}
            aria-label={`Remove ${file.name}`}
          >
            Remove
          </button>
        </div>
      )}

      {/* Both regions stay mounted so assistive tech registers them up front
          and announces text as it appears. */}
      <p className="resume-upload__error" id={errorId} role="alert">
        {error}
      </p>
      <p className="resume-upload__status" role="status" aria-live="polite">
        {!error && file ? `${file.name} attached.` : ''}
      </p>
    </div>
  );
}
