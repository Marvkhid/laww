import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import {
  getArticleBySlug,
  getAdjacentArticles,
  getRelatedArticles,
} from "@/lib/supabase/queries/articles";
import { getCurrentIssue } from "@/lib/supabase/queries/issues";
import { Byline } from "@/components/ui/byline";
import { ArticleCoverImage } from "@/components/ui/article-cover-image";
import { ContributorAvatar } from "@/components/ui/contributor-avatar";
import { Reveal } from "@/components/motion/reveal";
import { SocialShareIcons } from "@/components/ui/social-share-icons";
import { SITE_URL } from "@/lib/constants";
import { EditorialBody } from "@/components/editorial/editorial-body";
import type { ArticleImage } from "@/lib/types";

// Rough word count from Tiptap JSON body
function estimateReadingTime(body: unknown): number | null {
  if (!body || typeof body !== "object") return null;
  const doc = body as { content?: unknown[] };
  if (!Array.isArray(doc.content)) return null;

  let words = 0;
  function walk(nodes: unknown[]): void {
    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      const n = node as { type?: string; text?: string; content?: unknown[] };
      if (n.type === "text" && typeof n.text === "string") {
        words += n.text.split(/\s+/).filter(Boolean).length;
      }
      if (Array.isArray(n.content)) walk(n.content);
    }
  }
  walk(doc.content);

  if (words === 0) return null;
  return Math.max(1, Math.ceil(words / 230)); // ~230 wpm
}

// Real slugs are fetched from Supabase for static pre-rendering where
// possible. If that fetch can't complete (e.g. no network reachability to
// the database at build time), this falls back to an empty list rather than
// failing the build — Next.js still serves every real slug correctly, just
// rendered per-request (dynamicParams defaults to true) instead of
// pre-built.
export async function generateStaticParams() {
  try {
    const supabase = createSupabaseServerClient();
    const { getArticles } = await import("@/lib/supabase/queries/articles");
    const articles = await getArticles(supabase);
    // Skip slugs that are invalid as build output paths (e.g. contain "\"
    // or ":" which Windows cannot use in directory names). Those pages are
    // still served dynamically — one bad DB row must not break the build.
    return articles
      .filter((article) => /^[a-z0-9-]+$/i.test(decodeURIComponent(article.slug)))
      .map((article) => ({ slug: article.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createSupabaseServerClient();
  const article = await getArticleBySlug(supabase, slug);
  if (!article) return {};

  const canonicalUrl = `${SITE_URL}/articles/${article.slug}`;
  const description = article.dek
    ? article.dek
    : `By ${article.author.name}, Law Digest, p. ${article.page}.`;
  const ogImage = article.coverImageUrl || `${SITE_URL}/images/og-default.jpg`;

  return {
    title: article.title,
    description,
    alternates: {
      canonical: `/articles/${article.slug}`,
    },
    openGraph: {
      type: "article",
      title: article.title,
      description,
      url: canonicalUrl,
      siteName: "Law Digest",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: article.imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createSupabaseServerClient();
  const [article, issueMeta] = await Promise.all([
    getArticleBySlug(supabase, slug),
    getCurrentIssue(supabase),
  ]);

  if (!article) {
    notFound();
  }

  const readingTime = estimateReadingTime(article.body);
  const articleUrl = `${SITE_URL}/articles/${article.slug}`;

  // Fetch adjacent and related articles in parallel
  const [adjacent, related] = await Promise.all([
    article.page > 0 ? getAdjacentArticles(supabase, article.page) : Promise.resolve({ prev: null, next: null }),
    article.id && article.practiceAreaId
      ? getRelatedArticles(supabase, article.id, article.practiceAreaId)
      : Promise.resolve([]),
  ]);

  return (
    <article className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1.5 font-utility text-[10px] uppercase tracking-[0.12em] text-stone">
          <li><Link href="/" className="transition-colors hover:text-digest-red">Home</Link></li>
          <li className="text-hairline">&gt;</li>
          {article.practiceArea ? (
            <>
              <li><Link href="/articles" className="transition-colors hover:text-digest-red">Legal Insights</Link></li>
              <li className="text-hairline">&gt;</li>
              <li className="text-ink">{article.practiceArea}</li>
            </>
          ) : (
            <li className="text-ink">Article</li>
          )}
        </ol>
      </nav>

      {/* Two-column layout: main article + sidebar */}
      <div className="grid gap-12 lg:grid-cols-[1fr_300px]">
        {/* Main article column */}
        <div>
          <Reveal>
            {article.practiceArea ? (
              <p className="font-utility text-[10px] uppercase tracking-[0.2em] text-digest-red">
                {article.practiceArea}
              </p>
            ) : null}

            <h1 className="mt-3 font-display text-3xl italic leading-tight text-ink md:text-4xl lg:text-[2.5rem]">
              {article.title}
            </h1>

            {article.dek ? (
              <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-stone">
                {article.dek}
              </p>
            ) : null}

            {/* Social share icons */}
            <div className="mt-5">
              <SocialShareIcons title={article.title} url={articleUrl} />
            </div>

            {/* Author metadata row */}
            <div className="mt-5 flex flex-wrap items-center gap-3 border-b border-hairline pb-6">
              <Byline author={article.author} showPhoto page={article.page} />
              {readingTime ? (
                <span className="font-utility text-[10px] uppercase tracking-wide text-stone">
                  · {readingTime} min read
                </span>
              ) : null}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            {/* Cover image */}
            <div className="mt-8">
              <ArticleCoverImage src={article.coverImageUrl} alt={article.imageAlt} aspect="aspect-[16/9]" />
            </div>

            {/* Article body */}
            <div className="mt-10">
              {article.body ? (
                <EditorialBody
                  blocks={article.body?.content ?? []}
                  images={(article.images ?? []).map((img: ArticleImage) => ({
                    url: img.url,
                    alt: img.alt,
                    position: img.position,
                  }))}
                  title={article.title}
                />
              ) : (
                <div className="border border-hairline bg-paper-warm p-6">
                  <p className="font-utility text-[10px] uppercase tracking-[0.15em] text-digest-red">
                    Note
                  </p>
                  <p className="mt-2 font-body text-sm leading-relaxed text-stone">
                    The full article body has not yet been added to the digital edition.
                    The title, byline, and page reference{issueMeta ? ` from Issue ${issueMeta.issueNumber}` : ""} are confirmed.
                  </p>
                </div>
              )}
            </div>
          </Reveal>

          {/* Bottom share */}
          <Reveal delay={0.15}>
            <div className="mt-12 border-t border-hairline pt-8">
              <p className="font-utility text-[11px] uppercase tracking-[0.2em] text-stone mb-3">
                Share this article
              </p>
              <SocialShareIcons title={article.title} url={articleUrl} />
            </div>
          </Reveal>

          {/* Previous / Next */}
          {(adjacent.prev || adjacent.next) ? (
            <Reveal delay={0.18}>
              <nav
                className="mt-12 grid gap-6 border-t border-hairline pt-8 sm:grid-cols-2"
                aria-label="Article navigation"
              >
                {adjacent.prev ? (
                  <Link
                    href={`/articles/${adjacent.prev.slug}`}
                    className="group border-l-2 border-hairline pl-4 transition-colors duration-300 hover:border-digest-red"
                  >
                    <span className="font-utility text-[10px] uppercase tracking-wide text-stone">
                      ← Previous
                    </span>
                    <p className="mt-1 font-display text-base italic text-ink transition-colors duration-300 group-hover:text-digest-red">
                      {adjacent.prev.title}
                    </p>
                  </Link>
                ) : (
                  <div />
                )}
                {adjacent.next ? (
                  <Link
                    href={`/articles/${adjacent.next.slug}`}
                    className="group border-r-2 border-hairline text-right transition-colors duration-300 hover:border-digest-red sm:border-l-2 sm:border-r-0 sm:pl-4 sm:text-left"
                  >
                    <span className="font-utility text-[10px] uppercase tracking-wide text-stone">
                      Next →
                    </span>
                    <p className="mt-1 font-display text-base italic text-ink transition-colors duration-300 group-hover:text-digest-red">
                      {adjacent.next.title}
                    </p>
                  </Link>
                ) : null}
              </nav>
            </Reveal>
          ) : null}
        </div>

        {/* Right sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-36 space-y-8">
            {/* About the Author */}
            <Reveal delay={0.12}>
              <div className="border border-hairline p-5">
                <p className="font-utility text-[10px] uppercase tracking-[0.2em] text-digest-red">
                  About the Author
                </p>
                <div className="mt-4 flex items-start gap-3">
                  <ContributorAvatar
                    name={article.author.name}
                    photoUrl={article.author.photoUrl}
                    size="md"
                  />
                  <div>
                    <p className="font-admin text-sm font-medium text-ink">
                      {article.author.name}
                    </p>
                    {article.author.credentials ? (
                      <p className="mt-0.5 font-body text-xs text-stone">
                        {article.author.credentials}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Related Articles */}
            {related.length > 0 ? (
              <Reveal delay={0.16}>
                <div>
                  <p className="font-utility text-[10px] uppercase tracking-[0.2em] text-digest-red">
                    Related Articles
                  </p>
                  <div className="mt-4 space-y-4">
                    {related.map((rel) => (
                      <Link
                        key={rel.slug}
                        href={`/articles/${rel.slug}`}
                        className="group flex gap-3"
                      >
                        {rel.coverImageUrl ? (
                          <div className="h-16 w-20 shrink-0 overflow-hidden bg-hairline/30">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={rel.coverImageUrl}
                              alt={rel.imageAlt}
                              className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                            />
                          </div>
                        ) : null}
                        <div className="min-w-0">
                          <p className="font-display text-sm italic text-ink line-clamp-2 transition-colors duration-300 group-hover:text-digest-red">
                            {rel.title}
                          </p>
                          <p className="mt-1 font-utility text-[10px] uppercase tracking-wide text-stone">
                            {rel.author.name}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </Reveal>
            ) : null}

            {/* Practice Area */}
            {article.practiceArea ? (
              <Reveal delay={0.2}>
                <div className="border-t border-hairline pt-6">
                  <p className="font-utility text-[10px] uppercase tracking-[0.2em] text-digest-red">
                    Practice Area
                  </p>
                  <p className="mt-2 font-display text-base italic text-ink">
                    {article.practiceArea}
                  </p>
                  {article.practiceAreaId ? (
                    <Link
                      href={`/practice-areas/${article.practiceAreaId}`}
                      className="mt-2 inline-block font-utility text-[10px] uppercase tracking-wide text-digest-red transition-opacity hover:opacity-70"
                    >
                      View all articles →
                    </Link>
                  ) : null}
                </div>
              </Reveal>
            ) : null}
          </div>
        </aside>
      </div>
    </article>
  );
}
