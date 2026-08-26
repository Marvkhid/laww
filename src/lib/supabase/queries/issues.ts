import type { UntypedSupabaseClient } from "@/lib/supabase/client";
import type { IssueRow } from "@/lib/supabase/types";
import type { IssueMeta } from "@/lib/types";

export async function getCurrentIssue(
  supabase: UntypedSupabaseClient
): Promise<IssueMeta | null> {
  const { data, error } = await supabase
    .from("issues")
    .select("*")
    .order("issue_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as IssueRow;

  return {
    issueNumber: row.issue_number,
    season: row.season,
    year: row.year,
    edition: row.edition,
    coverImageSrc: row.cover_image_url ?? null,
    coverImageAlt: `Law Digest Issue ${row.issue_number} cover, ${row.season} ${row.year}`,
    pdfUrl: row.pdf_url ?? null,
    priceNigeria: row.price_ngn ?? "",
    priceUK: row.price_uk ?? "",
    priceUS: row.price_us ?? "",
  };
}
