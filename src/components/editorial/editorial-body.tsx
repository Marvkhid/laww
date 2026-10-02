/**
 * EditorialBody — shared article-content renderer.
 *
 * Used by every article page and every other long-form body in the app
 * (legal updates, lawyer-in-the-news interviews), so the layout behaviour is
 * defined once here rather than per page.
 *
 * LAYOUT CONTRACT
 * ---------------
 * Desktop (≥768px): the text occupies the FULL available content width.
 * Positioned images are CSS-floated, so following paragraphs genuinely wrap
 * around them and then return to the full measure once the image is passed —
 * a typeset magazine flow, not a two-column grid that strands half the page
 * empty. Which side an image floats to comes straight from the position the
 * admin chose in the dashboard (top/bottom-left → left, *-right → right,
 * full-width/center → breaks out of the flow entirely).
 *
 * Mobile (<768px): floats are reset, and every image becomes full width of
 * the container — still positioned in document order per the admin's
 * selection, never reordered or dropped, and never causing overflow.
 */

import { Fragment } from "react";
import { RichTextBlock } from "@/components/ui/rich-text";
import type { JSONContent } from "@tiptap/core";
import type { ReactNode } from "react";
import {
  EditorialFigure,
  EditorialFullFigure,
  type EditorialImageInput,
} from "./editorial-figure";

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
  return p.includes("full") || p.includes("center");
}

function sideFromPosition(
  position: string | null | undefined,
  altIndex: number
): "left" | "right" {
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

/**
 * Split the body into segments, placing each positional image at a natural
 * point in the text flow. Kept as a pure function so the placement logic is
 * independently testable.
 */
export function planEditorialLayout(
  blocks: JSONContent[],
  images: EditorialImageInput[]
): Segment[] {
  const textItems: JSONContent[] = [];
  const anchors: {
    image: EditorialImageInput;
    textIndex: number;
    embedded: boolean;
  }[] = [];

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

  // Images that float alongside text vs. images that break out full width.
  const floatable = images.filter((i) => i.url && !isFullWidthPosition(i.position));
  const fullWidthImages = images.filter((i) => i.url && isFullWidthPosition(i.position));

  if (floatable.length > 0 && textItems.length > 0) {
    const totalChars = textItems.reduce((s, b) => s + nodeChars(b), 0);
    const usedPositions = new Set(anchors.map((a) => a.textIndex));

    floatable.forEach((img, k) => {
      // Spread images evenly through the article by character proportion, so
      // text before and after every image still has room to breathe.
      const target = totalChars > 0 ? (totalChars * (k + 1)) / (floatable.length + 1) : 0;
      let cum = 0;
      let idx = textItems.length;
      for (let i = 0; i < textItems.length; i++) {
        cum += nodeChars(textItems[i]);
        if (cum >= target) {
          idx = i + 1;
          break;
        }
      }
      while (usedPositions.has(idx) && idx < textItems.length) idx++;
      usedPositions.add(idx);
      anchors.push({ image: img, textIndex: idx, embedded: false });
    });
  }

  anchors.sort((a, b) => a.textIndex - b.textIndex || (a.embedded ? -1 : 1));

  if (anchors.length === 0 && floatable.length === 0 && fullWidthImages.length === 0) {
    return [{ kind: "text", blocks: textItems }];
  }

  const segments: Segment[] = [];
  let cursor = 0;
  let altCounter = 0;

  for (const anchor of anchors) {
    if (cursor < anchor.textIndex) {
      segments.push({ kind: "text", blocks: textItems.slice(cursor, anchor.textIndex) });
      cursor = anchor.textIndex;
    }

    // Take the following text that sits beside this image. The budget is a
    // floor, not a ceiling: a single long paragraph is still included so no
    // text is ever dropped.
    const unitBlocks: JSONContent[] = [];
    let chars = 0;
    const budget = MAX_SIDE_CHARS * (floatable.length + 1);
    while (cursor < textItems.length) {
      const c = nodeChars(textItems[cursor]);
      if (unitBlocks.length > 0 && chars + c > budget) break;
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

  if (cursor < textItems.length) {
    segments.push({ kind: "text", blocks: textItems.slice(cursor) });
  }

  for (const img of fullWidthImages) {
    segments.push({ kind: "figure", image: img });
  }

  return segments;
}

// Text allowed to sit beside a floated image. Generous enough that a normal
// paragraph always fits, so the reader never sees a one-word line beside an
// image — the figure clears itself into full width once this is exhausted.
const MAX_SIDE_CHARS = 1400;

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
  const render =
    renderBlock ?? ((node: JSONContent, i: number) => <RichTextBlock node={node} index={i} />);

  const segments = planEditorialLayout(blocks, images ?? []);

  return (
    <div className={`editorial-body ${className ?? ""}`}>
      {segments.map((seg, i) => {
        switch (seg.kind) {
          case "text":
            return (
              <div key={`t${i}`} className="editorial-section">
                <div className="prose-article">
                  {seg.blocks.map((b, j) => (
                    <Fragment key={`t${i}-b${j}`}>{render(b, j)}</Fragment>
                  ))}
                </div>
              </div>
            );

          case "unit": {
            const { image, blocks: unitBlocks, side } = seg;
            if (!image.url) {
              return (
                <div key={`u${i}`} className="editorial-section">
                  <div className="prose-article">
                    {unitBlocks.map((b, j) => (
                      <Fragment key={`u${i}-b${j}`}>{render(b, j)}</Fragment>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              // One block formatting context: the figure floats, the text
              // flows around it, and .editorial-clear ends the float so the
              // next section returns to the full measure.
              <div key={`u${i}`} className="editorial-section editorial-flow">
                <EditorialFigure
                  url={image.url}
                  alt={image.alt ?? title}
                  caption={null}
                  floatSide={side}
                />
                <div className="prose-article">
                  {unitBlocks.map((b, j) => (
                    <Fragment key={`u${i}-b${j}`}>{render(b, j)}</Fragment>
                  ))}
                </div>
                <div className="editorial-clear" aria-hidden="true" />
              </div>
            );
          }

          case "figure": {
            const { image } = seg;
            if (!image.url) return null;
            return (
              <div key={`f${i}`} className="editorial-section">
                <EditorialFullFigure url={image.url} alt={image.alt ?? title} caption={null} />
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