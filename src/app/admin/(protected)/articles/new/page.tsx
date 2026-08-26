import type { Metadata } from "next";
import { ArticleForm } from "@/app/admin/(protected)/articles/article-form";
import { createArticleAction } from "@/app/admin/(protected)/articles/actions";
import { listIssuesForAdmin } from "@/lib/supabase/admin/issues";
import { listPracticeAreasForAdmin } from "@/lib/supabase/admin/practice-areas";
import { listContributorsForAdmin } from "@/lib/supabase/admin/contributors";

export const metadata: Metadata = {
  title: "New Article — Admin",
  robots: { index: false, follow: false },
};

export default async function NewArticlePage() {
  const [issues, practiceAreas, contributors] = await Promise.all([
    listIssuesForAdmin(),
    listPracticeAreasForAdmin(),
    listContributorsForAdmin(),
  ]);

  return (
    <div>
      <h1 className="font-admin text-2xl font-semibold text-ink">New Article</h1>
      <div className="mt-6">
        <ArticleForm
          action={createArticleAction}
          issues={issues}
          practiceAreas={practiceAreas}
          contributors={contributors}
          submitLabel="Create"
        />
      </div>
    </div>
  );
}
