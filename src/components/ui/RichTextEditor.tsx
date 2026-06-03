import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';
import { 
  Bold, Italic, Underline as UnderlineIcon, 
  List, ListOrdered, Undo2, Redo2 
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = 'Comece a escrever...', 
  minHeight = '120px' 
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // If the editor is empty, return empty string
      const isEmpty = editor.getText().trim() === '';
      onChange(isEmpty ? '' : html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none px-4 py-3 outline-none text-foreground leading-relaxed focus:outline-none min-h-[120px] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-0.5',
        style: `min-height: ${minHeight}`,
      },
    },
  });

  // Sync external value
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all duration-200">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-2.5 py-1.5 border-b border-border bg-muted/30">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ${editor.isActive('bold') ? 'bg-primary/20 text-primary hover:text-primary' : ''}`}
          title="Negrito"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ${editor.isActive('italic') ? 'bg-primary/20 text-primary hover:text-primary' : ''}`}
          title="Itálico"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ${editor.isActive('underline') ? 'bg-primary/20 text-primary hover:text-primary' : ''}`}
          title="Sublinhado"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>
        
        <div className="w-px h-4 bg-border/60 mx-1 shrink-0" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ${editor.isActive('bulletList') ? 'bg-primary/20 text-primary hover:text-primary' : ''}`}
          title="Lista"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ${editor.isActive('orderedList') ? 'bg-primary/20 text-primary hover:text-primary' : ''}`}
          title="Lista numerada"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-border/60 mx-1 shrink-0" />

        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Desfazer"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Refazer"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* Editor Content Area */}
      <div className="editor-container">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
