"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createPracticeArea,
  updatePracticeArea,
  deletePracticeArea,
} from "@/lib/supabase/admin/practice-areas";
import { uploadPracticeAreaImage } from "@/lib/supabase/admin/storage";
import { slugify } from "@/lib/slugify";

export type FormState = { error: string | null };

type PracticeAreaPayload = {
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  image_alt: string | null;
  display_order: number;
};

async function resolveImage(
  formData: FormData,
  existingUrl: string | null,
  existingAlt: string | null
): Promise<{ url: string | null; alt: string | null; error: string | null }> {
  const file = formData.get("image_file");
  const hasNewFile = file instanceof File && file.size > 0;

  if (hasNewFile) {
    const { url, error } = await uploadPracticeAreaImage(file as File);
    if (error) return { url: null, alt: null, error };
    const alt = String(formData.get("image_alt") ?? "").trim() || existingAlt;
    return { url, alt, error: null };
  }

  // No new file: keep the existing image unless a "remove" flag was set.
  const remove = String(formData.get("remove_image") ?? "") === "1";
  if (remove) return { url: null, alt: null, error: null };

  const alt = String(formData.get("image_alt") ?? "").trim() || existingAlt;
  return { url: existingUrl, alt, error: null };
}

function revalidatePracticeAreas(slug?: string) {
  revalidatePath("/admin/practice-areas");
  revalidatePath("/practice-areas");
  revalidatePath("/"); // homepage "Coverage areas" section
  if (slug) revalidatePath(`/practice-areas/${slug}`);
}

function readInput(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const displayOrderRaw = String(formData.get("display_order") ?? "").trim();
  const displayOrder = displayOrderRaw.length > 0 ? Number(displayOrderRaw) : 0;

  return {
    name,
    slug: slugRaw.length > 0 ? slugRaw : slugify(name),
    description: (() => {
      const raw = String(formData.get("description") ?? "").trim();
      return raw.length > 0 ? raw : null;
    })(),
    displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
  };
}

export async function createPracticeAreaAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const input = readInput(formData);

  if (!input.name) {
    return { error: "Name is required." };
  }

  const image = await resolveImage(formData, null, null);
  if (image.error) return { error: image.error };

  const payload: PracticeAreaPayload = {
    slug: input.slug,
    name: input.name,
    description: input.description,
    image_url: image.url,
    image_alt: image.alt,
    display_order: input.displayOrder,
  };

  const { error } = await createPracticeArea(payload);
  if (error) return { error };

  revalidatePracticeAreas(input.slug);
  redirect("/admin/practice-areas");
}

export async function updatePracticeAreaAction(
  id: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const input = readInput(formData);

  if (!input.name) {
    return { error: "Name is required." };
  }

  const existingUrl = String(formData.get("existing_image_url") ?? "").trim() || null;
  const existingAlt = String(formData.get("existing_image_alt") ?? "").trim() || null;

  const image = await resolveImage(formData, existingUrl, existingAlt);
  if (image.error) return { error: image.error };

  const payload: PracticeAreaPayload = {
    slug: input.slug,
    name: input.name,
    description: input.description,
    image_url: image.url,
    image_alt: image.alt,
    display_order: input.displayOrder,
  };

  const { error } = await updatePracticeArea(id, payload);
  if (error) return { error };

  revalidatePracticeAreas(input.slug);
  redirect("/admin/practice-areas");
}

export async function deletePracticeAreaAction(id: string, slug: string) {
  const { error } = await deletePracticeArea(id);
  if (error) return { error };

  revalidatePracticeAreas(slug);
  return { error: null };
}
