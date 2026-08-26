import type { UntypedSupabaseClient } from "@/lib/supabase/client";
import type { SponsorRow } from "@/lib/supabase/types";
import type { Sponsor } from "@/lib/types";

function mapSponsorRow(row: SponsorRow): Sponsor {
  return {
    name: row.name,
    logoUrl: row.logo_url ?? undefined,
    websiteUrl: row.website_url ?? undefined,
    tier: row.tier ?? undefined,
    placement: row.placement ?? 'all',
    imageUrl: row.image_url ?? undefined,
    pageNumber: row.page_number,
  };
}

export async function getActiveSponsors(supabase: UntypedSupabaseClient): Promise<Sponsor[]> {
  const { data, error } = await supabase
    .from("sponsors")
    .select("*")
    .eq("active", true)
    .order("display_order", { ascending: true });

  if (error || !data) return [];
  return (data as SponsorRow[]).map(mapSponsorRow);
}

/** Get sponsors filtered by placement. 'homepage' matches placement='homepage' OR placement='all'. */
export async function getSponsorsByPlacement(
  supabase: UntypedSupabaseClient,
  placement: string
): Promise<Sponsor[]> {
  const { data, error } = await supabase
    .from("sponsors")
    .select("*")
    .eq("active", true)
    .or(`placement.eq.${placement},placement.eq.all`)
    .order("display_order", { ascending: true });

  if (error || !data) return [];
  return (data as SponsorRow[]).map(mapSponsorRow);
}
