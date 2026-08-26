import { createSupabaseServerClient } from "@/lib/supabase/client";

export async function subscribeToNewsletter(
  email: string
): Promise<{ error: string | null; duplicate: boolean }> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("newsletter_subscribers").insert({ email });

  if (error) {
    // Postgres unique_violation — the email is already subscribed. Not a
    // real error from the visitor's point of view.
    if (error.code === "23505") {
      return { error: null, duplicate: true };
    }
    return { error: "Could not save the subscription.", duplicate: false };
  }

  return { error: null, duplicate: false };
}
