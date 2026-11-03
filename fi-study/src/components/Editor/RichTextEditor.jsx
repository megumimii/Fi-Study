import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import EditorToolbar from './EditorToolbar';
import EditorStatusBar from './EditorStatusBar';
import './rich-text-editor.css';

export default function RichTextEditor({
  content = '<p></p>',
  onChange,
  originalExtension = 'docx',
  isDirty = false,
  saving = false,
  placeholder = 'Start writing or editing your study notes here...'
}) {
  const disallowImages = (originalExtension || '').toLowerCase() === 'txt';

  const extensions = [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] }
    }),
    Underline,
    TextAlign.configure({
      types: ['heading', 'paragraph']
    }),
    Link.configure({
      openOnClick: false,
      autolink: true
    }),
    Table.configure({
      resizable: true
    }),
    TableRow,
    TableHeader,
    TableCell,
    Placeholder.configure({
      placeholder
    }),
    ...(disallowImages ? [] : [Image])
  ];

  const editor = useEditor({
    extensions,
    content,
    onUpdate: ({ editor: ed }) => {
      if (onChange) {
        onChange(ed.getHTML());
      }
    }
  });

  // Sync external content updates (e.g., when document finishes loading)
  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    if (content && content !== currentHtml) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  return (
    <div className="tactical-editor-shell">
      <EditorToolbar editor={editor} disallowImages={disallowImages} />
      <div className="tactical-editor-viewport">
        <EditorContent editor={editor} className="tactical-prosemirror-host" />
      </div>
      <EditorStatusBar
        htmlContent={content}
        originalExtension={originalExtension}
        isDirty={isDirty}
        saving={saving}
      />
    </div>
  );
}

