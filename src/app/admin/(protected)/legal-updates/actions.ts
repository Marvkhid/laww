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
import type { LegalUpdateRow, LegalUpdateStatus } from "@/lib/supabase/types";
import type { JSONContent } from "@tiptap/core";
import { slugify } from "@/lib/slugify";
import { dataToFormData, type AutosaveResult } from "@/lib/autosave";
import {
  readBodyPreserving,
  readTextOptional,
  readTextPreserving,
  storedText as storedTextOf,
} from "@/lib/form-presence";

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

/**
 * Read the body, but only trust it when the editor reports it has mounted.
 *
 * `body_state` is written by TiptapEditor on mount. Without it the body in
 * this payload is an artefact of an editor that never initialised — an
 * autosave that fired too early, or a restored tab — and writing it would
 * wipe a real body with null. Same guard as the article editor.
 */
function readBody(
  formData: FormData,
  current?: LegalUpdateRow | null
): JSONContent | null {
  return readBodyPreserving(
    formData,
    current?.body ?? null,
    parseBodyString
  );
}

/** Parse the hidden body field; null for empty/malformed/empty-doc input. */
function parseBodyString(raw: string): JSONContent | null {
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
  formData: FormData,
  current?: LegalUpdateRow | null
): Promise<{ input: LegalUpdateInput | null; error: string | null }> {
  // Presence rule (see lib/form-presence): present → deliberate value,
  // absent → keep what is stored.
  const preserveable = (
    key: string,
    stored: string | null | undefined
  ): string | null => readTextPreserving(formData, key, stored);

  const storedText = (key: keyof LegalUpdateRow): string | null =>
    storedTextOf(current, key);

  const headline = String(formData.get("headline") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const source_name = String(formData.get("source_name") ?? "").trim();
  const practiceAreaRaw = String(formData.get("practice_area_id") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "").trim();

  if (!headline) return { input: null, error: "Headline is required." };
  if (!source_name) return { input: null, error: "Source name is required." };

  // Cover image
  const { url: resolvedCover, error: coverErr } = await readImageUpload(
    formData, "cover_image_file", "existing_cover_image_url"
  );
  if (coverErr) return { input: null, error: coverErr };
  const cover_image_url = formData.has("existing_cover_image_url")
    ? resolvedCover
    : (storedText("cover_image_url") ?? resolvedCover);

  // Inline images (1–4)
  const imgs: { url: string | null; alt: string | null; position: string | null }[] = [];
  for (let i = 1; i <= 4; i++) {
    const { url: resolvedUrl, error: imgErr } = await readImageUpload(
      formData, `image_${i}_file`, `existing_image_${i}_url`
    );
    if (imgErr) return { input: null, error: imgErr };
    imgs.push({
      // Present (even empty) → the resolved value is deliberate; absent →
      // this slot was never in the payload, so keep what is stored.
      url: formData.has(`existing_image_${i}_url`)
        ? resolvedUrl
        : (storedText(`image_${i}_url` as keyof LegalUpdateRow) ?? resolvedUrl),
      alt: preserveable(
        `image_${i}_alt`,
        storedText(`image_${i}_alt` as keyof LegalUpdateRow)
      ),
      position: preserveable(
        `image_${i}_position`,
        storedText(`image_${i}_position` as keyof LegalUpdateRow)
      ),
    });
  }

  return {
    input: {
      headline,
      slug: slugRaw.length > 0 ? slugRaw : slugify(headline),
      // Absent → omitted from the UPDATE, so it can never be blanked.
      summary: readTextOptional(formData, "summary"),
      source_name,
      body: (() => {
        const parsed = readBody(formData, current);
        return parsed ? JSON.stringify(parsed) : null;
      })(),
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
  // Read against the stored row so a partial snapshot cannot null a field
  // it never carried (most importantly the body).
  const existing = id ? await getLegalUpdateByIdForAdmin(id) : null;
  const { input, error: validationError } = await readInput(formData, existing);
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

  const current = existing;
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
  const mode = readSaveMode(formData);
  const autosaveId = String(formData.get("autosave_id") ?? "").trim();

  const existing = autosaveId
    ? await getLegalUpdateByIdForAdmin(autosaveId)
    : null;
  const { input, error: validationError } = await readInput(formData, existing);
  if (!input) return { error: validationError ?? "Invalid input." };

  if (autosaveId) {
    const current = existing;
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
  const current = await getLegalUpdateByIdForAdmin(id);
  if (!current) return { error: "This update no longer exists." };

  const { input, error: validationError } = await readInput(formData, current);
  if (!input) return { error: validationError ?? "Invalid input." };

  const mode = readSaveMode(formData);
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
