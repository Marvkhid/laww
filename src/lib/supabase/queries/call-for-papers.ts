import type { UntypedSupabaseClient } from "@/lib/supabase/client";
import type { CallForPapersRow, CallForPapersPracticeAreaRow, PracticeAreaRow } from "@/lib/supabase/types";
import type { CallForPapers } from "@/lib/types";

export async function getCurrentCallForPapers(
  supabase: UntypedSupabaseClient
): Promise<CallForPapers | null> {
  const { data: cfpData, error } = await supabase
    .from("call_for_papers")
    .select("*")
    .order("issue_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !cfpData) return null;
  const cfp = cfpData as CallForPapersRow;

  const { data: linkData } = await supabase
    .from("call_for_papers_practice_areas")
    .select("practice_area_id")
    .eq("call_for_papers_id", cfp.id);
  const links = (linkData ?? []) as Pick<CallForPapersPracticeAreaRow, "practice_area_id">[];
  const practiceAreaIds = links.map((link) => link.practice_area_id);

  let topics: string[] = [];
  if (practiceAreaIds.length > 0) {
    const { data: areaData } = await supabase
      .from("practice_areas")
      .select("name")
      .in("id", practiceAreaIds)
      .order("name", { ascending: true });
    const areas = (areaData ?? []) as Pick<PracticeAreaRow, "name">[];
    topics = areas.map((area) => area.name);
  }

  return {
    nextIssueNumber: cfp.issue_number,
    nextIssueMonth: cfp.issue_month,
    deadline: cfp.deadline,
    wordLimit: cfp.word_limit,
    contactEmail: cfp.contact_email,
    topics,
  };
}
