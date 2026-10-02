"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createSponsor,
  updateSponsor,
  deleteSponsor,
  setSponsorActive,
  getSponsorByIdForAdmin,
  type SponsorInput,
} from "@/lib/supabase/admin/sponsors";
import { uploadSponsorImage } from "@/lib/supabase/admin/storage";
import {
  ADVERT_PAGE_OPTIONS,
  pagesFromFormData,
} from "@/lib/page-visibility";
import { dataToFormData, type AutosaveResult } from "@/lib/autosave";

export type FormState = { error: string | null };

// Adverts can sit on any public page, so every save must invalidate all of
// them — otherwise a changed advert keeps rendering from the old route cache
// on the pages it targets.
const AD_PAGES = [
  "/",
  "/about",
  "/articles",
  "/issues",
  "/events",
  "/legal-updates",
  "/contributors",
  "/contact",
] as const;

function revalidateAdPaths() {
  revalidatePath("/admin/sponsors");
  for (const page of AD_PAGES) revalidatePath(page);
}

async function readInput(formData: FormData): Promise<{ input: SponsorInput | null; error: string | null }> {
  const name = String(formData.get("name") ?? "").trim();
  const optional = (key: string) => {
    const raw = String(formData.get(key) ?? "").trim();
    return raw.length > 0 ? raw : null;
  };
  const displayOrderRaw = String(formData.get("display_order") ?? "0").trim();
  const pageNumberRaw = String(formData.get("page_number") ?? "").trim();

  if (!name) {
    return { input: null, error: "Name is required." };
  }
  if (displayOrderRaw && !Number.isInteger(Number(displayOrderRaw))) {
    return { input: null, error: "Display order must be a whole number." };
  }
  if (pageNumberRaw && !Number.isInteger(Number(pageNumberRaw))) {
    return { input: null, error: "Page number must be a whole number." };
  }

  // Logo image upload
  let logo_url: string | null = optional("existing_logo_url");
  const logoFile = formData.get("logo_file");
  if (logoFile instanceof File && logoFile.size > 0) {
    const { url, error: logoError } = await uploadSponsorImage(logoFile);
    if (logoError) return { input: null, error: logoError };
    logo_url = url;
  }

  // Banner image upload
  let image_url: string | null = optional("existing_image_url");
  const imageFile = formData.get("image_file");
  if (imageFile instanceof File && imageFile.size > 0) {
    const { url, error: imageError } = await uploadSponsorImage(imageFile);
    if (imageError) return { input: null, error: imageError };
    image_url = url;
  }

  // "Display On" — null when the group was not rendered (migration 0025
  // pending), so the column keeps its current value.
  const show_on_pages = pagesFromFormData(formData, ADVERT_PAGE_OPTIONS);
  if (show_on_pages && show_on_pages.length === 0) {
    return { input: null, error: "Select at least one page under Display On." };
  }

  return {
    input: {
      name,
      logo_url,
      image_url,
      website_url: optional("website_url"),
      tier: optional("tier"),
      display_order: displayOrderRaw ? Number(displayOrderRaw) : 0,
      page_number: pageNumberRaw ? Number(pageNumberRaw) : null,
      active: formData.get("active") === "on",
      ...(show_on_pages ? { show_on_pages } : {}),
    },
    error: null,
  };
}

/** Upload-on-select for advert artwork and logos. */
export async function uploadSponsorImageAction(
  file: File
): Promise<{ url: string | null; error: string | null }> {
  return uploadSponsorImage(file);
}

/**
 * Autosave — adverts have no draft/publish duality beyond `active`, and a
 * brand-new advert must never go live from autosave alone: creates force
 * active=false (the admin's explicit Save applies the checkbox), while
 * updates persist every targeting/status choice so toggling an existing
 * advert off takes effect without a separate step.
 */
export async function autosaveSponsorAction(
  id: string | null,
  rawData: Record<string, string[]>
): Promise<AutosaveResult> {
  const formData = dataToFormData(rawData);
  const { input, error: validationError } = await readInput(formData);
  if (!input) return { id, error: validationError ?? "Invalid advert." };

  if (!id) {
    const created = await createSponsor({ ...input, active: false });
    if (created.id) return { id: created.id, error: null };
    return { id: null, error: created.error };
  }

  const current = await getSponsorByIdForAdmin(id);
  if (!current) {
    return { id, error: "This advert no longer exists. Reload the editor." };
  }
  const { error } = await updateSponsor(id, input);
  if (error) return { id, error };
  return { id, error: null };
}

export async function createSponsorAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { input, error: validationError } = await readInput(formData);
  if (!input) return { error: validationError };

  // Autosave already created the draft advert — continue in it so no
  // duplicate row is produced, and let this explicit Save apply `active`.
  const autosaveId = String(formData.get("autosave_id") ?? "").trim();
  if (autosaveId) {
    const current = await getSponsorByIdForAdmin(autosaveId);
    if (current) {
      const { error } = await updateSponsor(autosaveId, input);
      if (error) return { error };
      revalidateAdPaths();
      redirect("/admin/sponsors");
    }
  }

  const { error } = await createSponsor(input);
  if (error) return { error };

  revalidateAdPaths();
  redirect("/admin/sponsors");
}

export async function updateSponsorAction(
  id: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { input, error: validationError } = await readInput(formData);
  if (!input) return { error: validationError };

  const { error } = await updateSponsor(id, input);
  if (error) return { error };

  revalidateAdPaths();
  redirect("/admin/sponsors");
}

export async function deleteSponsorAction(id: string) {
  const { error } = await deleteSponsor(id);
  if (error) return { error };

  revalidateAdPaths();
  return { error: null };
}

export async function toggleSponsorActiveAction(id: string, active: boolean) {
  const { error } = await setSponsorActive(id, active);
  if (error) return { error };

  revalidateAdPaths();
  return { error: null };
}
