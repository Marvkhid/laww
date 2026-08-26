import { requireAdmin } from "@/lib/supabase/admin/require-admin";
import type { IssuesArchiveRow } from "@/lib/supabase/types";

export type ArchiveIssueInput = {
  slug: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  issue_number: number | null;
  season: string | null;
  year: number | null;
  pdf_url: string | null;
};

export async function listArchiveIssuesForAdmin(): Promise<IssuesArchiveRow[]> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("issues_archive")
    .select("*")
    .order("issue_number", { ascending: false, nullsFirst: false });

  if (error || !data) return [];
  return data as IssuesArchiveRow[];
}

export async function getArchiveIssueByIdForAdmin(id: string): Promise<IssuesArchiveRow | null> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("issues_archive")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as IssuesArchiveRow;
}

export async function createArchiveIssue(input: ArchiveIssueInput): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("issues_archive").insert(input);

  if (error) {
    if (error.code === "23505") {
      return { error: "That slug is already in use by another archived issue." };
    }
    return { error: "Could not create the archived issue. Please try again." };
  }
  return { error: null };
}

export async function updateArchiveIssue(id: string, input: ArchiveIssueInput): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("issues_archive").update(input).eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "That slug is already in use by another archived issue." };
    }
    return { error: "Could not update the archived issue. Please try again." };
  }
  return { error: null };
}

export async function deleteArchiveIssue(id: string): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("issues_archive").delete().eq("id", id);

  if (error) return { error: "Could not delete the archived issue. Please try again." };
  return { error: null };
}
