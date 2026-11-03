import { useRef } from 'react';

export default function EditorToolbar({ editor, disallowImages = false }) {
  const imageInputRef = useRef(null);

  if (!editor) return null;

  function handleSetLink() {
    const previousUrl = editor.getAttributes('link').href || '';
    const url = window.prompt('Enter URL:', previousUrl);
    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url.trim(), target: '_blank' })
      .run();
  }

  function handleImageUpload(event) {
    if (disallowImages) return;
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPEG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result;
      if (typeof src === 'string') {
        editor.chain().focus().setImage({ src, alt: file.name }).run();
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  return (
    <div className="tiptap-toolbar" role="toolbar" aria-label="Rich text formatting toolbar">
      {/* History */}
      <div className="toolbar-group">
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          title="Undo"
        >
          <span className="material-symbols-outlined">undo</span>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          title="Redo"
        >
          <span className="material-symbols-outlined">redo</span>
        </button>
      </div>

      {/* Headings & Paragraph */}
      <div className="toolbar-group">
        <button
          type="button"
          className={`toolbar-btn text-btn ${editor.isActive('paragraph') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().setParagraph().run()}
          title="Paragraph"
        >
          P
        </button>
        <button
          type="button"
          className={`toolbar-btn text-btn ${editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Heading 1"
        >
          H1
        </button>
        <button
          type="button"
          className={`toolbar-btn text-btn ${editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          className={`toolbar-btn text-btn ${editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Heading 3"
        >
          H3
        </button>
      </div>

      {/* Inline Marks */}
      <div className="toolbar-group">
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive('bold') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <span className="material-symbols-outlined">format_bold</span>
        </button>
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <span className="material-symbols-outlined">format_italic</span>
        </button>
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive('underline') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline"
        >
          <span className="material-symbols-outlined">format_underlined</span>
        </button>
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive('strike') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <span className="material-symbols-outlined">strikethrough_s</span>
        </button>
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive('code') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="Inline Code"
        >
          <span className="material-symbols-outlined">code</span>
        </button>
      </div>

      {/* Alignment */}
      <div className="toolbar-group">
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title="Align Left"
        >
          <span className="material-symbols-outlined">format_align_left</span>
        </button>
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title="Align Center"
        >
          <span className="material-symbols-outlined">format_align_center</span>
        </button>
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title="Align Right"
        >
          <span className="material-symbols-outlined">format_align_right</span>
        </button>
      </div>

      {/* Lists & Blocks */}
      <div className="toolbar-group">
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          <span className="material-symbols-outlined">format_list_bulleted</span>
        </button>
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive('orderedList') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
        >
          <span className="material-symbols-outlined">format_list_numbered</span>
        </button>
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive('blockquote') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Blockquote"
        >
          <span className="material-symbols-outlined">format_quote</span>
        </button>
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive('codeBlock') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Code Block"
        >
          <span className="material-symbols-outlined">terminal</span>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Divider"
        >
          <span className="material-symbols-outlined">horizontal_rule</span>
        </button>
      </div>

      {/* Links, Images, & Tables */}
      <div className="toolbar-group">
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive('link') ? 'is-active' : ''}`}
          onClick={handleSetLink}
          title="Insert / Edit Link"
        >
          <span className="material-symbols-outlined">link</span>
        </button>

        {!disallowImages ? (
          <>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => imageInputRef.current?.click()}
              title="Insert Image"
            >
              <span className="material-symbols-outlined">image</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            className="toolbar-btn"
            disabled
            title="Images are not allowed in .TXT documents"
          >
            <span className="material-symbols-outlined">hide_image</span>
          </button>
        )}

        <button
          type="button"
          className={`toolbar-btn ${editor.isActive('table') ? 'is-active' : ''}`}
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
          title="Insert 3x3 Table"
        >
          <span className="material-symbols-outlined">table_chart</span>
        </button>

        {editor.isActive('table') && (
          <>
            <button
              type="button"
              className="toolbar-btn text-btn"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              title="Add Column"
            >
              +COL
            </button>
            <button
              type="button"
              className="toolbar-btn text-btn"
              onClick={() => editor.chain().focus().addRowAfter().run()}
              title="Add Row"
            >
              +ROW
            </button>
            <button
              type="button"
              className="toolbar-btn text-btn danger"
              onClick={() => editor.chain().focus().deleteTable().run()}
              title="Delete Table"
            >
              DEL TBL
            </button>
          </>
        )}
      </div>
    </div>
  );
}

