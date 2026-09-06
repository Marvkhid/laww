import { requireAdmin } from "@/lib/supabase/admin/require-admin";
import type { LawyerInTheNewsRow, LawyerNewsStatus, LawyerQAPair } from "@/lib/supabase/types";

export type LawyerNewsInput = {
  slug: string;
  lawyer_name: string;
  lawyer_title: string | null;
  intro: string | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  image_1_url: string | null;
  image_1_alt: string | null;
  image_1_position: string | null;
  image_2_url: string | null;
  image_2_alt: string | null;
  image_2_position: string | null;
  image_3_url: string | null;
  image_3_alt: string | null;
  image_3_position: string | null;
  image_4_url: string | null;
  image_4_alt: string | null;
  image_4_position: string | null;
  qa_pairs: LawyerQAPair[];
  status: LawyerNewsStatus;
};

export async function listLawyerNewsForAdmin(): Promise<LawyerInTheNewsRow[]> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("lawyer_in_the_news")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("listLawyerNewsForAdmin error:", error);
    return [];
  }
  return (data ?? []) as LawyerInTheNewsRow[];
}

export async function getLawyerNewsByIdForAdmin(id: string): Promise<LawyerInTheNewsRow | null> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("lawyer_in_the_news")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getLawyerNewsByIdForAdmin error:", error);
    return null;
  }
  return (data as LawyerInTheNewsRow) ?? null;
}

export async function createLawyerNews(input: LawyerNewsInput): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("lawyer_in_the_news").insert({
    ...input,
    published_at: input.status === "published" ? new Date().toISOString() : null,
  });

  if (error) {
    console.error("createLawyerNews error:", error);
    if (error.code === "23505") return { error: "An entry with this slug already exists." };
    return { error: "Could not save. Please try again." };
  }
  return { error: null };
}

export async function updateLawyerNews(
  id: string,
  input: LawyerNewsInput
): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("lawyer_in_the_news").update(input).eq("id", id);

  if (error) {
    console.error("updateLawyerNews error:", error);
    if (error.code === "23505") return { error: "An entry with this slug already exists." };
    return { error: "Could not save. Please try again." };
  }
  return { error: null };
}

export async function deleteLawyerNews(id: string): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("lawyer_in_the_news").delete().eq("id", id);

  if (error) {
    console.error("deleteLawyerNews error:", error);
    return { error: "Could not delete. Please try again." };
  }
  return { error: null };
}
