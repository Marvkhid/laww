import { requireAdmin } from "@/lib/supabase/admin/require-admin";
import type { HomepageHighlightRow } from "@/lib/supabase/types";

export type HomepageHighlightInput = {
  title: string;
  content: string;
  caption: string | null;
  category: string | null;
  image_url: string | null;
  image_position: string;
  published: boolean;
  display_order: number;
};

export async function listHighlightsForAdmin(): Promise<HomepageHighlightRow[]> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("homepage_highlights")
    .select("*")
    .order("display_order", { ascending: true });

  if (error || !data) return [];
  return data as HomepageHighlightRow[];
}

export async function getHighlightByIdForAdmin(id: string): Promise<HomepageHighlightRow | null> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("homepage_highlights")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as HomepageHighlightRow;
}

export async function createHighlight(input: HomepageHighlightInput): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("homepage_highlights").insert(input);

  if (error) {
    console.error("createHighlight error:", error);
    return { error: "Could not create the highlight. Please try again." };
  }
  return { error: null };
}

export async function updateHighlight(id: string, input: HomepageHighlightInput): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("homepage_highlights").update(input).eq("id", id);

  if (error) {
    console.error("updateHighlight error:", error);
    return { error: "Could not update the highlight. Please try again." };
  }
  return { error: null };
}

export async function deleteHighlight(id: string): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("homepage_highlights").delete().eq("id", id);

  if (error) return { error: "Could not delete the highlight. Please try again." };
  return { error: null };
}
