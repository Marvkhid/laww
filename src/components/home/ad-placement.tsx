import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getSponsorsForPage } from "@/lib/supabase/queries/sponsors";
import { Reveal } from "@/components/motion/reveal";
import { SafeImage } from "@/components/ui/safe-image";
import type { PageKey } from "@/lib/page-visibility";

/**
 * Active adverts allowed on the given public page, rendered one per spaced
 * <section> block in display order.
 *
 * Layout discipline: adverts are spread across the page so several are never
 * stacked beside each other. Because the block is keyed on the sponsor id, a
 * new advert never page-slots an existing one — extra adverts just stack in
 * order below the rest, and the same sponsor can never render twice on one
 * page even if the underlying result set ever contained two runs.
 *
 * Reads the SAME "Display On" selection the admin saved (show_on_pages), so
 * an advert targeted at About renders on About and nowhere else.
 *
 * Responsive: fluid width inside the reading container, natural aspect
 * ratio, no fixed pixel heights.
 */
export async function AdPlacement({
  page,
  inset = false,
  className = "",
}: {
  page: PageKey;
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

  // Dedup by id only: keep the first occurrence of each unique id in case a
  // future column drift ever sneaks two identical rows into the result set.
  const seen = new Set<string>();
  const unique: SponsorPublic[] = [];
  for (const advert of withArtwork) {
    if (seen.has(advert.id)) continue;
    seen.add(advert.id);
    unique.push(advert as SponsorPublic);
  }

  return (
    <>
      {unique.map((advert) => (
        <AdvertBlock key={advert.id} advert={advert} inset={inset} className={className} />
      ))}
    </>
  );
}

interface SponsorPublic {
  id: string;
  name: string;
  websiteUrl?: string;
  tier?: string;
  imageUrl?: string;
  logoUrl?: string;
}

interface AdvertBlockProps {
  advert: SponsorPublic;
  inset: boolean;
  className: string;
}

function AdvertBlock({ advert, inset, className }: AdvertBlockProps) {
  const artwork = advert.imageUrl ?? advert.logoUrl ?? "";
  const image = (
    <SafeImage
      src={artwork}
      alt={advert.name}
      label={advert.name}
      className="block h-auto w-full object-contain"
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
