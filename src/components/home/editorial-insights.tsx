import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getEditorialInsights } from "@/lib/supabase/queries/articles";
import { PageNumberBadge } from "@/components/ui/page-number-badge";
import { Byline } from "@/components/ui/byline";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { MagnifyingGlass } from "@/components/ui/editorial-illustration";

export async function EditorialInsights() {
  const supabase = createSupabaseServerClient();
  const editorialInsights = await getEditorialInsights(supabase);

  if (editorialInsights.length === 0) return null;

  return (
    <section className="border-t border-hairline bg-hairline/30">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading eyebrow="Editorial Insights" title="Analysis &amp; commentary" />
            <MagnifyingGlass className="h-16 w-16 shrink-0 opacity-20" />
          </div>
        </Reveal>
        <div className="grid gap-8 md:grid-cols-3">
          {editorialInsights.map((article, index) => (
            <Reveal key={article.slug} delay={index * 0.08}>
              <Link
                href={`/articles/${article.slug}`}
                className="group block border-t-2 border-purple/20 pt-6 transition-border-color duration-300 hover:border-purple"
              >
                <PageNumberBadge page={article.page} />
                <h3 className="mt-4 font-display text-lg italic text-ink transition-colors duration-300 group-hover:text-digest-red">
                  {article.title}
                </h3>
                <div className="mt-3">
                  <Byline author={article.author} />
                </div>
                {article.practiceArea ? (
                  <p className="mt-3 font-utility text-[10px] uppercase tracking-[0.15em] text-purple">
                    § {article.practiceArea}
                  </p>
                ) : null}
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
