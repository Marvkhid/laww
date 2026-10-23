import type { UntypedSupabaseClient } from "@/lib/supabase/client";
import type { SponsorRow } from "@/lib/supabase/types";
import type { Sponsor } from "@/lib/types";
import {
  isVisibleOn,
  pagesFromLegacyPlacement,
  pagesForRow,
  type PageKey,
} from "@/lib/page-visibility";

function mapSponsorRow(row: SponsorRow): Sponsor {
  const pages = pagesForRow(row.show_on_pages) ?? pagesFromLegacyPlacement(row.placement);
  return {
    name: row.name,
    logoUrl: row.logo_url ?? undefined,
    websiteUrl: row.website_url ?? undefined,
    tier: row.tier ?? undefined,
    placement: row.placement ?? "all",
    imageUrl: row.image_url ?? undefined,
    pageNumber: row.page_number,
    showOnPages: pages,
  };
}

/** Public shape with id for dedup/key usage. */
export type SponsorWithId = Sponsor & Pick<SponsorRow, "id">;

function mapSponsorWithId(row: SponsorRow): SponsorWithId {
  const pages = pagesForRow(row.show_on_pages) ?? pagesFromLegacyPlacement(row.placement);
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url ?? undefined,
    websiteUrl: row.website_url ?? undefined,
    tier: row.tier ?? undefined,
    placement: row.placement ?? "all",
    imageUrl: row.image_url ?? undefined,
    pageNumber: row.page_number,
    showOnPages: pages,
  };
}

/**
 * Where is this advert allowed to show?
 *
 * Reads show_on_pages (written by the admin's "Display On" checkboxes).
 * Rows saved before migration 0025 fall back to the legacy single-value
 * `placement` column, which keeps today's reach — an advert never
 * disappears from a page it currently sits on.
 */
function advertVisibleOn(row: SponsorRow, page: PageKey): boolean {
  const pages =
    pagesForRow(row.show_on_pages) ?? pagesFromLegacyPlacement(row.placement);
  return isVisibleOn(pages, page);
}

/** Active adverts the admin allowed on the given public page. */
export async function getSponsorsForPage(
  supabase: UntypedSupabaseClient,
  page: PageKey
): Promise<SponsorWithId[]> {
  const { data, error } = await supabase
    .from("sponsors")
    .select("*")
    .eq("active", true)
    .order("display_order", { ascending: true });

  if (error || !data) return [];
  return (data as SponsorRow[])
    .filter((row) => advertVisibleOn(row, page))
    .map(mapSponsorWithId);
}

/**
 * Sponsors shown in the homepage logo strip ("Supporting Law Digest").
 * Same page gate as the advert slots, so nothing shows twice or in the
 * wrong place.
 */
export async function getActiveSponsors(
  supabase: UntypedSupabaseClient
): Promise<SponsorWithId[]> {
  return getSponsorsForPage(supabase, "homepage");
}
