"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createArticle,
  updateArticle,
  deleteArticle,
  getArticleByIdForAdmin,
  getArticleBySlugForAdmin,
  setArticleStatus,
  type ArticleInput,
  type ContributorSelection,
} from "@/lib/supabase/admin/articles";
import type { ArticleRow } from "@/lib/supabase/types";
import type { JSONContent } from "@tiptap/core";
import { normalizeSlug } from "@/lib/slug-allocation";
import {
  ARTICLE_PAGE_OPTIONS,
  pagesFromFormData,
} from "@/lib/page-visibility";
import { dataToFormData, type AutosaveResult } from "@/lib/autosave";
import {
  readBodyPreserving,
  readTextPreserving,
  storedText as storedTextOf,
} from "@/lib/form-presence";

export type FormState = { error: string | null };

// The editor always submits *some* doc, even untouched (Tiptap's empty
// state is `{ type: "doc", content: [{ type: "paragraph" }] }`, not an
// absence of content). Treating that shape as "no body" keeps
// articles.body actually null when nothing was written, instead of every
// article silently getting a one-empty-paragraph body.
function isEmptyDoc(doc: JSONContent): boolean {
  const content = doc.content ?? [];
  if (content.length === 0) return true;
  return content.every(
    (node) => node.type === "paragraph" && (!node.content || node.content.length === 0)
  );
}

function parseArticleBodyFromString(raw: string): JSONContent | null {
  if (!raw) return null;
  let parsed: JSONContent;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (parsed?.type !== "doc") return null;
  if (isEmptyDoc(parsed)) return null;
  return parsed;
}

/**
 * The body is only read when the editor says it is ready (`body_state`,
 * written by TiptapEditor on mount). Before that the stored body is kept
 * intact rather than being overwritten with null by a snapshot that fired
 * too early. When the flag IS present, an empty body is a deliberate clear
 * and is written as null.
 */
function readBody(
  formData: FormData,
  current?: ArticleRow | null
): JSONContent | null {
  return readBodyPreserving(formData, current?.body ?? null, (raw) =>
    parseArticleBodyFromString(raw)
  );
}

// The URL comes from the hidden existing_cover_image_url field, which the
// upload zone writes the moment a file is selected (upload-on-select).
//
// No server action reads file bytes on purpose: a File inside a Server Action
// body is the request that the production host rejects with 413
// (FUNCTION_PAYLOAD_TOO_LARGE — see src/lib/request-limits.ts), and
// e2e/body-limits.spec.ts fails the suite if one ever appears again.
async function readCoverImageUrl(
  formData: FormData
): Promise<{ url: string | null; error: string | null }> {
  const existing = String(formData.get("existing_cover_image_url") ?? "").trim();
  return { url: existing.length > 0 ? existing : null, error: null };
}

/**
 * Read the article form into an ArticleInput.
 *
 * `current` is the row as it exists right now, and it exists to make the
 * update path non-destructive. Two classes of field must never be nulled by
 * a payload that simply did not carry them:
 *
 *  1. **The body.** The rich-text editor only becomes trustworthy once it
 *     has mounted, which it reports through the `body_state` field. A
 *     snapshot taken before that (a fast autosave, a restored tab, an
 *     upload that fired first) carries an empty body — writing it would
 *     destroy the article. When `body_state` is absent we keep the stored
 *     body instead.
 *  2. **Any field absent from the payload.** Presence is the signal: a key
 *     that is *present* — even empty — is a deliberate value (that is how
 *     the Delete button clears an image), while a key that is *absent* was
 *     never rendered or never loaded and must be preserved.
 *
 * This is what stops an unrelated edit (title, alt text, ordering) from
 * wiping the body and the four inline images.
 */
async function readArticleInput(
  formData: FormData,
  current?: ArticleRow | null
): Promise<{ input: ArticleInput | null; error: string | null }> {
  const optional = (key: string) => {
    const raw = String(formData.get(key) ?? "").trim();
    return raw.length > 0 ? raw : null;
  };

  // Presence rule (see lib/form-presence): present → deliberate value,
  // absent → keep what is stored. This is what stops an unrelated edit from
  // wiping the body or the inline images.
  const preserveable = (
    key: string,
    stored: string | null | undefined
  ): string | null => readTextPreserving(formData, key, stored);

  /** Read a text column off the stored row; null when there is no row. */
  const storedText = (key: keyof ArticleRow): string | null =>
    storedTextOf(current, key);

  const slugRaw = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "draft");
  const pageNumberRaw = String(formData.get("page_number") ?? "").trim();

  if (!title) {
    return { input: null, error: "Title is required." };
  }
  // The slug is the article's public URL, so it is normalised here: a paste
  // can never store something that is not a legal slug, and an empty slug
  // field still falls back to the title. Input that yields nothing at all —
  // a title of punctuation, an empty form — is refused rather than stored as
  // "", because an empty slug is a URL nobody can open (and the one value two
  // articles could both claim).
  const slug = normalizeSlug(slugRaw.length > 0 ? slugRaw : title);
  if (!slug) {
    return {
      input: null,
      error:
        "Add a title (or a slug) containing at least one letter or number — the article needs a URL.",
    };
  }
  if (status !== "draft" && status !== "published") {
    return { input: null, error: "Status must be draft or published." };
  }
  if (pageNumberRaw && !Number.isInteger(Number(pageNumberRaw))) {
    return { input: null, error: "Page number must be a whole number." };
  }

  const { url: resolvedCoverUrl, error: coverImageError } =
    await readCoverImageUrl(formData);
  if (coverImageError) {
    return { input: null, error: coverImageError };
  }
  // A cover the form never rendered must not be cleared.
  const cover_image_url = formData.has("existing_cover_image_url")
    ? resolvedCoverUrl
    : (storedText("cover_image_url") ?? resolvedCoverUrl);

  // Inline images (up to 4)
  const inlineImages: {
    url_key: string; alt_key: string; pos_key: string;
    url: string | null; alt: string | null; position: string | null;
  }[] = [];
  for (let i = 1; i <= 4; i++) {
    const urlKey = `existing_image_${i}_url`;
    // Present-and-empty means the Delete button cleared this slot.
    // Absent means this slot was never part of the payload — keep it.
    const imgUrl: string | null = preserveable(
      urlKey,
      storedText(`image_${i}_url` as keyof ArticleRow)
    );
    inlineImages.push({
      url_key: `image_${i}_url`,
      alt_key: `image_${i}_alt`,
      pos_key: `image_${i}_position`,
      url: imgUrl,
      alt: preserveable(
        `image_${i}_alt`,
        storedText(`image_${i}_alt` as keyof ArticleRow)
      ),
      position: preserveable(
        `image_${i}_position`,
        storedText(`image_${i}_position` as keyof ArticleRow)
      ),
    });
  }

  const featured = formData.get("featured") === "on";
  const is_editorial_insight = formData.get("is_editorial_insight") === "on";
  const on_cover = formData.get("on_cover") === "on";
  const is_cover_story = formData.get("is_cover_story") === "on";

  // "Display On" — null when the group was not rendered (migration 0025
  // pending), in which case the column is left untouched rather than being
  // silently overwritten with an empty selection.
  const show_on_pages = pagesFromFormData(formData, ARTICLE_PAGE_OPTIONS);
  if (show_on_pages) {
    if (show_on_pages.length === 0) {
      return {
        input: null,
        error: "Select at least one page under Display On.",
      };
    }
    // A homepage placement is meaningless without homepage visibility. The
    // form keeps these in step interactively; this guards a stale client.
    if (
      (featured || on_cover || is_editorial_insight || is_cover_story) &&
      !show_on_pages.includes("homepage")
    ) {
      show_on_pages.push("homepage");
    }
  }

  return {
    input: {
      slug,
      title,
      dek: optional("dek"),
      page_number: pageNumberRaw ? Number(pageNumberRaw) : null,
      cover_image_url,
      image_1_url: inlineImages[0].url,
      image_1_alt: inlineImages[0].alt,
      image_1_position: inlineImages[0].position,
      image_2_url: inlineImages[1].url,
      image_2_alt: inlineImages[1].alt,
      image_2_position: inlineImages[1].position,
      image_3_url: inlineImages[2].url,
      image_3_alt: inlineImages[2].alt,
      image_3_position: inlineImages[2].position,
      image_4_url: inlineImages[3].url,
      image_4_alt: inlineImages[3].alt,
      image_4_position: inlineImages[3].position,
      status,
      featured,
      is_editorial_insight,
      on_cover,
      is_cover_story,
      ...(show_on_pages ? { show_on_pages } : {}),
      issue_id: optional("issue_id"),
      practice_area_id: optional("practice_area_id"),
      body: readBody(formData, current),
    },
    error: null,
  };
}

function readContributorSelections(formData: FormData): ContributorSelection[] {
  const selections: ContributorSelection[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("contributor_") || value !== "on") continue;
    const contributorId = key.slice("contributor_".length);
    const orderRaw = String(formData.get(`order_${contributorId}`) ?? "1").trim();
    const order = Number.isInteger(Number(orderRaw)) ? Number(orderRaw) : 1;
    selections.push({ contributorId, order });
  }
  return selections;
}

/**
 * Save vs Publish. The buttons set `save_mode` (Enter-key implicit submits
 * default to "save", so a stray Enter can never publish):
 *   save      → persist everything; publication state unchanged
 *   publish   → persist + status published (+ published_at via the RPC)
 *   unpublish → persist + status draft
 */
function readSaveMode(formData: FormData): "save" | "publish" | "unpublish" {
  const mode = String(formData.get("save_mode") ?? "save");
  return mode === "publish" || mode === "unpublish" ? mode : "save";
}

/**
 * Invalidate everything an article mutation can change.
 *
 * Public detail pages are prerendered with a one-year `s-maxage`, so a route
 * that is not explicitly invalidated here stays publicly readable long after
 * the content was edited, unpublished or deleted. That is why this takes the
 * slug — and why it takes a LIST: a rename leaves the previous URL cached
 * under the old slug, so both have to be invalidated.
 */
/**
 * Where a completed Save/Publish lands.
 *
 * Normally the listing. When slug allocation had to store the article under a
 * different URL than the editor showed, the stored slug rides along in the
 * query string so the listing can say so: saving an article at a URL the
 * admin never saw, silently, is exactly the confusion this path removes.
 */
function savedToListing(
  stored: string | null,
  requested: string
): string {
  if (!stored || stored === requested) return "/admin/articles";
  return `/admin/articles?saved=${encodeURIComponent(
    stored
  )}&wanted=${encodeURIComponent(requested)}`;
}

function revalidateArticlePaths(...slugs: Array<string | null | undefined>) {
  revalidatePath("/admin/articles");
  revalidatePath("/articles");
  revalidatePath("/");
  revalidatePath("/practice-areas/[slug]", "page");
  revalidatePath("/issues/[slug]", "page");
  revalidatePath("/contributors/[slug]", "page");
  for (const slug of slugs) if (slug) revalidatePath(`/articles/${slug}`);
}



/**
 * Autosave — never publishes, never redirects, never revalidates.
 * - id === null: creates the row as a DRAFT and returns its id (the client
 *   keeps it in a hidden field so every later snapshot updates that row —
 *   no duplicate drafts).
 * - id present: updates every editable field while PRESERVING the row's
 *   current publication status.
 * Payloads run through the exact same reader as Save, so autosave and
 * Save can never disagree about what gets persisted.
 */
export async function autosaveArticleAction(
  id: string | null,
  rawData: Record<string, string[]>
): Promise<AutosaveResult> {
  const formData = dataToFormData(rawData);
  // Fetch the row FIRST so updates can preserve anything the payload does
  // not carry. This is the guard that makes partial snapshots non-destructive.
  const current = id ? await getArticleByIdForAdmin(id) : null;
  const { input, error: validationError } = await readArticleInput(
    formData,
    current
  );
  if (!input) return { id, error: validationError ?? "Invalid article." };
  const contributors = readContributorSelections(formData);

  if (!id) {
    // Slug allocation happens inside createArticle, so autosave and an
    // explicit Save/Publish resolve a clash by the same rule. This used to be
    // a local retry with a `-<timestamp>` suffix: an unshareable URL, and one
    // the editor was still holding the previous slug for.
    const created = await createArticle(
      { ...input, status: "draft" },
      contributors
    );
    return {
      id: created.id,
      error: created.error,
      // Reported only when the stored slug differs from the submitted one.
      slug: created.slug && created.slug !== input.slug ? created.slug : null,
      errorDetail: created.errorDetail,
    };
  }

  if (!current) {
    // The id we were given names a row that is gone — deleted in another tab,
    // or left behind by a local recovery snapshot. Failing here wedged the
    // editor permanently: autosave could never succeed, so every image
    // upload was lost too, and the user was told to reload — which throws
    // away the work sitting in front of them.
    //
    // The user still has all of it in the form, so recover instead: adopt a
    // row already holding this slug if there is one (a slug is unique, so it
    // is this article), otherwise start a fresh draft row and hand its id
    // back. Either way the editor keeps the id it is holding from now on.
    // Only an UNPUBLISHED draft may be adopted. A published article that
    // happens to hold this slug is somebody else's live content, so it is
    // left strictly alone: a fresh draft is created instead (the allocator
    // gives it a free URL).
    const bySlug = await getArticleBySlugForAdmin(input.slug);
    if (bySlug && bySlug.status === "draft") {
      const { error, errorDetail } = await updateArticle(
        bySlug.id,
        { ...input, status: bySlug.status },
        contributors,
        bySlug.slug
      );
      if (error) return { id, error, errorDetail };
      return { id: bySlug.id, error: null };
    }

    const recreated = await createArticle(
      { ...input, status: "draft" },
      contributors
    );
    if (recreated.error) {
      return { id, error: recreated.error, errorDetail: recreated.errorDetail };
    }
    return {
      id: recreated.id,
      error: null,
      slug:
        recreated.slug && recreated.slug !== input.slug ? recreated.slug : null,
    };
  }
  const { error, errorDetail, slug: storedSlug } = await updateArticle(
    id,
    { ...input, status: current.status },
    contributors,
    current.slug
  );
  if (error) return { id, error, errorDetail };
  return {
    id,
    error: null,
    slug: storedSlug && storedSlug !== input.slug ? storedSlug : null,
  };
}

export async function createArticleAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const contributors = readContributorSelections(formData);
  const mode = readSaveMode(formData);
  const autosaveId = String(formData.get("autosave_id") ?? "").trim();

  // Autosave already created the draft row — continue in it, so the id the
  // client holds never goes stale and no second row is produced. Read the
  // input against that row so a field the form did not render is preserved.
  //
  // ONLY an unpublished draft may be continued. A create flow must never
  // update somebody else's article: the id can name a PUBLISHED row that
  // leaked in from a stale local recovery snapshot or a second tab, and
  // adopting it rewrote that live article with this form's content — the
  // reported "publishing a new article replaced an existing one" defect. A
  // published row is ignored here and this submission becomes its own new
  // record (see the slug allocator below), so an existing article can only
  // change through the explicit Edit → Save path.
  const adopted = autosaveId ? await getArticleByIdForAdmin(autosaveId) : null;
  const existing = adopted && adopted.status === "draft" ? adopted : null;
  const { input, error: validationError } = await readArticleInput(
    formData,
    existing
  );
  if (!input) return { error: validationError };

  if (autosaveId) {
    const current = existing;
    if (current) {
      const status =
        mode === "publish"
          ? "published"
          : mode === "unpublish"
            ? "draft"
            : current.status;
      const { error, slug: storedSlug } = await updateArticle(
        autosaveId,
        { ...input, status },
        contributors,
        current.slug
      );
      if (error) return { error };
      revalidateArticlePaths(current.slug, input.slug, storedSlug);
      redirect(savedToListing(storedSlug, input.slug));
    }
  }

  // No usable id reached us — either the form carried none (an in-flight
  // autosave created the draft microseconds before this submit, but React had
  // not yet committed the id into `autosave_id`), or it carried a published
  // row's id, which this flow refuses to touch. Blindly creating in the first
  // case would produce a DUPLICATE row, so the row already holding this slug
  // is adopted instead — but ONLY while it is still an unpublished draft.
  // A published article is never overwritten by a create.
  const bySlug = await getArticleBySlugForAdmin(input.slug);
  if (bySlug && bySlug.status === "draft") {
    const status = mode === "publish" ? "published" : bySlug.status;
    const { error, slug: storedSlug } = await updateArticle(
      bySlug.id,
      { ...input, status },
      contributors,
      bySlug.slug
    );
    if (error) return { error };
    revalidateArticlePaths(bySlug.slug, input.slug, storedSlug);
    redirect(savedToListing(storedSlug, input.slug));
  }

  // Save never publishes a brand-new article; only Publish does.
  input.status = mode === "publish" ? "published" : "draft";

  const created = await createArticle(input, contributors);
  if (created.error) return { error: created.error };

  revalidateArticlePaths(created.slug);
  redirect(savedToListing(created.slug, input.slug));
}

export async function updateArticleAction(
  id: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const current = await getArticleByIdForAdmin(id);
  if (!current) return { error: "This article no longer exists." };

  const { input, error: validationError } = await readArticleInput(
    formData,
    current
  );
  if (!input) return { error: validationError };

  const contributors = readContributorSelections(formData);
  const mode = readSaveMode(formData);

  input.status =
    mode === "publish"
      ? "published"
      : mode === "unpublish"
        ? "draft"
        : current.status;

  const { error, slug: storedSlug } = await updateArticle(
    id,
    input,
    contributors,
    current.slug
  );
  if (error) return { error };

  revalidateArticlePaths(current.slug, input.slug, storedSlug);
  redirect(savedToListing(storedSlug, input.slug));
}

export async function toggleArticleStatusAction(id: string, nextStatus: "draft" | "published") {
  const { error } = await setArticleStatus(id, nextStatus);
  if (error) return { error };
  // Unpublishing from the admin list used to revalidate nothing but the
  // listings: the article's own page stayed live and readable, because that
  // route is cached for a year and was never invalidated.
  const current = await getArticleByIdForAdmin(id);
  revalidateArticlePaths(current?.slug);
  return { error: null };
}

export async function deleteArticleAction(id: string, slug: string) {
  const { error } = await deleteArticle(id);
  if (error) return { error };
  revalidateArticlePaths(slug);
  return { error: null };
}
