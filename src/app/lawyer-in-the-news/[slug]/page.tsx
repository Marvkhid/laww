import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import {
  getPublishedLawyerNewsBySlug,
  type LawyerInlineImage,
} from "@/lib/supabase/queries/lawyer-news";
import { Reveal } from "@/components/motion/reveal";
import { SITE_URL } from "@/lib/constants";

/** Inline figure with the shared editorial float classes (never crops). */
function InlineLawyerImage({
  image,
  index,
  title,
}: {
  image: LawyerInlineImage;
  index: number;
  title: string;
}) {
  if (!image.url) return null;
  const alt = image.alt ?? `${title} — Image ${index + 1}`;
  const position = image.position ?? "";
  const isRight = position.includes("right");
  const isLeft = position.includes("left");

  return (
    <figure
      className={`article-inline-figure ${
        isRight ? "article-inline-right" : isLeft ? "article-inline-left" : "article-inline-center"
      }`}
    >
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="h-auto w-full object-contain"
        />
      </div>
      {image.alt ? (
        <figcaption className="mt-2 font-utility text-[10px] uppercase tracking-wide text-stone">
          {image.alt}
        </figcaption>
      ) : null}
    </figure>
  );
}

/** Distributes floating images evenly across the Q&A list. */
function QAWithImages({
  qaPairs,
  images,
  title,
}: {
  qaPairs: { question: string; answer: string }[];
  images: LawyerInlineImage[];
  title: string;
}) {
  const floatable = images.filter((img) => {
    if (!img.url) return false;
    const pos = (img.position ?? "").toLowerCase();
    return pos.includes("right") || pos.includes("left");
  });
  const centerImages = images.filter((img) => {
    if (!img.url) return false;
    const pos = (img.position ?? "").toLowerCase();
    return !pos.includes("right") && !pos.includes("left");
  });

  if (floatable.length === 0 && centerImages.length === 0) {
    return (
      <div className="flex flex-col gap-10">
        {qaPairs.map((pair, i) => (
          <QABlock key={i} pair={pair} index={i} />
        ))}
      </div>
    );
  }

  const segments: (typeof qaPairs)[] = [];
  const imagesPerSegment: (LawyerInlineImage | null)[] = [];
  const pairsPerSegment = Math.max(1, Math.ceil(qaPairs.length / (floatable.length + 1)));
  let pairIndex = 0;

  for (let imgIdx = 0; imgIdx < floatable.length; imgIdx++) {
    const end = Math.min(pairIndex + pairsPerSegment, qaPairs.length);
    segments.push(qaPairs.slice(pairIndex, end));
    imagesPerSegment.push(floatable[imgIdx]);
    pairIndex = end;
  }
  segments.push(qaPairs.slice(pairIndex));
  imagesPerSegment.push(null);

  let globalImgIdx = 0;

  return (
    <>
      {segments.map((segment, segIdx) => (
        <div key={segIdx} className="article-editorial-segment">
          <div className="flex flex-col gap-10">
            {segment.map((pair, i) => (
              <QABlock key={i} pair={pair} index={i} />
            ))}
          </div>
          {imagesPerSegment[segIdx] ? (
            <InlineLawyerImage
              image={imagesPerSegment[segIdx]!}
              index={globalImgIdx++}
              title={title}
            />
          ) : null}
        </div>
      ))}
      {centerImages.map((img, i) => (
        <InlineLawyerImage key={`c${i}`} image={img} index={i} title={title} />
      ))}
    </>
  );
}

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
        <div className="article-editorial-body mt-10">
          <QAWithImages
            qaPairs={story.qaPairs}
            images={story.inlineImages}
            title={story.lawyerName}
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
