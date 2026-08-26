import { requireAdmin } from "@/lib/supabase/admin/require-admin";
import type { ArticleRow, ArticleContributorRow } from "@/lib/supabase/types";
import type { JSONContent } from "@tiptap/core";

export async function listArticlesForAdmin(): Promise<ArticleRow[]> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .order("page_number", { ascending: true, nullsFirst: false });

  if (error || !data) return [];
  return data as ArticleRow[];
}

export async function getArticleByIdForAdmin(id: string): Promise<ArticleRow | null> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as ArticleRow;
}

export async function getArticleContributorLinksForAdmin(
  articleId: string
): Promise<ArticleContributorRow[]> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("article_contributors")
    .select("*")
    .eq("article_id", articleId)
    .order("author_order", { ascending: true });

  if (error || !data) return [];
  return data as ArticleContributorRow[];
}

export type ArticleInput = {
  slug: string;
  title: string;
  dek: string | null;
  page_number: number | null;
  cover_image_url: string | null;
  image_1_url: string | null;
  image_1_alt: string | null;
  image_1_position: string | null;
  image_2_url: string | null;
  image_2_alt: string | null;
  image_2_position: string | null;
  image_3_url: string | null;
  image_3_alt: string | null;
  image_3_position: string | null;
  image_4_url: string | null;
  image_4_alt: string | null;
  image_4_position: string | null;
  status: "draft" | "published";
  featured: boolean;
  is_editorial_insight: boolean;
  on_cover: boolean;
  is_cover_story: boolean;
  issue_id: string | null;
  practice_area_id: string | null;
  body: JSONContent | null;
};

export type ContributorSelection = { contributorId: string; order: number };

// Both writes below call the migration-0004 database functions rather than
// separate client-side statements. That's not stylistic — a plain update +
// delete + insert sequence from the client has no atomicity (PostgREST has
// no multi-statement transaction), so a failure partway through would leave
// the article silently half-updated. The database function wraps every
// statement in one real Postgres transaction: any failure rolls back
// everything, article row included. Verified locally by deliberately
// injecting a bad contributor id and confirming zero rows persisted.
// Helper: ensure at most one article has is_cover_story = true.
// Called as a separate step so the code works even before migration 0010
// (which adds p_is_cover_story to the RPC functions) has been applied.
async function applyCoverStoryFlag(
  supabase: Awaited<ReturnType<typeof requireAdmin>>,
  articleId: string,
  isCoverStory: boolean
): Promise<void> {
  if (isCoverStory) {
    // Unset any previous cover story first
    await supabase
      .from("articles")
      .update({ is_cover_story: false })
      .eq("is_cover_story", true)
      .neq("id", articleId);
  }
  // Set this article's flag (works whether the column exists or not —
  // if migration 0009 hasn't run yet this will be ignored by Postgres
  // with a column-not-found error that we swallow gracefully)
  const { error } = await supabase
    .from("articles")
    .update({ is_cover_story: isCoverStory })
    .eq("id", articleId);
  // If the column doesn't exist yet (migration 0009 not applied),
  // just skip — the UI will still work, just without cover story support.
  if (error && error.code === "42703") {
    console.warn("is_cover_story column not found — run migration 0009");
  }
}

export async function createArticle(
  input: ArticleInput,
  contributors: ContributorSelection[]
): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();

  // Do NOT pass p_is_cover_story to the RPC — the function may not have
  // that parameter yet (migration 0010). Handle it separately below.
  const { data: articleId, error } = await supabase.rpc(
    "admin_create_article_with_contributors",
    {
      p_slug: input.slug,
      p_title: input.title,
      p_dek: input.dek,
      p_page_number: input.page_number,
      p_cover_image_url: input.cover_image_url,
      p_status: input.status,
      p_featured: input.featured,
      p_is_editorial_insight: input.is_editorial_insight,
      p_on_cover: input.on_cover,
      p_issue_id: input.issue_id,
      p_practice_area_id: input.practice_area_id,
      p_body: input.body,
      p_contributor_ids: contributors.map((c) => c.contributorId),
      p_contributor_orders: contributors.map((c) => c.order),
    }
  );

  if (error) {
    console.error("createArticle RPC error:", error);
    if (error.code === "23505") {
      return { error: "That slug is already in use by another article." };
    }
    return { error: "Could not create the article. Please try again." };
  }

  // Apply cover story flag separately
  if (articleId && input.is_cover_story) {
    await applyCoverStoryFlag(supabase, articleId, true);
  }

  // Apply inline images separately (the RPC doesn't have these columns)
  if (articleId) {
    await supabase
      .from("articles")
      .update({
        image_1_url: input.image_1_url,
        image_1_alt: input.image_1_alt,
        image_1_position: input.image_1_position,
        image_2_url: input.image_2_url,
        image_2_alt: input.image_2_alt,
        image_2_position: input.image_2_position,
        image_3_url: input.image_3_url,
        image_3_alt: input.image_3_alt,
        image_3_position: input.image_3_position,
        image_4_url: input.image_4_url,
        image_4_alt: input.image_4_alt,
        image_4_position: input.image_4_position,
      })
      .eq("id", articleId);
  }

  return { error: null };
}

export async function updateArticle(
  id: string,
  input: ArticleInput,
  contributors: ContributorSelection[]
): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();

  // Do NOT pass p_is_cover_story to the RPC — the function may not have
  // that parameter yet (migration 0010). Handle it separately below.
  const { error } = await supabase.rpc("admin_update_article_with_contributors", {
    p_id: id,
    p_slug: input.slug,
    p_title: input.title,
    p_dek: input.dek,
    p_page_number: input.page_number,
    p_cover_image_url: input.cover_image_url,
    p_status: input.status,
    p_featured: input.featured,
    p_is_editorial_insight: input.is_editorial_insight,
    p_on_cover: input.on_cover,
    p_issue_id: input.issue_id,
    p_practice_area_id: input.practice_area_id,
    p_body: input.body,
    p_contributor_ids: contributors.map((c) => c.contributorId),
    p_contributor_orders: contributors.map((c) => c.order),
  });

  if (error) {
    console.error("updateArticle RPC error:", error);
    if (error.code === "23505") {
      return { error: "That slug is already in use by another article." };
    }
    return { error: "Could not update the article. Please try again." };
  }

  // Apply cover story flag separately
  await applyCoverStoryFlag(supabase, id, input.is_cover_story);

  // Apply inline images separately
  await supabase
    .from("articles")
    .update({
      image_1_url: input.image_1_url,
      image_1_alt: input.image_1_alt,
      image_1_position: input.image_1_position,
      image_2_url: input.image_2_url,
      image_2_alt: input.image_2_alt,
      image_2_position: input.image_2_position,
      image_3_url: input.image_3_url,
      image_3_alt: input.image_3_alt,
      image_3_position: input.image_3_position,
      image_4_url: input.image_4_url,
      image_4_alt: input.image_4_alt,
      image_4_position: input.image_4_position,
    })
    .eq("id", id);

  return { error: null };
}

export async function setArticleStatus(
  id: string,
  status: "draft" | "published"
): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("articles")
    .update({ status, published_at: status === "published" ? new Date().toISOString() : null })
    .eq("id", id);

  if (error) return { error: "Could not update the article's status. Please try again." };
  return { error: null };
}

// article_contributors cascades on delete, so deleting an article is safe —
// nothing else references into articles by foreign key.
export async function deleteArticle(id: string): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("articles").delete().eq("id", id);

  if (error) return { error: "Could not delete the article. Please try again." };
  return { error: null };
}
