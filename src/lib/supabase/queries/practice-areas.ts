import type { UntypedSupabaseClient } from "@/lib/supabase/client";
import type { PracticeAreaRow } from "@/lib/supabase/types";
import type { PracticeArea } from "@/lib/types";

/**
 * Fetch a single practice area by its slug, straight from the database.
 *
 * Why this exists rather than reusing the list:
 *
 * `next build` caches Supabase GET requests in its persistent fetch cache
 * (`.next/cache/fetch-cache`), and that cache survives between builds. A
 * practice area created AFTER the first build is therefore missing from the
 * cached list. The dedicated page looked the slug up in that list, failed to
 * find it, and called `notFound()` — so a brand-new practice area's page
 * returned 404 on the deployed site while working perfectly in dev.
 *
 * A targeted `?slug=eq.…` request is a different URL and so a different
 * cache key, which means it resolves against current data. Combined with
 * Next's default on-demand rendering for unknown params, a newly created
 * practice area now serves its own page without needing a cache purge.
 */
export async function getPracticeAreaBySlug(
  supabase: UntypedSupabaseClient,
  slug: string
): Promise<PracticeArea | null> {
  const { data, error } = await supabase
    .from("practice_areas")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as PracticeAreaRow;
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    imageUrl: row.image_url,
    imageAlt: row.image_alt,
  };
}

export async function getPracticeAreas(
  supabase: UntypedSupabaseClient
): Promise<PracticeArea[]> {
  const { data, error } = await supabase
    .from("practice_areas")
    .select("*")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) return [];
  const rows = data as PracticeAreaRow[];

  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    description: row.description,
    imageUrl: row.image_url,
    imageAlt: row.image_alt,
  }));
}
