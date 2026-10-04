import type { ArticleImage } from "@/lib/types";
import { SafeImage } from "@/components/ui/safe-image";

/**
 * Fallback rendering for the Image 1–4 position system.
 *
 * EditorialBody interleaves images with the article's text, but there is no
 * text to interleave when the body is still empty — and dropping the images
 * entirely is exactly the "uploaded but never rendered" failure this system
 * exists to prevent. This grid honours the admin's position choice instead:
 *
 *   top-*     → first row      bottom-* → last row
 *   *-left    → left column    *-right  → right column
 *   full-width → spans both columns
 *
 * Aspect ratios are preserved (width 100%, height auto), so nothing is
 * distorted, cropped or overlapped, on any viewport.
 */
function band(position: string | null | undefined): number {
  const p = (position ?? "").toLowerCase();
  if (p.includes("top")) return 0;
  if (p.includes("bottom")) return 2;
  return 1;
}

function isLeft(position: string | null | undefined): boolean {
  return (position ?? "").toLowerCase().includes("left");
}

function isFullWidth(position: string | null | undefined): boolean {
  const p = (position ?? "").toLowerCase();
  return p.includes("full") || p === "center";
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
      className="grid gap-6 sm:grid-cols-2"
    >
      {ordered.map((image, index) => (
        <figure
          key={`${image.url}-${index}`}
          data-testid="positioned-image"
          data-position={image.position ?? ""}
          data-full-width={isFullWidth(image.position) ? "true" : "false"}
          className={isFullWidth(image.position) ? "sm:col-span-2" : undefined}
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
