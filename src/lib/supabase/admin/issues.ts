import { requireAdmin } from "@/lib/supabase/admin/require-admin";
import type { IssueRow } from "@/lib/supabase/types";

export async function listIssuesForAdmin(): Promise<IssueRow[]> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("issues")
    .select("*")
    .order("issue_number", { ascending: false });

  if (error || !data) return [];
  return data as IssueRow[];
}

export async function getIssueByIdForAdmin(id: string): Promise<IssueRow | null> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("issues")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as IssueRow;
}

// The public homepage/issue routes always show the highest issue_number as
// "the current issue" (see lib/supabase/queries/issues.ts) — there is no
// separate is_current flag. Used to warn the admin, not to change behavior.
export async function isHighestIssueNumber(issueNumber: number): Promise<boolean> {
  const supabase = await requireAdmin();
  const { data } = await supabase
    .from("issues")
    .select("issue_number")
    .order("issue_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = data as { issue_number: number } | null;
  return row?.issue_number === issueNumber;
}

export async function countArticlesForIssue(issueId: string): Promise<number> {
  const supabase = await requireAdmin();
  const { count } = await supabase
    .from("articles")
    .select("id", { count: "exact", head: true })
    .eq("issue_id", issueId);
  return count ?? 0;
}

export type IssueInput = {
  issue_number: number;
  season: string;
  year: number;
  edition: string;
  cover_image_url: string | null;
  pdf_url: string | null;
  price_ngn: string | null;
  price_uk: string | null;
  price_us: string | null;
  published_at: string | null;
};

export async function createIssue(input: IssueInput): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("issues").insert(input);

  if (error) {
    if (error.code === "23505") {
      return { error: "That issue number already exists." };
    }
    return { error: "Could not create the issue. Please try again." };
  }
  return { error: null };
}

export async function updateIssue(
  id: string,
  input: IssueInput
): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("issues").update(input).eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "That issue number already exists." };
    }
    return { error: "Could not update the issue. Please try again." };
  }
  return { error: null };
}

// issue_id on articles is ON DELETE SET NULL (see migration 0001) — deleting
// an issue is safe, no articles are lost, they just lose that association.
// The real thing worth warning about is that this may be the issue every
// issue-dependent public section currently shows.
export async function deleteIssue(id: string): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("issues").delete().eq("id", id);

  if (error) {
    return { error: "Could not delete the issue. Please try again." };
  }
  return { error: null };
}
