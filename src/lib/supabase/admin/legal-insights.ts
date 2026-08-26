import { requireAdmin } from "@/lib/supabase/admin/require-admin";
import type { LegalInsightRow } from "@/lib/supabase/types";

export type LegalInsightInput = {
  title: string;
  content: string;
  description: string | null;
  category: string;
  image_url: string | null;
  published: boolean;
  display_order: number;
};

export async function listLegalInsightsForAdmin(): Promise<LegalInsightRow[]> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("legal_insights")
    .select("*")
    .order("display_order", { ascending: true });

  if (error || !data) return [];
  return data as LegalInsightRow[];
}

export async function getLegalInsightByIdForAdmin(id: string): Promise<LegalInsightRow | null> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("legal_insights")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as LegalInsightRow;
}

export async function createLegalInsight(input: LegalInsightInput): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("legal_insights").insert(input);

  if (error) {
    console.error("createLegalInsight error:", error);
    return { error: "Could not create the legal insight. Please try again." };
  }
  return { error: null };
}

export async function updateLegalInsight(id: string, input: LegalInsightInput): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("legal_insights").update(input).eq("id", id);

  if (error) {
    console.error("updateLegalInsight error:", error);
    return { error: "Could not update the legal insight. Please try again." };
  }
  return { error: null };
}

export async function deleteLegalInsight(id: string): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("legal_insights").delete().eq("id", id);

  if (error) return { error: "Could not delete the legal insight. Please try again." };
  return { error: null };
}
