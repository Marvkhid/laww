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
 * Identity of one advert. Two rows with the same key are the SAME advert
 * stored twice — the duplicate rows the old create path produced — and must
 * never be rendered (or listed in the admin) twice.
 *
 * The key is the full placement tuple, not the name: this schema permits two
 * different adverts to share a name / sponsor, and collapsing them would hide
 * a real record. `active` is deliberately excluded — the duplicate pair is
 * usually one inactive draft plus the live row that replaced it.
 *
 * Mirrors `findSponsorForAdoption()` in the admin actions and the expression
 * index in `0028_sponsor_dedupe.sql`.
 */
export function sponsorIdentityKey(
  row: Pick<
    SponsorRow,
    | "name"
    | "logo_url"
    | "image_url"
    | "website_url"
    | "tier"
    | "placement"
    | "show_on_pages"
    | "display_order"
    | "page_number"
  >
): string {
  const pages =
    pagesForRow(row.show_on_pages) ?? pagesFromLegacyPlacement(row.placement);
  return [
    row.name.trim().toLowerCase(),
    row.logo_url ?? "",
    row.image_url ?? "",
    row.website_url ?? "",
    row.tier ?? "",
    String(row.display_order),
    row.page_number === null ? "" : String(row.page_number),
    [...pages].sort().join(","),
  ].join("\u0000");
}

/**
 * Collapse duplicate advert rows: keep one row per identity.
 *
 * A live row always wins over a draft duplicate, so hiding a duplicate can
 * never hide the advert the public site is actually serving. Insertion order
 * is preserved, so callers keep their `display_order` ordering.
 */
export function dedupeSponsorRows(rows: SponsorRow[]): SponsorRow[] {
  const kept = new Map<string, SponsorRow>();
  for (const row of rows) {
    const key = sponsorIdentityKey(row);
    const existing = kept.get(key);
    if (!existing) {
      kept.set(key, row);
    } else if (!existing.active && row.active) {
      kept.set(key, row);
    }
  }
  return [...kept.values()];
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
  return dedupeSponsorRows(data as SponsorRow[])
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
