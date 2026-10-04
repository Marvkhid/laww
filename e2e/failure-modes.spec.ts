import {
  test,
  expect,
  gotoClean,
  findHiddenContent,
  waitForNoHiddenContent,
} from "./fixtures";

/**
 * Failure-mode regression tests.
 *
 * Two deterministic ways a reader ends up staring at nothing, both found
 * during the cross-browser audit and both reproduced here on purpose:
 *
 *  1. Scripting is enabled but the app bundle never boots — stale hashed
 *     chunk after a deploy, a blocked /_next/static request, a privacy
 *     extension, or a hydration exception. Every reveal block is
 *     server-rendered at `opacity: 0`, so without the watchdog the page
 *     renders as a blank column.
 *  2. Scripting is disabled entirely — React's streamed content never swaps
 *     in, so the loading skeleton would pulse forever with no explanation.
 *
 * Both tests run in all three engines, which also proves the CSS features
 * they rely on (`@media (scripting: none)`, the `no-hydration` safety net)
 * actually work in Gecko and WebKit, not just Chromium.
 */

const FAULTY_ROUTES = ["/", "/articles/the-headline"];

/**
 * Two severities of the same failure:
 *   - `js only` is the realistic one: a stale hashed chunk after a deploy, or
 *     an extension blocking scripts, leaves the stylesheet intact so the
 *     `html.no-hydration` CSS rules can rescue the page.
 *   - `JS and CSS` is the harsher one: nothing under /_next/static loads, so
 *     the CSS safety net does not exist and only the inline watchdog's direct
 *     style normalisation can prevent a blank page.
 */
const BLOCK_MODES: { name: string; pattern: string }[] = [
  { name: "JS only", pattern: "**/_next/static/**/*.js" },
  { name: "JS and CSS", pattern: "**/_next/static/**" },
];

test.describe("app bundle never boots", () => {
  for (const mode of BLOCK_MODES) {
    for (const route of FAULTY_ROUTES) {
      test(`content still becomes visible on ${route} when ${mode.name} are blocked`, async ({
        page,
      }) => {
        const pageErrors: string[] = [];
        page.on("pageerror", (e) => pageErrors.push(String(e)));

        let blocked = 0;
        await page.route(mode.pattern, (r) => {
          blocked += 1;
          return r.abort();
        });

        await gotoClean(page, route);
        expect(
          blocked,
          "no chunk request was intercepted — the probe would pass vacuously"
        ).toBeGreaterThan(0);

      // The inline watchdog must fire (2.5s) and mark the document.
      await expect
        .poll(
          () =>
            page.evaluate(() =>
              document.documentElement.classList.contains("no-hydration")
            ),
          { timeout: 15_000 }
        )
        .toBe(true);

      // Streamed Suspense content still swaps in — React's swap scripts are
      // inline, so they are not part of the blocked bundle.
      await page
        .waitForFunction(
          () => document.querySelectorAll(".animate-pulse").length === 0,
          undefined,
          { timeout: 20_000 }
        )
        .catch(() => {
          /* asserted below with a readable message */
        });
      const stillPulsing = await page.evaluate(
        () => document.querySelectorAll(".animate-pulse").length
      );
      expect(
        stillPulsing,
        "streamed content never swapped in even though inline scripts ran"
      ).toBe(0);

      // Nothing that occupies space may be visually suppressed.
      const hidden = await findHiddenContent(page);
      expect(
        hidden,
        `invisible content with the bundle blocked:\n  ${hidden.join("\n  ")}`
      ).toEqual([]);

      // The headline must be on screen, not just in the DOM.
      const h1 = page.locator("main h1").first();
      await expect(h1).toBeVisible();

      expect(pageErrors, "uncaught exceptions with the bundle blocked").toEqual(
        []
      );
      });
    }
  }
});

test.describe("JavaScript disabled", () => {
  test.use({ javaScriptEnabled: false });

  test("the page explains itself instead of spinning forever", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "load" });

    // The explanatory notice replaces the endless skeleton.
    const notice = page.locator(".nojs-notice");
    await expect(notice).toBeVisible();

    // No element may still be animating as a loading skeleton.
    const pulsing = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>(".animate-pulse")].filter(
        (e) => {
          const cs = getComputedStyle(e);
          return cs.display !== "none" && cs.animationName !== "none";
        }
      ).length
    );
    expect(
      pulsing,
      "skeletons still animate with scripting disabled — an infinite spinner"
    ).toBe(0);

    // The chrome around the content must still be usable.
    await expect(
      page.getByRole("navigation", { name: "Primary" })
    ).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test("every public route settles to a static state", async ({ page }) => {
    for (const route of ["/", "/articles", "/about", "/events"]) {
      await page.goto(route, { waitUntil: "load" });
      const pulsing = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>(".animate-pulse")].filter(
          (e) => getComputedStyle(e).animationName !== "none"
        ).length
      );
      expect(
        pulsing,
        `${route} still shows an animated skeleton without JavaScript`
      ).toBe(0);
      await expect(page.locator(".nojs-notice")).toBeVisible();
    }
  });
});

test.describe("JavaScript enabled", () => {
  test("the no-JS notice stays out of the way", async ({ page }) => {
    await gotoClean(page, "/");
    await expect(page.locator(".nojs-notice")).toBeHidden();
    // Healthy boot ⇒ content becomes visible once the reveals have run.
    // (The watchdog class itself may be present if hydration legitimately
    // took longer than 2.5s on a cold server — by design it never re-hides
    // content it already showed.)
    const leftovers = await waitForNoHiddenContent(page);
    expect(
      leftovers,
      `invisible content on a healthy boot:\n  ${leftovers.join("\n  ")}`
    ).toEqual([]);
  });
});
