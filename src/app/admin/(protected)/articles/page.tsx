import type { Metadata } from "next";
import Link from "next/link";
import { listArticlesForAdmin } from "@/lib/supabase/admin/articles";
import { DeleteArticleButton } from "@/app/admin/(protected)/articles/delete-button";
import { StatusToggleButton } from "@/app/admin/(protected)/articles/status-toggle-button";

export const metadata: Metadata = {
  title: "Articles — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminArticlesPage() {
  const articles = await listArticlesForAdmin();

  return (
    <div>
      <div className="flex items-center justify-between">
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
                  {article.page_number ? ` · p. ${article.page_number}` : ""}
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
