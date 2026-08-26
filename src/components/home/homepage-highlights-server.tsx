import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getPublishedHighlights } from "@/lib/supabase/queries/homepage-highlights";
import { HomepageHighlights } from "./homepage-highlights";

export async function HomepageHighlightsServer() {
  const supabase = createSupabaseServerClient();
  const highlights = await getPublishedHighlights(supabase, 6);

  return <HomepageHighlights highlights={highlights} />;
}
