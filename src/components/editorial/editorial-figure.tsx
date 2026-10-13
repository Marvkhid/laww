import { ImageReveal } from "@/components/motion/image-reveal";
import { SafeImage } from "@/components/ui/safe-image";

export type EditorialImageInput = {
  url: string | null;
  alt?: string | null;
  position?: string | null;
};

/**
 * Editorial figure — a positioned image embedded in the article flow.
 *
 * `floatSide` is the mechanism that makes text wrap around an image instead
 * of being squeezed into a narrow column beside it:
 *   "left"  → figure floats left, text flows down its right side
 *   "right" → figure floats right, text flows down its left side
 *   omitted → figure stays in normal flow (standalone)
 *
 * On small screens the CSS resets the float and lets the figure take the
 * full container width, so the image is never letterboxed or cropped on
 * mobile. Which side is used always comes from the position the admin saved,
 * so the mobile/desktop switch never discards that choice.
 *
 * The image itself is never cropped or distorted (`h-auto w-full`).
 */
export function EditorialFigure({
  url,
  alt,
  caption,
  floatSide,
  className = "",
}: {
  url: string;
  alt?: string | null;
  caption?: string | null;
  /** Float the figure so surrounding text wraps around it on desktop. */
  floatSide?: "left" | "right";
  className?: string;
}) {
  const floatClass =
    floatSide === "left"
      ? "editorial-figure--float-left"
      : floatSide === "right"
        ? "editorial-figure--float-right"
        : "";

  return (
    <figure className={`editorial-figure ${floatClass} ${className}`}>
      <ImageReveal onScroll>
        <div className="overflow-hidden border border-hairline bg-hairline/10">
          <SafeImage
            src={url}
            alt={alt ?? ""}
            label="Image unavailable"
            className="h-auto w-full object-contain"
          />
        </div>
      </ImageReveal>
      {caption ? (
        <figcaption className="mt-2 font-utility text-[10px] uppercase tracking-wide text-stone">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

/**
 * Standalone full-width editorial figure — centred and bounded.
 *
 * Used for full-width/center positions, which by design break out of the text
 * flow rather than sitting beside it. The bound lives in CSS
 * (`.editorial-figure--full`) next to the floated sizes, so desktop and mobile
 * caps are defined in one place instead of being split between a Tailwind
 * utility here and a media query there.
 */
export function EditorialFullFigure({
  url,
  alt,
  caption,
  className = "",
}: {
  url: string;
  alt?: string | null;
  caption?: string | null;
  className?: string;
}) {
  return (
    <div className={`editorial-figure--full ${className}`}>
      <EditorialFigure url={url} alt={alt} caption={caption} />
    </div>
  );
}