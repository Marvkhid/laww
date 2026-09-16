import { PlaceholderImage } from "@/components/ui/placeholder-image";

/**
 * Full-bleed cover hero for article / legal-update detail pages.
 *
 * - Spans the FULL available page width: it is rendered OUTSIDE the
 *   article's max-width reading container by the page itself, so no
 *   container margin constrains it.
 * - FULL IMAGE VISIBILITY: the uploaded image is never cropped. It renders
 *   at its natural aspect ratio (w-full h-auto). On unusually tall portrait
 *   uploads the height is capped and the image letterboxes (object-contain)
 *   on a deep-ink band so the full frame stays visible without dominating
 *   the page.
 * - Responsive: width 100% at every breakpoint, no overflow, no hardcoded
 *   pixel widths.
 */
export function CoverHeroImage({
  src,
  alt,
}: {
  src?: string | null;
  alt: string;
}) {
  if (!src) {
    // Keep hero geometry even when no cover was uploaded.
    return (
      <div className="w-full">
        <PlaceholderImage label={alt} aspect="aspect-[21/9]" />
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden bg-ink"
      style={{ maxHeight: "80vh" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        className="mx-auto h-auto w-full object-contain"
        style={{ maxHeight: "80vh" }}
      />
    </div>
  );
}
