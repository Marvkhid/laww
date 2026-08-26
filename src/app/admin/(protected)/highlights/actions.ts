"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createHighlight,
  updateHighlight,
  deleteHighlight,
  type HomepageHighlightInput,
} from "@/lib/supabase/admin/homepage-highlights";
import { uploadHighlightImage } from "@/lib/supabase/admin/storage";

export type FormState = { error: string | null };

async function readInput(formData: FormData): Promise<{ input: HomepageHighlightInput | null; error: string | null }> {
  const optional = (key: string) => {
    const raw = String(formData.get(key) ?? "").trim();
    return raw.length > 0 ? raw : null;
  };

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

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

export async function createHighlightAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { input, error: validationError } = await readInput(formData);
  if (!input) return { error: validationError };

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
  const { input, error: validationError } = await readInput(formData);
  if (!input) return { error: validationError };

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
