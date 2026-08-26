import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cookie-aware client for admin Server Components, Server Actions, and
// Route Handlers — where an authenticated session matters. Distinct from
// lib/supabase/client.ts, which stays the cookie-less public client the
// existing homepage/routes already use; that file is untouched by M3.
export async function createSupabaseAuthServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component that can't write cookies —
            // proxy.ts refreshes and persists the session instead.
          }
        },
      },
    }
  );
}
