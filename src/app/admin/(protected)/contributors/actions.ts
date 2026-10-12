"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createContributor,
  updateContributor,
  deleteContributor,
  getContributorByIdForAdmin,
  type ContributorInput,
} from "@/lib/supabase/admin/contributors";
import { slugify } from "@/lib/slugify";
import { dataToFormData, type AutosaveResult } from "@/lib/autosave";
import { readTextOptional } from "@/lib/form-presence";

export type FormState = { error: string | null };



/**
 * Autosave — contributors have no publication state; every valid snapshot
 * persists as-is. Never redirects, never revalidates.
 */
export async function autosaveContributorAction(
  id: string | null,
  rawData: Record<string, string[]>
): Promise<AutosaveResult> {
  const formData = dataToFormData(rawData);
  let input: ContributorInput;
  try {
    input = await readInput(formData);
  } catch (err) {
    return {
      id,
      error: err instanceof Error ? err.message : "Could not upload the photo.",
    };
  }
  if (!input.name || !input.role) {
    return { id, error: null }; // required fields not filled in yet — skipped client-side too
  }

  if (!id) {
    const created = await createContributor(input);
    if (created.error && created.error.includes("slug")) {
      const fallbackSlug = `${input.slug}-${Date.now().toString(36)}`;
      const retry = await createContributor({ ...input, slug: fallbackSlug });
      if (retry.id) return { id: retry.id, error: null };
    }
    return { id: created.id, error: created.error };
  }

  const { error } = await updateContributor(id, input);
  if (error) return { id, error };
  return { id, error: null };
}

async function readInput(formData: FormData): Promise<ContributorInput> {
  const optional = (key: string) => {
    const raw = String(formData.get(key) ?? "").trim();
    return raw.length > 0 ? raw : null;
  };

  // The URL comes from the hidden existing_photo_url field, which the upload
  // zone fills the moment a file is selected. No server action reads file
  // bytes: that request is what the host rejects with 413 (request-limits.ts).
  const photo_url: string | null = optional("existing_photo_url");

  const name = String(formData.get("name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();

  return {
    slug: slugRaw.length > 0 ? slugRaw : slugify(name),
    name,
    credentials: optional("credentials"),
    role: String(formData.get("role") ?? "").trim(),
    // Absent → omitted from the UPDATE, so it can never be blanked.
    bio: readTextOptional(formData, "bio"),
    photo_url,
    is_editorial_board: formData.get("is_editorial_board") === "on",
  };
}

export async function createContributorAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  let input: ContributorInput;
  try {
    input = await readInput(formData);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not upload the photo.",
    };
  }

  if (!input.name || !input.role) {
    return { error: "Name and role are both required." };
  }

  // Autosave already created the draft row — continue in it.
  const autosaveId = String(formData.get("autosave_id") ?? "").trim();
  if (autosaveId) {
    const current = await getContributorByIdForAdmin(autosaveId);
    if (current) {
      const { error } = await updateContributor(autosaveId, input);
      if (error) return { error };
      revalidatePath("/admin/contributors");
      revalidatePath("/contributors");
      revalidatePath("/about");
      revalidatePath("/");
      redirect("/admin/contributors");
    }
  }

  const { error } = await createContributor(input);
  if (error) return { error };

  revalidatePath("/admin/contributors");
  revalidatePath("/contributors");
  revalidatePath("/about");
  revalidatePath("/"); // homepage Contributors section
  redirect("/admin/contributors");
}

export async function updateContributorAction(
  id: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  let input: ContributorInput;
  try {
    input = await readInput(formData);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not upload the photo.",
    };
  }

  if (!input.name || !input.role) {
    return { error: "Name and role are both required." };
  }

  const { error } = await updateContributor(id, input);
  if (error) return { error };

  revalidatePath("/admin/contributors");
  revalidatePath("/contributors");
  revalidatePath(`/contributors/${input.slug}`);
  revalidatePath("/about");
  revalidatePath("/"); // homepage Contributors section
  redirect("/admin/contributors");
}

export async function deleteContributorAction(id: string, slug: string) {
  const { error } = await deleteContributor(id);
  if (error) return { error };

  revalidatePath("/admin/contributors");
  revalidatePath("/contributors");
  revalidatePath(`/contributors/${slug}`);
  revalidatePath("/about");
  revalidatePath("/"); // homepage Contributors section
  return { error: null };
}
