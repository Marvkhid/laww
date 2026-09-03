"use server";

import { createSupabaseAuthServerClient } from "@/lib/supabase/server-client";

export async function clearNewsletterSubscribers(): Promise<string> {
  const supabase = await createSupabaseAuthServerClient();

  const { count } = await supabase
    .from("newsletter_subscribers")
    .select("*", { count: "exact", head: true });

  const { error } = await supabase
    .from("newsletter_subscribers")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) {
    return `Failed: ${error.message}`;
  }

  return `Deleted ${count ?? 0} subscriber(s).`;
}
