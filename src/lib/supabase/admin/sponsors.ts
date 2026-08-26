import { requireAdmin } from "@/lib/supabase/admin/require-admin";
import type { SponsorRow } from "@/lib/supabase/types";

export async function listSponsorsForAdmin(): Promise<SponsorRow[]> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("sponsors")
    .select("*")
    .order("display_order", { ascending: true });

  if (error || !data) return [];
  return data as SponsorRow[];
}

export async function getSponsorByIdForAdmin(id: string): Promise<SponsorRow | null> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase.from("sponsors").select("*").eq("id", id).maybeSingle();

  if (error || !data) return null;
  return data as SponsorRow;
}

export type SponsorInput = {
  name: string;
  logo_url: string | null;
  website_url: string | null;
  tier: string | null;
  placement: string;
  image_url: string | null;
  display_order: number;
  page_number: number | null;
  active: boolean;
};

export async function createSponsor(input: SponsorInput): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("sponsors").insert(input);

  if (error) return { error: "Could not create the sponsor. Please try again." };
  return { error: null };
}

export async function updateSponsor(
  id: string,
  input: SponsorInput
): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("sponsors").update(input).eq("id", id);

  if (error) {
    console.error("updateSponsor error:", error);
    if (error.code === "42703" || error.code === "PGRST204") {
      const { page_number: _, ...rest } = input;
      const { error: retryError } = await supabase.from("sponsors").update(rest).eq("id", id);
      if (retryError) {
        console.error("updateSponsor retry error:", retryError);
        return { error: "Could not update the sponsor. Please try again." };
      }
      return { error: null };
    }
    return { error: "Could not update the sponsor. Please try again." };
  }
  return { error: null };
}

export async function setSponsorActive(
  id: string,
  active: boolean
): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("sponsors").update({ active }).eq("id", id);

  if (error) return { error: "Could not update the sponsor. Please try again." };
  return { error: null };
}

export async function deleteSponsor(id: string): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("sponsors").delete().eq("id", id);

  if (error) return { error: "Could not delete the sponsor. Please try again." };
  return { error: null };
}
