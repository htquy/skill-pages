"use client";

import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
  Unlink,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import type { Dict } from "@/src/lib/i18n/config";

type Props = {
  name: string;
  defaultValue: string;
  placeholder: string;
  dict: Dict;
};

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md transition-colors",
        active ? "bg-indigo-50 text-indigo-700" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({ name, defaultValue, placeholder, dict }: Props) {
  const [html, setHtml] = useState(defaultValue);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: {
          openOnClick: false,
          autolink: true,
          protocols: ["http", "https", "mailto"],
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: defaultValue,
    onUpdate: ({ editor: instance }) => setHtml(instance.getHTML()),
  });

  function applyLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt(dict.richText.linkPrompt, previous ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white transition-colors focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
      <input type="hidden" name={name} value={html} />
      <div className="flex flex-wrap items-center gap-1 border-b border-zinc-100 bg-zinc-50/80 px-2 py-1.5">
        <ToolbarButton
          label={dict.richText.bold}
          active={editor?.isActive("bold")}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label={dict.richText.italic}
          active={editor?.isActive("italic")}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label={dict.richText.strike}
          active={editor?.isActive("strike")}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label={dict.richText.code}
          active={editor?.isActive("code")}
          onClick={() => editor?.chain().focus().toggleCode().run()}
        >
          <Code className="size-3.5" />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-zinc-200" aria-hidden="true" />
        <ToolbarButton
          label={dict.richText.heading2}
          active={editor?.isActive("heading", { level: 2 })}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label={dict.richText.heading3}
          active={editor?.isActive("heading", { level: 3 })}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="size-3.5" />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-zinc-200" aria-hidden="true" />
        <ToolbarButton
          label={dict.richText.bulletList}
          active={editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label={dict.richText.orderedList}
          active={editor?.isActive("orderedList")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label={dict.richText.blockquote}
          active={editor?.isActive("blockquote")}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label={dict.richText.codeBlock}
          active={editor?.isActive("codeBlock")}
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
        >
          <Code className="size-3.5" />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-zinc-200" aria-hidden="true" />
        <ToolbarButton label={dict.richText.link} active={editor?.isActive("link")} onClick={applyLink}>
          <LinkIcon className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label={dict.richText.linkRemove}
          onClick={() => editor?.chain().focus().unsetLink().run()}
        >
          <Unlink className="size-3.5" />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-zinc-200" aria-hidden="true" />
        <ToolbarButton label={dict.richText.undo} onClick={() => editor?.chain().focus().undo().run()}>
          <Undo2 className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton label={dict.richText.redo} onClick={() => editor?.chain().focus().redo().run()}>
          <Redo2 className="size-3.5" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} className="tiptap min-h-32 px-3 py-2 text-sm leading-relaxed text-zinc-800" />
    </div>
  );
}
