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
  summary: string | null;
  source_name: string;
  source_url: string;
  practice_area_id: string | null;
  status: LegalUpdateStatus;
};

// legal_updates has no junction table (practice_area_id is a plain nullable
// FK column, not a many-to-many link like articles/call_for_papers), so a
// plain insert/update is atomic on its own — no migration-0004/0005-style
// Postgres function is needed here. RLS write access already comes from
// migration 0003's "authenticated_write_legal_updates" policy.

export async function createLegalUpdate(
  input: LegalUpdateInput
): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("legal_updates").insert({
    headline: input.headline,
    summary: input.summary,
    source_name: input.source_name,
    source_url: input.source_url,
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

  // Mirrors the create/update-article function's published_at logic
  // (migration 0004): preserve the existing published_at if the row was
  // already published, set it fresh if newly published, clear it otherwise.
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
      summary: input.summary,
      source_name: input.source_name,
      source_url: input.source_url,
      practice_area_id: input.practice_area_id,
      status: input.status,
      published_at,
    })
    .eq("id", id);

  if (error) return { error: "Could not update the entry. Please try again." };
  return { error: null };
}

// Quick status change from the list page (analogous to articles'
// setArticleStatus + StatusToggleButton, generalized to 3 states).
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
