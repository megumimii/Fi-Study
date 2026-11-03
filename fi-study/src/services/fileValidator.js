export const MAX_FILE_SIZE_MB = 15;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const SUPPORTED_EXTENSIONS = ['docx', 'pdf', 'txt', 'md'];

export const EXTENSION_MIME_MAP = {
  docx: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/octet-stream'
  ],
  pdf: ['application/pdf'],
  txt: ['text/plain', ''],
  md: ['text/markdown', 'text/x-markdown', 'text/plain', '']
};

/**
 * Extracts normalized lowercase file extension from a file name.
 * @param {string} fileName
 * @returns {string}
 */
export function getFileExtension(fileName = '') {
  if (!fileName || typeof fileName !== 'string') return '';
  const parts = fileName.trim().split('.');
  if (parts.length < 2) return '';
  return parts.pop().toLowerCase();
}

/**
 * Formats byte size into human-readable string (KB / MB).
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Validates an uploaded document file against Fi-Study requirements:
 * - Supported extensions: .docx, .pdf, .txt, .md
 * - Non-empty (> 0 bytes)
 * - Within maximum size limit (<= 15 MB)
 * @param {File} file
 * @returns {{ valid: boolean, extension: string, error: string | null }}
 */
export function validateStudyFile(file) {
  if (!file) {
    return { valid: false, extension: '', error: 'No file selected.' };
  }

  const extension = getFileExtension(file.name);

  if (!SUPPORTED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      extension,
      error: `Unsupported file format "${extension ? '.' + extension : 'unknown'}". Allowed formats: .DOCX, .PDF, .TXT, .MD.`
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      extension,
      error: `The selected file "${file.name}" is empty (0 bytes). Please upload a file with content.`
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      extension,
      error: `File size (${formatFileSize(file.size)}) exceeds the ${MAX_FILE_SIZE_MB} MB maximum limit.`
    };
  }

  const allowedMimes = EXTENSION_MIME_MAP[extension] || [];
  if (file.type && allowedMimes.length > 0 && !allowedMimes.includes(file.type)) {
    // Allow text/* fallback for .md/.txt
    const isTextFallback = (extension === 'md' || extension === 'txt') && file.type.startsWith('text/');
    if (!isTextFallback) {
      return {
        valid: false,
        extension,
        error: `File MIME type (${file.type}) does not match the .${extension.toUpperCase()} format.`
      };
    }
  }

  return {
    valid: true,
    extension,
    error: null
  };
}

