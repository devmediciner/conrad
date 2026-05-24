import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { useEffect, useCallback } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, TextQuote,
  Link2, ImagePlus, Undo2, Redo2,
  AlignLeft, AlignCenter, AlignRight,
  Highlighter, RemoveFormatting, Minus,
  Loader2,
} from 'lucide-react';

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        parseHTML: element => element.getAttribute('width') || element.style.width || '100%',
        renderHTML: attributes => {
          return {
            width: attributes.width,
            style: `width: ${attributes.width}; max-width: 100%; display: block; margin: 8px auto;`,
          };
        },
      },
    };
  },
});

interface ArticleEditorProps {
  value: string;
  onChange: (html: string) => void;
  onImageUpload?: () => void;
  isUploadingImage?: boolean;
  placeholder?: string;
}

/* ────────────────────────── toolbar button ────────────────────────── */
function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-md transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed
        ${isActive
          ? 'bg-primary/15 text-primary shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
        }`}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div className="w-px h-5 bg-border/60 mx-0.5 shrink-0" />;
}

/* ────────────────────────── main component ────────────────────────── */
export function ArticleEditor({
  value,
  onChange,
  onImageUpload,
  isUploadingImage = false,
  placeholder = 'Comece a escrever seu artigo...',
}: ArticleEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Highlight.configure({ multicolor: false }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline underline-offset-4 cursor-pointer' },
      }),
      ResizableImage.configure({
        HTMLAttributes: { class: 'rounded-2xl mx-auto shadow-xl mt-8 mb-2 max-w-full border border-border/20 object-cover' },
      }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-invert max-w-none min-h-[400px] px-6 py-5 outline-none text-foreground text-base leading-relaxed ' +
          '[&_h1]:text-3xl [&_h1]:font-extrabold [&_h1]:tracking-tight [&_h1]:mt-8 [&_h1]:mb-4 ' +
          '[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:mt-6 [&_h2]:mb-3 ' +
          '[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 ' +
          '[&_p]:mb-4 [&_p]:text-foreground/85 ' +
          '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 ' +
          '[&_li]:mb-1 ' +
          '[&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-5 [&_blockquote]:py-2 [&_blockquote]:my-6 [&_blockquote]:italic [&_blockquote]:text-foreground/70 [&_blockquote]:bg-muted/30 [&_blockquote]:rounded-r-xl ' +
          '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 ' +
          '[&_img]:rounded-2xl [&_img]:mx-auto [&_img]:shadow-xl [&_img]:mt-8 [&_img]:mb-2 [&_img]:max-w-full [&_img]:border [&_img]:border-border/20 ' +
          '[&_mark]:bg-primary/20 [&_mark]:text-foreground [&_mark]:rounded-sm [&_mark]:px-1 ' +
          '[&_hr]:border-border/50 [&_hr]:my-8',
      },
    },
  });

  // Sync external value changes (e.g. when opening the modal with existing article)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL do link:', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImageByUrl = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('URL da imagem:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  const ic = 'w-4 h-4'; // icon class shorthand

  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all duration-200">
      {/* ─── toolbar ─── */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-border bg-muted/40">
        {/* Undo / Redo */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Desfazer">
          <Undo2 className={ic} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Refazer">
          <Redo2 className={ic} />
        </ToolbarButton>

        <Separator />

        {/* Text formatting */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Negrito">
          <Bold className={ic} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Itálico">
          <Italic className={ic} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Sublinhado">
          <UnderlineIcon className={ic} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Tachado">
          <Strikethrough className={ic} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} isActive={editor.isActive('highlight')} title="Destaque">
          <Highlighter className={ic} />
        </ToolbarButton>

        <Separator />

        {/* Headings */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="Título 1">
          <Heading1 className={ic} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Título 2">
          <Heading2 className={ic} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="Título 3">
          <Heading3 className={ic} />
        </ToolbarButton>

        <Separator />

        {/* Lists & quote */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Lista">
          <List className={ic} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Lista numerada">
          <ListOrdered className={ic} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Citação">
          <TextQuote className={ic} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linha divisória">
          <Minus className={ic} />
        </ToolbarButton>

        <Separator />

        {/* Alignment */}
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="Alinhar à esquerda">
          <AlignLeft className={ic} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="Centralizar">
          <AlignCenter className={ic} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="Alinhar à direita">
          <AlignRight className={ic} />
        </ToolbarButton>

        <Separator />

        {/* Link & Image */}
        <ToolbarButton onClick={setLink} isActive={editor.isActive('link')} title="Inserir link">
          <Link2 className={ic} />
        </ToolbarButton>
        {onImageUpload && (
          <ToolbarButton onClick={onImageUpload} disabled={isUploadingImage} title="Upload de imagem do PC">
            {isUploadingImage ? <Loader2 className={`${ic} animate-spin`} /> : <ImagePlus className={ic} />}
          </ToolbarButton>
        )}
        <ToolbarButton onClick={addImageByUrl} title="Imagem por URL">
          <ImagePlus className={`${ic} opacity-50`} />
        </ToolbarButton>

        <Separator />

        {/* Clear */}
        <ToolbarButton onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Limpar formatação">
          <RemoveFormatting className={ic} />
        </ToolbarButton>
      </div>

      {/* ─── bubble menu para texto ─── */}
      {editor && (
        <BubbleMenu 
          editor={editor} 
          tippyOptions={{ duration: 150, placement: 'top' }}
          shouldShow={({ editor }) => !editor.isActive('image') && !editor.state.selection.empty}
        >
          <div className="flex items-center gap-0.5 bg-card border border-border rounded-lg shadow-xl px-1.5 py-1 backdrop-blur-xl">
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Negrito">
              <Bold className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Itálico">
              <Italic className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Sublinhado">
              <UnderlineIcon className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Tachado">
              <Strikethrough className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} isActive={editor.isActive('highlight')} title="Destaque">
              <Highlighter className="w-3.5 h-3.5" />
            </ToolbarButton>
            <div className="w-px h-4 bg-border/60 mx-0.5" />
            <ToolbarButton onClick={setLink} isActive={editor.isActive('link')} title="Link">
              <Link2 className="w-3.5 h-3.5" />
            </ToolbarButton>
          </div>
        </BubbleMenu>
      )}

      {/* ─── bubble menu para imagem (Redimensionar e Legenda) ─── */}
      {editor && (
        <BubbleMenu 
          editor={editor} 
          tippyOptions={{ duration: 150, placement: 'top' }}
          shouldShow={({ editor }) => editor.isActive('image')}
        >
          <div className="flex items-center gap-0.5 bg-card border border-border rounded-lg shadow-xl px-1.5 py-1 backdrop-blur-xl">
            <span className="text-[10px] text-muted-foreground font-semibold px-2">Largura:</span>
            <button
              type="button"
              onClick={() => editor.chain().focus().updateAttributes('image', { width: '25%' }).run()}
              className={`text-xs px-2 py-1 rounded transition-colors ${editor.getAttributes('image').width === '25%' ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground hover:text-foreground'}`}
            >
              25%
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().updateAttributes('image', { width: '50%' }).run()}
              className={`text-xs px-2 py-1 rounded transition-colors ${editor.getAttributes('image').width === '50%' ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground hover:text-foreground'}`}
            >
              50%
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().updateAttributes('image', { width: '75%' }).run()}
              className={`text-xs px-2 py-1 rounded transition-colors ${editor.getAttributes('image').width === '75%' ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground hover:text-foreground'}`}
            >
              75%
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().updateAttributes('image', { width: '100%' }).run()}
              className={`text-xs px-2 py-1 rounded transition-colors ${editor.getAttributes('image').width === '100%' || !editor.getAttributes('image').width ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground hover:text-foreground'}`}
            >
              100%
            </button>
            <div className="w-px h-4 bg-border/60 mx-1" />
            <button
              type="button"
              onClick={() => {
                const caption = window.prompt('Digite o texto de legenda/fonte da imagem:');
                if (caption !== null && caption.trim() !== '') {
                  // Insere um parágrafo formatado como legenda logo abaixo da imagem
                  editor
                    .chain()
                    .focus()
                    .insertContentAt(
                      editor.state.selection.to,
                      `<p style="text-align: center; font-size: 0.85em; color: #888888; font-style: italic; margin-top: 4px; margin-bottom: 20px;">Fonte: ${caption}</p><p></p>`
                    )
                    .run();
                }
              }}
              className="text-xs px-2.5 py-1 rounded text-primary hover:bg-primary/10 transition-colors font-medium flex items-center gap-1"
            >
              + Legenda
            </button>
          </div>
        </BubbleMenu>
      )}

      {/* ─── editor area ─── */}
      <EditorContent editor={editor} />
    </div>
  );
}
