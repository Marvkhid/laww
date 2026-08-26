import { createBrowserClient } from "@supabase/ssr";

// For Client Components only (e.g. an interactive admin form that needs to
// call Supabase directly). Distinct from lib/supabase/client.ts, which is
// the cookie-less public client the existing homepage/routes already use —
// that file is untouched by M3.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
