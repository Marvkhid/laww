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
import {
  BAND_TARGET,
  parseImagePosition,
  type ImageBand,
} from "@/lib/image-position";

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
  return parseImagePosition(position).span === "full";
}

function sideFromPosition(
  position: string | null | undefined,
  altIndex: number
): "left" | "right" {
  const spec = parseImagePosition(position);
  return spec.side ?? (altIndex % 2 === 0 ? "left" : "right");
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

  // Every uploaded image gets a place in the document derived from its
  // position: the band (top / centre / bottom) says WHERE, and the side
  // (left / right) says WHICH SIDE once it is there.
  //
  // Previously only floated images were placed — by even character-proportion
  // spreading, which ignored the band entirely — and full-width images were
  // appended after every segment, so they always ended up below the article
  // regardless of the slot they occupied.
  const placeable = images.filter((i) => i.url);
  const floatCount = placeable.filter((i) => !isFullWidthPosition(i.position)).length;

  if (placeable.length > 0 && textItems.length > 0) {
    const totalChars = textItems.reduce((s, b) => s + nodeChars(b), 0);
    const usedPositions = new Set(anchors.map((a) => a.textIndex));

    // Resolve each image's band to an index, keeping document order stable:
    // earlier bands land earlier even when two images pick the same index.
    const wanted = placeable.map((image) => {
      const band: ImageBand = parseImagePosition(image.position).band;
      const fraction = BAND_TARGET[band];
      const target = totalChars * fraction;
      let cum = 0;
      let idx = textItems.length;
      for (let i = 0; i < textItems.length; i++) {
        cum += nodeChars(textItems[i]);
        if (cum >= target) {
          idx = i + 1;
          break;
        }
      }
      return { image, band, idx };
    });

    // Two images can resolve to the same index (e.g. top-left and top-right,
    // or several images sharing one band). Spread them apart instead of
    // dropping one.
    //
    // The cascade has to run in DOCUMENT order, not slot order: the default
    // positions are top, bottom, centre, centre, so slot order is not band
    // order. Cascading in slot order pushed a later image's earlier band past
    // the end of the article. Sorting by resolved index first makes the
    // sequence monotonic, so each image only ever moves forward from its own
    // band target.
    wanted.sort((a, b) => a.idx - b.idx);
    for (let i = 1; i < wanted.length; i++) {
      if (wanted[i].idx <= wanted[i - 1].idx) wanted[i].idx = wanted[i - 1].idx + 1;
    }
    // Leave at least one block of text after the last image, so a floated
    // image always has prose to wrap beside instead of collapsing into a
    // full-width breakout at the very end.
    const maxIdx = Math.max(0, textItems.length - 1);
    wanted.forEach(({ image, idx }) => {
      let final = Math.min(idx, maxIdx);
      let guard = 0;
      while (usedPositions.has(final) && final < maxIdx && guard < textItems.length) {
        final++;
        guard++;
      }
      usedPositions.add(final);
      anchors.push({ image, textIndex: final, embedded: false });
    });
  } else {
    for (const image of placeable) {
      anchors.push({ image, textIndex: textItems.length, embedded: false });
    }
  }

  anchors.sort((a, b) => a.textIndex - b.textIndex || (a.embedded ? -1 : 1));

  if (anchors.length === 0) {
    return [{ kind: "text", blocks: textItems }];
  }

  const segments: Segment[] = [];
  let cursor = 0;
  let altCounter = 0;

  for (let a = 0; a < anchors.length; a++) {
    const anchor = anchors[a];
    // Never let one image's text run past the next image's anchor. Without
    // this a single unit's generous budget swallows the remainder of the
    // article, and every later image — including a full-width one — ends up
    // rendered after all the text, which is the bug being fixed here.
    const nextAnchorIndex = a + 1 < anchors.length ? anchors[a + 1].textIndex : textItems.length;
    const limit = Math.max(anchor.textIndex, nextAnchorIndex);

    if (cursor < anchor.textIndex) {
      segments.push({ kind: "text", blocks: textItems.slice(cursor, anchor.textIndex) });
      cursor = anchor.textIndex;
    }

    // A full-width image breaks out of the flow at exactly the point its
    // position chose, and deliberately takes no text beside it.
    if (isFullWidthPosition(anchor.image.position)) {
      segments.push({ kind: "figure", image: anchor.image });
      continue;
    }

    // Take the following text that sits beside this image, stopping at the
    // next image so document order is preserved. The character budget is a
    // floor, not a ceiling: a single long paragraph is still included so no
    // text is ever dropped.
    const unitBlocks: JSONContent[] = [];
    let chars = 0;
    const budget = MAX_SIDE_CHARS * (floatCount + 1);
    while (cursor < limit) {
      const c = nodeChars(textItems[cursor]);
      if (unitBlocks.length > 0 && chars + c > budget) break;
      unitBlocks.push(textItems[cursor]);
      chars += c;
      cursor++;
    }

    if (unitBlocks.length === 0) {
      // Nothing left to wrap beside (a very short article, or every block is
      // already claimed by an earlier image). Emitting a full-width figure
      // here would be misleading — the admin did not choose Full Width — so
      // the text is emitted on its own and the image follows it.
      segments.push({ kind: "text", blocks: textItems.slice(cursor, limit) });
      cursor = limit;
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