import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getCurrentIssue } from "@/lib/supabase/queries/issues";
import { getArticles } from "@/lib/supabase/queries/articles";
import { PageNumberBadge } from "@/components/ui/page-number-badge";
import { Byline } from "@/components/ui/byline";
import { Reveal } from "@/components/motion/reveal";

export async function generateStaticParams() {
  try {
    const supabase = createSupabaseServerClient();
    const issueMeta = await getCurrentIssue(supabase);
    return issueMeta ? [{ slug: `issue-${issueMeta.issueNumber}` }] : [];
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
  const issueMeta = await getCurrentIssue(supabase);
  if (!issueMeta || slug !== `issue-${issueMeta.issueNumber}`) return {};
  return {
    title: `Issue ${issueMeta.issueNumber} — Law Digest`,
    description: `Law Digest Issue ${issueMeta.issueNumber}, ${issueMeta.season} ${issueMeta.year}, ${issueMeta.edition}.`,
  };
}

export default async function IssuePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createSupabaseServerClient();
  const [issueMeta, articles] = await Promise.all([
    getCurrentIssue(supabase),
    getArticles(supabase),
  ]);

  if (!issueMeta || slug !== `issue-${issueMeta.issueNumber}`) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <Reveal>
        <div className="grid gap-8 md:grid-cols-[240px_1fr] md:items-start">
          <div className="relative aspect-[3/4] w-full max-w-[240px] overflow-hidden">
            {issueMeta.coverImageSrc ? (
              <Image
                src={issueMeta.coverImageSrc}
                alt={issueMeta.coverImageAlt}
                fill
                sizes="240px"
                className="object-contain transition-transform duration-700 hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-hairline/60 p-4">
                <span className="font-utility text-[10px] uppercase tracking-wide text-stone">
                  Cover pending
                </span>
              </div>
            )}
          </div>
          <div>
            <p className="font-utility text-xs uppercase tracking-wide text-digest-red">
              Issue {issueMeta.issueNumber}
            </p>
            <h1 className="mt-2 font-display text-3xl italic text-ink">
              {issueMeta.season} {issueMeta.year}
            </h1>
            <p className="mt-1 font-body text-sm text-stone">{issueMeta.edition}</p>

            <h2 className="mt-8 font-utility text-xs uppercase tracking-wide text-stone">
              In this issue
            </h2>
            <ul className="mt-3 divide-y divide-hairline border-y border-hairline">
              {articles.map((article) => (
                <li
                  key={article.slug}
                  className="flex items-center gap-4 py-3 transition-colors hover:bg-hairline/20"
                >
                  <PageNumberBadge page={article.page} />
                  <div>
                    <p className="font-display text-base italic text-ink">
                      {article.title}
                    </p>
                    <Byline author={article.author} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
