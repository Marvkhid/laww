"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createArticle,
  updateArticle,
  deleteArticle,
  setArticleStatus,
  type ArticleInput,
  type ContributorSelection,
} from "@/lib/supabase/admin/articles";
import type { JSONContent } from "@tiptap/core";
import { uploadArticleCoverImage } from "@/lib/supabase/admin/storage";

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

function readArticleBody(formData: FormData): JSONContent | null {
  const raw = String(formData.get("body") ?? "").trim();
  if (!raw) {
    console.log("readArticleBody: empty body field");
    return null;
  }
  let parsed: JSONContent;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error("readArticleBody: JSON parse error:", e);
    return null;
  }
  if (parsed?.type !== "doc") {
    console.log("readArticleBody: not a doc type:", parsed?.type);
    return null;
  }
  if (isEmptyDoc(parsed)) {
    console.log("readArticleBody: empty doc");
    return null;
  }
  console.log("readArticleBody: body content found, length:", JSON.stringify(parsed).length);
  return parsed;
}

// A new file upload always takes priority. If none was selected, the
// hidden existing_cover_image_url field (set from the article's current
// value in article-form.tsx) is preserved as-is — so leaving the file
// input empty on edit never clears an existing image.
async function readCoverImageUrl(
  formData: FormData
): Promise<{ url: string | null; error: string | null }> {
  const file = formData.get("cover_image_file");
  const existing = String(formData.get("existing_cover_image_url") ?? "").trim();

  if (file instanceof File && file.size > 0) {
    const { url, error } = await uploadArticleCoverImage(file);
    if (error) return { url: null, error };
    return { url, error: null };
  }

  return { url: existing.length > 0 ? existing : null, error: null };
}

async function readArticleInput(
  formData: FormData
): Promise<{ input: ArticleInput | null; error: string | null }> {
  const optional = (key: string) => {
    const raw = String(formData.get(key) ?? "").trim();
    return raw.length > 0 ? raw : null;
  };

  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "draft");
  const pageNumberRaw = String(formData.get("page_number") ?? "").trim();

  if (!slug || !title) {
    return { input: null, error: "Slug and title are both required." };
  }
  if (status !== "draft" && status !== "published") {
    return { input: null, error: "Status must be draft or published." };
  }
  if (pageNumberRaw && !Number.isInteger(Number(pageNumberRaw))) {
    return { input: null, error: "Page number must be a whole number." };
  }

  const { url: cover_image_url, error: coverImageError } = await readCoverImageUrl(formData);
  if (coverImageError) {
    return { input: null, error: coverImageError };
  }

  // Inline images (up to 4)
  const inlineImages: {
    url_key: string; alt_key: string; pos_key: string;
    url: string | null; alt: string | null; position: string | null;
  }[] = [];
  for (let i = 1; i <= 4; i++) {
    let imgUrl: string | null = optional(`existing_image_${i}_url`);
    const imgFile = formData.get(`image_${i}_file`);
    if (imgFile instanceof File && imgFile.size > 0) {
      const { url, error: imgError } = await uploadArticleCoverImage(imgFile);
      if (imgError) return { input: null, error: imgError };
      imgUrl = url;
    }
    inlineImages.push({
      url_key: `image_${i}_url`,
      alt_key: `image_${i}_alt`,
      pos_key: `image_${i}_position`,
      url: imgUrl,
      alt: optional(`image_${i}_alt`),
      position: optional(`image_${i}_position`),
    });
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
      featured: formData.get("featured") === "on",
      is_editorial_insight: formData.get("is_editorial_insight") === "on",
      on_cover: formData.get("on_cover") === "on",
      is_cover_story: formData.get("is_cover_story") === "on",
      issue_id: optional("issue_id"),
      practice_area_id: optional("practice_area_id"),
      body: readArticleBody(formData),
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

function revalidateArticlePaths(slug?: string) {
  revalidatePath("/admin/articles");
  revalidatePath("/articles");
  revalidatePath("/");
  revalidatePath("/practice-areas/[slug]", "page");
  revalidatePath("/issues/[slug]", "page");
  revalidatePath("/contributors/[slug]", "page");
  if (slug) revalidatePath(`/articles/${slug}`);
}

export async function createArticleAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { input, error: validationError } = await readArticleInput(formData);
  if (!input) return { error: validationError };

  const contributors = readContributorSelections(formData);
  const { error } = await createArticle(input, contributors);
  if (error) return { error };

  revalidateArticlePaths(input.slug);
  redirect("/admin/articles");
}

export async function updateArticleAction(
  id: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  console.log("updateArticleAction: starting for article", id);
  const { input, error: validationError } = await readArticleInput(formData);
  if (!input) {
    console.error("updateArticleAction validation error:", validationError);
    return { error: validationError };
  }

  console.log("updateArticleAction: body is", input.body ? "present" : "null");
  const contributors = readContributorSelections(formData);
  const { error } = await updateArticle(id, input, contributors);
  if (error) {
    console.error("updateArticleAction error for article", id, ":", error);
    return { error };
  }

  console.log("updateArticleAction: success, revalidating");
  revalidateArticlePaths(input.slug);
  redirect("/admin/articles");
}

export async function toggleArticleStatusAction(id: string, nextStatus: "draft" | "published") {
  const { error } = await setArticleStatus(id, nextStatus);
  if (error) return { error };
  revalidateArticlePaths();
  return { error: null };
}

export async function deleteArticleAction(id: string, slug: string) {
  const { error } = await deleteArticle(id);
  if (error) return { error };
  revalidateArticlePaths(slug);
  return { error: null };
}
