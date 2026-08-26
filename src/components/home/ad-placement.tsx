import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getSponsorsByPlacement } from "@/lib/supabase/queries/sponsors";
import { Reveal } from "@/components/motion/reveal";

/**
 * Advertisement placement component.
 * Shows sponsor banner ads filtered by placement.
 * Uses the existing sponsors table with placement + image_url fields.
 */
export async function AdPlacement({
  placement = "homepage",
  className = "",
}: {
  placement?: string;
  className?: string;
}) {
  const supabase = createSupabaseServerClient();
  const sponsors = await getSponsorsByPlacement(supabase, placement);

  // Filter to sponsors that have a banner image
  const bannerAds = sponsors.filter((s) => s.imageUrl);

  if (bannerAds.length === 0) return null;

  return (
    <section className={`border-t border-hairline ${className}`}>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <Reveal>
          <p className="mb-6 text-center font-utility text-[10px] uppercase tracking-[0.2em] text-stone">
            Advertisement
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {bannerAds.map((sponsor) => {
              const imgSrc = sponsor.imageUrl ?? "";
              return (
                <div key={sponsor.name} className="flex items-center">
                  {sponsor.websiteUrl ? (
                    <a
                      href={sponsor.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block opacity-70 transition-opacity duration-300 hover:opacity-100"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgSrc}
                        alt={sponsor.name}
                        className="max-h-32 w-auto object-contain transition-all duration-500 hover:scale-105"
                        loading="lazy"
                      />
                    </a>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={imgSrc}
                      alt={sponsor.name}
                      className="max-h-32 w-auto object-contain transition-all duration-500 hover:scale-105"
                      loading="lazy"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
