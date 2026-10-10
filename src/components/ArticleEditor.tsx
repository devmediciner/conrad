import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { useEffect, useCallback, useState, useRef } from "react";
import { toast } from "sonner";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, TextQuote,
  Link2, ImagePlus, Undo2, Redo2,
  AlignLeft, AlignCenter, AlignRight,
  Highlighter, RemoveFormatting, Minus,
  Loader2, Trash2, Columns2, GripVertical
} from "lucide-react";

export function parseWidthPercent(w?: string | number): number {
  if (!w) return 100;
  if (typeof w === "number") return w;
  const match = w.match(/(\d+)%/);
  if (match) return parseInt(match[1], 10);
  const num = parseInt(w, 10);
  return isNaN(num) ? 100 : num;
}

export function normalizeArticleHtml(html: string): string {
  if (!html || !html.includes("<img")) return html;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const allP = Array.from(doc.querySelectorAll("p"));

    for (let i = 0; i < allP.length; i++) {
      const currentP = allP[i];
      if (!currentP.parentNode) continue;
      const currentImgs = currentP.querySelectorAll("img");
      const currentText = currentP.textContent?.trim() || "";

      if (currentText === "" && currentImgs.length > 0) {
        const isCurrentPartial = Array.from(currentImgs).every((img) => {
          const w = img.style.width || img.getAttribute("width") || "";
          const match = w.match(/(\d+)%/);
          const wNum = match ? parseInt(match[1], 10) : parseInt(w, 10);
          return (wNum > 0 && wNum <= 55) || w.includes("50%") || w.includes("48%") || img.classList.contains("img-half-width");
        });

        if (isCurrentPartial) {
          let nextEl = currentP.nextElementSibling;
          while (nextEl && nextEl.tagName.toLowerCase() === "p") {
            const nextImgs = nextEl.querySelectorAll("img");
            const nextText = nextEl.textContent?.trim() || "";
            if (nextText === "" && nextImgs.length > 0) {
              const isNextPartial = Array.from(nextImgs).every((img) => {
                const w = img.style.width || img.getAttribute("width") || "";
                const match = w.match(/(\d+)%/);
                const wNum = match ? parseInt(match[1], 10) : parseInt(w, 10);
                return (wNum > 0 && wNum <= 55) || w.includes("50%") || w.includes("48%") || img.classList.contains("img-half-width");
              });

              if (isNextPartial) {
                nextImgs.forEach((img) => currentP.appendChild(img));
                const toRemove = nextEl;
                nextEl = nextEl.nextElementSibling;
                toRemove.remove();
                continue;
              }
            }
            break;
          }
        }
      }
    }
    return doc.body.innerHTML;
  } catch {
    return html;
  }
}

/* Resizable Image NodeView */
function ResizableImageNodeView({ node, updateAttributes, selected, deleteNode, editor }: NodeViewProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [liveWidth, setLiveWidth] = useState<string>(node.attrs.width || "100%");
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const resizeStateRef = useRef<{
    startX: number;
    startWidth: number;
    parentWidth: number;
    direction: "e" | "w";
  } | null>(null);

  useEffect(() => {
    if (!isResizing) setLiveWidth(node.attrs.width || "100%");
  }, [node.attrs.width, isResizing]);

  const handleMouseDown = (e: React.MouseEvent, direction: "e" | "w") => {
    e.preventDefault();
    e.stopPropagation();
    const img = imgRef.current;
    if (!img) return;
    const parent = (containerRef.current?.closest(".ProseMirror") as HTMLElement) ?? containerRef.current?.parentElement ?? document.body;
    resizeStateRef.current = { startX: e.clientX, startWidth: img.clientWidth, parentWidth: parent.clientWidth || 800, direction };
    setIsResizing(true);

    const onMouseMove = (ev: MouseEvent) => {
      if (!resizeStateRef.current) return;
      const { startX, startWidth, parentWidth, direction: dir } = resizeStateRef.current;
      const delta = ev.clientX - startX;
      const newPx = dir === "e" ? startWidth + delta : startWidth - delta;
      const clamped = Math.max(80, Math.min(newPx, parentWidth));
      setLiveWidth(`${Math.round((clamped / parentWidth) * 100)}%`);
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (resizeStateRef.current && imgRef.current) {
        const { parentWidth } = resizeStateRef.current;
        const pct = Math.round((imgRef.current.clientWidth / parentWidth) * 100);
        const clampedPct = Math.max(10, Math.min(pct, 100));
        const finalWidth = clampedPct >= 46 && clampedPct <= 54 ? "50%" : `${clampedPct}%`;
        updateAttributes({ width: finalWidth });
      }
      setIsResizing(false);
      resizeStateRef.current = null;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const widthNum = parseWidthPercent(liveWidth);
  const isHalf = (widthNum >= 45 && widthNum <= 55) || liveWidth.includes("50%") || liveWidth.includes("48%");
  const isThird = (widthNum >= 28 && widthNum <= 36) || liveWidth.includes("33%") || liveWidth.includes("31%");
  const isFull = !isHalf && !isThird && widthNum >= 92;
  const align = node.attrs.align || "center";

  let effectiveWidth: string;
  let wrapperMargin: string;

  if (isHalf) {
    effectiveWidth = "calc(50% - 8px)";
    wrapperMargin = "0.5rem 4px";
  } else if (isThird) {
    effectiveWidth = "calc(33.333% - 8px)";
    wrapperMargin = "0.5rem 4px";
  } else if (isFull) {
    effectiveWidth = "100%";
    wrapperMargin = align === "left" ? "1rem auto 1rem 0" : align === "right" ? "1rem 0 1rem auto" : "1rem auto";
  } else {
    effectiveWidth = liveWidth;
    wrapperMargin = align === "left" ? "0.5rem 0.5rem 0.5rem 0" : align === "right" ? "0.5rem 0 0.5rem 0.5rem" : "0.5rem 4px";
  }

  const wrapperStyle: React.CSSProperties = isFull
    ? { display: "block", width: "100%", maxWidth: "100%", margin: wrapperMargin, boxSizing: "border-box" }
    : { display: "inline-block", width: effectiveWidth, maxWidth: "100%", verticalAlign: "top", margin: wrapperMargin, boxSizing: "border-box" };

  const handleAlign = (newAlign: "left" | "center" | "right") => {
    updateAttributes({ align: newAlign });
    try {
      if (editor) {
        editor.commands.setTextAlign(newAlign);
      }
    } catch {
      // ignore
    }
  };

  const showControls = selected || isResizing;

  return (
    <NodeViewWrapper
      as="span"
      ref={containerRef}
      data-align={align}
      data-half={isHalf ? "true" : undefined}
      data-third={isThird ? "true" : undefined}
      data-drag-handle
      draggable="true"
      style={wrapperStyle}
      className={`conrad-node-img-wrapper relative select-none ${
        isFull ? (align === "center" ? "mx-auto block" : align === "right" ? "ml-auto block" : "mr-auto block") : "inline-block align-top"
      }`}
    >
      <span className={`block relative rounded-xl overflow-visible group cursor-grab active:cursor-grabbing ${showControls ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}>
        <img
          ref={imgRef}
          src={node.attrs.src}
          alt={node.attrs.alt || ""}
          draggable={false}
          className="w-full h-auto object-contain rounded-xl block border border-border/20 shadow-md pointer-events-auto"
        />
        {isResizing && (
          <span className="absolute top-2 left-2 z-40 bg-black/80 text-white text-[11px] font-mono px-2 py-0.5 rounded-md shadow-md pointer-events-none">{liveWidth}</span>
        )}
        {showControls && (
          <>
            <span onMouseDown={(e) => handleMouseDown(e, "w")} className="absolute top-1/2 -left-2.5 -translate-y-1/2 w-4 h-4 bg-primary border-2 border-background rounded-full shadow-lg z-30 cursor-ew-resize hover:scale-125 transition-transform block" title="Redimensionar" />
            <span onMouseDown={(e) => handleMouseDown(e, "e")} className="absolute top-1/2 -right-2.5 -translate-y-1/2 w-4 h-4 bg-primary border-2 border-background rounded-full shadow-lg z-30 cursor-ew-resize hover:scale-125 transition-transform block" title="Redimensionar" />
          </>
        )}
        {showControls && (
          <span className="absolute -top-11 left-1/2 -translate-x-1/2 z-40 flex items-center gap-0.5 bg-card/98 border border-border px-2 py-1.5 rounded-xl shadow-2xl backdrop-blur-md whitespace-nowrap">
            <span className="p-1 text-muted-foreground/80 cursor-grab active:cursor-grabbing" title="Arraste para mover no texto">
              <GripVertical className="w-3.5 h-3.5" />
            </span>
            <span className="w-px h-3.5 bg-border mx-0.5 inline-block" />
            <button
              type="button"
              onClick={() => handleAlign("left")}
              className={`p-1 rounded transition-colors ${
                align === "left" ? "bg-primary/20 text-primary font-bold" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="Alinhar à esquerda"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleAlign("center")}
              className={`p-1 rounded transition-colors ${
                align === "center" || !align ? "bg-primary/20 text-primary font-bold" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="Centralizar"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleAlign("right")}
              className={`p-1 rounded transition-colors ${
                align === "right" ? "bg-primary/20 text-primary font-bold" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="Alinhar à direita"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <span className="w-px h-3.5 bg-border mx-0.5 inline-block" />
            <button type="button" onClick={() => updateAttributes({ width: "100%" })} className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${isFull ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`} title="Largura total">100%</button>
            <button type="button" onClick={() => updateAttributes({ width: "75%" })} className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${widthNum >= 73 && widthNum <= 77 ? "bg-primary/20 text-primary font-bold" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`} title="75%">75%</button>
            <button type="button" onClick={() => updateAttributes({ width: "50%" })} className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors ${isHalf ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`} title="50% lado a lado"><Columns2 className="w-3 h-3" /> 50%</button>
            <button type="button" onClick={() => updateAttributes({ width: "33%" })} className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${isThird ? "bg-primary/20 text-primary font-bold" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`} title="33%">33%</button>
            <span className="w-px h-3.5 bg-border mx-0.5 inline-block" />
            <button type="button" onClick={deleteNode} className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors" title="Remover imagem"><Trash2 className="w-3 h-3" /></button>
          </span>
        )}
      </span>
    </NodeViewWrapper>
  );
}

/* ResizableImage TipTap Extension */
const ResizableImage = Image.extend({
  name: "image",
  inline() { return true; },
  group() { return "inline"; },
  draggable: true,
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: "100%",
        parseHTML: element => element.getAttribute("width") || element.style.width || "100%",
        renderHTML: attributes => ({ width: attributes.width }),
      },
      align: {
        default: "center",
        parseHTML: element => element.getAttribute("data-align") || element.getAttribute("align") || "center",
        renderHTML: attributes => ({ "data-align": attributes.align || "center" }),
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    const rawWidth = HTMLAttributes.width || "100%";
    const align = HTMLAttributes["data-align"] || HTMLAttributes.align || "center";
    const widthNum = parseWidthPercent(rawWidth);
    const isHalf = (widthNum >= 45 && widthNum <= 55) || rawWidth.includes("50%") || rawWidth.includes("48%");
    const isThird = (widthNum >= 28 && widthNum <= 36) || rawWidth.includes("33%") || rawWidth.includes("31%");
    const isFull = !isHalf && !isThird && widthNum >= 92;
    const display = isFull ? "block" : "inline-block";

    let margin: string;
    if (isFull) {
      margin = align === "left" ? "1rem auto 1rem 0" : align === "right" ? "1rem 0 1rem auto" : "1rem auto";
    } else if (isHalf || isThird) {
      margin = "0.5rem 4px";
    } else {
      margin = align === "left" ? "0.5rem 0.5rem 0.5rem 0" : align === "right" ? "0.5rem 0 0.5rem 0.5rem" : "0.5rem 4px";
    }

    const savedWidth = isHalf ? "50%" : isThird ? "33%" : isFull ? "100%" : rawWidth;
    const styleWidth = isHalf ? "calc(50% - 8px)" : isThird ? "calc(33.333% - 8px)" : savedWidth;

    return [
      "img",
      {
        ...HTMLAttributes,
        width: savedWidth,
        "data-align": align,
        class: `conrad-article-img align-${align}${isHalf ? " img-half-width" : ""}${isThird ? " img-third-width" : ""}`,
        style: `width:${styleWidth}; max-width:100%; height:auto; object-fit:contain; display:${display}; vertical-align:top; margin:${margin}; box-sizing:border-box;`,
      },
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageNodeView);
  },
});

interface ArticleEditorProps {
  value: string;
  onChange: (html: string) => void;
  onUploadImage?: (file: File) => Promise<string>;
  onImageUpload?: () => void;
  isUploadingImage?: boolean;
  placeholder?: string;
  className?: string;
}

function ToolbarButton({ onClick, isActive = false, disabled = false, title, children }: { onClick: () => void; isActive?: boolean; disabled?: boolean; title: string; children: React.ReactNode; }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={`p-1.5 rounded-md transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed ${isActive ? "bg-primary/15 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/80"}`}>
      {children}
    </button>
  );
}

function Separator() { return <div className="w-px h-5 bg-border/60 mx-0.5 shrink-0" />; }

export function ArticleEditor({ value, onChange, onUploadImage, onImageUpload, isUploadingImage = false, placeholder = "Comece a escrever seu artigo...", className }: ArticleEditorProps) {
  const [, setSelectionKey] = useState(0);
  const [internalUploading, setInternalUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastSelectionPosRef = useRef<number>(0);
  const onUploadImageRef = useRef(onUploadImage);
  onUploadImageRef.current = onUploadImage;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        dropcursor: { color: "hsl(var(--primary))", width: 3 }
      }),
      Underline,
      Highlight.configure({ multicolor: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline underline-offset-4 cursor-pointer" } }),
      ResizableImage.configure({ HTMLAttributes: { class: "rounded-xl shadow-md max-w-full border border-border/20 object-contain h-auto" } }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: normalizeArticleHtml(value),
    onUpdate: ({ editor: e }) => onChange(normalizeArticleHtml(e.getHTML())),
    onSelectionUpdate: ({ editor: e }) => {
      lastSelectionPosRef.current = e.state.selection.from;
      setSelectionKey(prev => prev + 1);
    },
    editorProps: {
      handleClick: (_view, pos) => {
        lastSelectionPosRef.current = pos;
        return false;
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;

        const files = event.dataTransfer?.files;
        if (files && files.length > 0 && onUploadImageRef.current) {
          const imageFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
          if (imageFiles.length > 0) {
            event.preventDefault();
            const coords = { left: event.clientX, top: event.clientY };
            const dropPos = view.posAtCoords(coords);
            const targetPos = dropPos ? dropPos.pos : view.state.selection.from;
            lastSelectionPosRef.current = targetPos;
            uploadAndInsertFiles(imageFiles, targetPos);
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const files = event.clipboardData?.files;
        if (files && files.length > 0 && onUploadImageRef.current) {
          const imageFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
          if (imageFiles.length > 0) {
            event.preventDefault();
            const targetPos = view.state.selection.from;
            uploadAndInsertFiles(imageFiles, targetPos);
            return true;
          }
        }
        return false;
      },
      attributes: {
        class:
          "prose prose-invert max-w-4xl mx-auto min-h-full my-4 px-6 md:px-12 py-8 md:py-12 outline-none text-foreground/90 text-sm md:text-base leading-relaxed bg-background border border-border rounded-xl shadow-sm " +
          "[&_h1]:text-2xl md:[&_h1]:text-3xl [&_h1]:font-extrabold [&_h1]:tracking-tight [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-foreground [&_h1]:leading-tight " +
          "[&_h2]:text-xl md:[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-foreground [&_h2]:border-b [&_h2]:border-border/50 [&_h2]:pb-2 " +
          "[&_h3]:text-lg md:[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:tracking-tight [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-foreground " +
          "[&_p]:mb-4 [&_p]:text-foreground/85 " +
          "[&_strong]:font-bold [&_strong]:text-foreground " +
          "[&_a]:text-primary [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-4 " +
          "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_ul]:space-y-1.5 [&_li]:pl-1 [&_li]:marker:text-primary/70 [&_li]:list-item [&_li_p]:m-0 " +
          "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3 [&_ol]:space-y-1.5 [&_li]:pl-1 [&_li]:marker:text-primary/70 [&_li]:marker:font-bold [&_li]:list-item [&_li_p]:m-0 " +
          "[&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-6 [&_blockquote]:py-2 [&_blockquote]:my-4 [&_blockquote]:italic [&_blockquote]:text-foreground/75 [&_blockquote]:bg-muted/30 [&_blockquote]:rounded-r-xl " +
          "[&_mark]:bg-primary/20 [&_mark]:text-foreground [&_mark]:rounded-sm [&_mark]:px-1 " +
          "[&_hr]:border-border/50 [&_hr]:my-4",
      },
    },
  });

  useEffect(() => {
    if (editor && value) {
      const normalized = normalizeArticleHtml(value);
      if (normalized !== editor.getHTML()) {
        editor.commands.setContent(normalized, false);
      }
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const uploadAndInsertFiles = async (files: File[], targetPos?: number) => {
    if (!editor || !onUploadImageRef.current) return;
    setInternalUploading(true);
    try {
      let insertPos = typeof targetPos === "number" ? targetPos : lastSelectionPosRef.current;
      if (insertPos < 0 || insertPos > editor.state.doc.content.size) {
        insertPos = editor.state.selection.from;
      }

      for (const file of files) {
        const url = await onUploadImageRef.current(file);
        editor.chain().focus().insertContentAt(insertPos, {
          type: "image",
          attrs: { src: url, width: "100%", align: "center" }
        }).run();
        insertPos = editor.state.selection.to;
      }
      toast.success(files.length > 1 ? "Imagens inseridas no texto!" : "Imagem inserida no texto!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar imagem.");
    } finally {
      setInternalUploading(false);
    }
  };

  const handleToolbarImageUploadClick = () => {
    if (onUploadImage) {
      if (editor) {
        lastSelectionPosRef.current = editor.state.selection.from;
      }
      fileInputRef.current?.click();
    } else if (onImageUpload) {
      onImageUpload();
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadAndInsertFiles(Array.from(files), lastSelectionPosRef.current);
    }
    e.target.value = "";
  };

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL do link:", previousUrl);
    if (url === null) return;
    if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImageByUrl = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("URL da imagem:");
    if (url) {
      let insertPos = lastSelectionPosRef.current;
      if (insertPos < 0 || insertPos > editor.state.doc.content.size) {
        insertPos = editor.state.selection.from;
      }
      editor.chain().focus().insertContentAt(insertPos, {
        type: "image",
        attrs: { src: url, width: "100%", align: "center" }
      }).run();
    }
  }, [editor]);

  if (!editor) return null;
  const ic = "w-4 h-4";
  const isUploading = isUploadingImage || internalUploading;

  return (
    <div className={className || "rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all duration-200 relative"}>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        multiple
        onChange={handleFileInputChange}
      />
      <div className={`sticky top-0 z-30 flex flex-wrap items-center gap-0.5 px-3 py-1.5 border-b border-border bg-background/95 backdrop-blur-md shadow-sm ${className ? "rounded-none" : "rounded-t-xl"}`}>
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Desfazer"><Undo2 className={ic} /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Refazer"><Redo2 className={ic} /></ToolbarButton>
        <Separator />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")} title="Negrito"><Bold className={ic} /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")} title="Itálico"><Italic className={ic} /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive("underline")} title="Sublinhado"><UnderlineIcon className={ic} /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive("strike")} title="Tachado"><Strikethrough className={ic} /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} isActive={editor.isActive("highlight")} title="Destaque"><Highlighter className={ic} /></ToolbarButton>
        <Separator />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive("heading", { level: 1 })} title="Título 1"><Heading1 className={ic} /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive("heading", { level: 2 })} title="Título 2"><Heading2 className={ic} /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive("heading", { level: 3 })} title="Título 3"><Heading3 className={ic} /></ToolbarButton>
        <Separator />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive("bulletList")} title="Lista"><List className={ic} /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive("orderedList")} title="Lista numerada"><ListOrdered className={ic} /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive("blockquote")} title="Citação"><TextQuote className={ic} /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linha divisória"><Minus className={ic} /></ToolbarButton>
        <Separator />
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} isActive={editor.isActive({ textAlign: "left" })} title="Alinhar à esquerda"><AlignLeft className={ic} /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} isActive={editor.isActive({ textAlign: "center" })} title="Centralizar"><AlignCenter className={ic} /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} isActive={editor.isActive({ textAlign: "right" })} title="Alinhar à direita"><AlignRight className={ic} /></ToolbarButton>
        <Separator />
        <ToolbarButton onClick={setLink} isActive={editor.isActive("link")} title="Inserir link"><Link2 className={ic} /></ToolbarButton>
        {(onUploadImage || onImageUpload) && (
          <ToolbarButton onClick={handleToolbarImageUploadClick} disabled={isUploading} title="Upload de imagem do PC (insere onde o cursor estiver)">
            {isUploading ? <Loader2 className={`${ic} animate-spin`} /> : <ImagePlus className={ic} />}
          </ToolbarButton>
        )}
        <ToolbarButton onClick={addImageByUrl} title="Imagem por URL (insere onde o cursor estiver)"><ImagePlus className={`${ic} opacity-50`} /></ToolbarButton>
        <Separator />
        <ToolbarButton onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Limpar formatação"><RemoveFormatting className={ic} /></ToolbarButton>
      </div>
      {editor && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 150, placement: "top" }} shouldShow={({ editor }) => !editor.isActive("image") && !editor.state.selection.empty}>
          <div className="flex items-center gap-0.5 bg-card border border-border rounded-lg shadow-xl px-1.5 py-1 backdrop-blur-xl">
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")} title="Negrito"><Bold className="w-3.5 h-3.5" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")} title="Itálico"><Italic className="w-3.5 h-3.5" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive("underline")} title="Sublinhado"><UnderlineIcon className="w-3.5 h-3.5" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive("strike")} title="Tachado"><Strikethrough className="w-3.5 h-3.5" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} isActive={editor.isActive("highlight")} title="Destaque"><Highlighter className="w-3.5 h-3.5" /></ToolbarButton>
            <span className="w-px h-4 bg-border/60 mx-0.5 inline-block" />
            <ToolbarButton onClick={setLink} isActive={editor.isActive("link")} title="Link"><Link2 className="w-3.5 h-3.5" /></ToolbarButton>
          </div>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} className={className ? "flex-1 overflow-y-auto min-h-0 bg-muted/15 p-4" : ""} />
    </div>
  );
}
