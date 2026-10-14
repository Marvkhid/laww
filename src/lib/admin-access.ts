/**
 * The admin-area boundary.
 *
 * The policy this file defines: being signed in is not, on its own, permission
 * to reach the CMS. An admin session exists only while the admin is *in* the
 * admin area. The moment they navigate to the public site the session ends
 * server-side, and returning to /admin asks for the password again — the
 * behaviour the client asked for ("log in, edit, go and read the published
 * article, come back to fix a typo" must require signing in again).
 *
 * Moving between admin pages must NOT ask for anything again, so these
 * predicates have to be exact in both directions. They are kept as plain
 * functions — no Next.js request objects — so the whole policy is testable
 * without a browser or a server.
 */

export const ADMIN_ROOT = "/admin";

/** Is this path inside the CMS? `/admin` and `/admin/...`, login included. */
export function isAdminAreaPath(pathname: string): boolean {
  return pathname === ADMIN_ROOT || pathname.startsWith(`${ADMIN_ROOT}/`);
}

/**
 * The sign-in page: inside the admin area, but the one route that must be
 * reachable *without* a session (otherwise the redirect loops).
 */
export function isAdminLoginPath(pathname: string): boolean {
  return (
    pathname === `${ADMIN_ROOT}/login` ||
    pathname.startsWith(`${ADMIN_ROOT}/login/`)
  );
}

/**
 * Does this cookie name belong to the Supabase session?
 *
 * @supabase/ssr stores the session in `sb-<project-ref>-auth-token`, split
 * into `...auth-token.0`, `...auth-token.1`, … when it exceeds the 4 KB cookie
 * limit. Any of them means "this browser might be holding an admin session",
 * which is what decides whether the proxy has to look at Supabase at all.
 */
export function isSupabaseAuthCookie(name: string): boolean {
  return /^sb-[^.]*-auth-token(\.\d+)?$/.test(name);
}

/** What the proxy should do with one request. */
export type AdminBoundaryAction =
  | "allow"
  | "redirect-to-login"
  /** End the admin session, then let the public page render normally. */
  | "end-session";

/**
 * The whole policy, as one pure decision.
 *
 * The proxy calls this for every request that carries a Supabase cookie (the
 * caller passes `isLoggedIn: false` when there is no cookie at all, which is
 * why an unauthenticated /admin request is redirected without ever asking
 * Supabase anything).
 */
export function decideAdminBoundary(input: {
  pathname: string;
  isLoggedIn: boolean;
  method: string;
  mode?: string | null;
  accept?: string | null;
  rsc?: string | null;
}): AdminBoundaryAction {
  // Inside the admin area: moving between admin pages keeps the session, and
  // an unauthenticated request is sent to the sign-in page instead of being
  // rendered.
  if (isAdminAreaPath(input.pathname)) {
    if (!input.isLoggedIn && !isAdminLoginPath(input.pathname)) {
      return "redirect-to-login";
    }
    return "allow";
  }

  // Outside it: only a signed-in admin who is *opening* a public page has left
  // the admin area. A prefetch, an RSC fetch, an image or a Server Action is
  // not a departure.
  if (!input.isLoggedIn) return "allow";
  return isDocumentNavigation(input) ? "end-session" : "allow";
}

/**
 * A real top-level document navigation — the user opening a page — as opposed
 * to a prefetch, an RSC fetch, a Server Action POST or an asset request.
 *
 * This predicate decides when leaving the admin area ends the session, so it
 * has to be conservative in the same direction as the security it protects:
 *
 *  · A **prefetch** must not count. Next.js fetches links that scroll into
 *    view; if that counted, opening the editor could sign the admin out.
 *  · A **Server Action** must not count (it is a POST), or saving an article
 *    would.
 *  · An **RSC fetch** must not count, or a client-side navigation to a public
 *    page would fire while the admin is still in the dashboard.
 *
 * `Sec-Fetch-Mode: navigate` is precisely "this is a document the user
 * opened". Safari before 16.4 does not send the Sec-Fetch headers, so there is
 * a fallback: a document request asks for `text/html`, whereas an RSC request
 * asks for `text/x-component` and carries an `RSC` header. Both are excluded
 * explicitly rather than relied on to be absent.
 */
export function isDocumentNavigation(input: {
  method: string;
  mode?: string | null;
  accept?: string | null;
  rsc?: string | null;
}): boolean {
  if (input.method.toUpperCase() !== "GET") return false;
  if (input.rsc) return false;
  if (input.mode) return input.mode === "navigate";
  return (input.accept ?? "").includes("text/html");
}
