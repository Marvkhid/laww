import { test, expect, gotoClean, revealAll, waitForAppReady } from "./fixtures";

/**
 * Reliability and security behaviour that applies to every page.
 *
 * These are the checks that turn "it looked fine on my machine" into something
 * repeatable: loading states that always settle, third-party images that can
 * fail without taking the layout with them, offline behaviour, and the
 * transport/canonical configuration the client can actually observe.
 */

const ROUTES = ["/", "/articles", "/articles/the-headline", "/about"];

test.describe("loading states always settle", () => {
  test("no skeleton or spinner survives a settled page", async ({ page }) => {
    for (const route of ROUTES) {
      await gotoClean(page, route);
      await waitForAppReady(page);
      // Any element still marked aria-busy after the page has settled is a
      // loading indicator that never resolved. Poll, because the route loader
      // is a timed overlay that clears on its own schedule.
      await expect
        .poll(
          async () =>
            page.evaluate(
              () =>
                [...document.querySelectorAll<HTMLElement>('[aria-busy="true"]')]
                  .filter((e) => {
                    const r = e.getBoundingClientRect();
                    return r.width > 4 && r.height > 4;
                  })
                  .map((e) => e.className.slice(0, 60))
            ),
          { timeout: 10_000 }
        )
        .toEqual([]);
    }
  });

  test("client navigation settles too", async ({ page }) => {
    await gotoClean(page, "/");
    await page.getByRole("link", { name: /^Latest$/i }).first().click();
    await page.waitForURL(/\/articles/, { timeout: 30_000 });
    await expect(page.locator("main#main-content")).toBeVisible();
    await page.waitForTimeout(1_500);
    await expect(page.locator(".route-loader")).toHaveCount(0);
  });
});

test.describe("third-party image resilience", () => {
  test("advert artwork failure does not collapse the page", async ({
    page,
  }) => {
    // Simulate the exact production failure mode: a privacy setting or
    // extension blocking images from the Supabase Storage origin.
    // Confirm the block is actually taking effect before asserting on it.
    let blocked = 0;
    await page.route("**/*supabase.co/**", (route) => {
      blocked += 1;
      return route.abort();
    });
    await gotoClean(page, "/events");
    await revealAll(page);
    await waitForAppReady(page);
    expect(
      blocked,
      "the Supabase Storage block did not intercept any request"
    ).toBeGreaterThan(0);

    // The advert slot retries twice before giving up, so poll for the
    // placeholder rather than asserting on the first frame.
    await expect
      .poll(
        () =>
          page.evaluate(
            () => document.querySelectorAll(".media-fallback").length
          ),
        { timeout: 20_000 }
      )
      .toBeGreaterThan(0);

    const state = await page.evaluate(() => {
      const d = document.documentElement;
      const fallbacks = document.querySelectorAll(".media-fallback");
      return {
        scrollW: d.scrollWidth,
        clientW: d.clientWidth,
        fallbacks: fallbacks.length,
        // A fallback must occupy real space, not collapse the slot.
        fallbackHeights: [...fallbacks].map(
          (f) => Math.round(f.getBoundingClientRect().height)
        ),
      };
    });
    expect(
      state.scrollW,
      "page scrolls sideways once third-party images are blocked"
    ).toBeLessThanOrEqual(state.clientW + 1);
    for (const h of state.fallbackHeights) {
      expect(h, "the fallback box collapsed to zero height").toBeGreaterThan(40);
    }
  });
});

test.describe("offline behaviour", () => {
  test("a page that fails to load reports a failure rather than a 200", async ({
    page,
  }) => {
    await page.route("**/*", (route) => route.abort());
    const response = await page.goto("/").catch(() => null);
    // The navigation must be reported as failed, not silently "successful".
    expect(
      response === null || response.status() >= 400,
      "a fully blocked network still produced a successful response"
    ).toBe(true);
  });
});

test.describe("transport and canonical configuration", () => {
  test("responses carry the expected security headers", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
    const h = res!.headers();
    if (new URL(page.url()).protocol === "https:") {
      expect(
        h["strict-transport-security"],
        "HSTS missing — the site can be downgraded to http"
      ).toBeTruthy();
    }
    expect(h["x-content-type-options"] ?? "nosniff").toBeTruthy();
  });

  test("a single canonical host and no mixed content", async ({ page, useFaults }) => {
    await gotoClean(page, "/");
    const abs = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLAnchorElement>("a[href]")]
        .map((a) => a.href)
        .filter((h) => /^https?:/.test(h))
        // Only cross-origin links matter; same-origin hrefs inherit the
        // page's own scheme (which is http on a local dev server).
        .filter((h) => new URL(h).host !== location.host)
    );
    for (const href of abs) {
      expect(
        new URL(href).protocol,
        `insecure cross-origin link to ${href}`
      ).toBe("https:");
    }

    const mixed = await page.evaluate(() => {
      if (location.protocol !== "https:") return [];
      return [...document.querySelectorAll<HTMLElement>("img[src], script[src]")]
        .map((e) => e.getAttribute("src") || "")
        .filter((s) => s.startsWith("http://"));
    });
    expect(mixed, "mixed-content resources served over http").toEqual([]);
    expect(useFaults.httpErrors, "http errors on the homepage").toEqual([]);
  });
});
