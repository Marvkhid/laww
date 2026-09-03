import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getPublishedLegalUpdates } from "@/lib/supabase/queries/legal-updates";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Legal Updates",
  description:
    "Breaking legal news and updates from Law Digest — covering the latest developments in Nigerian and African law.",
};

export default async function LegalUpdatesPage() {
  const supabase = createSupabaseServerClient();
  const updates = await getPublishedLegalUpdates(supabase, 50);

  return (
    <section className="border-t border-hairline">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <SectionHeading
            eyebrow="Legal Updates"
            title="Breaking Legal News"
          />
          <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-stone">
            Stay informed with the latest legal developments, court decisions,
            and regulatory changes across Nigeria and beyond.
          </p>
        </Reveal>

        {updates.length === 0 ? (
          <Reveal delay={0.1}>
            <div className="mt-12 border-t border-hairline pt-8">
              <p className="font-body text-sm text-stone">
                No legal updates published yet. Check back soon.
              </p>
            </div>
          </Reveal>
        ) : (
          <div className="mt-10 space-y-0">
            {updates.map((update, index) => (
              <Reveal key={update.id} delay={index * 0.04}>
                <Link
                  href={`/legal-updates/${update.slug}`}
                  className="group block border-t border-hairline py-6 transition-colors duration-300 hover:bg-paper-warm/50"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {update.practiceArea ? (
                          <span className="font-utility text-[10px] uppercase tracking-[0.15em] text-purple">
                            § {update.practiceArea}
                          </span>
                        ) : null}
                        <span className="font-utility text-[10px] text-stone">
                          · {update.sourceName}
                        </span>
                      </div>
                      <h2 className="mt-2 font-display text-lg italic leading-snug text-ink transition-colors duration-300 group-hover:text-digest-red md:text-xl">
                        {update.headline}
                      </h2>
                      {update.summary ? (
                        <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-stone line-clamp-2">
                          {update.summary}
                        </p>
                      ) : null}
                    </div>
                    <p className="mt-2 shrink-0 font-utility text-[10px] uppercase tracking-wide text-stone sm:mt-0 sm:text-right">
                      {new Date(update.publishedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
