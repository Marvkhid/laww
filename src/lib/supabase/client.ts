import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Deliberately NOT `createClient<Database>(...)`. Verified empirically
// (isolated minimal repro, several schema-shape variations, against the
// actual installed @supabase/supabase-js 2.112.2 / postgrest-js 2.112.2):
// passing a hand-written Database generic here makes every query result
// resolve to `never` under this project's strict tsconfig, regardless of
// how closely the Database type is shaped to match GenericTable/
// GenericSchema. This looks like a real inference limitation in this
// installed version's conditional types, not a mistake in the schema shape
// — worth re-testing (and switching back to the generic form) once real
// types are generated with `supabase gen types typescript --linked`
// against the live project.
//
// Type safety isn't lost: every query function in lib/supabase/queries/
// has an explicit, precise return type (Promise<Article[]>, etc.) and casts
// the raw response to its matching Row interface from lib/supabase/types.ts
// — so callers get full type safety even though the client itself is loosely
// typed here.
export type UntypedSupabaseClient = SupabaseClient;

// Module-level singleton: this client has persistSession: false and no auth
// state, so one instance is safe to share across all server components in
// the same process. Without this, every call to createSupabaseServerClient()
// creates a new GoTrueClient, which causes the "Multiple GoTrueClient
// instances detected" warning during SSR streaming.
let cachedClient: SupabaseClient | null = null;

export function createSupabaseServerClient(): UntypedSupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. " +
        "Copy .env.local.example to .env.local and fill in your project's values."
    );
  }

  cachedClient = createClient(url, key, {
    auth: { persistSession: false },
  });
  return cachedClient;
}
