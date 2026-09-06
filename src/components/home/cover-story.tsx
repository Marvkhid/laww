import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getPublishedLawyerNews } from "@/lib/supabase/queries/lawyer-news";
import { Reveal } from "@/components/motion/reveal";

const HOMEPAGE_QA_COUNT = 3;

export async function CoverStory() {
  const supabase = createSupabaseServerClient();
  const story = await getPublishedLawyerNews(supabase);

  if (!story || story.qaPairs.length === 0) return null;

  const homepageQa = story.qaPairs.slice(0, HOMEPAGE_QA_COUNT);
  const hasMore = story.qaPairs.length > HOMEPAGE_QA_COUNT;
  const href = `/lawyer-in-the-news/${story.slug}`;

  return (
    <section className="border-b border-hairline bg-paper">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <Reveal>
          <div className="grid gap-10 md:grid-cols-[2fr_1fr]">
            {/* Interview content */}
            <div>
              <p className="font-utility text-[11px] uppercase tracking-[0.2em] text-digest-red">
                § Cover Story · Lawyer in the News
              </p>
              <Link href={href} className="group mt-3 block">
                <h2 className="font-display text-3xl italic leading-tight text-ink transition-colors group-hover:text-digest-red md:text-4xl">
                  {story.lawyerName}
                </h2>
                {story.lawyerTitle ? (
                  <p className="mt-2 font-utility text-xs font-semibold uppercase tracking-[0.15em] text-stone">
                    {story.lawyerTitle}
                  </p>
                ) : null}
              </Link>

              {story.intro ? (
                <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-stone">
                  {story.intro}
                </p>
              ) : null}

              {/* First 3 Q&As */}
              <div className="mt-8 flex flex-col gap-6">
                {homepageQa.map((pair, i) => (
                  <Link key={i} href={href} className="group block">
                    <p className="font-display text-lg font-bold italic text-ink transition-colors group-hover:text-digest-red">
                      <span className="mr-2 font-utility text-xs not-italic text-digest-red">
                        Q{i + 1}.
                      </span>
                      {pair.question}
                    </p>
                    <p className="mt-2 line-clamp-3 font-body text-sm leading-relaxed text-stone">
                      {pair.answer}
                    </p>
                  </Link>
                ))}
              </div>

              {hasMore ? (
                <Link
                  href={href}
                  className="mt-8 inline-block border-b border-digest-red pb-1 font-utility text-[11px] font-semibold uppercase tracking-wide text-digest-red transition-opacity hover:opacity-70"
                >
                  Read the full interview ({story.qaPairs.length} Q&amp;As) →
                </Link>
              ) : (
                <Link
                  href={href}
                  className="mt-8 inline-block border-b border-digest-red pb-1 font-utility text-[11px] font-semibold uppercase tracking-wide text-digest-red transition-opacity hover:opacity-70"
                >
                  View the full interview →
                </Link>
              )}
            </div>

            {/* Portrait */}
            <Link href={href} className="group block self-start">
              {story.coverImageUrl ? (
                <div className="border border-hairline bg-hairline/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={story.coverImageUrl}
                    alt={story.coverImageAlt ?? story.lawyerName}
                    loading="lazy"
                    decoding="async"
                    className="h-auto w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex aspect-[3/4] items-center justify-center border border-hairline bg-hairline/30">
                  <span className="font-utility text-xs uppercase tracking-wide text-stone">
                    Portrait
                  </span>
                </div>
              )}
              <p className="mt-3 font-utility text-[10px] uppercase tracking-[0.15em] text-stone group-hover:text-digest-red">
                {story.lawyerName} — full interview →
              </p>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
