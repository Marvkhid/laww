import { requireAdmin } from "@/lib/supabase/admin/require-admin";
import type { PracticeAreaRow } from "@/lib/supabase/types";


export async function listPracticeAreasForAdmin(): Promise<PracticeAreaRow[]> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("practice_areas")
    .select("*")
    .order("name", { ascending: true });

  if (error || !data) return [];
  return data as PracticeAreaRow[];
}

export async function getPracticeAreaByIdForAdmin(
  id: string
): Promise<PracticeAreaRow | null> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("practice_areas")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as PracticeAreaRow;
}

// Slug is a plain, admin-edited field throughout — no auto-generation from
// name, no migration/redirect logic. The public /practice-areas/[slug]
// route already looks records up by this exact column, unchanged.

export async function createPracticeArea(input: {
  slug: string;
  name: string;
  description: string | null;
}): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("practice_areas").insert({
    slug: input.slug,
    name: input.name,
    description: input.description,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "That slug is already in use by another practice area." };
    }
    return { error: "Could not create the practice area. Please try again." };
  }
  return { error: null };
}

export async function updatePracticeArea(
  id: string,
  input: { slug: string; name: string; description: string | null }
): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("practice_areas")
    .update({
      slug: input.slug,
      name: input.name,
      description: input.description,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "That slug is already in use by another practice area." };
    }
    return { error: "Could not update the practice area. Please try again." };
  }
  return { error: null };
}

export async function deletePracticeArea(id: string): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("practice_areas").delete().eq("id", id);

  if (error) {
    return { error: "Could not delete the practice area. Please try again." };
  }
  return { error: null };
}
