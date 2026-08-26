import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    calloutBlock: {
      insertCalloutBlock: (options?: {
        variant?: string;
        title?: string;
      }) => ReturnType;
      toggleCalloutBlock: () => ReturnType;
      setCalloutVariant: (variant: string) => ReturnType;
    };
  }
}

/**
 * Callout block node — a visually distinct content block that supports
 * variants: note, warning, highlight, quote, takeaway.
 */
export const CalloutBlock = Node.create({
  name: "calloutBlock",
  group: "block",
  content: "block+",

  addAttributes() {
    return {
      variant: {
        default: "note",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-variant") ?? "note",
        renderHTML: (attrs: Record<string, unknown>) => ({ "data-variant": attrs.variant }),
      },
      title: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-title") ?? null,
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.title ? { "data-title": attrs.title } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-callout": "",
        class: "article-callout",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      insertCalloutBlock:
        (options = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              variant: options.variant ?? "note",
              title: options.title ?? null,
            },
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "" }],
              },
            ],
          });
        },
      toggleCalloutBlock:
        () =>
        ({ commands }) => {
          return commands.wrapIn(this.name);
        },
      setCalloutVariant:
        (variant: string) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { variant });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-c": () => this.editor.commands.insertCalloutBlock(),
    };
  },
});
