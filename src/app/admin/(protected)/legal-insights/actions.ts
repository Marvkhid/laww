"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createLegalInsight,
  updateLegalInsight,
  deleteLegalInsight,
  getLegalInsightByIdForAdmin,
  type LegalInsightInput,
} from "@/lib/supabase/admin/legal-insights";
import { uploadLegalInsightImage } from "@/lib/supabase/admin/storage";
import { dataToFormData, type AutosaveResult } from "@/lib/autosave";
import { readTextPreserving } from "@/lib/form-presence";
import type { LegalInsightRow } from "@/lib/supabase/types";

export type FormState = { error: string | null };

/** Upload-on-select for quiz images. */
export async function uploadLegalInsightImageAction(
  file: File
): Promise<{ url: string | null; error: string | null }> {
  return uploadLegalInsightImage(file);
}

async function readInput(
  formData: FormData,
  current?: LegalInsightRow | null
): Promise<{ input: LegalInsightInput | null; error: string | null }> {
  const optional = (key: string) => {
    const raw = String(formData.get(key) ?? "").trim();
    return raw.length > 0 ? raw : null;
  };
  // Presence rule (see lib/form-presence): a key the payload does not carry
  // keeps its stored value, so an unrelated edit or an early autosave can
  // never empty the Explanation content.
  const preserveable = (key: string, stored: string | null): string =>
    readTextPreserving(formData, key, stored) ?? "";

  const title = preserveable("title", current?.title ?? null);
  const content = preserveable("content", current?.content ?? null);
  const category = String(formData.get("category") ?? "general").trim();

  if (!title) {
    return { input: null, error: "Question is required." };
  }
  if (!content) {
    return { input: null, error: "Explanation is required." };
  }

  // Answer options — collected from option_0..option_5 fields.
  const options: string[] = [];
  for (let i = 0; i < 6; i++) {
    const raw = String(formData.get(`option_${i}`) ?? "").trim();
    if (raw.length > 0) options.push(raw);
  }
  if (options.length < 2) {
    return { input: null, error: "Provide at least two answer options." };
  }

  const correctRaw = String(formData.get("correct_option") ?? "").trim();
  const correctIndex = Number(correctRaw);
  const correct_option =
    correctRaw.length > 0 &&
    Number.isInteger(correctIndex) &&
    correctIndex >= 0 &&
    correctIndex < options.length
      ? correctIndex
      : null;

  // Image upload
  let image_url: string | null = optional("existing_image_url");
  const imageFile = formData.get("image_file");
  if (imageFile instanceof File && imageFile.size > 0) {
    const { url, error } = await uploadLegalInsightImage(imageFile);
    if (error) return { input: null, error };
    image_url = url;
  }

  const displayOrderRaw = String(formData.get("display_order") ?? "0").trim();
  const display_order = Number(displayOrderRaw) || 0;

  return {
    input: {
      title,
      content,
      description: optional("description"),
      category,
      image_url,
      answer_options: options,
      correct_option,
      published: formData.get("published") === "on",
      display_order,
    },
    error: null,
  };
}

/**
 * Autosave — never publishes (new questions forced draft; existing rows
 * keep their flag), never redirects, never revalidates.
 */
export async function autosaveLegalInsightAction(
  id: string | null,
  rawData: Record<string, string[]>
): Promise<AutosaveResult> {
  const formData = dataToFormData(rawData);
  const existing = id ? await getLegalInsightByIdForAdmin(id) : null;
  const { input, error: validationError } = await readInput(formData, existing);
  if (!input) return { id, error: validationError ?? "Invalid question." };

  if (!id) {
    const created = await createLegalInsight({ ...input, published: false });
    return { id: created.id, error: created.error };
  }

  const current = existing;
  if (!current) {
    // Stale id (row deleted elsewhere, or named by an old recovery snapshot).
    // Recover instead of wedging: the editor still holds the user's work, so
    // start a fresh draft and hand its id back. See articles/actions.ts.
    const recreated = await createLegalInsight({ ...input, published: false });
    if (recreated.error) return { id, error: recreated.error };
    return { id: recreated.id, error: null };
  }
  const { error } = await updateLegalInsight(id, { ...input, published: current.published });
  if (error) return { id, error };
  return { id, error: null };
}

export async function createLegalInsightAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const autosaveId = String(formData.get("autosave_id") ?? "").trim();

  const existing = autosaveId
    ? await getLegalInsightByIdForAdmin(autosaveId)
    : null;
  const { input, error: validationError } = await readInput(formData, existing);
  if (!input) return { error: validationError };

  if (autosaveId) {
    const current = existing;
    if (current) {
      // `published` comes from the form's Published checkbox (readInput).
      // The old code consulted a `save_mode` field this form never renders,
      // so it always fell back to "save" and silently ignored the checkbox.
      const { error } = await updateLegalInsight(autosaveId, input);
      if (error) return { error };
      revalidatePath("/admin/legal-insights");
      revalidatePath("/");
      redirect("/admin/legal-insights");
    }
  }

  const { error } = await createLegalInsight(input);
  if (error) return { error };

  revalidatePath("/admin/legal-insights");
  revalidatePath("/");
  redirect("/admin/legal-insights");
}

export async function updateLegalInsightAction(
  id: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const current = await getLegalInsightByIdForAdmin(id);
  if (!current) return { error: "This question no longer exists." };

  const { input, error: validationError } = await readInput(formData, current);
  if (!input) return { error: validationError };

  const { error } = await updateLegalInsight(id, input);
  if (error) return { error };

  revalidatePath("/admin/legal-insights");
  revalidatePath("/");
  redirect("/admin/legal-insights");
}

export async function deleteLegalInsightAction(id: string) {
  const { error } = await deleteLegalInsight(id);
  if (error) return { error };

  revalidatePath("/admin/legal-insights");
  revalidatePath("/");
  return { error: null };
}
