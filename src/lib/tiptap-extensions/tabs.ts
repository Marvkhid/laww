import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tabsNode: {
      insertTabs: () => ReturnType;
    };
  }
}

/**
 * Tabs node — a tabbed content container. Each tab has a title and its own
 * rich-text content.
 */
export const TabsNode = Node.create({
  name: "tabsNode",
  group: "block",
  content: "tabNode+",
  atom: false,

  parseHTML() {
    return [{ tag: "div[data-tabs]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-tabs": "",
        class: "article-tabs",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      insertTabs:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            content: [
              {
                type: "tabNode",
                attrs: { title: "Tab 1" },
                content: [
                  { type: "paragraph", content: [{ type: "text", text: "" }] },
                ],
              },
              {
                type: "tabNode",
                attrs: { title: "Tab 2" },
                content: [
                  { type: "paragraph", content: [{ type: "text", text: "" }] },
                ],
              },
            ],
          });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-t": () => this.editor.commands.insertTabs(),
    };
  },
});

/**
 * Individual tab node — a child of TabsNode.
 */
export const TabNode = Node.create({
  name: "tabNode",
  group: "block",
  content: "block+",

  addAttributes() {
    return {
      title: {
        default: "Tab",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-tab-title") ?? "Tab",
        renderHTML: (attrs: Record<string, unknown>) => ({ "data-tab-title": attrs.title }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-tab]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-tab": "",
        class: "article-tab-panel",
      }),
      0,
    ];
  },
});
