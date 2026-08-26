import { requireAdmin } from "@/lib/supabase/admin/require-admin";
import type { ContributorRow } from "@/lib/supabase/types";

export async function listContributorsForAdmin(): Promise<ContributorRow[]> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("contributors")
    .select("*")
    .order("name", { ascending: true });

  if (error || !data) return [];
  return data as ContributorRow[];
}

export async function getContributorByIdForAdmin(id: string): Promise<ContributorRow | null> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("contributors")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as ContributorRow;
}

export type ContributorInput = {
  slug: string;
  name: string;
  credentials: string | null;
  role: string;
  bio: string | null;
  photo_url: string | null;
  is_editorial_board: boolean;
};

export async function createContributor(
  input: ContributorInput
): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("contributors").insert(input);

  if (error) {
    if (error.code === "23505") {
      return { error: "That slug is already in use by another contributor." };
    }
    return { error: "Could not create the contributor. Please try again." };
  }
  return { error: null };
}

export async function updateContributor(
  id: string,
  input: ContributorInput
): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("contributors").update(input).eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "That slug is already in use by another contributor." };
    }
    return { error: "Could not update the contributor. Please try again." };
  }
  return { error: null };
}

// article_contributors cascades on delete (see migration 0001), so deleting
// a contributor who is still credited on a real article would silently
// remove that byline rather than error — checked here instead, so the admin
// gets a clear warning before that happens, without changing the schema.
export async function deleteContributor(id: string): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();

  const { count } = await supabase
    .from("article_contributors")
    .select("article_id", { count: "exact", head: true })
    .eq("contributor_id", id);

  if (count && count > 0) {
    return {
      error: `This contributor is credited on ${count} article${count === 1 ? "" : "s"} and can't be deleted yet — remove them from those articles first.`,
    };
  }

  const { error } = await supabase.from("contributors").delete().eq("id", id);

  if (error) {
    return { error: "Could not delete the contributor. Please try again." };
  }
  return { error: null };
}
