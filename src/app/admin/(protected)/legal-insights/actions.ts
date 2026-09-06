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

async function readInput(
  formData: FormData
): Promise<{ input: LegalInsightInput | null; error: string | null }> {
  const optional = (key: string) => {
    const raw = String(formData.get(key) ?? "").trim();
    return raw.length > 0 ? raw : null;
  };

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
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
