import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getArticleByIdForAdmin,
  getArticleContributorLinksForAdmin,
} from "@/lib/supabase/admin/articles";
import { updateArticleAction } from "@/app/admin/(protected)/articles/actions";
import { ArticleForm } from "@/app/admin/(protected)/articles/article-form";
import { listIssuesForAdmin } from "@/lib/supabase/admin/issues";
import { listPracticeAreasForAdmin } from "@/lib/supabase/admin/practice-areas";
import { listContributorsForAdmin } from "@/lib/supabase/admin/contributors";

export const metadata: Metadata = {
  title: "Edit Article — Admin",
  robots: { index: false, follow: false },
};

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [article, links, issues, practiceAreas, contributors] = await Promise.all([
    getArticleByIdForAdmin(id),
    getArticleContributorLinksForAdmin(id),
    listIssuesForAdmin(),
    listPracticeAreasForAdmin(),
    listContributorsForAdmin(),
  ]);

  if (!article) {
    notFound();
  }

  const initialContributorSelections = new Map(
    links.map((link) => [link.contributor_id, link.author_order])
  );
  const boundAction = updateArticleAction.bind(null, id);

  return (
    <div>
      <h1 className="font-admin text-2xl font-semibold text-ink">Edit Article</h1>
      <div className="mt-6">
        <ArticleForm
          action={boundAction}
          initial={article}
          initialContributorSelections={initialContributorSelections}
          issues={issues}
          practiceAreas={practiceAreas}
          contributors={contributors}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}
