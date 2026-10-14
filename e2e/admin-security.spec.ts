/**
 * The admin-area boundary.
 *
 * The policy the client asked for: an editor signs in, works in the CMS,
 * leaves for the public site to read the published article, and then — coming
 * back to fix a typo — has to sign in again. Moving *between* admin pages must
 * never ask for anything again.
 *
 * Two things are deliberately kept apart here:
 *
 *  · The **server-side** boundary, which the unauthenticated block checks
 *    directly: a protected route with no session is answered with a redirect,
 *    not with its content, and it says so in a header (not just by a page that
 *    happens to look like a login form). The upload-signing endpoint is
 *    checked structurally for the same reason `body-limits.spec.ts` reads the
 *    source tree: it cannot be driven over HTTP without credentials.
 *  · The **browser behaviour**, in the credentialed block: leaving for the
 *    public site, the explicit exit control, a protected URL in a new tab, a
 *    refresh, and going back. Those need real editor credentials, which are
 *    read from the environment; without them the block is reported as SKIPPED,
 *    never silently passed.
 *
 *   E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... npx playwright test admin-security.spec.ts
 */

import { readFileSync } from "node:fs";
import type { BrowserContext, Page } from "@playwright/test";
import { test, expect, gotoClean } from "./fixtures";

const EMAIL = process.env.E2E_ADMIN_EMAIL;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const HAS_CREDS = Boolean(EMAIL && PASSWORD);

/** The login screen is the only place a protected route may land. */
async function expectLoginPage(page: Page) {
  await page.waitForURL(/\/admin\/login/, { timeout: 20_000 });
  await expect(page.locator('input[type="email"]')).toBeVisible();
}

/**
 * Wait until the browser holds no Supabase session cookie.
 *
 * Polling rather than a single check straight after the navigation: a browser
 * applies the `Set-Cookie` deletions the moment the response arrives, but the
 * *test* only sees the cookie jar at whatever point it asks, and under a
 * parallel run the two can interleave (this is the one assertion that flaked
 * on Firefox in a full run and passed on its own). Asserting the end state
 * keeps the check precise — and if a cookie ever does survive leaving the
 * admin area, the failure says so instead of surfacing as a redirect timeout.
 */
async function waitForSessionCookiesToClear(
  context: BrowserContext,
  timeoutMs = 15_000
): Promise<string[]> {
  const deadline = Date.now() + timeoutMs;
  let remaining: string[] = [];
  while (Date.now() < deadline) {
    remaining = (await context.cookies())
      .map((cookie) => cookie.name)
      .filter((name) => /^sb-.*-auth-token/.test(name));
    if (remaining.length === 0) return [];
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return remaining;
}

async function login(page: Page) {
  await gotoClean(page, "/admin/login");
  await page.locator('input[type="email"]').fill(EMAIL!);
  await page.locator('input[type="password"]').fill(PASSWORD!);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.endsWith("/admin/login"), {
    timeout: 30_000,
  });
}

// ── The server-side boundary (no credentials needed) ────────────────────────

test.describe("protected routes without a session", () => {
  test("a protected admin URL is answered with the login page", async ({ page }) => {
    await gotoClean(page, "/admin/articles");
    await expectLoginPage(page);
  });

  test("a nested protected admin URL is protected too", async ({ page }) => {
    await gotoClean(page, "/admin/articles/new");
    await expectLoginPage(page);
  });

  test("the redirect comes from the server, not from page content", async ({
    page,
  }) => {
    // Follow nothing: the point is that the server refuses to render the
    // dashboard at all, rather than rendering it and hiding it with a script.
    const res = await page.request.get("/admin/articles", { maxRedirects: 0 });
    expect([301, 302, 303, 307, 308]).toContain(res.status());
    expect(res.headers()["location"] ?? "").toContain("/admin/login");
  });

  test("following the redirect yields the sign-in form and no editor", async ({
    page,
  }) => {
    const res = await page.request.get("/admin/articles");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/Admin sign in/i);
    // The article editor (autosave bookkeeping, the create form) must not be
    // in the response at all.
    expect(body).not.toContain("autosave_id");
  });

  test("the public site stays open without a session", async ({ page }) => {
    const res = await gotoClean(page, "/");
    expect(res?.status()).toBe(200);
    await expect(page.locator("header").first()).toBeVisible();
    // No session was invented, and no redirect to the CMS happened.
    expect(page.url()).not.toContain("/admin");
  });

  test("the upload-signing endpoint authorises before it mints a URL", () => {
    // Structural, like body-limits.spec.ts: server actions cannot be invoked
    // by raw HTTP without an action id, so the guarantee is checked at the
    // source — the session check must come first, and the path the caller
    // cannot influence must be generated server-side.
    const source = readFileSync(
      "src/app/admin/(protected)/upload-sign-actions.ts",
      "utf8"
    );
    const guard = source.indexOf("await requireAdmin()");
    const sign = source.indexOf(".createSignedUploadUrl(");
    expect(guard, "upload signing has no requireAdmin() guard").toBeGreaterThan(-1);
    expect(sign, "upload signing never mints a URL").toBeGreaterThan(-1);
    expect(guard, "requireAdmin() must run before the URL is minted").toBeLessThan(sign);
    // The caller supplies a kind and a name, never a destination.
    expect(source).toMatch(/const path = `\$\{folder\}/);
  });
});

// ── The browser behaviour (needs credentials) ───────────────────────────────

test.describe("leaving the admin area", () => {
  test.skip(
    !HAS_CREDS,
    "No E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD supplied — the leave-and-sign-in-" +
      "again journey could not be executed in a real browser."
  );

  test("moving between admin pages does not ask for a password again", async ({
    page,
  }) => {
    await login(page);
    for (const path of [
      "/admin",
      "/admin/articles",
      "/admin/articles/new",
      "/admin/articles",
    ]) {
      await gotoClean(page, path);
      expect(page.url(), `navigating to ${path} ended the admin session`).toContain(
        "/admin"
      );
      expect(page.url()).not.toContain("/admin/login");
    }
  });

  test("coming back from the public site requires signing in again", async ({
    page,
  }) => {
    await login(page);
    await gotoClean(page, "/admin/articles");
    expect(page.url()).toContain("/admin/articles");

    // Step 4 of the requested workflow: go and read the published site.
    await gotoClean(page, "/");
    const survived = await waitForSessionCookiesToClear(page.context());
    expect(
      survived,
      `the session cookies survived leaving the admin area: ${survived.join(", ")}`
    ).toEqual([]);

    // Step 5: back to the dashboard to fix a typo.
    await gotoClean(page, "/admin/articles");
    await expectLoginPage(page);
  });

  test("the explicit exit control signs out before it navigates", async ({
    page,
  }) => {
    await login(page);
    const exit = page.getByRole("button", { name: /view site/i });
    await expect(exit).toBeVisible();
    await exit.click();
    await page.waitForURL((url) => url.pathname === "/", { timeout: 30_000 });
    const survived = await waitForSessionCookiesToClear(page.context());
    expect(
      survived,
      `the exit control left a live session behind: ${survived.join(", ")}`
    ).toEqual([]);

    await gotoClean(page, "/admin");
    await expectLoginPage(page);
  });

  test("a protected URL opened in a new tab after leaving is not authorised", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await login(page);
      await gotoClean(page, "/");
      // The cookie jar is shared by every tab in the context, so waiting for
      // it to empty covers the second tab below as well.
      const survived = await waitForSessionCookiesToClear(context);
      expect(
        survived,
        `the session cookies survived leaving the admin area: ${survived.join(", ")}`
      ).toEqual([]);
      await gotoClean(page, "/admin/articles");
      await expectLoginPage(page);

      const second = await context.newPage();
      await gotoClean(second, "/admin/articles");
      await expectLoginPage(second);
    } finally {
      await context.close();
    }
  });

  test("refresh and back navigation do not restore the dashboard", async ({
    page,
  }) => {
    await login(page);
    await gotoClean(page, "/admin/articles");
    await gotoClean(page, "/");

    // Refresh: a fresh request, so it must be refused.
    await gotoClean(page, "/admin/articles");
    await expectLoginPage(page);
    await page.reload();
    expect(page.url()).toContain("/admin/login");

    // Back: even if the browser serves the old document from its cache, the
    // session is gone — either the entry is replaced by the guard, or the
    // request is refused and redirected.
    await page.goBack({ waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/admin\/login|\/$/, { timeout: 20_000 });
    expect(page.url()).not.toContain("/admin/articles");
  });

  test("protected data is not returned to the signed-out browser", async ({
    page,
  }) => {
    await login(page);
    await gotoClean(page, "/");
    await gotoClean(page, "/admin/articles");
    await expectLoginPage(page);

    const res = await page.request.get("/admin/articles", { maxRedirects: 0 });
    expect([301, 302, 303, 307, 308]).toContain(res.status());
    expect(res.headers()["location"] ?? "").toContain("/admin/login");
  });
});
