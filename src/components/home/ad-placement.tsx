import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getSponsorsForPage } from "@/lib/supabase/queries/sponsors";
import { Reveal } from "@/components/motion/reveal";
import type { PageKey } from "@/lib/page-visibility";

/**
 * Advertisement slot.
 *
 * Reads the SAME "Display On" selection the admin saved (show_on_pages), so
 * an advert targeted at About renders on About and nowhere else.
 *
 * Layout discipline: a slot renders AT MOST ONE advert, and pages place
 * their slots far apart — several adverts are never stacked beside each
 * other, while multiple active adverts can still rotate through the slots
 * a page defines (slot 0, slot 1, …) in display order.
 *
 * Responsive: fluid width inside the reading container, natural aspect
 * ratio, no fixed pixel heights.
 */
export async function AdPlacement({
  page,
  slot = 0,
  inset = false,
  className = "",
}: {
  page: PageKey;
  /** 0 = first advert for this page, 1 = the next one, and so on. */
  slot?: number;
  /** Render inside an already-padded page container (no second max-w wrapper). */
  inset?: boolean;
  className?: string;
}) {
  const supabase = createSupabaseServerClient();
  const adverts = await getSponsorsForPage(supabase, page);

  // Only entries carrying artwork act as ad slots — logo-only sponsors
  // belong to the "Supporting Law Digest" strip instead.
  const withArtwork = adverts.filter(
    (advert) => advert.imageUrl ?? advert.logoUrl
  );
  const advert = withArtwork[slot];

  if (!advert) return null;

  const artwork = advert.imageUrl ?? advert.logoUrl ?? "";
  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={artwork}
      alt={advert.name}
      loading="lazy"
      decoding="async"
      className="mx-auto block h-auto w-full max-w-3xl object-contain"
    />
  );

  return (
    <section className={`border-t border-hairline ${className}`}>
      <div className={inset ? "py-10" : "mx-auto max-w-6xl px-6 py-10"}>
        <Reveal>
          <p className="mb-5 text-center font-utility text-[10px] uppercase tracking-[0.2em] text-stone">
            Advertisement
          </p>
          {advert.websiteUrl ? (
            <a
              href={advert.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mx-auto block max-w-3xl opacity-90 transition-opacity duration-300 hover:opacity-100"
            >
              {image}
            </a>
          ) : (
            image
          )}
          {advert.name ? (
            <p className="mt-3 text-center font-admin text-[11px] uppercase tracking-[0.12em] text-stone">
              {advert.name}
            </p>
          ) : null}
        </Reveal>
      </div>
    </section>
  );
}
