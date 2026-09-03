import { requireAdmin } from "@/lib/supabase/admin/require-admin";
import type {
  LegalUpdateRow,
  LegalUpdateOrigin,
  LegalUpdateStatus,
  PracticeAreaRow,
} from "@/lib/supabase/types";

export type LegalUpdateForAdmin = LegalUpdateRow & { practice_area_name: string | null };

export async function listLegalUpdatesForAdmin(): Promise<LegalUpdateForAdmin[]> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("legal_updates")
    .select("*")
    .order("created_at", { ascending: false });

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
    ...row,
    practice_area_name: row.practice_area_id ? namesById.get(row.practice_area_id) ?? null : null,
  }));
}

export async function getLegalUpdateByIdForAdmin(id: string): Promise<LegalUpdateRow | null> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("legal_updates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as LegalUpdateRow;
}

export type LegalUpdateInput = {
  headline: string;
  slug: string;
  summary: string | null;
  source_name: string;
  body: string | null;
  cover_image_url: string | null;
  image_1_url: string | null;
  image_1_alt: string | null;
  image_1_position: string | null;
  image_2_url: string | null;
  image_2_alt: string | null;
  image_2_position: string | null;
  image_3_url: string | null;
  image_3_alt: string | null;
  image_3_position: string | null;
  image_4_url: string | null;
  image_4_alt: string | null;
  image_4_position: string | null;
  practice_area_id: string | null;
  status: LegalUpdateStatus;
};

export async function createLegalUpdate(
  input: LegalUpdateInput
): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("legal_updates").insert({
    headline: input.headline,
    slug: input.slug,
    summary: input.summary,
    source_name: input.source_name,
    body: input.body ? JSON.parse(input.body) : null,
    cover_image_url: input.cover_image_url,
    image_1_url: input.image_1_url,
    image_1_alt: input.image_1_alt,
    image_1_position: input.image_1_position,
    image_2_url: input.image_2_url,
    image_2_alt: input.image_2_alt,
    image_2_position: input.image_2_position,
    image_3_url: input.image_3_url,
    image_3_alt: input.image_3_alt,
    image_3_position: input.image_3_position,
    image_4_url: input.image_4_url,
    image_4_alt: input.image_4_alt,
    image_4_position: input.image_4_position,
    practice_area_id: input.practice_area_id,
    status: input.status,
    origin: "manual" satisfies LegalUpdateOrigin,
    published_at: input.status === "published" ? new Date().toISOString() : null,
  });

  if (error) return { error: "Could not create the update. Please try again." };
  return { error: null };
}

export async function updateLegalUpdate(
  id: string,
  input: LegalUpdateInput
): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();

  const { data: current } = await supabase
    .from("legal_updates")
    .select("published_at")
    .eq("id", id)
    .maybeSingle();
  const currentPublishedAt =
    (current as { published_at: string | null } | null)?.published_at ?? null;

  const published_at =
    input.status === "published" ? currentPublishedAt ?? new Date().toISOString() : null;

  const { error } = await supabase
    .from("legal_updates")
    .update({
      headline: input.headline,
      slug: input.slug,
      summary: input.summary,
      source_name: input.source_name,
      body: input.body ? JSON.parse(input.body) : null,
      cover_image_url: input.cover_image_url,
      image_1_url: input.image_1_url,
      image_1_alt: input.image_1_alt,
      image_1_position: input.image_1_position,
      image_2_url: input.image_2_url,
      image_2_alt: input.image_2_alt,
      image_2_position: input.image_2_position,
      image_3_url: input.image_3_url,
      image_3_alt: input.image_3_alt,
      image_3_position: input.image_3_position,
      image_4_url: input.image_4_url,
      image_4_alt: input.image_4_alt,
      image_4_position: input.image_4_position,
      practice_area_id: input.practice_area_id,
      status: input.status,
      published_at,
    })
    .eq("id", id);

  if (error) return { error: "Could not update the entry. Please try again." };
  return { error: null };
}

export async function setLegalUpdateStatus(
  id: string,
  status: LegalUpdateStatus
): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("legal_updates")
    .update({
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) return { error: "Could not update the status. Please try again." };
  return { error: null };
}

export async function deleteLegalUpdate(id: string): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("legal_updates").delete().eq("id", id);

  if (error) return { error: "Could not delete the entry. Please try again." };
  return { error: null };
}
