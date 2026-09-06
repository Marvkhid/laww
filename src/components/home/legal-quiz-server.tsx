import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getPublishedLegalInsights } from "@/lib/supabase/queries/legal-insights";
import { LegalQuiz } from "./legal-quiz";

export async function LegalQuizServer() {
  const supabase = createSupabaseServerClient();
  const questions = await getPublishedLegalInsights(supabase, 10);

  // Only questions with a marked correct answer are playable; the rest are
  // skipped so readers never hit an unanswerable question.
  const playable = questions.filter((q) => q.correctOption !== null);

  return <LegalQuiz questions={playable} />;
}
