import { PlaceholderImage } from "@/components/ui/placeholder-image";

/**
 * Full-width cover hero for article / legal-update detail pages.
 *
 * - WIDTH: 100% of the available page area, edge to edge. The page renders
 *   this component OUTSIDE the article's max-width reading container, so
 *   nothing constrains it and there are no black side margins — the old
 *   implementation letter-boxed the image on an ink-coloured band whenever
 *   the upload's aspect ratio differed from the frame.
 * - ASPECT RATIO: preserved exactly (width 100%, height auto). Nothing is
 *   cropped, stretched or distorted.
 * - RESPONSIVE: fluid at every breakpoint, no hardcoded pixel widths.
 *
 * Only images the admin designated as COVER images receive this treatment;
 * ordinary inline images keep their editorial layout.
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
    <div className="w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        className="block h-auto w-full"
      />
    </div>
  );
}
