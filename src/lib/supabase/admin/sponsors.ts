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
  image_url: string | null;
  display_order: number;
  page_number: number | null;
  active: boolean;
  /** Page keys from the admin's "Display On" group; omitted when unavailable. */
  show_on_pages?: string[];
};

// show_on_pages is written in its own statement so a missing column
// (migration 0025 not applied yet) can never roll back the advert itself.
// The admin form withholds the "Display On" group in that state, so no
// selection is ever silently dropped.
async function applyPageVisibility(
  supabase: Awaited<ReturnType<typeof requireAdmin>>,
  sponsorId: string,
  pages: string[] | undefined
): Promise<void> {
  if (!pages) return;
  const { error } = await supabase
    .from("sponsors")
    .update({ show_on_pages: pages })
    .eq("id", sponsorId);
  if (error) {
    if (error.code === "42703" || error.code === "PGRST204") {
      console.warn("show_on_pages column not found — run migration 0025_page_visibility");
    } else {
      console.error("applyPageVisibility error:", error);
    }
  }
}

export async function createSponsor(input: SponsorInput): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { show_on_pages, ...row } = input;
  const { data, error } = await supabase.from("sponsors").insert(row).select("id").maybeSingle();

  if (error || !data) {
    console.error("createSponsor error:", error);
    return { error: "Could not create the advert. Please try again." };
  }
  await applyPageVisibility(supabase, (data as { id: string }).id, show_on_pages);
  return { error: null };
}

export async function updateSponsor(
  id: string,
  input: SponsorInput
): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { show_on_pages, ...row } = input;
  const { error } = await supabase.from("sponsors").update(row).eq("id", id);

  if (error) {
    console.error("updateSponsor error:", error);
    if (error.code === "42703" || error.code === "PGRST204") {
      const { page_number: _, ...rest } = row;
      const { error: retryError } = await supabase.from("sponsors").update(rest).eq("id", id);
      if (retryError) {
        console.error("updateSponsor retry error:", retryError);
        return { error: "Could not update the advert. Please try again." };
      }
      await applyPageVisibility(supabase, id, show_on_pages);
      return { error: null };
    }
    return { error: "Could not update the advert. Please try again." };
  }
  await applyPageVisibility(supabase, id, show_on_pages);
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
