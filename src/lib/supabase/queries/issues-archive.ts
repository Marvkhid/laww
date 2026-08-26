import type { UntypedSupabaseClient } from "@/lib/supabase/client";
import type { IssuesArchiveRow } from "@/lib/supabase/types";
import type { IssueArchive } from "@/lib/types";

export async function getArchivedIssues(
  supabase: UntypedSupabaseClient
): Promise<IssueArchive[]> {
  const { data, error } = await supabase
    .from("issues_archive")
    .select("*")
    .order("issue_number", { ascending: false, nullsFirst: false });

  if (error || !data) return [];
  return (data as IssuesArchiveRow[]).map((row) => ({
    slug: row.slug,
    title: row.title,
    description: row.description,
    coverImageUrl: row.cover_image_url,
    issueNumber: row.issue_number,
    season: row.season,
    year: row.year,
    pdfUrl: row.pdf_url,
  }));
}

export async function getArchivedIssueBySlug(
  supabase: UntypedSupabaseClient,
  slug: string
): Promise<IssueArchive | null> {
  const { data, error } = await supabase
    .from("issues_archive")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as IssuesArchiveRow;
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    coverImageUrl: row.cover_image_url,
    issueNumber: row.issue_number,
    season: row.season,
    year: row.year,
    pdfUrl: row.pdf_url,
  };
}
