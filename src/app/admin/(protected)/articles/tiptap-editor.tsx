"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import { CalloutBlock } from "@/lib/tiptap-extensions/callout-block";
import { TabsNode, TabNode } from "@/lib/tiptap-extensions/tabs";
import type { JSONContent } from "@tiptap/core";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link2,
  Undo2,
  Redo2,
  Minus,
  Palette,
  Highlighter,
  TableIcon,
  Plus,
  Minus as MinusIcon,
  PanelTop,
  MessageSquare,
  Columns2,
  Trash2,
} from "lucide-react";

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`flex h-8 w-8 items-center justify-center border border-[#b5b0a8] ${
        active ? "bg-digest-red text-paper" : "text-ink hover:bg-hairline/40"
      } disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function ToolbarSeparator() {
  return <div className="mx-1 w-px self-stretch bg-hairline" />;
}

// --- Callout variant picker (small dropdown) ---
const CALLOUT_VARIANTS = [
  { value: "note", label: "Note", icon: "📝" },
  { value: "highlight", label: "Highlight", icon: "💡" },
  { value: "warning", label: "Warning", icon: "⚠️" },
  { value: "quote", label: "Quote", icon: "💬" },
  { value: "takeaway", label: "Takeaway", icon: "🎯" },
];

// --- Color palette ---
const TEXT_COLORS = [
  { value: "#17140f", label: "Black" },
  { value: "#a3352a", label: "Digest Red" },
  { value: "#6b3a7a", label: "Purple" },
  { value: "#6e6a63", label: "Stone" },
  { value: "#ffffff", label: "White" },
  { value: "#2563eb", label: "Blue" },
  { value: "#059669", label: "Green" },
  { value: "#d97706", label: "Amber" },
];

const HIGHLIGHT_COLORS = [
  { value: "#fef3c7", label: "Yellow" },
  { value: "#fee2e2", label: "Red" },
  { value: "#ede9fe", label: "Purple" },
  { value: "#dbeafe", label: "Blue" },
  { value: "#d1fae5", label: "Green" },
  { value: "#f3e8ff", label: "Lavender" },
];

function ColorPicker({
  colors,
  onSelect,
  onRemove,
  currentColor,
}: {
  colors: typeof TEXT_COLORS;
  onSelect: (color: string) => void;
  onRemove?: () => void;
  currentColor?: string;
}) {
  return (
    <div className="absolute top-full left-0 z-50 mt-1 flex flex-wrap gap-1 border border-[#b5b0a8] bg-white p-2 shadow-md w-48">
      {colors.map((c) => (
        <button
          key={c.value}
          type="button"
          title={c.label}
          onClick={() => onSelect(c.value)}
          className={`h-6 w-6 border ${
            currentColor === c.value ? "border-ink ring-2 ring-ink/20" : "border-hairline"
          }`}
          style={{ backgroundColor: c.value }}
        />
      ))}
      {onRemove && (
        <button
          type="button"
          title="Remove color"
          onClick={onRemove}
          className="h-6 w-6 border border-[#b5b0a8] bg-white text-center text-[10px] leading-6 text-ink hover:bg-hairline/40"
        >
          ×
        </button>
      )}
    </div>
  );
}

function ToolbarGroup({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

export function TiptapEditor({
  name,
  initialContent,
}: {
  name: string;
  initialContent?: JSONContent | null;
}) {
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const [showTextColor, setShowTextColor] = useState(false);
  const [showHighlightColor, setShowHighlightColor] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        strike: false,
        code: false,
        codeBlock: false,
        underline: false,
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        },
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({
        placeholder: "Start writing your article…",
      }),
      CalloutBlock,
      TabsNode,
      TabNode,
    ],
    content: initialContent ?? undefined,
    editorProps: {
      attributes: {
        class:
          "min-h-[240px] border border-t-0 border-[#b5b0a8] bg-white px-4 py-3 font-admin text-sm text-ink focus:outline-none " +
          "[&_p]:mt-3 [&_p:first-child]:mt-0 " +
          "[&_h2]:mt-6 [&_h2]:font-display [&_h2]:italic [&_h2]:text-lg [&_h2]:text-ink " +
          "[&_h3]:mt-5 [&_h3]:font-display [&_h3]:italic [&_h3]:text-base [&_h3]:text-ink " +
          "[&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mt-1 " +
          "[&_blockquote]:mt-3 [&_blockquote]:border-l-2 [&_blockquote]:border-digest-red [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-[#333] " +
          "[&_a]:underline [&_a]:decoration-digest-red [&_a]:underline-offset-2 " +
          "[&_.ProseMirror-selectednode]:outline-2 [&_.ProseMirror-selectednode]:outline-digest-red " +
          // Table styles
          "[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:border [&_table]:border-hairline " +
          "[&_th]:border [&_th]:border-hairline [&_th]:bg-hairline/30 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-admin [&_th]:text-sm [&_th]:font-semibold " +
          "[&_td]:border [&_td]:border-hairline [&_td]:px-3 [&_td]:py-2 [&_td]:font-body [&_td]:text-sm " +
          "[&_td.selectedCell]:bg-digest-red/10 " +
          "[&_th.selectedCell]:bg-digest-red/10 " +
          // Placeholder
          "[&_.is-editor-empty:first-child::before]:text-[#666] [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
      },
    },
    onCreate: ({ editor }) => {
      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = JSON.stringify(editor.getJSON());
      }
    },
    onUpdate: ({ editor }) => {
      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = JSON.stringify(editor.getJSON());
      }
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt("Link URL");
    if (!url) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const insertTable = useCallback(() => {
    if (!editor) return;
    const rows = window.prompt("Number of rows?", "3");
    const cols = window.prompt("Number of columns?", "3");
    if (!rows || !cols) return;
    editor
      .chain()
      .focus()
      .insertTable({
        rows: parseInt(rows, 10) || 3,
        cols: parseInt(cols, 10) || 3,
        withHeaderRow: true,
      })
      .run();
  }, [editor]);

  const insertCallout = useCallback(
    (variant: string) => {
      if (!editor) return;
      editor.chain().focus().insertCalloutBlock({ variant }).run();
    },
    [editor],
  );

  const insertTabs = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTabs().run();
  }, [editor]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-0.5 border border-[#b5b0a8] bg-white p-1">
        {/* Text formatting */}
        <ToolbarGroup>
          <ToolbarButton
            label="Bold"
            active={editor?.isActive("bold")}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            active={editor?.isActive("italic")}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Headings */}
        <ToolbarGroup>
          <ToolbarButton
            label="Heading 2"
            active={editor?.isActive("heading", { level: 2 })}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Heading 3"
            active={editor?.isActive("heading", { level: 3 })}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Lists */}
        <ToolbarGroup>
          <ToolbarButton
            label="Bullet list"
            active={editor?.isActive("bulletList")}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Numbered list"
            active={editor?.isActive("orderedList")}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Quote & Rule */}
        <ToolbarGroup>
          <ToolbarButton
            label="Blockquote"
            active={editor?.isActive("blockquote")}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Horizontal rule"
            disabled={!editor}
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          >
            <Minus className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Link */}
        <ToolbarGroup>
          <ToolbarButton
            label={editor?.isActive("link") ? "Remove link" : "Add link"}
            active={editor?.isActive("link")}
            disabled={!editor}
            onClick={setLink}
          >
            <Link2 className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Text color */}
        <div className="relative">
          <ToolbarButton
            label="Text color"
            disabled={!editor}
            onClick={() => {
              setShowTextColor(!showTextColor);
              setShowHighlightColor(false);
            }}
          >
            <Palette className="h-4 w-4" />
          </ToolbarButton>
          {showTextColor && (
            <ColorPicker
              colors={TEXT_COLORS}
              currentColor={
                editor?.getAttributes("textStyle").color ?? undefined
              }
              onSelect={(color) => {
                editor?.chain().focus().setColor(color).run();
                setShowTextColor(false);
              }}
              onRemove={() => {
                editor?.chain().focus().unsetColor().run();
                setShowTextColor(false);
              }}
            />
          )}
        </div>

        {/* Highlight color */}
        <div className="relative">
          <ToolbarButton
            label="Highlight"
            active={editor?.isActive("highlight")}
            disabled={!editor}
            onClick={() => {
              setShowHighlightColor(!showHighlightColor);
              setShowTextColor(false);
            }}
          >
            <Highlighter className="h-4 w-4" />
          </ToolbarButton>
          {showHighlightColor && (
            <ColorPicker
              colors={HIGHLIGHT_COLORS}
              currentColor={
                editor?.isActive("highlight")
                  ? (editor?.getAttributes("highlight").color ?? "#fef3c7")
                  : undefined
              }
              onSelect={(color) => {
                editor?.chain().focus().toggleHighlight({ color }).run();
                setShowHighlightColor(false);
              }}
              onRemove={() => {
                editor?.chain().focus().unsetHighlight().run();
                setShowHighlightColor(false);
              }}
            />
          )}
        </div>

        <ToolbarSeparator />

        {/* Table */}
        <ToolbarGroup>
          <ToolbarButton label="Insert table" disabled={!editor} onClick={insertTable}>
            <TableIcon className="h-4 w-4" />
          </ToolbarButton>
          {editor?.isActive("table") && (
            <>
              <ToolbarButton
                label="Add column before"
                disabled={!editor}
                onClick={() => editor?.chain().focus().addColumnBefore().run()}
              >
                <Plus className="h-3 w-3" />
              </ToolbarButton>
              <ToolbarButton
                label="Add column after"
                disabled={!editor}
                onClick={() => editor?.chain().focus().addColumnAfter().run()}
              >
                <Plus className="h-3 w-3" />
              </ToolbarButton>
              <ToolbarButton
                label="Delete column"
                disabled={!editor}
                onClick={() => editor?.chain().focus().deleteColumn().run()}
              >
                <MinusIcon className="h-3 w-3" />
              </ToolbarButton>
              <ToolbarButton
                label="Add row before"
                disabled={!editor}
                onClick={() => editor?.chain().focus().addRowBefore().run()}
              >
                <Plus className="h-3 w-3" />
              </ToolbarButton>
              <ToolbarButton
                label="Add row after"
                disabled={!editor}
                onClick={() => editor?.chain().focus().addRowAfter().run()}
              >
                <Plus className="h-3 w-3" />
              </ToolbarButton>
              <ToolbarButton
                label="Delete row"
                disabled={!editor}
                onClick={() => editor?.chain().focus().deleteRow().run()}
              >
                <MinusIcon className="h-3 w-3" />
              </ToolbarButton>
              <ToolbarButton
                label="Merge cells"
                disabled={!editor}
                onClick={() => editor?.chain().focus().mergeCells().run()}
              >
                <Columns2 className="h-3 w-3" />
              </ToolbarButton>
              <ToolbarButton
                label="Delete table"
                disabled={!editor}
                onClick={() => editor?.chain().focus().deleteTable().run()}
              >
                <Trash2 className="h-3 w-3" />
              </ToolbarButton>
            </>
          )}
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Callout blocks */}
        <div className="relative group">
          <ToolbarButton
            label="Insert callout block"
            disabled={!editor}
            onClick={() => insertCallout("note")}
          >
            <MessageSquare className="h-4 w-4" />
          </ToolbarButton>
          <div className="absolute top-full left-0 z-50 mt-1 hidden w-40 border border-[#b5b0a8] bg-white shadow-md group-hover:block">
            {CALLOUT_VARIANTS.map((v) => (
              <button
                key={v.value}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left font-admin text-xs text-ink hover:bg-hairline/40"
                onClick={() => insertCallout(v.value)}
              >
                <span>{v.icon}</span>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <ToolbarButton label="Insert tabbed section" disabled={!editor} onClick={insertTabs}>
          <PanelTop className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarSeparator />

        {/* Undo / Redo */}
        <ToolbarGroup>
          <ToolbarButton
            label="Undo"
            disabled={!editor}
            onClick={() => editor?.chain().focus().undo().run()}
          >
            <Undo2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Redo"
            disabled={!editor}
            onClick={() => editor?.chain().focus().redo().run()}
          >
            <Redo2 className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>
      </div>
      <EditorContent editor={editor} />
      <input
        ref={hiddenInputRef}
        type="hidden"
        name={name}
        defaultValue={initialContent ? JSON.stringify(initialContent) : ""}
      />
    </div>
  );
}
