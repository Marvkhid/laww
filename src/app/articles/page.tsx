import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getArticles } from "@/lib/supabase/queries/articles";
import { getCurrentIssue } from "@/lib/supabase/queries/issues";
import { PageNumberBadge } from "@/components/ui/page-number-badge";
import { Byline } from "@/components/ui/byline";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { OpenBook } from "@/components/ui/editorial-illustration";

export const metadata: Metadata = {
  title: "Articles — Law Digest",
  description: "All articles from the current issue of Law Digest.",
};

export default async function ArticlesPage() {
  const supabase = createSupabaseServerClient();
  const [articles, issueMeta] = await Promise.all([
    getArticles(supabase),
    getCurrentIssue(supabase),
  ]);

  const issueLabel = issueMeta ? `Issue ${issueMeta.issueNumber}` : "Articles";

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <Reveal>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading eyebrow="Articles" title={`${issueLabel} — all articles`} />
          <OpenBook className="h-16 w-16 shrink-0 opacity-20" />
        </div>
        <ul className="divide-y divide-hairline border-y border-hairline">
          {articles.map((article) => (
            <li
              key={article.slug}
              className="flex items-center gap-4 py-4 transition-colors hover:bg-hairline/20"
            >
              <PageNumberBadge page={article.page} />
              <div>
                <Link
                  href={`/articles/${article.slug}`}
                  className="font-display text-lg italic text-digest-red hover:text-digest-red-deep"
                >
                  {article.title}
                </Link>
                <Byline author={article.author} />
              </div>
            </li>
          ))}
        </ul>
      </Reveal>
    </div>
  );
}
