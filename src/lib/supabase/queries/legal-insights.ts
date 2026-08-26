import type { UntypedSupabaseClient } from "@/lib/supabase/client";
import type { LegalInsightRow } from "@/lib/supabase/types";
import type { LegalInsight } from "@/lib/types";

function mapRow(row: LegalInsightRow): LegalInsight {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    description: row.description,
    category: row.category,
    imageUrl: row.image_url,
    published: row.published,
    displayOrder: row.display_order,
  };
}

export async function getPublishedLegalInsights(
  supabase: UntypedSupabaseClient,
  limit = 10
): Promise<LegalInsight[]> {
  const { data, error } = await supabase
    .from("legal_insights")
    .select("*")
    .eq("published", true)
    .order("display_order", { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return (data as LegalInsightRow[]).map(mapRow);
}
