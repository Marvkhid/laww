/**
 * The Image 1–4 position vocabulary — one definition, used everywhere.
 *
 * Until now the same seven position values were interpreted independently in
 * several places, and they did not agree:
 *
 *   - `PositionedImageGrid` read them correctly (top/center/bottom → row,
 *     left/right → column).
 *   - `EditorialBody` treated anything containing "center" as full-width and
 *     ignored the vertical band entirely.
 *
 * Because `Centre / Left` and `Centre / Right` are *side* positions with a
 * vertical band — exactly like `Top / Right` and `Bottom / Right` — that made
 * them render as full-width breakouts appended after the whole article. Only
 * the literal `Full Width` breaks out of the text flow.
 *
 * Every position is therefore exactly two things:
 *
 *   band — WHERE in the article it belongs: top · centre · bottom
 *   side — WHICH side it sits on:      left · right  (or full-width, which
 *                                          breaks out of the flow entirely)
 *
 * This module is the single place that vocabulary is defined. The admin
 * forms take their options and defaults from here, and both renderers take
 * their interpretation from here, so the editor and the published page cannot
 * disagree about what a position means.
 */

/** Where in the article an image belongs. */
export type ImageBand = "top" | "center" | "bottom";

/** Which side of the column an image sits on. */
export type ImageSide = "left" | "right";

/** `full` breaks out of the text flow; `float` sits beside it. */
export type ImageSpan = "float" | "full";

export type ImagePositionSpec = {
  value: string;
  label: string;
  band: ImageBand;
  /** `null` only for full-width, which is not side-specific. */
  side: ImageSide | null;
  span: ImageSpan;
};

/**
 * The complete set of positions the admin can choose, in the order the
 * dropdowns present them. Adding a position here makes it available in every
 * admin form and correctly interpreted by every renderer.
 */
export const IMAGE_POSITIONS: readonly ImagePositionSpec[] = [
  { value: "top-right", label: "Top / Right", band: "top", side: "right", span: "float" },
  { value: "top-left", label: "Top / Left", band: "top", side: "left", span: "float" },
  { value: "center-right", label: "Centre / Right", band: "center", side: "right", span: "float" },
  { value: "center-left", label: "Centre / Left", band: "center", side: "left", span: "float" },
  { value: "bottom-right", label: "Bottom / Right", band: "bottom", side: "right", span: "float" },
  { value: "bottom-left", label: "Bottom / Left", band: "bottom", side: "left", span: "float" },
  { value: "full-width", label: "Full Width", band: "center", side: null, span: "full" },
] as const;

export const IMAGE_POSITION_VALUES: readonly string[] = IMAGE_POSITIONS.map((p) => p.value);

const BY_VALUE = new Map(IMAGE_POSITIONS.map((p) => [p.value, p]));

/**
 * Defaults for slots 1–4, matching the per-column defaults the articles table
 * was migrated with (`0015_article_inline_images.sql`). Kept here so the
 * tables that have no SQL default (`legal_updates`, `lawyer_in_the_news`) and
 * the tables that do cannot drift apart.
 */
export const DEFAULT_IMAGE_POSITIONS: readonly string[] = [
  "top-right",
  "bottom-left",
  "center-right",
  "center-left",
] as const;

/** The default for a given 1-based slot number. */
export function defaultPositionForSlot(slot: number): string {
  return DEFAULT_IMAGE_POSITIONS[slot - 1] ?? "top-right";
}

/**
 * Fallback for a stored row with no position at all.
 *
 * `legal_updates` and `lawyer_in_the_news` have no SQL default, so rows
 * created before those columns existed hold `null`. Treating that as
 * full-width would reproduce the original bug (everything dumped after the
 * text), so an unknown/absent position is read as an ordinary centred
 * float — the behaviour that keeps the image in the article flow.
 *
 * Nothing is written back: this is a read-time interpretation, so existing
 * rows keep whatever they have and valid settings are never overwritten.
 */
const UNKNOWN_POSITION: ImagePositionSpec = {
  value: "center-right",
  label: "Centre / Right",
  band: "center",
  side: "right",
  span: "float",
};

/**
 * Interpret a stored position string. Never throws and never returns
 * undefined, so a legacy or hand-edited value degrades to a sensible float
 * rather than silently disappearing from the layout.
 */
export function parseImagePosition(position: string | null | undefined): ImagePositionSpec {
  if (typeof position !== "string") return UNKNOWN_POSITION;
  const key = position.trim().toLowerCase();
  const exact = BY_VALUE.get(key);
  if (exact) return exact;

  // Tolerate values written before the vocabulary was centralised
  // ("centre-left", "bottom right", a bare "left").
  const band: ImageBand = key.includes("bottom")
    ? "bottom"
    : key.includes("top")
      ? "top"
      : "center";
  const side: ImageSide | null = key.includes("left")
    ? "left"
    : key.includes("right")
      ? "right"
      : null;

  if (key.includes("full") || key.includes("wide") || key === "center" || key === "centre") {
    return { value: key, label: "Full Width", band, side: null, span: "full" };
  }
  return { value: key, label: key, band, side: side ?? "right", span: "float" };
}

/**
 * Does this position break out of the text flow entirely?
 *
 * Only Full Width does. A centred position is still a *side* choice — it says
 * where in the article the image goes, not that it should ignore the text.
 */
export function isFullWidthPosition(position: string | null | undefined): boolean {
  return parseImagePosition(position).span === "full";
}

/** Which side a floated image sits on. */
export function sideFromPosition(
  position: string | null | undefined,
  fallbackIndex = 0
): ImageSide {
  const spec = parseImagePosition(position);
  if (spec.span === "full") return fallbackIndex % 2 === 0 ? "left" : "right";
  return spec.side ?? (fallbackIndex % 2 === 0 ? "left" : "right");
}

/** Where in the article the image belongs. */
export function bandFromPosition(position: string | null | undefined): ImageBand {
  return parseImagePosition(position).band;
}

/**
 * Where each band aims to sit, as a fraction of the article's text. Used to
 * turn a position into a concrete point in the document.
 */
export const BAND_TARGET: Record<ImageBand, number> = {
  top: 0.12,
  center: 0.5,
  bottom: 0.88,
};