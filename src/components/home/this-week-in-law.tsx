import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getPublishedLegalUpdates } from "@/lib/supabase/queries/legal-updates";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { LegalScales } from "@/components/ui/editorial-illustration";

export async function ThisWeekInLaw() {
  const supabase = createSupabaseServerClient();
  const updates = await getPublishedLegalUpdates(supabase, 6);

  if (updates.length === 0) return null;

  return (
    <section className="border-t border-hairline">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              eyebrow="Legal Updates"
              title="This Week in Law"
            />
            <LegalScales className="h-16 w-16 shrink-0 opacity-20" />
          </div>
        </Reveal>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {updates.map((update, index) => (
            <Reveal key={update.id} delay={index * 0.06}>
              <Link
                href={`/legal-updates/${update.slug}`}
                className="group block border-t-2 border-hairline pt-4 transition-border-color duration-300 hover:border-digest-red"
              >
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
                <h3 className="mt-2 font-display text-base italic leading-snug text-ink transition-colors duration-300 group-hover:text-digest-red line-clamp-3">
                  {update.headline}
                </h3>
                <p className="mt-2 font-utility text-[10px] uppercase tracking-wide text-stone">
                  {new Date(update.publishedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.2}>
          <div className="mt-8">
            <Link
              href="/legal-updates"
              className="border-b border-digest-red pb-1 font-utility text-[11px] uppercase tracking-wide text-digest-red transition-opacity hover:opacity-70"
            >
              View all legal updates →
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
