import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getPublishedLegalUpdateBySlug, type LegalUpdateDetail } from "@/lib/supabase/queries/legal-updates";
import { RichText, RichTextBlock } from "@/components/ui/rich-text";
import { ArticleCoverImage } from "@/components/ui/article-cover-image";
import { Reveal } from "@/components/motion/reveal";
import { SITE_URL } from "@/lib/constants";
import type { JSONContent } from "@tiptap/core";

type ImageItem = { url: string | null; alt: string | null; position: string | null };

function InlineLegalImage({
  image,
  index,
  articleTitle,
}: {
  image: ImageItem;
  index: number;
  articleTitle: string;
}) {
  if (!image.url) return null;
  const alt = image.alt ?? `${articleTitle} — Image ${index + 1}`;
  const position = image.position ?? "";
  const isRight = position.includes("right");
  const isLeft = position.includes("left");

  return (
    <figure
      className={`article-inline-figure ${
        isRight ? "article-inline-right" : isLeft ? "article-inline-left" : "article-inline-center"
      }`}
    >
      <div className="overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="h-auto w-full object-cover"
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

function LegalUpdateBodyWithImages({
  body,
  images,
  articleTitle,
}: {
  body: JSONContent;
  images: ImageItem[];
  articleTitle: string;
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

  const blocks = body.content ?? [];

  if (floatable.length === 0 && centerImages.length === 0) {
    return (
      <div className="article-editorial-body">
        <RichText content={body} />
      </div>
    );
  }

  const totalFloatable = floatable.length;
  const segments: JSONContent[][] = [];
  const imagesPerSegment: (ImageItem | null)[] = [];
  const blocksPerSegment = Math.max(1, Math.ceil(blocks.length / (totalFloatable + 1)));
  let blockIndex = 0;

  for (let imgIdx = 0; imgIdx < totalFloatable; imgIdx++) {
    const end = Math.min(blockIndex + blocksPerSegment, blocks.length);
    segments.push(blocks.slice(blockIndex, end));
    imagesPerSegment.push(floatable[imgIdx]);
    blockIndex = end;
  }
  segments.push(blocks.slice(blockIndex));
  imagesPerSegment.push(null);

  let globalImgIdx = 0;

  return (
    <div className="article-editorial-body">
      {segments.map((segment, segIdx) => (
        <div key={segIdx} className="article-editorial-segment">
          {segment.map((block, blockIdx) => (
            <RichTextBlock key={`${segIdx}-${blockIdx}`} node={block} />
          ))}
          {imagesPerSegment[segIdx] ? (
            <InlineLegalImage
              image={imagesPerSegment[segIdx]!}
              index={globalImgIdx++}
              articleTitle={articleTitle}
            />
          ) : null}
        </div>
      ))}
      {centerImages.map((img, i) => (
        <figure key={`c${i}`} className="article-inline-figure article-inline-center">
          <div className="overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url!}
              alt={img.alt ?? `${articleTitle} — Image ${i + 4}`}
              loading="lazy"
              decoding="async"
              className="h-auto w-full object-cover"
            />
          </div>
          {img.alt ? (
            <figcaption className="mt-2 font-utility text-[10px] uppercase tracking-wide text-stone">
              {img.alt}
            </figcaption>
          ) : null}
        </figure>
      ))}
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
  const update = await getPublishedLegalUpdateBySlug(supabase, slug);
  if (!update) return {};

  const description = update.summary ?? `Legal update: ${update.headline}`;
  const canonicalUrl = `${SITE_URL}/legal-updates/${update.slug}`;
  const ogImage = update.coverImageUrl || `${SITE_URL}/images/og-default.jpg`;

  return {
    title: update.headline,
    description,
    alternates: { canonical: `/legal-updates/${update.slug}` },
    openGraph: {
      type: "article",
      title: update.headline,
      description,
      url: canonicalUrl,
      siteName: "Law Digest",
      images: [{ url: ogImage, width: 1200, height: 630, alt: update.headline }],
    },
    twitter: {
      card: "summary_large_image",
      title: update.headline,
      description,
      images: [ogImage],
    },
  };
}

export default async function LegalUpdateArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createSupabaseServerClient();
  const update = await getPublishedLegalUpdateBySlug(supabase, slug);

  if (!update) {
    notFound();
  }

  const hasImages = update.images.some((img) => img.url);

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
          <li>
            <Link href="/legal-updates" className="transition-colors hover:text-digest-red">
              Legal Updates
            </Link>
          </li>
          <li className="text-hairline">&gt;</li>
          <li className="text-ink line-clamp-1">{update.headline}</li>
        </ol>
      </nav>

      <Reveal>
        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3">
          {update.practiceArea ? (
            <span className="font-utility text-[11px] uppercase tracking-[0.2em] text-purple">
              § {update.practiceArea}
            </span>
          ) : null}
          <span className="font-utility text-[11px] text-stone">
            · {update.sourceName}
          </span>
          <span className="font-utility text-[11px] uppercase tracking-wide text-stone">
            ·{" "}
            {new Date(update.publishedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>

        {/* Headline */}
        <h1 className="mt-4 font-display text-3xl italic leading-tight text-ink md:text-4xl">
          {update.headline}
        </h1>

        {/* Summary */}
        {update.summary ? (
          <p className="mt-4 max-w-2xl font-body text-lg leading-relaxed text-stone">
            {update.summary}
          </p>
        ) : null}
      </Reveal>

      {/* Cover Image */}
      <Reveal delay={0.05}>
        <div className="mt-8">
          <ArticleCoverImage src={update.coverImageUrl} alt={update.headline} aspect="aspect-[16/9]" />
        </div>
      </Reveal>

      {/* Divider */}
      <div className="mt-8 mb-8 border-t border-hairline" />

      {/* Full article body with inline images */}
      <Reveal delay={0.1}>
        {update.body ? (
          hasImages ? (
            <LegalUpdateBodyWithImages
              body={update.body}
              images={update.images}
              articleTitle={update.headline}
            />
          ) : (
            <RichText content={update.body} />
          )
        ) : (
          <div className="border border-hairline bg-paper-warm p-6">
            <p className="font-utility text-[10px] uppercase tracking-[0.15em] text-digest-red">
              Note
            </p>
            <p className="mt-2 font-body text-sm leading-relaxed text-stone">
              The full article content has not yet been added. Check back soon.
            </p>
          </div>
        )}
      </Reveal>

      {/* Back link */}
      <Reveal delay={0.15}>
        <div className="mt-12 border-t border-hairline pt-8">
          <Link
            href="/legal-updates"
            className="border-b border-digest-red pb-1 font-utility text-[11px] uppercase tracking-wide text-digest-red transition-opacity hover:opacity-70"
          >
            ← Back to all legal updates
          </Link>
        </div>
      </Reveal>
    </article>
  );
}
