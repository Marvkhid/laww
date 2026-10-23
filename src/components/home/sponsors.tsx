import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getActiveSponsors } from "@/lib/supabase/queries/sponsors";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";

export async function Sponsors() {
  const supabase = createSupabaseServerClient();
  const allSponsors = await getActiveSponsors(supabase);
  const sponsors = allSponsors.filter((sponsor) => !sponsor.imageUrl);

  if (sponsors.length === 0) return null;

  return (
    <section className="border-t border-hairline">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <SectionHeading eyebrow="Sponsors" title="Supporting Law Digest" />
          <ul className="flex flex-wrap items-center gap-x-12 gap-y-8">
              {sponsors.map((sponsor) => {
                const content = sponsor.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sponsor.logoUrl}
                    alt={sponsor.name}
                    className="h-10 w-auto grayscale transition-all duration-500 hover:grayscale-0 hover:scale-110"
                  />
                ) : (
                  <span className="font-admin text-sm text-ink transition-colors duration-300 hover:text-digest-red">
                    {sponsor.name}
                  </span>
                );

                return (
                  <li key={sponsor.id}>
                    {sponsor.websiteUrl ? (
                      <a
                        href={sponsor.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block opacity-70 transition-opacity duration-300 hover:opacity-100"
                      >
                        {content}
                      </a>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
