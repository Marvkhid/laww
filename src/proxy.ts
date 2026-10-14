import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  decideAdminBoundary,
  isAdminAreaPath,
  isSupabaseAuthCookie,
} from "@/lib/admin-access";
import { logAdminEvent } from "@/lib/admin-diagnostics";

// Next.js 16 renamed Middleware to Proxy (same mechanism, new name/file).
// It does two things:
//
// 1. Refreshes the Supabase auth cookie so Server Components never have to.
// 2. Enforces the admin-area boundary — an *optimistic* redirect for /admin/*
//    without a session, and the part that makes "sign in again" real: a
//    signed-in admin who navigates to the public site has their session
//    revoked server-side before the public page is served.
//
// Why the second job belongs here rather than in a `beforeunload`/`pagehide`
// handler: those are browser events, and a browser event cannot invalidate
// anything. It can be skipped entirely — a killed tab, a crash, a URL typed
// into the address bar, another device — and it only proves something about
// the client. Every one of those cases, though, produces a document request
// for the next page, and *that* is a server-observable event, so it is where
// the boundary is enforced.
//
// The real check for protected data is always the server-side gate
// (`requireAdmin()` in every admin module, plus the protected layout) — this
// file only ends sessions; it never grants access.

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // ── Fast path ────────────────────────────────────────────────────────────
  // The overwhelming majority of traffic: a visitor with no Supabase cookie.
  // Nothing is refreshed, no auth call is made, and the request is passed
  // straight through. Without a cookie there is certainly no session, which is
  // all the decision below needs to know.
  const hasAuthCookie = request.cookies
    .getAll()
    .some((cookie) => isSupabaseAuthCookie(cookie.name));

  if (!hasAuthCookie) {
    const action = decideAdminBoundary({
      pathname: path,
      isLoggedIn: false,
      method: request.method,
    });
    return action === "redirect-to-login"
      ? NextResponse.redirect(new URL("/admin/login", request.url))
      : NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);

  const action = decideAdminBoundary({
    pathname: path,
    isLoggedIn,
    method: request.method,
    mode: request.headers.get("sec-fetch-mode"),
    accept: request.headers.get("accept"),
    rsc: request.headers.get("rsc"),
  });

  if (action === "redirect-to-login") {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (action === "end-session") {
    // A signed-in admin is opening a public page: they have left the admin
    // area, so their admin access ends here. The public page itself still
    // renders normally — signing out is not a redirect, and the public site
    // never required a session in the first place.
    await endAdminSession({ request, response, supabase, path });
    return response;
  }

  if (isAdminAreaPath(path)) {
    // A dashboard must not come back out of the browser cache (or the
    // back/forward cache) looking signed in after the session has ended.
    response.headers.set("Cache-Control", "no-store, must-revalidate");
  }
  return response;
}

/**
 * Revoke the session at the Auth server, then clear its cookies.
 *
 * Order matters. The revocation is what makes the refresh token unusable; the
 * cookie clearing is what makes the browser forget it. If revocation fails
 * (offline, Auth server hiccup) the cookies are cleared anyway, so no
 * protected page or action stays reachable — the failure is logged rather than
 * swallowed, and it never leaves the browser holding a live session.
 *
 * Honest limitation: Supabase access tokens are stateless JWTs, so a copy of
 * one that has already been issued stays valid until it expires even after
 * `signOut()`. Nothing in the client can shorten that; the settings that do
 * are the project's JWT expiry (Auth → Sessions) and, if it is ever needed,
 * an enforced refresh-token rotation. What this code guarantees is that the
 * admin's *browser* is signed out — no cookie, no reusable session — which is
 * what the requested behaviour requires.
 */
async function endAdminSession({
  request,
  response,
  supabase,
  path,
}: {
  request: NextRequest;
  response: NextResponse;
  supabase: ReturnType<typeof createServerClient>;
  path: string;
}) {
  let revoked = true;
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch (error) {
    revoked = false;
    console.error(
      "[admin] could not revoke the session while leaving the admin area — cookies are cleared anyway:",
      error
    );
  }

  // Belt and braces: `signOut` clears the cookies through the adapter above,
  // but every chunk of the session cookie must go even if it did not.
  for (const cookie of request.cookies.getAll()) {
    if (isSupabaseAuthCookie(cookie.name)) response.cookies.delete(cookie.name);
  }

  logAdminEvent({
    op: "auth",
    section: "admin",
    stage: "navigate",
    outcome: revoked ? "ok" : "failed",
    category: "left_admin_area",
    detail: path.slice(0, 60),
  });
}

export const config = {
  // Everything except Next.js's own build output and static files: the
  // boundary has to see public page navigations as well as admin ones.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|webmanifest)$).*)",
  ],
};
