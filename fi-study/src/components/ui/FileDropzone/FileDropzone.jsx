import { useState, useRef } from 'react';
import { validateStudyFile, formatFileSize } from '../../../services/fileValidator';
import './file-dropzone.css';

export default function FileDropzone({
  onFileSelect,
  selectedFile = null,
  error = null,
  disabled = false,
  label = 'Upload Study Document (Optional)'
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState(null);
  const inputRef = useRef(null);

  const displayError = error || localError;

  function handleFile(file) {
    if (!file) {
      setLocalError(null);
      if (onFileSelect) onFileSelect(null, null);
      return;
    }

    const validation = validateStudyFile(file);
    if (!validation.valid) {
      setLocalError(validation.error);
      if (inputRef.current) inputRef.current.value = '';
      if (onFileSelect) onFileSelect(null, validation.error);
      return;
    }

    setLocalError(null);
    if (onFileSelect) onFileSelect(file, null, validation.extension);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }

  function handleClear(e) {
    e.stopPropagation();
    setLocalError(null);
    if (inputRef.current) inputRef.current.value = '';
    if (onFileSelect) onFileSelect(null, null);
  }

  return (
    <div className="tactical-dropzone-wrapper">
      {label && <label className="tactical-dropzone-label">{label}</label>}

      <div
        className={`tactical-dropzone ${isDragging ? 'dragging' : ''} ${selectedFile ? 'has-file' : ''} ${displayError ? 'has-error' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".docx,.pdf,.txt,.md"
          style={{ display: 'none' }}
          disabled={disabled}
          onChange={(e) => handleFile(e.target.files?.[0] || null)}
        />

        {selectedFile ? (
          <div className="dropzone-selected-info">
            <span className="material-symbols-outlined file-icon">description</span>
            <div className="dropzone-file-meta">
              <span className="dropzone-filename">{selectedFile.name}</span>
              <span className="dropzone-filesize">
                {formatFileSize(selectedFile.size)}
              </span>
            </div>
            {!disabled && (
              <button
                type="button"
                className="dropzone-remove-btn"
                onClick={handleClear}
                title="Remove file"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>
        ) : (
          <div className="dropzone-prompt">
            <span className="material-symbols-outlined upload-icon">upload_file</span>
            <div className="dropzone-text">
              <strong>Click or drop file to upload</strong>
              <span>Supported: .DOCX, .PDF, .MD, .TXT (Max 15 MB)</span>
            </div>
          </div>
        )}
      </div>

      {displayError && <span className="error-message">{displayError}</span>}
    </div>
  );
}

