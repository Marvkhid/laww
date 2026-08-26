import { PlaceholderImage } from "@/components/ui/placeholder-image";

export function ArticleCoverImage({
  src,
  alt,
  aspect = "aspect-[4/3]",
}: {
  src?: string | null;
  alt: string;
  aspect?: string;
}) {
  if (!src) {
    return <PlaceholderImage label={alt} aspect={aspect} />;
  }

  return (
    <div className={`${aspect} overflow-hidden bg-hairline/20`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      />
    </div>
  );
}
