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
