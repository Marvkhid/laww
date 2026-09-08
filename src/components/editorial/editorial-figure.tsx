import { ImageReveal } from "@/components/motion/image-reveal";

export type EditorialImageInput = {
  url: string | null;
  alt?: string | null;
  position?: string | null;
};

/**
 * Full-visibility editorial figure — never crops uploaded images.
 * Wraps in ImageReveal for a scroll-triggered entrance.
 */
export function EditorialFigure({
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
    <figure className={`editorial-figure ${className}`}>
      <ImageReveal onScroll>
        <div className="overflow-hidden border border-hairline bg-hairline/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={alt ?? ""}
            loading="lazy"
            decoding="async"
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
 * Standalone full-width editorial figure — centered, max-width constrained.
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
    <div className={`mx-auto my-10 max-w-4xl ${className}`}>
      <EditorialFigure url={url} alt={alt} caption={caption} />
    </div>
  );
}
