import { Fragment, type ReactNode } from "react";
import type { JSONContent } from "@tiptap/core";

// Renders Tiptap's JSON document format as React elements — never as raw
// HTML. Supports: paragraphs, headings, lists, blockquotes, links, bold,
// italic, text color, text-style, highlight, tables, callout blocks,
// tabbed content, and horizontal rules.

const ALLOWED_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

function safeHref(href: unknown): string | null {
  if (typeof href !== "string" || href.trim().length === 0) return null;
  try {
    const url = new URL(href, "https://law-digest.invalid");
    if (!ALLOWED_LINK_PROTOCOLS.has(url.protocol)) return null;
    return href;
  } catch {
    return null;
  }
}

/* ────────── Text marks ────────── */

function renderTextWithMarks(text: string, marks: JSONContent["marks"]): ReactNode {
  if (!marks || marks.length === 0) return text;
  return marks.reduce<ReactNode>((acc, mark) => {
    switch (mark.type) {
      case "bold":
        return <strong className="font-semibold text-ink">{acc}</strong>;
      case "italic":
        return <em>{acc}</em>;
      case "link": {
        const href = safeHref(mark.attrs?.href);
        if (!href) return acc;
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="border-b border-digest-red text-digest-red transition-opacity hover:opacity-70"
          >
            {acc}
          </a>
        );
      }
      case "textStyle": {
        const color = mark.attrs?.color;
        if (color) {
          return <span style={{ color }}>{acc}</span>;
        }
        return acc;
      }
      case "highlight": {
        const bgColor = mark.attrs?.color;
        return (
          <mark
            style={bgColor ? { backgroundColor: bgColor } : undefined}
            className="px-0.5"
          >
            {acc}
          </mark>
        );
      }
      default:
        return acc;
    }
  }, text);
}

/* ────────── Inline nodes ────────── */

function renderInline(nodes: JSONContent[] | undefined): ReactNode {
  if (!nodes) return null;
  return nodes.map((node, i) => {
    if (node.type === "text") {
      return <Fragment key={i}>{renderTextWithMarks(node.text ?? "", node.marks)}</Fragment>;
    }
    if (node.type === "hardBreak") {
      return <br key={i} />;
    }
    return null;
  });
}

/* ────────── List items ────────── */

function renderListItem(node: JSONContent, key: number): ReactNode {
  const content = node.content ?? [];
  if (content.length === 1 && content[0].type === "paragraph") {
    return <li key={key}>{renderInline(content[0].content)}</li>;
  }
  return (
    <li key={key}>{content.map((child, i) => renderBlock(child, i))}</li>
  );
}

/* ────────── Table rendering ────────── */

function renderTable(node: JSONContent, key: number): ReactNode {
  const rows = node.content ?? [];
  return (
    <div key={key} className="my-6 overflow-x-auto">
      <table className="article-table">
        <thead>
          {rows
            .filter((row) => row.type === "tableRow")
            .slice(0, 1)
            .map((row, ri) => (
              <tr key={ri}>
                {(row.content ?? []).map((cell, ci) => {
                  const isHeader = cell.type === "tableHeader";
                  const Tag = isHeader ? "th" : "td";
                  return (
                    <Tag key={ci} className="article-table-cell">
                      {cell.content?.map((block, bi) => renderBlock(block, bi))}
                    </Tag>
                  );
                })}
              </tr>
            ))}
        </thead>
        <tbody>
          {rows
            .filter((row) => row.type === "tableRow")
            .slice(1)
            .map((row, ri) => (
              <tr key={ri}>
                {(row.content ?? []).map((cell, ci) => {
                  const isHeader = cell.type === "tableHeader";
                  const Tag = isHeader ? "th" : "td";
                  return (
                    <Tag key={ci} className="article-table-cell">
                      {cell.content?.map((block, bi) => renderBlock(block, bi))}
                    </Tag>
                  );
                })}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

/* ────────── Callout block rendering ────────── */

const CALLOUT_STYLES: Record<string, { bg: string; border: string; label: string; icon: string }> = {
  note: { bg: "bg-blue-50", border: "border-l-blue-500", label: "Note", icon: "📝" },
  highlight: { bg: "bg-amber-50", border: "border-l-amber-500", label: "Highlight", icon: "💡" },
  warning: { bg: "bg-red-50", border: "border-l-red-500", label: "Warning", icon: "⚠️" },
  quote: { bg: "bg-purple-50", border: "border-l-purple-600", label: "Quote", icon: "💬" },
  takeaway: { bg: "bg-green-50", border: "border-l-green-600", label: "Takeaway", icon: "🎯" },
};

function renderCalloutBlock(node: JSONContent, key: number): ReactNode {
  const variant = (node.attrs?.variant as string) ?? "note";
  const title = node.attrs?.title as string | null;
  const style = CALLOUT_STYLES[variant] ?? CALLOUT_STYLES.note;
  return (
    <div
      key={key}
      className={`my-6 border-l-4 ${style.border} ${style.bg} rounded-sm px-5 py-4`}
    >
      {title ? (
        <p className="mb-2 font-admin text-xs font-semibold uppercase tracking-wider text-ink">
          {style.icon} {title}
        </p>
      ) : (
        <p className="mb-2 font-admin text-xs font-semibold uppercase tracking-wider text-ink">
          {style.icon} {style.label}
        </p>
      )}
      <div className="article-callout-content">
        {node.content?.map((child, i) => renderBlock(child, i))}
      </div>
    </div>
  );
}

/* ────────── Tabs rendering ────────── */

function renderTabsNode(node: JSONContent, key: number): ReactNode {
  const tabs = (node.content ?? []).filter((c) => c.type === "tabNode");
  if (tabs.length === 0) return null;

  return (
    <TabsContainer key={key} tabs={tabs} />
  );
}

/** Client-side interactive tabs — server renders the first tab's content */
function TabsContainer({ tabs }: { tabs: JSONContent[] }) {
  // We render a simple tabs UI. Since this is SSR, we use a <details> based
  // approach for progressive enhancement, but with CSS tabs for modern browsers.
  const tabId = `tabs-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div className="my-6" data-article-tabs>
      <div className="article-tabs-header" role="tablist">
        {tabs.map((tab, i) => (
          <label
            key={i}
            className="article-tab-label"
            htmlFor={`${tabId}-${i}`}
            role="tab"
          >
            <input
              type="radio"
              name={tabId}
              id={`${tabId}-${i}`}
              defaultChecked={i === 0}
              className="sr-only peer"
            />
            <span className="article-tab-trigger">
              {tab.attrs?.title ?? `Tab ${i + 1}`}
            </span>
          </label>
        ))}
      </div>
      {tabs.map((tab, i) => (
        <div
          key={i}
          className="article-tab-panel-content"
          role="tabpanel"
        >
          <input
            type="radio"
            name={tabId}
            defaultChecked={i === 0}
            className="sr-only peer"
            id={`${tabId}-${i}-panel`}
          />
          <div className="peer-checked:block hidden">
            {tab.content?.map((child, ci) => renderBlock(child, ci))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ────────── Block rendering ────────── */

function renderBlock(node: JSONContent, key: number): ReactNode {
  switch (node.type) {
    case "paragraph": {
      const hasContent =
        node.content &&
        node.content.some(
          (child) =>
            (child.type === "text" && child.text && child.text.trim().length > 0) ||
            child.type === "hardBreak" ||
            child.type === "link"
        );
      if (!hasContent) {
        return <p key={key} className="h-4" aria-hidden="true" />;
      }
      return (
        <p key={key} className="mt-5 font-body text-[1.05rem] leading-[1.85] text-ink first:mt-0 max-w-[70ch]">
          {renderInline(node.content)}
        </p>
      );
    }
    case "heading": {
      const level = node.attrs?.level;
      if (level === 3) {
        return (
          <h3
            key={key}
            className="mt-10 font-display text-[1.3rem] font-bold italic leading-[1.35] text-ink first:mt-0 tracking-tight"
          >
            {renderInline(node.content)}
          </h3>
        );
      }
      return (          <h2
            key={key}
            className="mt-12 font-display text-[1.65rem] font-bold italic leading-[1.3] text-ink first:mt-0 tracking-tight"
          >
          {renderInline(node.content)}
        </h2>
      );
    }
    case "bulletList":
      return (
        <ul
          key={key}
          className="mt-5 space-y-2 pl-6 font-body text-[1.05rem] leading-[1.75] text-ink"
          style={{ listStyleType: "disc" }}
        >
          {node.content?.map((item, i) => renderListItem(item, i))}
        </ul>
      );
    case "orderedList":
      return (
        <ol
          key={key}
          className="mt-5 space-y-2 pl-6 font-body text-[1.05rem] leading-[1.75] text-ink"
          style={{ listStyleType: "decimal" }}
        >
          {node.content?.map((item, i) => renderListItem(item, i))}
        </ol>
      );
    case "blockquote":
      return (
        <blockquote
          key={key}
          className="my-8 border-l-[3px] border-digest-red py-1 pl-6"
        >
          <div className="font-body text-[1.05rem] italic leading-[1.8] text-stone">
            {node.content?.map((child, i) => renderBlock(child, i))}
          </div>
        </blockquote>
      );
    case "horizontalRule":
      return (
        <hr
          key={key}
          className="my-10 border-0"
          style={{
            height: "1px",
            background:
              "linear-gradient(to right, transparent, var(--color-hairline), transparent)",
          }}
        />
      );
    case "table":
      return renderTable(node, key);
    case "calloutBlock":
      return renderCalloutBlock(node, key);
    case "tabsNode":
      return renderTabsNode(node, key);
    case "tabNode":
      // Individual tabNode should not be rendered standalone — handled by tabsNode
      return null;
    default:
      return null;
  }
}

/** Render a single top-level block node from a Tiptap document. */
export function RichTextBlock({ node, index = 0 }: { node: JSONContent; index?: number }) {
  return <>{renderBlock(node, index)}</>;
}

export function RichText({ content }: { content?: JSONContent | null }) {
  if (!content || content.type !== "doc" || !Array.isArray(content.content)) {
    return null;
  }
  if (content.content.length === 0) return null;

  return (
    <div className="prose-article">
      {content.content.map((node, i) => renderBlock(node, i))}
    </div>
  );
}
