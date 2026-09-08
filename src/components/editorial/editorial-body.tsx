/**
 * EditorialBody — reusable editorial image+text composition system.
 *
 * Takes ordered JSONContent blocks + an images array, splits the body into
 * segments around image anchors, and renders an alternating side-by-side
 * composition with text-length awareness.
 *
 * - Each image anchors a bounded chunk of following text (≤ MAX_SIDE_CHARS).
 * - Overflow text returns to a comfortable full-width reading column.
 * - Side alternates left/right, respecting explicit position fields.
 * - Center/full-width images stand alone.
 * - Responsive: side-by-side on desktop, stacked on mobile.
 * - Preserves original content order.
 */
import { RichTextBlock } from "@/components/ui/rich-text";
import type { JSONContent } from "@tiptap/core";
import type { ReactNode } from "react";
import {
  EditorialFigure,
  EditorialFullFigure,
  type EditorialImageInput,
} from "./editorial-figure";

// ─── Budget ────────────────────────────────────────────────────────────────
const MAX_SIDE_CHARS = 1100; // ~175 words beside an image

// ─── Helpers ───────────────────────────────────────────────────────────────

function nodeChars(node: JSONContent): number {
  let total = 0;
  if (node.type === "text" && typeof node.text === "string") {
    total += node.text.length;
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) total += nodeChars(child);
  }
  return total;
}

function isEmbeddedImage(block: JSONContent): boolean {
  return block.type === "image";
}

function isFullWidthPosition(position?: string | null): boolean {
  const p = (position ?? "").toLowerCase();
  return p.includes("full") || p === "center";
}

function sideFromPosition(position: string | null | undefined, altIndex: number): "left" | "right" {
  const p = (position ?? "").toLowerCase();
  if (p.includes("right")) return "right";
  if (p.includes("left")) return "left";
  return altIndex % 2 === 0 ? "left" : "right";
}

// ─── Segment planning ──────────────────────────────────────────────────────

type TextSegment = { kind: "text"; blocks: JSONContent[] };
type UnitSegment = {
  kind: "unit";
  image: EditorialImageInput;
  blocks: JSONContent[];
  side: "left" | "right";
};
type FigureSegment = { kind: "figure"; image: EditorialImageInput };
type Segment = TextSegment | UnitSegment | FigureSegment;

export function planEditorialLayout(
  blocks: JSONContent[],
  images: EditorialImageInput[],
): Segment[] {
  // 1. Separate text blocks from embedded image anchors.
  const textItems: JSONContent[] = [];
  // anchor → textIndex = how many textItems were present BEFORE this anchor
  const anchors: { image: EditorialImageInput; textIndex: number; embedded: boolean }[] = [];

  for (const block of blocks) {
    if (isEmbeddedImage(block)) {
      const src = typeof block.attrs?.src === "string" ? block.attrs.src : null;
      const alt = typeof block.attrs?.alt === "string" ? block.attrs.alt : "";
      anchors.push({
        image: { url: src, alt, position: null },
        textIndex: textItems.length,
        embedded: true,
      });
    } else {
      textItems.push(block);
    }
  }

  if (textItems.length === 0 && anchors.length === 0) return [];

  // 2. Distribute separate floatable images among text items by char proportion.
  const floatable = images.filter((i) => i.url && !isFullWidthPosition(i.position));
  const fullWidthImages = images.filter((i) => i.url && isFullWidthPosition(i.position));

  if (floatable.length > 0 && textItems.length > 0) {
    const totalChars = textItems.reduce((s, b) => s + nodeChars(b), 0);
    const usedPositions = new Set(anchors.map((a) => a.textIndex));

    floatable.forEach((img, k) => {
      const target = totalChars > 0 ? (totalChars * (k + 1)) / (floatable.length + 1) : 0;
      let cum = 0;
      let idx = textItems.length; // default: end
      for (let i = 0; i < textItems.length; i++) {
        cum += nodeChars(textItems[i]);
        if (cum >= target) {
          idx = i + 1;
          break;
        }
      }
      // avoid stacking multiple at same index
      while (usedPositions.has(idx) && idx < textItems.length) idx++;
      usedPositions.add(idx);
      anchors.push({ image: img, textIndex: idx, embedded: false });
    });
  }

  // 3. Sort anchors: by textIndex, embedded before separate at same index.
  anchors.sort((a, b) => a.textIndex - b.textIndex || (a.embedded ? -1 : 1));

  if (anchors.length === 0 && floatable.length === 0 && fullWidthImages.length === 0) {
    // No images at all — pure text.
    return [{ kind: "text", blocks: textItems }];
  }

  // 4. Walk textItems with anchors, producing segments.
  const segments: Segment[] = [];
  let cursor = 0;
  let altCounter = 0;

  for (const anchor of anchors) {
    // Emit full-width text before this anchor.
    if (cursor < anchor.textIndex) {
      segments.push({ kind: "text", blocks: textItems.slice(cursor, anchor.textIndex) });
      cursor = anchor.textIndex;
    }

    // Take following text blocks up to the char budget.
    const unitBlocks: JSONContent[] = [];
    let chars = 0;
    while (cursor < textItems.length) {
      const c = nodeChars(textItems[cursor]);
      if (unitBlocks.length > 0 && chars + c > MAX_SIDE_CHARS) break;
      unitBlocks.push(textItems[cursor]);
      chars += c;
      cursor++;
    }

    if (unitBlocks.length === 0) {
      segments.push({ kind: "figure", image: anchor.image });
    } else {
      segments.push({
        kind: "unit",
        image: anchor.image,
        blocks: unitBlocks,
        side: sideFromPosition(anchor.image.position ?? null, altCounter++),
      });
    }
  }

  // Trailing text.
  if (cursor < textItems.length) {
    segments.push({ kind: "text", blocks: textItems.slice(cursor) });
  }

  // Standalone full-width images.
  for (const img of fullWidthImages) {
    segments.push({ kind: "figure", image: img });
  }

  return segments;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function EditorialBody({
  blocks,
  images,
  title,
  className,
  renderBlock,
}: {
  blocks: JSONContent[];
  images?: EditorialImageInput[];
  title: string;
  className?: string;
  renderBlock?: (node: JSONContent, index: number) => ReactNode;
}) {
  const render = renderBlock ?? ((node: JSONContent, i: number) => <RichTextBlock node={node} index={i} />);

  const segments = planEditorialLayout(blocks, images ?? []);

  return (
    <div className={`editorial-body ${className ?? ""}`}>
      {segments.map((seg, i) => {
        switch (seg.kind) {
          case "text":
            return (
              <div key={`t${i}`} className="editorial-section my-10">
                {i === 0 ? (
                  <div className="prose-article">
                    {seg.blocks.map((b, j) => render(b, j))}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {seg.blocks.map((b, j) => render(b, j))}
                  </div>
                )}
              </div>
            );

          case "unit": {
            const { image, blocks: unitBlocks, side } = seg;
            const figure = image.url ? (
              <EditorialFigure
                url={image.url}
                alt={image.alt ?? title}
                caption={null}
              />
            ) : null;

            const textCol = (
              <div className="space-y-5">
                {unitBlocks.map((b, j) => render(b, j))}
              </div>
            );

            const isRight = side === "right";

            // On mobile: image always first (DOM order). On desktop: alternate via order.
            return (
              <div key={`u${i}`} className="editorial-section my-12">
                <div
                  className="grid items-start gap-6 md:gap-8 md:grid-cols-[2fr_3fr]"
                >
                  <div className={isRight ? "md:order-2" : ""}>{figure}</div>
                  <div className={isRight ? "md:order-1" : ""}>{textCol}</div>
                </div>
              </div>
            );
          }

          case "figure": {
            const { image } = seg;
            if (!image.url) return null;
            return (
              <div key={`f${i}`} className="editorial-section">
                <EditorialFullFigure
                  url={image.url}
                  alt={image.alt ?? title}
                  caption={null}
                />
              </div>
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
}
