import Image from "next/image";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getCurrentIssue } from "@/lib/supabase/queries/issues";
import { getCoverStory } from "@/lib/supabase/queries/articles";
import { getPublishedLawyerNews } from "@/lib/supabase/queries/lawyer-news";
import { CoverHeroMotion } from "@/components/home/cover-hero-motion";
import { ImageReveal } from "@/components/motion/image-reveal";

export async function CoverHero() {
  const supabase = createSupabaseServerClient();
  const [issueMeta, coverStory, lawyerNews] = await Promise.all([
    getCurrentIssue(supabase),
    getCoverStory(supabase),
    getPublishedLawyerNews(supabase),
  ]);

  // Lawyer in the News IS the Cover Story — it takes priority over the
  // legacy article-based cover. Falls back when no interview is published.
  // The cover image is full-width; the caption panel sits on top.
  if (lawyerNews) {
    const href = `/lawyer-in-the-news/${lawyerNews.slug}`;
    return (
      <section className="border-b border-hairline bg-paper">
        <div className="mx-auto max-w-6xl px-6">
          <div className="relative w-full overflow-hidden md:aspect-[21/9]">
            {lawyerNews.coverImageUrl ? (
              <ImageReveal className="absolute inset-0">
                <Image
                  src={lawyerNews.coverImageUrl}
                  alt={lawyerNews.coverImageAlt ?? lawyerNews.lawyerName}
                  fill
                  priority
                  sizes="100vw"
                  className="block h-auto w-full"
                />
              </ImageReveal>
            ) : (
              <div className="flex aspect-[16/9] w-full items-center justify-center bg-hairline/40">
                <span className="font-utility text-xs uppercase tracking-wide text-stone">
                  Cover image pending
                </span>
              </div>
            )}

            <div className="absolute top-0 left-0 h-24 w-24 bg-gradient-to-br from-digest-red/10 to-transparent" />
            <div className="absolute bottom-0 right-0 h-32 w-32 bg-gradient-to-tl from-ink/15 to-transparent" />

            <CoverHeroMotion
              eyebrow={`§ Cover Story · Lawyer in the News${
                issueMeta ? ` · Issue ${issueMeta.issueNumber}, ${issueMeta.season} ${issueMeta.year}` : ""
              }`}
              subjectName={lawyerNews.lawyerName}
              subjectRole={
                lawyerNews.lawyerTitle ?? `${lawyerNews.qaPairs.length} Q&As — exclusive interview`
              }
              dek={lawyerNews.intro ?? ""}
              slug={href}
            />
          </div>
        </div>
      </section>
    );
  }

  if (!coverStory) return null;

  return (
    <section className="border-b border-hairline bg-paper">
      <div className="mx-auto max-w-6xl px-6">
        {/* Full-width cover image — the image itself fills the available
        horizontal width edge to edge; the aspect ratio is preserved, and
        nothing letterboxes it inside a narrower frame. */}
        <div className="relative w-full overflow-hidden md:aspect-[21/9]">
          {coverStory.coverImageUrl ? (
            <Image
              src={coverStory.coverImageUrl}
              alt={coverStory.imageAlt}
              fill
              priority
              sizes="100vw"
              className="block h-auto w-full"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-hairline/40">
              <span className="font-utility text-xs uppercase tracking-wide text-stone">
                Cover image pending
              </span>
            </div>
          )}

          {/* Editorial accent corners */}
          <div className="absolute top-0 left-0 h-24 w-24 bg-gradient-to-br from-digest-red/10 to-transparent" />
          <div className="absolute bottom-0 right-0 h-32 w-32 bg-gradient-to-tl from-ink/15 to-transparent" />

          {/* Text overlay panel — cream editorial panel positioned over the image */}
          <CoverHeroMotion
            eyebrow={`§ Cover Story${
              issueMeta
                ? ` · Issue ${issueMeta.issueNumber}, ${issueMeta.season} ${issueMeta.year}`
                : ""
            }`}
            subjectName={coverStory.title}
            subjectRole={
              coverStory.author.name +
              (coverStory.author.credentials
                ? `, ${coverStory.author.credentials}`
                : "")
            }
            dek={coverStory.dek ?? ""}
            slug={`/articles/${coverStory.slug}`}
          />
        </div>
      </div>
    </section>
  );
}
