import { redirect } from "next/navigation";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server-client";

// Defense in depth: the protected layout already gates page renders, but
// each mutation re-verifies its own session before touching the database,
// per Next.js's guidance that a layout-level check should not be the only
// line of defense for actions. Shared by every admin/<content-type>.ts
// module rather than each defining its own copy.
export async function requireAdmin() {
  const supabase = await createSupabaseAuthServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/admin/login");
  }
  return supabase;
}
