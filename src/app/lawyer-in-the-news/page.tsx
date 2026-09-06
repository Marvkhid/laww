import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { listPublishedLawyerNews } from "@/lib/supabase/queries/lawyer-news";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Lawyer in the News — Law Digest",
  description: "Exclusive interviews with the lawyers making headlines.",
};

export default async function LawyerNewsIndexPage() {
  const supabase = createSupabaseServerClient();
  const interviews = await listPublishedLawyerNews(supabase);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <SectionHeading eyebrow="Cover Story" title="Lawyer in the News" />
      <p className="-mt-4 font-body text-stone">
        Exclusive interviews with the lawyers making headlines across Nigeria and beyond.
      </p>

      {interviews.length === 0 ? (
        <p className="mt-10 font-body text-stone">No interviews published yet.</p>
      ) : (
        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {interviews.map((interview, i) => (
            <Reveal key={interview.id} delay={i * 0.05}>
              <Link href={`/lawyer-in-the-news/${interview.slug}`} className="group block">
                {interview.coverImageUrl ? (
                  <div className="border border-hairline bg-hairline/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={interview.coverImageUrl}
                      alt={interview.coverImageAlt ?? interview.lawyerName}
                      loading="lazy"
                      decoding="async"
                      className="h-auto w-full object-contain"
                    />
                  </div>
                ) : null}
                <h2 className="mt-4 font-display text-xl font-bold italic text-ink transition-colors group-hover:text-digest-red">
                  {interview.lawyerName}
                </h2>
                {interview.lawyerTitle ? (
                  <p className="mt-1 font-utility text-[10px] font-semibold uppercase tracking-[0.15em] text-stone">
                    {interview.lawyerTitle}
                  </p>
                ) : null}
                {interview.intro ? (
                  <p className="mt-2 line-clamp-3 font-body text-sm leading-relaxed text-stone">
                    {interview.intro}
                  </p>
                ) : null}
                <p className="mt-3 font-utility text-[11px] font-semibold uppercase tracking-wide text-digest-red">
                  {interview.qaPairs.length} Q&amp;As — read the interview →
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
