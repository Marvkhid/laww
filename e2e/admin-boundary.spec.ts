/**
 * The admin-area boundary decision (Node, engine-independent).
 *
 * `decideAdminBoundary` is the whole policy the proxy applies to every request
 * that may carry a session, so this is where the two halves of the client's
 * requirement are pinned:
 *
 *  · moving between admin pages keeps the session — never a surprise logout;
 *  · leaving the admin area for a public page ends it, so coming back asks for
 *    the password again.
 *
 * The cases that must NOT end a session are the interesting ones, because a
 * false positive here would sign an editor out while they are working: a link
 * prefetch, an RSC fetch from a client-side navigation, and a Server Action
 * POST all touch public URLs.
 */

import { test, expect } from "@playwright/test";
import {
  decideAdminBoundary,
  isAdminAreaPath,
  isAdminLoginPath,
  isDocumentNavigation,
  isSupabaseAuthCookie,
} from "../src/lib/admin-access";

const get = (overrides: Record<string, unknown> = {}) => ({
  pathname: "/",
  isLoggedIn: true,
  method: "GET",
  mode: "navigate",
  accept: "text/html,application/xhtml+xml",
  rsc: null,
  ...overrides,
});

test.describe("what counts as the admin area", () => {
  test("the CMS and its nested routes", () => {
    expect(isAdminAreaPath("/admin")).toBe(true);
    expect(isAdminAreaPath("/admin/articles")).toBe(true);
    expect(isAdminAreaPath("/admin/articles/new")).toBe(true);
    expect(isAdminAreaPath("/admin/login")).toBe(true);
  });

  test("public routes are not the admin area", () => {
    expect(isAdminAreaPath("/")).toBe(false);
    expect(isAdminAreaPath("/articles")).toBe(false);
    expect(isAdminAreaPath("/articles/the-headline")).toBe(false);
    // Not a prefix match on the string "admin".
    expect(isAdminAreaPath("/administrator")).toBe(false);
    expect(isAdminAreaPath("/admin-panel")).toBe(false);
  });

  test("the sign-in route is inside the area but not protected", () => {
    expect(isAdminLoginPath("/admin/login")).toBe(true);
    expect(isAdminLoginPath("/admin/login/")).toBe(true);
    expect(isAdminLoginPath("/admin")).toBe(false);
    expect(isAdminLoginPath("/admin/login-details")).toBe(false);
  });
});

test.describe("the session cookie is recognised in every form it takes", () => {
  test("the auth-token cookie and its chunks", () => {
    expect(isSupabaseAuthCookie("sb-abcdefghijklmnop-auth-token")).toBe(true);
    expect(isSupabaseAuthCookie("sb-abcdefghijklmnop-auth-token.0")).toBe(true);
    expect(isSupabaseAuthCookie("sb-abcdefghijklmnop-auth-token.1")).toBe(true);
  });

  test("unrelated cookies are ignored", () => {
    expect(isSupabaseAuthCookie("theme")).toBe(false);
    expect(isSupabaseAuthCookie("__cf_bm")).toBe(false);
    expect(isSupabaseAuthCookie("sb-abcdefghijklmnop-auth-token-code-verifier")).toBe(
      false
    );
  });
});

test.describe("only opening a public page counts as leaving", () => {
  test("a document navigation is", () => {
    expect(isDocumentNavigation(get())).toBe(true);
  });

  test("a prefetch, an RSC fetch and an action POST are not", () => {
    // A prefetch of a link that scrolled into view.
    expect(isDocumentNavigation(get({ mode: "cors" }))).toBe(false);
    // A client-side navigation: Next.js fetches the RSC payload.
    expect(isDocumentNavigation(get({ mode: "cors", accept: "text/x-component" }))).toBe(
      false
    );
    expect(isDocumentNavigation(get({ rsc: "1" }))).toBe(false);
    // A Server Action is a POST — saving an article must not end the session.
    expect(isDocumentNavigation(get({ method: "POST" }))).toBe(false);
    // An image or an API fetch.
    expect(isDocumentNavigation(get({ mode: "no-cors", accept: "image/avif" }))).toBe(
      false
    );
  });

  test("without Sec-Fetch headers the document Accept header decides", () => {
    // Safari before 16.4 sends no Sec-Fetch-* headers.
    expect(isDocumentNavigation(get({ mode: null }))).toBe(true);
    expect(isDocumentNavigation(get({ mode: null, accept: "text/x-component" }))).toBe(
      false
    );
    expect(isDocumentNavigation(get({ mode: null, accept: "*/*" }))).toBe(false);
  });
});

test.describe("the decision", () => {
  test("an unauthenticated admin request goes to the sign-in page", () => {
    expect(
      decideAdminBoundary(get({ pathname: "/admin/articles", isLoggedIn: false }))
    ).toBe("redirect-to-login");
    expect(decideAdminBoundary(get({ pathname: "/admin", isLoggedIn: false }))).toBe(
      "redirect-to-login"
    );
  });

  test("the sign-in page itself is reachable without a session", () => {
    expect(
      decideAdminBoundary({
        pathname: "/admin/login",
        isLoggedIn: false,
        method: "GET",
      })
    ).toBe("allow");
  });

  test("inside the admin area a session is kept, in both directions", () => {
    for (const pathname of [
      "/admin",
      "/admin/articles",
      "/admin/articles/new",
      "/admin/articles/abc/edit",
    ]) {
      expect(decideAdminBoundary(get({ pathname }))).toBe("allow");
    }
  });

  test("a signed-in admin opening a public page has left the admin area", () => {
    for (const pathname of ["/", "/articles", "/articles/the-headline", "/contact"]) {
      expect(decideAdminBoundary(get({ pathname }))).toBe("end-session");
    }
  });

  test("public traffic without a session is untouched", () => {
    for (const pathname of ["/", "/articles", "/about"]) {
      expect(decideAdminBoundary(get({ pathname, isLoggedIn: false }))).toBe("allow");
    }
  });

  test("a signed-in admin's background requests do not end the session", () => {
    // The editor prefetching a public link, or a client-side navigation to it,
    // must not sign them out mid-edit.
    expect(decideAdminBoundary(get({ pathname: "/articles", mode: "cors" }))).toBe(
      "allow"
    );
    expect(decideAdminBoundary(get({ pathname: "/articles", rsc: "1" }))).toBe("allow");
    expect(
      decideAdminBoundary(get({ pathname: "/admin/articles", method: "POST" }))
    ).toBe("allow");
  });
});
