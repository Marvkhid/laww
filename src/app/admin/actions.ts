"use server";

import { redirect } from "next/navigation";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server-client";
import { PUBLIC_FIELD_LIMITS } from "@/lib/request-limits";

/**
 * Deliberately generous: Supabase auth itself cannot accept a password longer
 * than bcrypt's 72-byte input, so this cap never blocks a real credential —
 * it only stops an unauthenticated caller from growing the request body with
 * megabytes of text (see src/lib/request-limits.ts).
 */
const MAX_PASSWORD_LENGTH = 200;

export async function login(_prevState: string | null, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return "Enter both an email and a password.";
  }

  if (email.length > PUBLIC_FIELD_LIMITS.email) {
    return "That email address is too long.";
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return "That password is too long.";
  }

  const supabase = await createSupabaseAuthServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return "Those credentials weren't accepted. Check the email and password and try again.";
  }

  redirect("/admin");
}

export async function logout() {
  const supabase = await createSupabaseAuthServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

/**
 * Leave the admin area to read the public site.
 *
 * This is the same boundary the proxy enforces on any navigation to a public
 * page (src/proxy.ts), applied *before* the navigation rather than on the way
 * back: the session is revoked at the Auth server and its cookies are cleared,
 * so the dashboard is not waiting to let the admin straight back in.
 *
 * A failed revocation must never leave the browser signed in, so the cookies
 * are cleared regardless and the failure is logged.
 */
export async function exitToSite() {
  const supabase = await createSupabaseAuthServerClient();
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch (error) {
    console.error(
      "[admin] could not revoke the session while leaving the admin area — cookies are cleared anyway:",
      error
    );
  }
  redirect("/");
}
