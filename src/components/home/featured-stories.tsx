import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getFeaturedStories } from "@/lib/supabase/queries/articles";
import { ArticleCard } from "@/components/ui/article-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";

export async function FeaturedStories() {
  const supabase = createSupabaseServerClient();
  const featuredStories = await getFeaturedStories(supabase);

  if (featuredStories.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <Reveal>
        <SectionHeading eyebrow="Featured" title="Featured Stories" />
      </Reveal>
      <div className="grid gap-12 md:grid-cols-2">
        {featuredStories.map((article, index) => (
          <Reveal key={article.slug} delay={index * 0.1}>
            <ArticleCard article={article} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
