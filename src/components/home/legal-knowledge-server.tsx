import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getPublishedLegalInsights } from "@/lib/supabase/queries/legal-insights";
import { LegalKnowledge } from "./legal-knowledge";

export async function LegalKnowledgeServer() {
  const supabase = createSupabaseServerClient();
  const insights = await getPublishedLegalInsights(supabase, 10);

  return <LegalKnowledge insights={insights} />;
}
