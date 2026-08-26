import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getArchivedIssues } from "@/lib/supabase/queries/issues-archive";
import { IssuesArchiveOverlay } from "./issues-archive-overlay";

export async function IssuesArchiveStrip() {
  const supabase = createSupabaseServerClient();
  const issues = await getArchivedIssues(supabase);

  if (issues.length === 0) return null;

  return <IssuesArchiveOverlay issues={issues} />;
}
