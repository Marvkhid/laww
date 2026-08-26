"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createContributor,
  updateContributor,
  deleteContributor,
  type ContributorInput,
} from "@/lib/supabase/admin/contributors";
import { uploadContributorPhoto } from "@/lib/supabase/admin/storage";

export type FormState = { error: string | null };

async function readInput(formData: FormData): Promise<ContributorInput> {
  const optional = (key: string) => {
    const raw = String(formData.get(key) ?? "").trim();
    return raw.length > 0 ? raw : null;
  };

  // Photo upload takes priority; fall back to hidden field for existing URL
  let photo_url: string | null = optional("existing_photo_url");
  const photoFile = formData.get("photo_file");
  if (photoFile instanceof File && photoFile.size > 0) {
    const { url, error: photoError } = await uploadContributorPhoto(photoFile);
    if (photoError) throw new Error(photoError);
    photo_url = url;
  }

  return {
    slug: String(formData.get("slug") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    credentials: optional("credentials"),
    role: String(formData.get("role") ?? "").trim(),
    bio: optional("bio"),
    photo_url,
    is_editorial_board: formData.get("is_editorial_board") === "on",
  };
}

export async function createContributorAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const input = await readInput(formData);

  if (!input.slug || !input.name || !input.role) {
    return { error: "Slug, name, and role are all required." };
  }

  const { error } = await createContributor(input);
  if (error) return { error };

  revalidatePath("/admin/contributors");
  revalidatePath("/contributors");
  revalidatePath("/about");
  redirect("/admin/contributors");
}

export async function updateContributorAction(
  id: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const input = await readInput(formData);

  if (!input.slug || !input.name || !input.role) {
    return { error: "Slug, name, and role are all required." };
  }

  const { error } = await updateContributor(id, input);
  if (error) return { error };

  revalidatePath("/admin/contributors");
  revalidatePath("/contributors");
  revalidatePath(`/contributors/${input.slug}`);
  revalidatePath("/about");
  redirect("/admin/contributors");
}

export async function deleteContributorAction(id: string, slug: string) {
  const { error } = await deleteContributor(id);
  if (error) return { error };

  revalidatePath("/admin/contributors");
  revalidatePath("/contributors");
  revalidatePath(`/contributors/${slug}`);
  revalidatePath("/about");
  return { error: null };
}
