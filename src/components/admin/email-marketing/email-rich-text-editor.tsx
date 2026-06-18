"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bold,
  Heading1,
  Heading2,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EMPTY_TIPTAP_DOC } from "@/lib/email-marketing/tiptap-html";

type EmailRichTextEditorProps = {
  contentJson: string;
  onChange: (contentJson: string, contentHtml: string) => void;
  className?: string;
  contentClassName?: string;
  placeholder?: string;
};

export function EmailRichTextEditor({
  contentJson,
  onChange,
  className,
  contentClassName,
  placeholder = "Write your email content...",
}: EmailRichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      Placeholder.configure({ placeholder }),
    ],
    content: contentJson ? JSON.parse(contentJson) : JSON.parse(EMPTY_TIPTAP_DOC),
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      const json = JSON.stringify(ed.getJSON());
      onChange(json, ed.getHTML());
    },
    editorProps: {
      attributes: {
        class: "rich-text-content rich-text-editor px-4 py-3 focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    if (contentJson && contentJson !== current) {
      editor.commands.setContent(JSON.parse(contentJson));
    }
  }, [contentJson, editor]);

  if (!editor) return null;

  const addLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const addImage = () => {
    const url = window.prompt("Enter image URL");
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  };

  const addCtaButton = () => {
    const url = window.prompt("Enter button URL", "https://");
    const label = window.prompt("Enter button label", "Shop Now");
    if (!url || !label) return;
    editor
      .chain()
      .focus()
      .insertContent(
        `<p><a href="${url}" style="display:inline-block;background:#111827;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">${label}</a></p>`
      )
      .run();
  };

  return (
    <div className={cn("overflow-hidden rounded-lg border", className)}>
      <div className="flex flex-wrap gap-1 border-b bg-muted/40 p-2">
        <ToolbarButton
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          label="H1"
        >
          <Heading1 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          label="H2"
        >
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("paragraph")}
          onClick={() => editor.chain().focus().setParagraph().run()}
          label="Paragraph"
        >
          <Pilcrow className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="Bold"
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label="Italic"
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="Bullet list"
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label="Ordered list"
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton onClick={addLink} label="Link">
          <Link2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton onClick={addImage} label="Image">
          <ImageIcon className="size-4" />
        </ToolbarButton>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onMouseDown={(event) => event.preventDefault()}
          onClick={addCtaButton}
        >
          Add Button
        </Button>
      </div>
      <div
        className={cn(
          "min-h-[12rem] max-h-[min(55vh,26rem)] overflow-y-auto overscroll-contain",
          contentClassName
        )}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  active,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      aria-label={label}
    >
      {children}
    </Button>
  );
}

export function EmailSubjectField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Email subject" />;
}
