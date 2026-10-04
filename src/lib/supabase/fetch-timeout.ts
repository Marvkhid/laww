/**
 * Bounded waits for Supabase reads, in two flavours.
 *
 * ── Why any of this exists ────────────────────────────────────────────────────
 * Public pages render content behind `<Suspense>` skeletons
 * (`BreakingLegalUpdatesSkeleton`, the article/issue list skeletons, the admin
 * list pages). Supabase's `fetch` has no built-in timeout, so a stalled
 * connection or a response that never completes leaves that promise pending
 * and the skeleton spinning forever — the user never reaches a success state,
 * an error, or a retry.
 *
 * ── Why there are two, and which one to use ────────────────────────────────────
 * `fetchWithTimeout` overrides the Supabase client's `global.fetch` with a
 * request that carries an `AbortSignal`. **It must only ever be installed on a
 * client whose results are never prerendered.** Verified against this repo:
 * installing it on the public, cached client (`lib/supabase/client.ts`) makes
 * `next build` silently emit empty HTML for every statically generated page —
 * the events list, the adverts and the homepage content all vanished from the
 * prerendered output, while the same pages rendered correctly at runtime. That
 * is exactly the sort of failure a build-time-only regression hides, so the
 * override is restricted to the admin client, whose pages are all dynamic
 * (`ƒ` in the build output) and therefore never cached or prerendered.
 *
 * `withTimeout` is the safe, build-compatible tool for a read that sits behind
 * a Suspense boundary on a prerendered page: it bounds how long the render
 * waits without touching `fetch`, so Next.js's data cache and static
 * generation are untouched. On timeout it resolves to the caller's fallback
 * value, so the boundary always settles into rendered content.
 */
export const SUPABASE_FETCH_TIMEOUT_MS = 10_000;

/**
 * Abort the underlying request after `timeoutMs`, and never serve it from a
 * cache. For dynamically rendered, non-cached clients only.
 *
 * WHY `cache: "no-store"` IS HERE (and it matters more than the timeout):
 *
 * Supabase's REST endpoint caches GET responses at its own edge, and
 * Next.js additionally caches GET fetches in `.next/cache/fetch-cache`.
 * Both were observed serving a STALE article row to the admin editor: the
 * row came back with `body`, all four inline image URLs and the cover image
 * as null even though they had been saved.
 *
 * That staleness is not merely a display problem — it is the mechanism by
 * which content is destroyed. The editor renders from whatever it was
 * given, so a stale empty row produces an empty editor. The next autosave
 * then writes those emptinesses back and the stored content is gone for
 * good. A stale read must never be allowed to become a write.
 *
 * This is safe precisely where it is used: the cookie-aware admin client
 * (`server-client.ts`) only ever serves dynamic admin routes, so there is
 * no prerendered output to invalidate. It must NOT be installed on the
 * public client — doing so was measured to empty every statically
 * prerendered page at build time.
 */
export function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs: number = SUPABASE_FETCH_TIMEOUT_MS
): Promise<Response> {
  const noStore: RequestInit = { ...init, cache: "no-store" };

  // Respect a caller-supplied signal; only add ours when there isn't one.
  if (init?.signal) return fetch(input, noStore);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(input, { ...noStore, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

/**
 * Bound how long a render waits on `promise`.
 *
 * Does not cancel `promise` — it stops the *render* waiting for it, which is
 * what makes a Suspense fallback settle. Safe on prerendered pages: `fetch` is
 * never touched, so Next.js's data cache and static generation behave exactly
 * as before.
 *
 * On timeout it resolves to `fallback`, so the caller renders a real (empty)
 * state instead of an endless skeleton.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = SUPABASE_FETCH_TIMEOUT_MS,
  fallback: T
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => resolve(fallback), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}