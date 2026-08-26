import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getArticles } from "@/lib/supabase/queries/articles";
import { PageNumberBadge } from "@/components/ui/page-number-badge";
import { Byline } from "@/components/ui/byline";
import { ArticleCoverImage } from "@/components/ui/article-cover-image";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";

export async function LatestStories() {
  const supabase = createSupabaseServerClient();
  const articles = await getArticles(supabase);

  // Take the most recent 8 published articles
  const latest = articles.slice(-8).reverse();

  if (latest.length === 0) return null;

  return (
    <section className="border-t border-hairline">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <div className="flex items-end justify-between">
            <SectionHeading eyebrow="Latest" title="Latest Stories" />
            <Link
              href="/articles"
              className="hidden border-b border-digest-red pb-1 font-utility text-[11px] uppercase tracking-wide text-digest-red transition-opacity hover:opacity-70 md:block"
            >
              View all articles →
            </Link>
          </div>
        </Reveal>

        {/* Horizontal scroll carousel */}
        <div className="-mx-6 overflow-x-auto px-6 pb-4 scrollbar-thin">
          <div className="flex gap-6" style={{ width: "max-content" }}>
            {latest.map((article, index) => (
              <Reveal key={article.slug} delay={index * 0.06}>
                <Link
                  href={`/articles/${article.slug}`}
                  className="group flex w-[280px] flex-col sm:w-[320px]"
                >
                  <div className="relative overflow-hidden">
                    <ArticleCoverImage
                      src={article.coverImageUrl}
                      alt={article.imageAlt}
                      aspect="aspect-[16/10]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  </div>
                  <div className="mt-3 flex items-start gap-2">
                    <PageNumberBadge page={article.page} />
                    <div className="min-w-0 flex-1">
                      {article.practiceArea ? (
                        <p className="font-utility text-[10px] uppercase tracking-[0.15em] text-purple">
                          § {article.practiceArea}
                        </p>
                      ) : null}
                      <h3 className="mt-1 line-clamp-2 font-display text-base italic text-ink transition-colors duration-300 group-hover:text-digest-red">
                        {article.title}
                      </h3>
                      <div className="mt-1.5">
                        <Byline author={article.author} />
                      </div>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center md:hidden">
          <Link
            href="/articles"
            className="border-b border-digest-red pb-1 font-utility text-[11px] uppercase tracking-wide text-digest-red transition-opacity hover:opacity-70"
          >
            View all articles →
          </Link>
        </div>
      </div>
    </section>
  );
}
