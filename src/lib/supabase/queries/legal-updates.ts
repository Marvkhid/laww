import type { UntypedSupabaseClient } from "@/lib/supabase/client";
import type { LegalUpdateRow, PracticeAreaRow } from "@/lib/supabase/types";
import type { LegalUpdate } from "@/lib/types";
import type { JSONContent } from "@tiptap/core";

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
    slug: row.slug,
    headline: row.headline,
    summary: row.summary,
    sourceName: row.source_name,
    publishedAt: row.published_at ?? row.created_at,
    practiceArea: row.practice_area_id ? namesById.get(row.practice_area_id) : undefined,
    body: row.body as JSONContent | null,
  }));
}

export type LegalUpdateDetail = LegalUpdate & {
  coverImageUrl: string | null;
  images: {
    url: string | null;
    alt: string | null;
    position: string | null;
  }[];
};

export async function getPublishedLegalUpdateBySlug(
  supabase: UntypedSupabaseClient,
  slug: string
): Promise<LegalUpdateDetail | null> {
  const { data, error } = await supabase
    .from("legal_updates")
    .select("*")
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as LegalUpdateRow;

  let practiceArea: string | undefined;
  if (row.practice_area_id) {
    const { data: areaData } = await supabase
      .from("practice_areas")
      .select("name")
      .eq("id", row.practice_area_id)
      .maybeSingle();
    practiceArea = (areaData as Pick<PracticeAreaRow, "name"> | null)?.name ?? undefined;
  }

  return {
    id: row.id,
    slug: row.slug,
    headline: row.headline,
    summary: row.summary,
    sourceName: row.source_name,
    publishedAt: row.published_at ?? row.created_at,
    practiceArea,
    body: row.body as JSONContent | null,
    coverImageUrl: row.cover_image_url,
    images: [
      { url: row.image_1_url, alt: row.image_1_alt, position: row.image_1_position },
      { url: row.image_2_url, alt: row.image_2_alt, position: row.image_2_position },
      { url: row.image_3_url, alt: row.image_3_alt, position: row.image_3_position },
      { url: row.image_4_url, alt: row.image_4_alt, position: row.image_4_position },
    ],
  };
}
