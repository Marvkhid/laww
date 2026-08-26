import type { UntypedSupabaseClient } from "@/lib/supabase/client";
import type { LegalUpdateRow, PracticeAreaRow } from "@/lib/supabase/types";
import type { LegalUpdate } from "@/lib/types";

export async function getPublishedLegalUpdates(
  supabase: UntypedSupabaseClient,
  limit = 5
): Promise<LegalUpdate[]> {
  const { data, error } = await supabase
    .from("legal_updates")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  const rows = data as LegalUpdateRow[];

  const practiceAreaIds = [
    ...new Set(rows.map((row) => row.practice_area_id).filter((id): id is string => id !== null)),
  ];

  let namesById = new Map<string, string>();
  if (practiceAreaIds.length > 0) {
    const { data: areaData } = await supabase
      .from("practice_areas")
      .select("id, name")
      .in("id", practiceAreaIds);
    const areas = (areaData ?? []) as Pick<PracticeAreaRow, "id" | "name">[];
    namesById = new Map(areas.map((area) => [area.id, area.name]));
  }

  return rows.map((row) => ({
    id: row.id,
    headline: row.headline,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    publishedAt: row.published_at ?? row.created_at,
    practiceArea: row.practice_area_id ? namesById.get(row.practice_area_id) : undefined,
  }));
}
