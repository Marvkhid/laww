import type { ArticleImage } from "@/lib/types";

/**
 * Single inline article image component for use in the article body layout.
 */
export function ArticleInlineImage({
  image,
  index,
  articleTitle,
}: {
  image: ArticleImage;
  index: number;
  articleTitle: string;
}) {
  if (!image.url) return null;

  const alt = image.alt ?? `${articleTitle} — Image ${index + 1}`;

  return (
    <figure className="article-inline-figure">
      <div className="overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="h-auto w-full object-cover"
        />
      </div>
      {image.alt ? (
        <figcaption className="mt-2 font-utility text-[10px] uppercase tracking-wide text-stone">
          {image.alt}
        </figcaption>
      ) : null}
    </figure>
  );
}

/**
 * Renders multiple inline article images based on their position.
 * Legacy component for backward compatibility.
 */
export function ArticleInlineImages({
  images,
  articleTitle,
}: {
  images: ArticleImage[];
  articleTitle: string;
}) {
  if (!images || images.length === 0) return null;

  return (
    <>
      {images.map((img, index) => (
        <ArticleInlineImage key={index} image={img} index={index} articleTitle={articleTitle} />
      ))}
    </>
  );
}
