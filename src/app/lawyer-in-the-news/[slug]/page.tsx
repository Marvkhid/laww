import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import {
  getPublishedLawyerNewsBySlug,
} from "@/lib/supabase/queries/lawyer-news";
import { Reveal } from "@/components/motion/reveal";
import { SITE_URL } from "@/lib/constants";
import { EditorialBody } from "@/components/editorial/editorial-body";
import type { JSONContent } from "@tiptap/core";
import { RichTextBlock } from "@/components/ui/rich-text";

function QABlock({ pair, index }: { pair: { question: string; answer: string }; index: number }) {
  return (
    <div>
      <p className="font-display text-xl font-bold italic leading-snug text-ink md:text-2xl">
        <span className="mr-2 font-utility text-sm not-italic text-digest-red">
          Q{index + 1}.
        </span>
        {pair.question}
      </p>
      <p className="mt-3 font-body text-base leading-relaxed text-ink/90">{pair.answer}</p>
    </div>
  );
}

function qaToBlock(pair: { question: string; answer: string }, i: number): JSONContent {
  return {
    type: "qaPair",
    attrs: { question: pair.question, answer: pair.answer, index: i },
    content: [{ type: "text", text: pair.question + " " + pair.answer }],
  };
}

function qaRenderBlock(node: JSONContent, index: number) {
  if (node.type === "qaPair") {
    return (
      <QABlock
        key={index}
        pair={{ question: node.attrs?.question ?? "", answer: node.attrs?.answer ?? "" }}
        index={node.attrs?.index ?? index}
      />
    );
  }
  return <RichTextBlock node={node} index={index} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createSupabaseServerClient();
  const story = await getPublishedLawyerNewsBySlug(supabase, slug);
  if (!story) return {};

  const description = story.intro ?? `Interview with ${story.lawyerName}`;
  const canonicalUrl = `${SITE_URL}/lawyer-in-the-news/${story.slug}`;
  const ogImage = story.coverImageUrl || `${SITE_URL}/images/og-default.jpg`;

  return {
    title: `${story.lawyerName} — Lawyer in the News`,
    description,
    alternates: { canonical: `/lawyer-in-the-news/${story.slug}` },
    openGraph: {
      type: "article",
      title: `${story.lawyerName} — Lawyer in the News`,
      description,
      url: canonicalUrl,
      siteName: "Law Digest",
      images: [{ url: ogImage, width: 1200, height: 630, alt: story.lawyerName }],
    },
  };
}

export default async function LawyerNewsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createSupabaseServerClient();
  const story = await getPublishedLawyerNewsBySlug(supabase, slug);

  if (!story) notFound();

  return (
    <article className="mx-auto max-w-3xl px-6 py-12 md:py-16">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1.5 font-utility text-[10px] uppercase tracking-[0.12em] text-stone">
          <li>
            <Link href="/" className="transition-colors hover:text-digest-red">
              Home
            </Link>
          </li>
          <li className="text-hairline">&gt;</li>
          <li className="text-ink line-clamp-1">Lawyer in the News</li>
        </ol>
      </nav>

      <Reveal>
        <p className="font-utility text-[11px] uppercase tracking-[0.2em] text-digest-red">
          § Cover Story · Lawyer in the News
        </p>
        <h1 className="mt-3 font-display text-3xl italic leading-tight text-ink md:text-5xl">
          {story.lawyerName}
        </h1>
        {story.lawyerTitle ? (
          <p className="mt-3 font-utility text-xs font-semibold uppercase tracking-[0.15em] text-stone">
            {story.lawyerTitle}
          </p>
        ) : null}
      </Reveal>

      {/* Cover image — full visibility, never cropped */}
      {story.coverImageUrl ? (
        <Reveal delay={0.05}>
          <figure className="mt-8 border border-hairline bg-hairline/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={story.coverImageUrl}
              alt={story.coverImageAlt ?? story.lawyerName}
              className="h-auto w-full object-contain"
            />
            {story.coverImageAlt ? (
              <figcaption className="border-t border-hairline px-4 py-2 font-utility text-[10px] uppercase tracking-wide text-stone">
                {story.coverImageAlt}
              </figcaption>
            ) : null}
          </figure>
        </Reveal>
      ) : null}

      {story.intro ? (
        <Reveal delay={0.08}>
          <p className="mt-8 border-l-2 border-digest-red pl-4 font-body text-lg leading-relaxed text-stone">
            {story.intro}
          </p>
        </Reveal>
      ) : null}

      {/* All Q&As with editorial image distribution */}
      <Reveal delay={0.1}>
        <div className="mt-10">
          <EditorialBody
            blocks={story.qaPairs.map((pair, i) => qaToBlock(pair, i))}
            images={story.inlineImages.map((img) => ({
              url: img.url,
              alt: img.alt,
              position: img.position,
            }))}
            title={story.lawyerName}
            renderBlock={qaRenderBlock}
          />
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <div className="mt-12 border-t border-hairline pt-8">
          <Link
            href="/"
            className="border-b border-digest-red pb-1 font-utility text-[11px] font-semibold uppercase tracking-wide text-digest-red transition-opacity hover:opacity-70"
          >
            ← Back to the homepage
          </Link>
        </div>
      </Reveal>
    </article>
  );
}
