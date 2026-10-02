import type { Metadata } from "next";
import Link from "next/link";
import { listArticlesForAdmin } from "@/lib/supabase/admin/articles";
import { DeleteArticleButton } from "@/app/admin/(protected)/articles/delete-button";
import { StatusToggleButton } from "@/app/admin/(protected)/articles/status-toggle-button";
import { AdminBackButton } from "@/app/admin/(protected)/admin-back-button";
import {
  ARTICLE_PAGE_OPTIONS,
  pageLabels,
  pagesForRow,
} from "@/lib/page-visibility";
import type { ArticleRow } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Articles — Admin",
  robots: { index: false, follow: false },
};

// Where this article is listed — mirrors the form and the public queries,
// including the pre-migration fallback (placement flags imply homepage).
function visiblePages(article: ArticleRow): string[] {
  const stored = pagesForRow(article.show_on_pages, ARTICLE_PAGE_OPTIONS);
  if (stored) return stored;
  const onHomepage =
    article.featured ||
    article.on_cover ||
    article.is_editorial_insight ||
    article.is_cover_story;
  return onHomepage ? ["homepage", "articles", "issues"] : ["articles", "issues"];
}

export default async function AdminArticlesPage() {
  const articles = await listArticlesForAdmin();

  return (
    <div>
      <AdminBackButton />
      <div className="mt-4 flex items-center justify-between">
        <h1 className="font-admin text-2xl font-semibold text-ink">Articles</h1>
        <Link
          href="/admin/articles/new"
          className="bg-digest-red px-4 py-2 font-admin text-sm font-semibold uppercase tracking-wide text-paper"
        >
          New
        </Link>
      </div>

      {articles.length === 0 ? (
        <p className="mt-6 font-admin text-sm text-[#333]">No articles yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-hairline border-y border-hairline">
          {articles.map((article) => (
            <li key={article.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-admin text-sm text-ink">{article.title}</p>
                <p className="font-admin text-[11px] font-semibold uppercase tracking-wide text-ink">
                  /{article.slug} ·{" "}
                  <span
                    className={article.status === "published" ? "text-digest-red" : undefined}
                  >
                    {article.status}
                  </span>
                  {article.is_cover_story ? " · Cover Story" : ""}
                  {article.featured ? " · Featured" : ""}
                  {article.page_number ? ` · p. ${article.page_number}` : ""}
                </p>
                <p className="font-admin text-[11px] tracking-wide text-stone">
                  Shows on: {pageLabels(visiblePages(article))}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <StatusToggleButton id={article.id} status={article.status} />
                <Link
                  href={`/admin/articles/${article.id}/edit`}
                  className="font-admin text-xs font-semibold uppercase tracking-wide text-digest-red hover:text-digest-red-deep"
                >
                  Edit
                </Link>
                <DeleteArticleButton id={article.id} slug={article.slug} title={article.title} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
