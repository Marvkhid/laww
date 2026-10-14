"use server";

import { createSupabaseAuthServerClient } from "@/lib/supabase/server-client";

/**
 * Does this browser still hold a valid admin session?
 *
 * Used by AdminSessionGuard for the one case the proxy cannot see: a page
 * restored from the back/forward cache, which the browser re-displays without
 * asking the server for it. It returns a boolean instead of redirecting so the
 * caller — running in the browser, where it can replace the history entry —
 * decides what to do.
 *
 * This is the UX half of the boundary. The security half is that every
 * protected page, action and upload-signing endpoint re-verifies the session
 * itself (see requireAdmin), so a restored dashboard cannot read or write
 * anything even if this check never runs.
 */
export async function assertAdminSession(): Promise<boolean> {
  const supabase = await createSupabaseAuthServerClient();
  const { data, error } = await supabase.auth.getClaims();
  return !error && Boolean(data?.claims);
}
