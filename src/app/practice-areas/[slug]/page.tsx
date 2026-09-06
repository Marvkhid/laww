import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getPracticeAreas } from "@/lib/supabase/queries/practice-areas";
import { getArticles } from "@/lib/supabase/queries/articles";
import {
  getPracticeAreaEditorial,
  type PracticeAreaSection,
  type PracticeAreaStat,
  type PracticeAreaNotableCase,
} from "@/lib/data/practice-area-content";
import { PageNumberBadge } from "@/components/ui/page-number-badge";
import { Byline } from "@/components/ui/byline";
import { Reveal } from "@/components/motion/reveal";

export async function generateStaticParams() {
  try {
    const supabase = createSupabaseServerClient();
    const areas = await getPracticeAreas(supabase);
    return areas.map((area) => ({ slug: area.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/practice-areas/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createSupabaseServerClient();
  const areas = await getPracticeAreas(supabase);
  const area = areas.find((a) => a.slug === slug);
  if (!area) return {};

  const editorial = getPracticeAreaEditorial(slug);
  const description =
    editorial?.intro?.slice(0, 160) ?? area.description?.slice(0, 160) ?? `Coverage of ${area.name} by Law Digest.`;

  return {
    title: `${area.name} — Law Digest`,
    description,
  };
}

/* ─── Sub-components ────────────────────────────────────────────────── */

function SectionRenderer({ section, index }: { section: PracticeAreaSection; index: number }) {
  const hasImage = section.blocks.some((b) => b.type === "image");
  const imageBlock = section.blocks.find((b) => b.type === "image");
  const textBlocks = section.blocks.filter((b) => b.type === "paragraph");

  /* If no image, render text-only section */
  if (!hasImage || !imageBlock || imageBlock.type !== "image") {
    return (
      <section className="mx-auto max-w-3xl px-6 py-12">
        <h2 className="font-display text-2xl font-bold text-[#171717] md:text-3xl">
          {section.heading}
        </h2>
        {textBlocks.map((block, i) =>
          block.type === "paragraph" ? (
            <p
              key={i}
              className="mt-6 font-body text-lg leading-relaxed text-[#333333]"
            >
              {block.text}
            </p>
          ) : null
        )}
        {index > 0 && (
          <div className="mt-12 flex items-center gap-4">
            <span className="h-px flex-1 bg-[#e2ddd5]" />
            <span className="h-1.5 w-1.5 bg-[#A51C30]" />
            <span className="h-px flex-1 bg-[#e2ddd5]" />
          </div>
        )}
      </section>
    );
  }

  /* Image left layout */
  if (section.imagePosition === "left") {
    return (
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-col gap-10 md:flex-row md:items-start">
          <figure className="shrink-0 md:w-[45%]">
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={imageBlock.url}
                alt={imageBlock.alt}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 45vw"
              />
            </div>
            {imageBlock.caption && (
              <p className="mt-3 font-admin text-xs text-stone">
                {imageBlock.caption}
              </p>
            )}
          </figure>
          <div className="flex-1">
            <h2 className="font-display text-2xl font-bold text-[#171717] md:text-3xl">
              {section.heading}
            </h2>
            {textBlocks.map((block, i) =>
              block.type === "paragraph" ? (
                <p
                  key={i}
                  className="mt-5 font-body text-lg leading-relaxed text-[#333333]"
                >
                  {block.text}
                </p>
              ) : null
            )}
          </div>
        </div>
        {index > 0 && (
          <div className="mt-12 flex items-center gap-4">
            <span className="h-px flex-1 bg-[#e2ddd5]" />
            <span className="h-1.5 w-1.5 bg-[#A51C30]" />
            <span className="h-px flex-1 bg-[#e2ddd5]" />
          </div>
        )}
      </section>
    );
  }

  /* Image right layout */
  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-col gap-10 md:flex-row md:items-start">
        <div className="flex-1">
          <h2 className="font-display text-2xl font-bold text-[#171717] md:text-3xl">
            {section.heading}
          </h2>
          {textBlocks.map((block, i) =>
            block.type === "paragraph" ? (
              <p
                key={i}
                className="mt-5 font-body text-lg leading-relaxed text-[#333333]"
              >
                {block.text}
              </p>
            ) : null
          )}
        </div>
        <figure className="shrink-0 md:w-[45%]">
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image
              src={imageBlock.url}
              alt={imageBlock.alt}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 45vw"
            />
          </div>
          {imageBlock.caption && (
            <p className="mt-3 font-admin text-xs text-stone">
              {imageBlock.caption}
            </p>
          )}
        </figure>
      </div>
      {index > 0 && (
        <div className="mt-12 flex items-center gap-4">
          <span className="h-px flex-1 bg-[#e2ddd5]" />
          <span className="h-1.5 w-1.5 bg-[#A51C30]" />
          <span className="h-px flex-1 bg-[#e2ddd5]" />
        </div>
      )}
    </section>
  );
}

function KeyStats({ stats }: { stats: PracticeAreaStat[] }) {
  return (
    <section className="border-y border-[#e2ddd5] bg-[#FAF9F6]">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <p className="font-admin text-[11px] font-semibold uppercase tracking-[0.25em] text-[#A51C30]">
          Key Figures
        </p>
        <h2 className="mt-3 font-display text-2xl font-bold text-[#171717]">
          By the Numbers
        </h2>
        <div className="mt-2 h-px w-16 bg-[#A51C30]" />
        <div className="mt-10 grid gap-8 sm:grid-cols-2 md:grid-cols-3">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <p className="font-display text-4xl font-bold text-[#A51C30]">
                {stat.value}
              </p>
              <p className="mt-2 font-admin text-sm font-semibold uppercase tracking-wide text-[#171717]">
                {stat.label}
              </p>
              {stat.detail && (
                <p className="mt-2 font-admin text-sm text-[#555555]">
                  {stat.detail}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NotableCases({ cases }: { cases: PracticeAreaNotableCase[] }) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <p className="font-admin text-[11px] font-semibold uppercase tracking-[0.25em] text-[#A51C30]">
        Case Law
      </p>
      <h2 className="mt-3 font-display text-2xl font-bold text-[#171717]">
        Notable Cases
      </h2>
      <div className="mt-2 h-px w-16 bg-[#A51C30]" />

      <div className="mt-10 space-y-8">
        {cases.map((c, i) => (
          <div
            key={i}
            className="border-l-4 border-[#A51C30] pl-8"
          >
            <h3 className="font-display text-xl font-bold text-[#171717]">
              {c.name}
            </h3>
            <p className="mt-1 font-admin text-xs font-semibold uppercase tracking-wider text-[#A51C30]">
              {c.jurisdiction}
            </p>
            <p className="mt-3 font-body text-base leading-relaxed text-[#333333]">
              {c.summary}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────── */

export default async function PracticeAreaPage({
  params,
}: PageProps<"/practice-areas/[slug]">) {
  const { slug } = await params;
  const supabase = createSupabaseServerClient();
  const [areas, allArticles] = await Promise.all([
    getPracticeAreas(supabase),
    getArticles(supabase),
  ]);
  const area = areas.find((a) => a.slug === slug);

  if (!area) {
    notFound();
  }

  const editorial = getPracticeAreaEditorial(slug);
  const related = allArticles.filter(
    (article) => article.practiceArea === area.name
  );

  return (
    <article className="min-h-screen">
      {/* ─── Hero ─── */}
      <Reveal>
        <header className="relative">
          <div className="relative h-[50vh] min-h-[400px] w-full overflow-hidden">
            <Image
              src={
                editorial?.heroImage ??
                "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=80"
              }
              alt={editorial?.heroAlt ?? area.name}
              fill
              className="object-contain"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#171717]/85 via-[#171717]/40 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end">
              <div className="mx-auto w-full max-w-5xl px-6 pb-14">
                <p className="font-admin text-[11px] font-semibold uppercase tracking-[0.25em] text-[#A51C30]">
                  Practice Area
                </p>
                <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
                  {editorial?.headline ?? area.name}
                </h1>
                {editorial?.subheadline && (
                  <p className="mt-3 max-w-xl font-admin text-lg text-white/80">
                    {editorial.subheadline}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="h-1 w-full bg-[#A51C30]" />
        </header>
      </Reveal>

      {/* ─── Intro ─── */}
      <Reveal>
        <section className="mx-auto max-w-3xl px-6 py-16">
          <p className="font-body text-xl leading-relaxed text-[#333333] md:text-2xl">
            {editorial?.intro ?? area.description ?? ""}
          </p>
          <div className="mt-12 flex items-center gap-4">
            <span className="h-px flex-1 bg-[#e2ddd5]" />
            <span className="h-2 w-2 bg-[#A51C30]" />
            <span className="h-px flex-1 bg-[#e2ddd5]" />
          </div>
        </section>
      </Reveal>

      {/* ─── Editorial Sections ─── */}
      {editorial?.sections.map((section, idx) => (
        <Reveal key={idx}>
          <SectionRenderer section={section} index={idx} />
        </Reveal>
      ))}

      {/* ─── Pull Quote ─── */}
      {editorial?.pullQuote && (
        <Reveal>
          <section className="border-y border-[#e2ddd5] bg-[#171717]">
            <div className="mx-auto max-w-4xl px-6 py-20 text-center">
              <p className="font-display text-2xl italic leading-relaxed text-white md:text-3xl">
                &ldquo;{editorial.pullQuote.text}&rdquo;
              </p>
              {editorial.pullQuote.attribution && (
                <p className="mt-6 font-admin text-sm text-white/60">
                  — {editorial.pullQuote.attribution}
                </p>
              )}
            </div>
          </section>
        </Reveal>
      )}

      {/* ─── Key Stats ─── */}
      {editorial?.keyStats && editorial.keyStats.length > 0 && (
        <Reveal>
          <KeyStats stats={editorial.keyStats} />
        </Reveal>
      )}

      {/* ─── Notable Cases ─── */}
      {editorial?.notableCases && editorial.notableCases.length > 0 && (
        <Reveal>
          <NotableCases cases={editorial.notableCases} />
        </Reveal>
      )}

      {/* ─── Key Journals ─── */}
      {editorial?.keyJournals && editorial.keyJournals.length > 0 && (
        <Reveal>
          <section className="mx-auto max-w-5xl px-6 py-16">
            <div className="border-t border-[#e2ddd5] pt-16">
              <p className="font-admin text-[11px] font-semibold uppercase tracking-[0.25em] text-[#A51C30]">
                Further Reading
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold text-[#171717]">
                Key Journals &amp; Publications
              </h2>
              <div className="mt-2 h-px w-16 bg-[#A51C30]" />
              <div className="mt-8 flex flex-wrap gap-3">
                {editorial.keyJournals.map((journal, i) => (
                  <span
                    key={i}
                    className="border border-[#e2ddd5] bg-[#FAF9F6] px-4 py-2 font-admin text-sm text-[#333333] transition-colors hover:border-[#A51C30] hover:text-[#A51C30]"
                  >
                    {journal}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </Reveal>
      )}

      {/* ─── Closing Statement ─── */}
      {editorial?.closingStatement && (
        <Reveal>
          <section className="mx-auto max-w-3xl px-6 py-16">
            <blockquote className="border-l-4 border-[#A51C30] pl-8">
              <p className="font-display text-xl italic leading-relaxed text-[#171717] md:text-2xl">
                {editorial.closingStatement}
              </p>
            </blockquote>
          </section>
        </Reveal>
      )}

      {/* ─── Related Articles ─── */}
      {related.length > 0 && (
        <Reveal>
          <section className="border-t border-[#e2ddd5] bg-[#FAF9F6]">
            <div className="mx-auto max-w-5xl px-6 py-16">
              <p className="font-admin text-[11px] font-semibold uppercase tracking-[0.25em] text-[#A51C30]">
                From the Archive
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold text-[#171717]">
                Related Articles
              </h2>
              <div className="mt-2 h-px w-16 bg-[#A51C30]" />

              <ul className="mt-10 divide-y divide-[#e2ddd5]">
                {related.map((article) => (
                  <li key={article.slug}>
                    <Link
                      href={`/articles/${article.slug}`}
                      className="group flex items-start gap-5 py-6 transition-colors hover:bg-[#e2ddd5]/20"
                    >
                      <PageNumberBadge page={article.page} />
                      <div className="flex-1">
                        <h3 className="font-display text-xl font-bold text-[#171717] transition-colors group-hover:text-[#A51C30]">
                          {article.title}
                        </h3>
                        {article.dek && (
                          <p className="mt-1 font-body text-sm leading-relaxed text-[#555555]">
                            {article.dek}
                          </p>
                        )}
                        <div className="mt-2">
                          <Byline author={article.author} />
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </Reveal>
      )}

      {/* ─── Fallback ─── */}
      {related.length === 0 && !editorial && (
        <Reveal>
          <section className="mx-auto max-w-3xl px-6 py-16">
            <p className="font-admin text-sm text-[#555555]">
              No articles have been published in this practice area yet.
            </p>
          </section>
        </Reveal>
      )}

      {/* ─── Back Link ─── */}
      <Reveal>
        <div className="mx-auto max-w-5xl px-6 pb-16">
          <div className="flex items-center gap-4 border-t border-[#e2ddd5] pt-8">
            <Link
              href="/practice-areas"
              className="font-admin text-sm font-medium text-[#A51C30] transition-colors hover:text-[#8A1728]"
            >
              ← Back to all Practice Areas
            </Link>
          </div>
        </div>
      </Reveal>
    </article>
  );
}
