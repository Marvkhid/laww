"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createHighlight,
  updateHighlight,
  deleteHighlight,
  getHighlightByIdForAdmin,
  type HomepageHighlightInput,
} from "@/lib/supabase/admin/homepage-highlights";
import type { HomepageHighlightRow } from "@/lib/supabase/types";
import { uploadHighlightImage } from "@/lib/supabase/admin/storage";
import { dataToFormData, type AutosaveResult } from "@/lib/autosave";
import { readTextPreserving } from "@/lib/form-presence";

export type FormState = { error: string | null };

/** Save vs Publish — autosave and Enter-key submits always stay draft-safe. */
function readSaveMode(formData: FormData): "save" | "publish" | "unpublish" {
  const mode = String(formData.get("save_mode") ?? "save");
  return mode === "publish" || mode === "unpublish" ? mode : "save";
}

/** Upload-on-select for highlight images. */
export async function uploadHighlightImageAction(
  file: File
): Promise<{ url: string | null; error: string | null }> {
  return uploadHighlightImage(file);
}

async function readInput(
  formData: FormData,
  current?: HomepageHighlightRow | null
): Promise<{ input: HomepageHighlightInput | null; error: string | null }> {
  const optional = (key: string) => {
    const raw = String(formData.get(key) ?? "").trim();
    return raw.length > 0 ? raw : null;
  };
  // Presence rule (see lib/form-presence): a key the payload does not carry
  // was never rendered or never loaded, so keep what is stored rather than
  // overwriting it. This is what stops an unrelated edit or an early
  // autosave from emptying the Content field.
  const preserveable = (key: string, stored: string | null): string =>
    readTextPreserving(formData, key, stored) ?? "";

  const title = preserveable("title", current?.title ?? null);
  const content = preserveable("content", current?.content ?? null);

  // Image is the only required field
  // Image upload
  let image_url: string | null = optional("existing_image_url");
  const imageFile = formData.get("image_file");
  if (imageFile instanceof File && imageFile.size > 0) {
    const { url, error } = await uploadHighlightImage(imageFile);
    if (error) return { input: null, error };
    image_url = url;
  }

  if (!image_url) {
    return { input: null, error: "Image is required." };
  }

  const displayOrderRaw = String(formData.get("display_order") ?? "0").trim();
  const display_order = Number(displayOrderRaw) || 0;
  const image_position = optional("image_position") ?? "left";

  return {
    input: {
      title: title || "",
      content: content || "",
      caption: optional("caption"),
      category: optional("category"),
      image_url,
      image_position,
      published: formData.get("published") === "on",
      display_order,
    },
    error: null,
  };
}

/**
 * Autosave — never publishes (new rows forced draft; existing rows keep
 * their flag), never redirects, never revalidates.
 */
export async function autosaveHighlightAction(
  id: string | null,
  rawData: Record<string, string[]>
): Promise<AutosaveResult> {
  const formData = dataToFormData(rawData);
  // Read against the stored row so a partial snapshot cannot empty a field.
  const existing = id ? await getHighlightByIdForAdmin(id) : null;
  const { input, error: validationError } = await readInput(formData, existing);
  if (!input) return { id, error: validationError ?? "Invalid highlight." };

  if (!id) {
    const created = await createHighlight({ ...input, published: false });
    return { id: created.id, error: created.error };
  }

  const current = existing;
  if (!current) {
    return { id, error: "This draft no longer exists. Reload the editor." };
  }
  const { error } = await updateHighlight(id, { ...input, published: current.published });
  if (error) return { id, error };
  return { id, error: null };
}

export async function createHighlightAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const mode = readSaveMode(formData);
  const autosaveId = String(formData.get("autosave_id") ?? "").trim();

  const existing = autosaveId ? await getHighlightByIdForAdmin(autosaveId) : null;
  const { input, error: validationError } = await readInput(formData, existing);
  if (!input) return { error: validationError };

  if (autosaveId) {
    const current = existing;
    if (current) {
      input.published =
        mode === "publish" ? true : mode === "unpublish" ? false : current.published;
      const { error } = await updateHighlight(autosaveId, input);
      if (error) return { error };
      revalidatePath("/admin/highlights");
      revalidatePath("/");
      redirect("/admin/highlights");
    }
  }

  // Save never publishes a brand-new highlight; only Publish does.
  input.published = mode === "publish";

  const { error } = await createHighlight(input);
  if (error) return { error };

  revalidatePath("/admin/highlights");
  revalidatePath("/");
  redirect("/admin/highlights");
}

export async function updateHighlightAction(
  id: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const mode = readSaveMode(formData);
  const current = await getHighlightByIdForAdmin(id);
  if (!current) return { error: "This highlight no longer exists." };

  const { input, error: validationError } = await readInput(formData, current);
  if (!input) return { error: validationError };

  input.published =
    mode === "publish" ? true : mode === "unpublish" ? false : current.published;

  const { error } = await updateHighlight(id, input);
  if (error) return { error };

  revalidatePath("/admin/highlights");
  revalidatePath("/");
  redirect("/admin/highlights");
}

export async function deleteHighlightAction(id: string) {
  const { error } = await deleteHighlight(id);
  if (error) return { error };

  revalidatePath("/admin/highlights");
  revalidatePath("/");
  return { error: null };
}
