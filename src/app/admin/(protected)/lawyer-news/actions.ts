"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createLawyerNews,
  updateLawyerNews,
  deleteLawyerNews,
  getLawyerNewsByIdForAdmin,
  setLawyerNewsStatus,
  type LawyerNewsInput,
} from "@/lib/supabase/admin/lawyer-news";
import { uploadLawyerNewsImage } from "@/lib/supabase/admin/storage";
import type { LawyerNewsStatus } from "@/lib/supabase/types";
import { slugify } from "@/lib/slugify";
import { dataToFormData, type AutosaveResult } from "@/lib/autosave";
import { readTextOptional } from "@/lib/form-presence";

export type FormState = { error: string | null };

/**
 * Save vs Publish. Autosave and Enter-key submits default to "save", so
 * neither can ever publish. "unpublish" moves published entries back to
 * pending review; archiving/restoring goes through
 * setLawyerNewsStatusAction below.
 */
function readSaveMode(formData: FormData): "save" | "publish" | "unpublish" {
  const mode = String(formData.get("save_mode") ?? "save");
  return mode === "publish" || mode === "unpublish" ? mode : "save";
}

/** Upload-on-select for interview cover and inline images. */
export async function uploadLawyerNewsImageAction(
  file: File
): Promise<{ url: string | null; error: string | null }> {
  return uploadLawyerNewsImage(file);
}

const VALID_STATUSES: LawyerNewsStatus[] = ["pending_review", "published", "archived"];

/** Read a file upload or fall back to the existing URL. */
async function readImageUpload(
  formData: FormData,
  fileKey: string,
  existingKey: string
): Promise<{ url: string | null; error: string | null }> {
  const file = formData.get(fileKey);
  const existing = String(formData.get(existingKey) ?? "").trim();

  if (file instanceof File && file.size > 0) {
    const { url, error } = await uploadLawyerNewsImage(file);
    if (error) return { url: null, error };
    return { url, error: null };
  }

  return { url: existing.length > 0 ? existing : null, error: null };
}

/** Q&A pairs come in as parallel qa_question_N / qa_answer_N fields. */
function readQaPairs(formData: FormData): { question: string; answer: string }[] {
  const pairs: { question: string; answer: string }[] = [];
  let index = 0;

  while (formData.has(`qa_question_${index}`)) {
    const question = String(formData.get(`qa_question_${index}`) ?? "").trim();
    const answer = String(formData.get(`qa_answer_${index}`) ?? "").trim();
    if (question || answer) {
      pairs.push({ question, answer });
    }
    index++;
  }

  return pairs;
}

async function readInput(
  formData: FormData
): Promise<{ input: LawyerNewsInput | null; error: string | null }> {
  const optional = (key: string) => {
    const raw = String(formData.get(key) ?? "").trim();
    return raw.length > 0 ? raw : null;
  };

  const lawyerName = String(formData.get("lawyer_name") ?? "").trim();
  if (!lawyerName) return { input: null, error: "Lawyer name is required." };

  const slugRaw = String(formData.get("slug") ?? "").trim();

  const { url: cover_image_url, error: coverErr } = await readImageUpload(
    formData,
    "cover_image_file",
    "existing_cover_image_url"
  );
  if (coverErr) return { input: null, error: coverErr };

  const inlineImages: {
    url: string | null;
    alt: string | null;
    position: string | null;
  }[] = [];
  for (let i = 1; i <= 4; i++) {
    const { url, error: imgErr } = await readImageUpload(
      formData,
      `image_${i}_file`,
      `existing_image_${i}_url`
    );
    if (imgErr) return { input: null, error: imgErr };
    inlineImages.push({
      url,
      alt: optional(`image_${i}_alt`),
      position: optional(`image_${i}_position`),
    });
  }

  const qa_pairs = readQaPairs(formData);
  if (qa_pairs.length === 0) {
    return { input: null, error: "Add at least one Question & Answer pair." };
  }

  const statusRaw = String(formData.get("status") ?? "").trim();

  return {
    input: {
      slug: slugRaw.length > 0 ? slugRaw : slugify(lawyerName),
      lawyer_name: lawyerName,
      lawyer_title: optional("lawyer_title"),
      // Absent → omitted from the UPDATE, so it can never be blanked.
      intro: readTextOptional(formData, "intro"),
      cover_image_url,
      cover_image_alt: optional("cover_image_alt"),
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
      qa_pairs,
      status: (VALID_STATUSES as string[]).includes(statusRaw)
        ? (statusRaw as LawyerNewsStatus)
        : "pending_review",
    },
    error: null,
  };
}

/**
 * Autosave — never publishes (new rows forced to pending_review; existing
 * rows keep their status), never redirects, never revalidates.
 */
export async function autosaveLawyerNewsAction(
  id: string | null,
  rawData: Record<string, string[]>
): Promise<AutosaveResult> {
  const formData = dataToFormData(rawData);
  const { input, error: validationError } = await readInput(formData);
  if (!input) return { id, error: validationError ?? "Invalid entry." };

  if (!id) {
    const created = await createLawyerNews({ ...input, status: "pending_review" });
    if (created.error && created.error.includes("slug")) {
      const fallbackSlug = `${input.slug}-${Date.now().toString(36)}`;
      const retry = await createLawyerNews({
        ...input,
        slug: fallbackSlug,
        status: "pending_review",
      });
      if (retry.id) return { id: retry.id, error: null };
    }
    return { id: created.id, error: created.error };
  }

  const current = await getLawyerNewsByIdForAdmin(id);
  if (!current) {
    return { id, error: "This entry no longer exists. Reload the editor." };
  }
  const { error } = await updateLawyerNews(id, { ...input, status: current.status });
  if (error) return { id, error };
  return { id, error: null };
}

/** Archive / restore — standalone state transitions (no form submit needed). */
export async function setLawyerNewsStatusAction(
  id: string,
  status: LawyerNewsStatus
): Promise<{ error: string | null }> {
  const valid: LawyerNewsStatus[] = ["pending_review", "published", "archived"];
  if (!valid.includes(status)) return { error: "Unknown status." };
  const { error } = await setLawyerNewsStatus(id, status);
  if (error) return { error };
  revalidatePath("/admin/lawyer-news");
  revalidatePath("/");
  return { error: null };
}

export async function createLawyerNewsAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { input, error: validationError } = await readInput(formData);
  if (!input) return { error: validationError ?? "Invalid input." };

  const mode = readSaveMode(formData);
  const autosaveId = String(formData.get("autosave_id") ?? "").trim();

  if (autosaveId) {
    const current = await getLawyerNewsByIdForAdmin(autosaveId);
    if (current) {
      const status: LawyerNewsStatus =
        mode === "publish"
          ? "published"
          : mode === "unpublish"
            ? "pending_review"
            : current.status;
      const { error } = await updateLawyerNews(autosaveId, { ...input, status });
      if (error) return { error };
      revalidatePath("/admin/lawyer-news");
      revalidatePath("/");
      revalidatePath(`/lawyer-in-the-news/${input.slug}`);
      redirect("/admin/lawyer-news");
    }
  }

  // Save never publishes a brand-new interview; only Publish does.
  input.status = mode === "publish" ? "published" : "pending_review";

  const { error } = await createLawyerNews(input);
  if (error) return { error };

  revalidatePath("/admin/lawyer-news");
  revalidatePath("/");
  redirect("/admin/lawyer-news");
}

export async function updateLawyerNewsAction(
  id: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { input, error: validationError } = await readInput(formData);
  if (!input) return { error: validationError ?? "Invalid input." };

  const mode = readSaveMode(formData);
  const current = await getLawyerNewsByIdForAdmin(id);
  if (!current) return { error: "This entry no longer exists." };
  input.status =
    mode === "publish"
      ? "published"
      : mode === "unpublish"
        ? "pending_review"
        : current.status;

  const { error } = await updateLawyerNews(id, input);
  if (error) return { error };

  revalidatePath("/admin/lawyer-news");
  revalidatePath("/");
  revalidatePath(`/lawyer-in-the-news/${input.slug}`);
  // A rename leaves the previous URL cached under the old slug, and public
  // detail pages are cached for a year — invalidate both.
  if (current.slug !== input.slug) {
    revalidatePath(`/lawyer-in-the-news/${current.slug}`);
  }
  redirect("/admin/lawyer-news");
}

export async function deleteLawyerNewsAction(id: string) {
  // Read the slug BEFORE the row is gone, or the cached detail page for a
  // deleted entry stays publicly readable for the rest of the cache window.
  const current = await getLawyerNewsByIdForAdmin(id);
  const { error } = await deleteLawyerNews(id);
  if (error) return { error };

  revalidatePath("/admin/lawyer-news");
  revalidatePath("/");
  if (current?.slug) revalidatePath(`/lawyer-in-the-news/${current.slug}`);
  return { error: null };
}
