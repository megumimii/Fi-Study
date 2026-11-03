export default function EditorStatusBar({
  htmlContent = '',
  originalExtension = 'docx',
  isDirty = false,
  saving = false
}) {
  const tempDiv = typeof document !== 'undefined' ? document.createElement('div') : null;
  let plainText = '';
  if (tempDiv) {
    tempDiv.innerHTML = htmlContent;
    plainText = (tempDiv.innerText || tempDiv.textContent || '').trim();
  }

  const charCount = plainText.length;
  const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
  const extUpper = (originalExtension || 'docx').toUpperCase();
  const aiReady = charCount >= 500;

  return (
    <div className="tiptap-status-bar">
      <div className="status-bar-left">
        <span className="status-metric">
          <strong>{wordCount}</strong> WORDS
        </span>
        <span className="status-divider">//</span>
        <span className="status-metric">
          <strong>{charCount}</strong> CHARS
        </span>
        <span className="status-divider">//</span>
        <span className={`status-ai-readiness ${aiReady ? 'ready' : 'short'}`}>
          {aiReady ? 'AI GENERATION READY' : `NEED ${500 - charCount} MORE CHARS FOR AI QUIZ`}
        </span>
      </div>

      <div className="status-bar-right">
        <span className={`status-save-pill ${saving ? 'saving' : isDirty ? 'unsaved' : 'saved'}`}>
          {saving ? 'Saving...' : isDirty ? 'Unsaved edits' : 'Saved'}
        </span>
      </div>
    </div>
  );
}

