"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createLegalUpdate,
  updateLegalUpdate,
  deleteLegalUpdate,
  setLegalUpdateStatus,
  getLegalUpdateByIdForAdmin,
  type LegalUpdateInput,
} from "@/lib/supabase/admin/legal-updates";
import { uploadLegalUpdateImage } from "@/lib/supabase/admin/storage";
import type { LegalUpdateStatus } from "@/lib/supabase/types";
import type { JSONContent } from "@tiptap/core";
import { slugify } from "@/lib/slugify";
import { dataToFormData, type AutosaveResult } from "@/lib/autosave";

export type FormState = { error: string | null };

/** Save vs Publish — autosave and Enter-key submits always stay draft-safe. */
function readSaveMode(formData: FormData): "save" | "publish" | "unpublish" {
  const mode = String(formData.get("save_mode") ?? "save");
  return mode === "publish" || mode === "unpublish" ? mode : "save";
}

/** Upload-on-select for update covers and inline images. */
export async function uploadLegalUpdateImageAction(
  file: File
): Promise<{ url: string | null; error: string | null }> {
  return uploadLegalUpdateImage(file);
}

// Legal updates surface on the homepage ("This Week in Law") and in the
// breaking-news bar, so every mutation must invalidate those routes too —
// revalidating only the admin list is how published content ends up
// missing from the homepage until an unrelated rebuild.
function revalidateLegalUpdatePaths(slug?: string) {
  revalidatePath("/admin/legal-updates");
  revalidatePath("/legal-updates");
  revalidatePath("/");
  if (slug) revalidatePath(`/legal-updates/${slug}`);
}

const VALID_STATUSES: LegalUpdateStatus[] = ["pending_review", "published", "rejected"];

function isEmptyDoc(doc: JSONContent): boolean {
  const content = doc.content ?? [];
  if (content.length === 0) return true;
  return content.every(
    (node) => node.type === "paragraph" && (!node.content || node.content.length === 0)
  );
}

function readBody(formData: FormData): JSONContent | null {
  const raw = String(formData.get("body") ?? "").trim();
  if (!raw) return null;
  try {
    const parsed: JSONContent = JSON.parse(raw);
    if (parsed?.type !== "doc") return null;
    if (isEmptyDoc(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Read a file upload or fall back to the existing URL. */
async function readImageUpload(
  formData: FormData,
  fileKey: string,
  existingKey: string,
): Promise<{ url: string | null; error: string | null }> {
  const file = formData.get(fileKey);
  const existing = String(formData.get(existingKey) ?? "").trim();

  if (file instanceof File && file.size > 0) {
    const { url, error } = await uploadLegalUpdateImage(file);
    if (error) return { url: null, error };
    return { url, error: null };
  }

  return { url: existing.length > 0 ? existing : null, error: null };
}

async function readInput(
  formData: FormData
): Promise<{ input: LegalUpdateInput | null; error: string | null }> {
  const optional = (key: string) => {
    const raw = String(formData.get(key) ?? "").trim();
    return raw.length > 0 ? raw : null;
  };

  const headline = String(formData.get("headline") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const source_name = String(formData.get("source_name") ?? "").trim();
  const summaryRaw = String(formData.get("summary") ?? "").trim();
  const practiceAreaRaw = String(formData.get("practice_area_id") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "").trim();

  if (!headline) return { input: null, error: "Headline is required." };
  if (!source_name) return { input: null, error: "Source name is required." };

  // Cover image
  const { url: cover_image_url, error: coverErr } = await readImageUpload(
    formData, "cover_image_file", "existing_cover_image_url"
  );
  if (coverErr) return { input: null, error: coverErr };

  // Inline images (1–4)
  const imgs: { url: string | null; alt: string | null; position: string | null }[] = [];
  for (let i = 1; i <= 4; i++) {
    const { url, error: imgErr } = await readImageUpload(
      formData, `image_${i}_file`, `existing_image_${i}_url`
    );
    if (imgErr) return { input: null, error: imgErr };
    imgs.push({
      url,
      alt: optional(`image_${i}_alt`),
      position: optional(`image_${i}_position`),
    });
  }

  return {
    input: {
      headline,
      slug: slugRaw.length > 0 ? slugRaw : slugify(headline),
      summary: summaryRaw.length > 0 ? summaryRaw : null,
      source_name,
      body: readBody(formData) ? JSON.stringify(readBody(formData)) : null,
      cover_image_url,
      image_1_url: imgs[0].url,
      image_1_alt: imgs[0].alt,
      image_1_position: imgs[0].position,
      image_2_url: imgs[1].url,
      image_2_alt: imgs[1].alt,
      image_2_position: imgs[1].position,
      image_3_url: imgs[2].url,
      image_3_alt: imgs[2].alt,
      image_3_position: imgs[2].position,
      image_4_url: imgs[3].url,
      image_4_alt: imgs[3].alt,
      image_4_position: imgs[3].position,
      practice_area_id: practiceAreaRaw.length > 0 ? practiceAreaRaw : null,
      status: (VALID_STATUSES as string[]).includes(statusRaw)
        ? (statusRaw as LegalUpdateStatus)
        : "pending_review",
    },
    error: null,
  };
}

/**
 * Autosave — never publishes (new rows forced to pending_review; existing
 * rows keep their status), never redirects, never revalidates.
 */
export async function autosaveLegalUpdateAction(
  id: string | null,
  rawData: Record<string, string[]>
): Promise<AutosaveResult> {
  const formData = dataToFormData(rawData);
  const { input, error: validationError } = await readInput(formData);
  if (!input) return { id, error: validationError ?? "Invalid update." };

  if (!id) {
    const created = await createLegalUpdate({ ...input, status: "pending_review" });
    if (created.error && created.error.includes("slug")) {
      const fallbackSlug = `${input.slug}-${Date.now().toString(36)}`;
      const retry = await createLegalUpdate({
        ...input,
        slug: fallbackSlug,
        status: "pending_review",
      });
      if (retry.id) return { id: retry.id, error: null };
    }
    return { id: created.id, error: created.error };
  }

  const current = await getLegalUpdateByIdForAdmin(id);
  if (!current) {
    return { id, error: "This update no longer exists. Reload the editor." };
  }
  const { error } = await updateLegalUpdate(id, { ...input, status: current.status });
  if (error) return { id, error };
  return { id, error: null };
}

export async function createLegalUpdateAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { input, error: validationError } = await readInput(formData);
  if (!input) return { error: validationError ?? "Invalid input." };

  const mode = readSaveMode(formData);
  const autosaveId = String(formData.get("autosave_id") ?? "").trim();

  if (autosaveId) {
    const current = await getLegalUpdateByIdForAdmin(autosaveId);
    if (current) {
      const status: LegalUpdateStatus =
        mode === "publish"
          ? "published"
          : mode === "unpublish"
            ? "pending_review"
            : current.status;
      const { error } = await updateLegalUpdate(autosaveId, { ...input, status });
      if (error) return { error };
      revalidateLegalUpdatePaths(input.slug);
      redirect("/admin/legal-updates");
    }
  }

  // Save never publishes a brand-new update; only Publish does.
  input.status = mode === "publish" ? "published" : "pending_review";

  const { error } = await createLegalUpdate(input);
  if (error) return { error };

  revalidateLegalUpdatePaths(input.slug);
  redirect("/admin/legal-updates");
}

export async function updateLegalUpdateAction(
  id: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { input, error: validationError } = await readInput(formData);
  if (!input) return { error: validationError ?? "Invalid input." };

  const mode = readSaveMode(formData);
  const current = await getLegalUpdateByIdForAdmin(id);
  if (!current) return { error: "This update no longer exists." };
  input.status =
    mode === "publish"
      ? "published"
      : mode === "unpublish"
        ? "pending_review"
        : current.status;

  const { error } = await updateLegalUpdate(id, input);
  if (error) return { error };

  revalidateLegalUpdatePaths(input.slug);
  redirect("/admin/legal-updates");
}

export async function deleteLegalUpdateAction(id: string) {
  const { error } = await deleteLegalUpdate(id);
  if (error) return { error };

  revalidateLegalUpdatePaths();
  return { error: null };
}

export async function setLegalUpdateStatusAction(id: string, status: LegalUpdateStatus) {
  const { error } = await setLegalUpdateStatus(id, status);
  if (error) return { error };

  revalidateLegalUpdatePaths();
  return { error: null };
}
