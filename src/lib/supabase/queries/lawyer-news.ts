import type { UntypedSupabaseClient } from "@/lib/supabase/client";
import type { LawyerInTheNewsRow } from "@/lib/supabase/types";
import type { LawyerInTheNews, LawyerQAPairView } from "@/lib/types";

export type LawyerInlineImage = {
  url: string | null;
  alt: string | null;
  position: string | null;
};

export interface LawyerNewsDetail extends LawyerInTheNews {
  inlineImages: LawyerInlineImage[];
}

function mapRow(row: LawyerInTheNewsRow): LawyerInTheNews {
  const qaPairs: LawyerQAPairView[] = Array.isArray(row.qa_pairs)
    ? (row.qa_pairs as LawyerQAPairView[])
        .filter((pair) => pair && typeof pair.question === "string")
        .map((pair) => ({
          question: pair.question,
          answer: typeof pair.answer === "string" ? pair.answer : "",
        }))
    : [];

  return {
    id: row.id,
    slug: row.slug,
    lawyerName: row.lawyer_name,
    lawyerTitle: row.lawyer_title,
    intro: row.intro,
    coverImageUrl: row.cover_image_url,
    coverImageAlt: row.cover_image_alt,
    qaPairs,
  };
}

function mapImages(row: LawyerInTheNewsRow): LawyerInlineImage[] {
  return [
    { url: row.image_1_url, alt: row.image_1_alt, position: row.image_1_position },
    { url: row.image_2_url, alt: row.image_2_alt, position: row.image_2_position },
    { url: row.image_3_url, alt: row.image_3_alt, position: row.image_3_position },
    { url: row.image_4_url, alt: row.image_4_alt, position: row.image_4_position },
  ];
}

/** The single published interview used as the homepage Cover Story. */
export async function getPublishedLawyerNews(
  supabase: UntypedSupabaseClient
): Promise<LawyerInTheNews | null> {
  const { data, error } = await supabase
    .from("lawyer_in_the_news")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(1);

  if (error || !data || data.length === 0) return null;
  return mapRow((data as LawyerInTheNewsRow[])[0]);
}

/** All published interviews, newest first. */
export async function listPublishedLawyerNews(
  supabase: UntypedSupabaseClient
): Promise<LawyerInTheNews[]> {
  const { data, error } = await supabase
    .from("lawyer_in_the_news")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false });

  if (error || !data) return [];
  return (data as LawyerInTheNewsRow[]).map(mapRow);
}

export async function getPublishedLawyerNewsBySlug(
  supabase: UntypedSupabaseClient,
  slug: string
): Promise<LawyerNewsDetail | null> {
  const { data, error } = await supabase
    .from("lawyer_in_the_news")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) return null;
  const row = data as LawyerInTheNewsRow;

  return { ...mapRow(row), inlineImages: mapImages(row) };
}
