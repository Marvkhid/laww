import type { ArticleImage } from "@/lib/types";
import { SafeImage } from "@/components/ui/safe-image";
import {
  bandFromPosition,
  isFullWidthPosition,
  parseImagePosition,
} from "@/lib/image-position";

/**
 * Fallback rendering for the Image 1–4 position system.
 *
 * EditorialBody interleaves images with the article's text, but there is no
 * text to interleave when the body is still empty — and dropping the images
 * entirely is exactly the "uploaded but never rendered" failure this system
 * exists to prevent. This grid honours the admin's position choice instead:
 *
 *   top-*      → first row      bottom-* → last row
 *   centre-*   → middle row
 *   *-left     → left column    *-right  → right column
 *   full-width → spans both columns
 *
 * The position vocabulary itself lives in `@/lib/image-position`, so this grid
 * and `EditorialBody` can never disagree about what a position means.
 *
 * SIZE. Images 1–4 are editorial artwork, not heroes. Their sizes come from
 * the shared `.article-image--half` / `.article-image--full` rules in
 * `globals.css` — the exact numbers `EditorialBody`'s floated and full figures
 * use — so the two renderers of the same admin images cannot drift apart as
 * they had (this grid rendered at 42% while the floated figures were 46%).
 * On small screens the images are inset rather than filling the column;
 * `full-width` keeps its meaning and stays bounded at every breakpoint.
 *
 * Aspect ratios are preserved (height auto, `object-contain`), so nothing is
 * distorted, cropped or overlapped, on any viewport.
 */
const BAND_ORDER = { top: 0, center: 1, bottom: 2 } as const;

function band(position: string | null | undefined): number {
  return BAND_ORDER[bandFromPosition(position)];
}

function isLeft(position: string | null | undefined): boolean {
  return parseImagePosition(position).side === "left";
}

export function PositionedImageGrid({
  images,
  title,
}: {
  images: ArticleImage[];
  title: string;
}) {
  const usable = images.filter((image) => image.url);
  if (usable.length === 0) return null;

  const ordered = [...usable].sort((a, b) => {
    const bandDiff = band(a.position) - band(b.position);
    if (bandDiff !== 0) return bandDiff;
    return Number(isLeft(b.position)) - Number(isLeft(a.position));
  });

  return (
    <div
      data-testid="positioned-image-grid"
      className="flex flex-wrap items-start justify-between gap-6"
    >
      {ordered.map((image, index) => (
        <figure
          key={`${image.url}-${index}`}
          data-testid="positioned-image"
          data-position={image.position ?? ""}
          data-full-width={isFullWidthPosition(image.position) ? "true" : "false"}
          className={
            isFullWidthPosition(image.position)
              ? "article-image--full"
              : "article-image--half"
          }
        >
          <div className="overflow-hidden border border-hairline bg-hairline/10">
            <SafeImage
              src={image.url ?? ""}
              alt={image.alt ?? `${title} — Image ${index + 1}`}
              className="h-auto w-full object-contain"
            />
          </div>
          {image.alt ? (
            <figcaption className="mt-2 font-utility text-[10px] uppercase tracking-wide text-stone">
              {image.alt}
            </figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}
