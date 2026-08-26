"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createLegalInsight,
  updateLegalInsight,
  deleteLegalInsight,
  type LegalInsightInput,
} from "@/lib/supabase/admin/legal-insights";
import { uploadLegalInsightImage } from "@/lib/supabase/admin/storage";

export type FormState = { error: string | null };

async function readInput(formData: FormData): Promise<{ input: LegalInsightInput | null; error: string | null }> {
  const optional = (key: string) => {
    const raw = String(formData.get(key) ?? "").trim();
    return raw.length > 0 ? raw : null;
  };

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const category = String(formData.get("category") ?? "general").trim();

  if (!title) {
    return { input: null, error: "Title is required." };
  }
  if (!content) {
    return { input: null, error: "Content is required." };
  }

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
      published: formData.get("published") === "on",
      display_order,
    },
    error: null,
  };
}

export async function createLegalInsightAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { input, error: validationError } = await readInput(formData);
  if (!input) return { error: validationError };

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
  const { input, error: validationError } = await readInput(formData);
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
