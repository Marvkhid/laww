import type { UntypedSupabaseClient } from "@/lib/supabase/client";
import type { ContributorRow } from "@/lib/supabase/types";
import type { Contributor, EditorialBoardMember } from "@/lib/types";

export async function getContributors(
  supabase: UntypedSupabaseClient
): Promise<Contributor[]> {
  const { data, error } = await supabase
    .from("contributors")
    .select("*")
    .eq("is_editorial_board", false)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  const rows = data as ContributorRow[];

  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    role: row.credentials ? `${row.role} (${row.credentials})` : row.role,
    photoUrl: row.photo_url,
  }));
}

export async function getEditorialBoard(
  supabase: UntypedSupabaseClient
): Promise<EditorialBoardMember[]> {
  const { data, error } = await supabase
    .from("contributors")
    .select("*")
    .eq("is_editorial_board", true)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  const rows = data as ContributorRow[];

  return rows.map((row) => ({
    name: row.name,
    credentials: row.credentials ?? undefined,
    role: row.role,
  }));
}

export async function getContributorBySlug(
  supabase: UntypedSupabaseClient,
  slug: string
): Promise<Contributor | null> {
  const { data, error } = await supabase
    .from("contributors")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as ContributorRow;

  return {
    slug: row.slug,
    name: row.name,
    role: row.credentials ? `${row.role} (${row.credentials})` : row.role,
    bio: row.bio,
    photoUrl: row.photo_url,
  };
}
