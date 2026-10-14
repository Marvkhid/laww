import { requireAdmin } from "@/lib/supabase/admin/require-admin";
import type { ArticleRow, ArticleContributorRow } from "@/lib/supabase/types";
import type { JSONContent } from "@tiptap/core";
import {
  allocateSlugAndSave,
  classifyUniqueViolation,
  describeDbError,
  type AttemptOutcome,
  type ConflictKind,
  type DbError,
} from "@/lib/slug-allocation";

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

export async function getArticleBySlugForAdmin(
  slug: string
): Promise<ArticleRow | null> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
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
  /** Page keys from the admin's "Display On" group; null/undefined = leave as-is. */
  show_on_pages?: string[] | null;
};

export type ContributorSelection = { contributorId: string; order: number };

type RpcClient = Awaited<ReturnType<typeof requireAdmin>>;

// PostgREST reports a call to a not-yet-existing function overload either
// as 42883 (missing function) or PGRST202 (could not find the function).
// That only happens between deploying this code and applying migration
// 0026, so we fall back to the pre-0026 multi-statement path instead of
// failing the admin's save.
function isMissingFunction(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "42883" ||
    error.code === "PGRST202" ||
    /could not find the function|function .* does not exist/i.test(
      error.message ?? ""
    )
  );
}

/**
 * Turn a refused write into something the admin can act on.
 *
 * The classification here is the fix for a mis-reported failure. This module
 * used to treat ANY unique violation as "that slug is already in use by
 * another article", so a *cover-story* clash — the 0009 partial unique index
 * `one_cover_story_at_a_time`, raised by migration 0026's write order — was
 * reported to the admin as a slug problem, and was investigated as one for as
 * long as that message existed.
 *
 * The kind is also what drives the retry policy in `allocateSlugAndSave`: only
 * a genuine slug clash is retryable.
 */
function refusal(
  error: DbError | null | undefined,
  fallback: string
): Extract<AttemptOutcome<never>, { ok: false }> {
  const kind: ConflictKind = classifyUniqueViolation(error);
  const detail = describeDbError(error);

  if (kind === "cover_story") {
    return {
      ok: false,
      kind,
      detail,
      message:
        "Another article is already the Cover Story, and this save could not move it. Apply migration 0027, or untick Cover Story here, then save again.",
    };
  }
  if (kind === "contributors") {
    return {
      ok: false,
      kind,
      detail,
      message:
        "This article could not be saved because the same author is credited twice.",
    };
  }
  if (kind === "slug") {
    return {
      ok: false,
      kind,
      detail,
      message: "That slug is already in use by another article.",
    };
  }
  return { ok: false, kind: "other", message: fallback, detail };
}

function baseRpcParams(input: ArticleInput, contributors: ContributorSelection[]) {
  return {
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
  };
}

/** Everything the 0026 overload adds on top of the 0006 signature. */
function extendedRpcParams(input: ArticleInput) {
  return {
    p_image_1_url: input.image_1_url,
    p_image_1_alt: input.image_1_alt,
    p_image_1_position: input.image_1_position,
    p_image_2_url: input.image_2_url,
    p_image_2_alt: input.image_2_alt,
    p_image_2_position: input.image_2_position,
    p_image_3_url: input.image_3_url,
    p_image_3_alt: input.image_3_alt,
    p_image_3_position: input.image_3_position,
    p_image_4_url: input.image_4_url,
    p_image_4_alt: input.image_4_alt,
    p_image_4_position: input.image_4_position,
    p_show_on_pages: input.show_on_pages ?? null,
    p_is_cover_story: input.is_cover_story,
  };
}

// ── Legacy (pre-0026) helpers ──────────────────────────────────────────────
// Only used when migration 0026 has not been applied yet: the old RPC has a
// fixed parameter list, so cover-story, page visibility and the inline
// images have to be applied as separate follow-up statements.

async function applyCoverStoryFlag(
  supabase: RpcClient,
  articleId: string,
  isCoverStory: boolean
): Promise<void> {
  if (isCoverStory) {
    await supabase
      .from("articles")
      .update({ is_cover_story: false })
      .eq("is_cover_story", true)
      .neq("id", articleId);
  }
  const { error } = await supabase
    .from("articles")
    .update({ is_cover_story: isCoverStory })
    .eq("id", articleId);
  if (error && error.code === "42703") {
    console.warn("is_cover_story column not found — run migration 0009");
  }
}

async function applyPageVisibility(
  supabase: RpcClient,
  articleId: string,
  pages: string[] | null | undefined
): Promise<void> {
  if (!pages) return;
  const { error } = await supabase
    .from("articles")
    .update({ show_on_pages: pages })
    .eq("id", articleId);
  if (error) {
    if (error.code === "42703" || error.code === "PGRST204") {
      console.warn("show_on_pages column not found — run migration 0025_page_visibility");
    } else {
      console.error("applyPageVisibility error:", error);
    }
  }
}

async function applyInlineImages(
  supabase: RpcClient,
  articleId: string,
  input: ArticleInput
): Promise<void> {
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

// ── Public write API ───────────────────────────────────────────────────────

export type ArticleWriteResult = {
  id: string | null;
  error: string | null;
  /**
   * The slug actually stored. It differs from the requested one only when that
   * URL was already taken and a readable suffix was allocated instead, so the
   * editor can show the admin the URL the article really has.
   */
  slug: string | null;
  /** Machine-readable cause of a failure. Goes to the diagnostics log only. */
  errorDetail: string | null;
};

/** One attempt at the 0026 create RPC, with the pre-0026 fallback behind it. */
async function insertArticleOnce(
  supabase: RpcClient,
  input: ArticleInput,
  contributors: ContributorSelection[]
): Promise<AttemptOutcome<string>> {
  // Migration 0026 overload: one transaction carries the article, its body,
  // inline images, page visibility and the cover-story flag.
  const { data: articleId, error } = await supabase.rpc(
    "admin_create_article_with_contributors",
    { ...baseRpcParams(input, contributors), ...extendedRpcParams(input) }
  );

  if (!error && articleId) {
    return { ok: true, value: articleId as string };
  }

  if (error && !isMissingFunction(error)) {
    console.error("createArticle RPC error:", error);
    return refusal(error, "Could not create the article. Please try again.");
  }

  // ── Legacy path (migration 0026 not applied yet) ────────────────────────
  const { data: legacyId, error: legacyError } = await supabase.rpc(
    "admin_create_article_with_contributors",
    baseRpcParams(input, contributors)
  );

  if (legacyError) {
    console.error("createArticle legacy RPC error:", legacyError);
    return refusal(legacyError, "Could not create the article. Please try again.");
  }
  if (!legacyId) {
    return {
      ok: false,
      kind: "other",
      message: "Could not create the article. Please try again.",
      detail: null,
    };
  }

  const id = legacyId as string;
  if (input.is_cover_story) await applyCoverStoryFlag(supabase, id, true);
  await applyPageVisibility(supabase, id, input.show_on_pages);
  await applyInlineImages(supabase, id, input);
  return { ok: true, value: id };
}

/**
 * Create an article, allocating a free URL when the requested one is taken.
 *
 * The unique constraint — not a pre-flight SELECT — is the arbiter, because
 * two requests can both find a slug free and both then try to claim it. The
 * loser of that race retries with `-2`, `-3`, … (see lib/slug-allocation).
 * Autosave and the explicit Save/Publish both come through here, so they can
 * never disagree about which URL an article gets.
 *
 * A refusal that is not a slug clash returns immediately: retrying a
 * cover-story or validation failure six times would only take six times as
 * long to say the same thing.
 */
export async function createArticle(
  input: ArticleInput,
  contributors: ContributorSelection[]
): Promise<ArticleWriteResult> {
  const supabase = await requireAdmin();

  const allocation = await allocateSlugAndSave<string>({
    requested: input.slug || input.title,
    attempt: (slug) =>
      insertArticleOnce(supabase, { ...input, slug }, contributors),
  });

  if (!allocation.ok) {
    return {
      id: null,
      error: allocation.message,
      slug: null,
      errorDetail: allocation.detail,
    };
  }

  return {
    id: allocation.value,
    error: null,
    slug: allocation.slug,
    errorDetail: null,
  };
}

export type ArticleUpdateResult = {
  error: string | null;
  slug: string | null;
  errorDetail: string | null;
};

/** One attempt at the 0026 update RPC, with the pre-0026 fallback behind it. */
async function updateArticleOnce(
  supabase: RpcClient,
  id: string,
  input: ArticleInput,
  contributors: ContributorSelection[]
): Promise<AttemptOutcome<void>> {
  const { error } = await supabase.rpc("admin_update_article_with_contributors", {
    p_id: id,
    ...baseRpcParams(input, contributors),
    ...extendedRpcParams(input),
  });

  if (!error) return { ok: true, value: undefined };

  if (!isMissingFunction(error)) {
    console.error("updateArticle RPC error:", error);
    return refusal(error, "Could not update the article. Please try again.");
  }

  // ── Legacy path (migration 0026 not applied yet) ────────────────────────
  const { error: legacyError } = await supabase.rpc(
    "admin_update_article_with_contributors",
    { p_id: id, ...baseRpcParams(input, contributors) }
  );

  if (legacyError) {
    console.error("updateArticle legacy RPC error:", legacyError);
    return refusal(legacyError, "Could not update the article. Please try again.");
  }

  await applyCoverStoryFlag(supabase, id, input.is_cover_story);
  await applyPageVisibility(supabase, id, input.show_on_pages);
  await applyInlineImages(supabase, id, input);
  return { ok: true, value: undefined };
}

/**
 * Update an article, resolving a slug clash exactly the way creation does.
 *
 * `currentSlug` is the slug the row holds right now. When the submitted slug
 * is unchanged — the normal edit, since the editor renders existing slugs
 * read-only — allocation gets exactly ONE candidate: editing an article can
 * never silently rename a published page. A *changed* slug that is taken gets
 * the next readable suffix instead of an error the admin cannot fix.
 */
export async function updateArticle(
  id: string,
  input: ArticleInput,
  contributors: ContributorSelection[],
  currentSlug: string | null = null
): Promise<ArticleUpdateResult> {
  const supabase = await requireAdmin();

  const allocation = await allocateSlugAndSave<void>({
    requested: input.slug || input.title,
    currentSlug,
    attempt: (slug) =>
      updateArticleOnce(supabase, id, { ...input, slug }, contributors),
  });

  if (!allocation.ok) {
    return {
      error: allocation.message,
      slug: null,
      errorDetail: allocation.detail,
    };
  }

  return { error: null, slug: allocation.slug, errorDetail: null };
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
