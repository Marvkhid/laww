import { requireAdmin } from "@/lib/supabase/admin/require-admin";
import type { PracticeAreaRow } from "@/lib/supabase/types";


export async function listPracticeAreasForAdmin(): Promise<PracticeAreaRow[]> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("practice_areas")
    .select("*")
    .order("display_order", { ascending: true })
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
  image_url: string | null;
  image_alt: string | null;
  display_order: number;
}): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("practice_areas").insert({
    slug: input.slug,
    name: input.name,
    description: input.description,
    image_url: input.image_url,
    image_alt: input.image_alt,
    display_order: input.display_order,
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
  input: {
    slug: string;
    name: string;
    description: string | null;
    image_url: string | null;
    image_alt: string | null;
    display_order: number;
  }
): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("practice_areas")
    .update({
      slug: input.slug,
      name: input.name,
      description: input.description,
      image_url: input.image_url,
      image_alt: input.image_alt,
      display_order: input.display_order,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "42703" || error.code === "PGRST204") {
      // Migration 0024 may not be applied yet — degrade gracefully to the
      // pre-image schema so core name/slug/description editing keeps working.
      const { image_url: _i, image_alt: _a, display_order: _d, ...rest } = input;
      const { error: retryError } = await supabase
        .from("practice_areas")
        .update(rest)
        .eq("id", id);
      if (retryError) {
        if (retryError.code === "23505") {
          return { error: "That slug is already in use by another practice area." };
        }
        return { error: "Could not update the practice area. Please try again." };
      }
      return { error: null };
    }
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
