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

/**
 * How long one Supabase read may be reused by Next's data cache.
 *
 * WHY THIS EXISTS (measured, not theoretical)
 * --------------------------------------------
 * Next caches GET `fetch`es in `.next/cache/fetch-cache`. With no explicit
 * TTL it keeps them for a YEAR (`revalidate: 31536000`) and, crucially,
 * `next build` reads that entry back on the next build instead of asking
 * Postgres again. Observed on this project: the cached row for
 * `warehouse-got-burnt-in-laspotech-nigeria` still said `body: 8 blocks,
 * image_1..4_url: null` while the live row held 48 blocks and all four image
 * URLs — so every rebuild silently prerendered a months-old article, the
 * four uploaded images never reached the page, and listings could resurrect
 * rows that had since been deleted.
 *
 * Admin writes already invalidate their own data: `revalidatePath` expires
 * the implicit `_N_T_<pathname>` tag, which is one of the soft tags every
 * fetch on that pathname is read with. What was missing is a ceiling for
 * everything else — a rebuild, a Supabase dashboard edit, a test that writes
 * straight to the table. This TTL is that ceiling: the page re-renders at
 * most this old, and admin actions still refresh it instantly.
 *
 * It must NOT be `no-store`: that turns every public page dynamic and was
 * measured here to empty the prerendered output at build time (see
 * `fetch-timeout.ts`). `revalidate` keeps the pages static/ISR and only
 * bounds how stale their data may be.
 */
export const CMS_DATA_REVALIDATE_SECONDS = 300;

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
    global: {
      // Every read carries an explicit TTL, so no query can silently opt in
      // to the one-year default. Writes (POST/PATCH/DELETE) are never cached
      // by Next, so this changes nothing about saving.
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, {
          ...init,
          next: { revalidate: CMS_DATA_REVALIDATE_SECONDS },
        }),
    },
  });
  return cachedClient;
}
