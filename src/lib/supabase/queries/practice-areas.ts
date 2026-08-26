import type { UntypedSupabaseClient } from "@/lib/supabase/client";
import type { PracticeAreaRow } from "@/lib/supabase/types";
import type { PracticeArea } from "@/lib/types";

export async function getPracticeAreas(
  supabase: UntypedSupabaseClient
): Promise<PracticeArea[]> {
  const { data, error } = await supabase
    .from("practice_areas")
    .select("*")
    .order("name", { ascending: true });

  if (error || !data) return [];
  const rows = data as PracticeAreaRow[];

  return rows.map((row) => ({ slug: row.slug, name: row.name, description: row.description }));
}
