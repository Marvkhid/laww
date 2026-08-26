"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createPracticeArea,
  updatePracticeArea,
  deletePracticeArea,
} from "@/lib/supabase/admin/practice-areas";

export type FormState = { error: string | null };

function readInput(formData: FormData) {
  return {
    slug: String(formData.get("slug") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    description: (() => {
      const raw = String(formData.get("description") ?? "").trim();
      return raw.length > 0 ? raw : null;
    })(),
  };
}

export async function createPracticeAreaAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const input = readInput(formData);

  if (!input.slug || !input.name) {
    return { error: "Slug and name are both required." };
  }

  const { error } = await createPracticeArea(input);
  if (error) return { error };

  revalidatePath("/admin/practice-areas");
  revalidatePath("/practice-areas");
  redirect("/admin/practice-areas");
}

export async function updatePracticeAreaAction(
  id: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const input = readInput(formData);

  if (!input.slug || !input.name) {
    return { error: "Slug and name are both required." };
  }

  const { error } = await updatePracticeArea(id, input);
  if (error) return { error };

  revalidatePath("/admin/practice-areas");
  revalidatePath("/practice-areas");
  revalidatePath(`/practice-areas/${input.slug}`);
  redirect("/admin/practice-areas");
}

export async function deletePracticeAreaAction(id: string, slug: string) {
  const { error } = await deletePracticeArea(id);
  if (error) return { error };

  revalidatePath("/admin/practice-areas");
  revalidatePath("/practice-areas");
  revalidatePath(`/practice-areas/${slug}`);
  return { error: null };
}
