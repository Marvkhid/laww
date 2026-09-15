"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createPracticeArea,
  updatePracticeArea,
  deletePracticeArea,
} from "@/lib/supabase/admin/practice-areas";
import { slugify } from "@/lib/slugify";

export type FormState = { error: string | null };

function readInput(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  return {
    slug: slugRaw.length > 0 ? slugRaw : slugify(name),
    name,
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

  if (!input.name) {
    return { error: "Name is required." };
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

  if (!input.name) {
    return { error: "Name is required." };
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
