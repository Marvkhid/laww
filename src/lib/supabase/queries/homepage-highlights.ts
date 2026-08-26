import type { UntypedSupabaseClient } from "@/lib/supabase/client";
import type { HomepageHighlightRow } from "@/lib/supabase/types";
import type { HomepageHighlight } from "@/lib/types";

function mapRow(row: HomepageHighlightRow): HomepageHighlight {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    caption: row.caption,
    category: row.category,
    imageUrl: row.image_url,
    imagePosition: row.image_position,
    published: row.published,
    displayOrder: row.display_order,
  };
}

export async function getPublishedHighlights(
  supabase: UntypedSupabaseClient,
  limit = 12
): Promise<HomepageHighlight[]> {
  const { data, error } = await supabase
    .from("homepage_highlights")
    .select("*")
    .eq("published", true)
    .order("display_order", { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return (data as HomepageHighlightRow[]).map(mapRow);
}
