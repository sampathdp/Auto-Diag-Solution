"use client";

import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Undo,
  Redo,
  Heading2,
  Heading3,
  Quote,
  Code,
  LinkIcon,
  ImagePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MediaLibraryPickerModal } from "@/components/admin/media/MediaLibraryPickerModal";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { toMediaItem, type RawMediaRow } from "@/lib/admin/mediaAdapter";
import type { PaginatedResponse } from "@/types/api";

interface PageRichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  dir?: "ltr" | "rtl";
}

/** Full-featured Tiptap editor for CMS pages: headings, lists, links, images from the media library, blockquote, code. */
export function PageRichTextEditor({ value, onChange, dir = "ltr" }: PageRichTextEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  // toMediaItem: the API returns raw media rows (path, not url; string ids on the
  // live host) — the adapter normalizes both so the id lookup below matches the
  // picker's returned ids and item.url is actually populated.
  const mediaQuery = useAdminQuery<PaginatedResponse<RawMediaRow>>(
    adminQueryKeys.media.list({ per_page: 200 }),
    "/media",
    { per_page: 200 }
  );
  const mediaById = new Map((mediaQuery.data?.items ?? []).map(toMediaItem).map((m) => [m.id, m]));

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[280px] px-3.5 py-2.5 text-body text-ink focus:outline-none " +
          "[&_p]:mb-2 [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-h3 [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-h4 [&_h3]:font-bold " +
          "[&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-0.5 " +
          "[&_blockquote]:mb-2 [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-3 [&_blockquote]:text-ink-muted " +
          "[&_pre]:mb-2 [&_pre]:rounded-sm [&_pre]:bg-app [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-caption " +
          "[&_a]:text-primary [&_a]:underline [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-sm",
        dir,
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) {
    return <div className="h-[326px] animate-pulse rounded-sm border border-border bg-app" />;
  }

  const buttonClass = (active: boolean) =>
    cn("rounded-sm p-1.5 hover:bg-app", active ? "bg-app text-primary" : "text-ink-muted");

  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="overflow-hidden rounded-sm border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5">
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={buttonClass(editor.isActive("heading", { level: 2 }))} aria-label="Heading 2">
          <Heading2 className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={buttonClass(editor.isActive("heading", { level: 3 }))} aria-label="Heading 3">
          <Heading3 className="h-3.5 w-3.5" />
        </button>
        <div className="mx-1 h-4 w-px bg-border" />
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={buttonClass(editor.isActive("bold"))} aria-label="Bold">
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={buttonClass(editor.isActive("italic"))} aria-label="Italic">
          <Italic className="h-3.5 w-3.5" />
        </button>
        <div className="mx-1 h-4 w-px bg-border" />
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={buttonClass(editor.isActive("bulletList"))} aria-label="Bullet list">
          <List className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={buttonClass(editor.isActive("orderedList"))} aria-label="Numbered list">
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={buttonClass(editor.isActive("blockquote"))} aria-label="Blockquote">
          <Quote className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={buttonClass(editor.isActive("codeBlock"))} aria-label="Code block">
          <Code className="h-3.5 w-3.5" />
        </button>
        <div className="mx-1 h-4 w-px bg-border" />
        <button type="button" onClick={setLink} className={buttonClass(editor.isActive("link"))} aria-label="Insert link">
          <LinkIcon className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => setPickerOpen(true)} className={buttonClass(false)} aria-label="Insert image from library">
          <ImagePlus className="h-3.5 w-3.5" />
        </button>
        <div className="mx-1 h-4 w-px bg-border" />
        <button type="button" onClick={() => editor.chain().focus().undo().run()} className={buttonClass(false)} aria-label="Undo">
          <Undo className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} className={buttonClass(false)} aria-label="Redo">
          <Redo className="h-3.5 w-3.5" />
        </button>
      </div>
      <EditorContent editor={editor} />

      <MediaLibraryPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={(ids) => {
          for (const id of ids) {
            const item = mediaById.get(id);
            if (item) editor.chain().focus().setImage({ src: item.url, alt: item.alt_text_en }).run();
          }
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
