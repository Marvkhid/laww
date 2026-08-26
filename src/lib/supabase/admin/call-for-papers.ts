import { requireAdmin } from "@/lib/supabase/admin/require-admin";
import type { CallForPapersRow } from "@/lib/supabase/types";

export async function listCallForPapersForAdmin(): Promise<CallForPapersRow[]> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("call_for_papers")
    .select("*")
    .order("issue_number", { ascending: false });

  if (error || !data) return [];
  return data as CallForPapersRow[];
}

export async function getCallForPapersByIdForAdmin(
  id: string
): Promise<CallForPapersRow | null> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("call_for_papers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as CallForPapersRow;
}

export async function getCallForPapersPracticeAreaIds(
  callForPapersId: string
): Promise<string[]> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("call_for_papers_practice_areas")
    .select("practice_area_id")
    .eq("call_for_papers_id", callForPapersId);

  if (error || !data) return [];
  return (data as { practice_area_id: string }[]).map((row) => row.practice_area_id);
}

export type CallForPapersInput = {
  issue_number: number;
  issue_month: string;
  deadline: string; // yyyy-mm-dd
  word_limit: number;
  contact_email: string;
};

// Calls the migration-0005 database functions rather than separate
// client-side statements — see that file for why: without a real
// transaction, a failure partway through could save the CFP row while
// silently leaving its topic list wrong. Verified locally with both a
// successful multi-topic save and a deliberate failure injection on create
// and update, confirming a full rollback in both cases (zero rows on
// failed create; original data unchanged on failed update).
export async function createCallForPapers(
  input: CallForPapersInput,
  practiceAreaIds: string[]
): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();

  const { error } = await supabase.rpc("admin_create_call_for_papers_with_topics", {
    p_issue_number: input.issue_number,
    p_issue_month: input.issue_month,
    p_deadline: input.deadline,
    p_word_limit: input.word_limit,
    p_contact_email: input.contact_email,
    p_practice_area_ids: practiceAreaIds,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "A call for papers for that issue number already exists." };
    }
    return { error: "Could not create the call for papers. Please try again." };
  }
  return { error: null };
}

export async function updateCallForPapers(
  id: string,
  input: CallForPapersInput,
  practiceAreaIds: string[]
): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();

  const { error } = await supabase.rpc("admin_update_call_for_papers_with_topics", {
    p_id: id,
    p_issue_number: input.issue_number,
    p_issue_month: input.issue_month,
    p_deadline: input.deadline,
    p_word_limit: input.word_limit,
    p_contact_email: input.contact_email,
    p_practice_area_ids: practiceAreaIds,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "A call for papers for that issue number already exists." };
    }
    return { error: "Could not update the call for papers. Please try again." };
  }
  return { error: null };
}

// Both FKs on call_for_papers_practice_areas cascade on delete, so removing
// a call for papers is safe — its topic links go with it, nothing else
// references into this table.
export async function deleteCallForPapers(id: string): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("call_for_papers").delete().eq("id", id);

  if (error) return { error: "Could not delete the call for papers. Please try again." };
  return { error: null };
}
