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
 * they rely on (`@media (scripting: none)`, the injected rescue stylesheet)
 * actually work in Gecko and WebKit, not just Chromium.
 *
 * A third case covers the opposite mistake — a rescue that *edits* the
 * document it finds. See the slow-boot block at the end.
 */

const FAULTY_ROUTES = ["/", "/articles/the-headline"];

/**
 * Two severities of the same failure:
 *   - `js only` is the realistic one: a stale hashed chunk after a deploy, or
 *     an extension blocking scripts.
 *   - `JS and CSS` is the harsher one: nothing under /_next/static loads, so
 *     the page stylesheet does not exist either.
 *
 * Both are survived by the same mechanism — the stylesheet the inline
 * watchdog installs — which is why the rescue cannot live in globals.css.
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

      // The inline watchdog must fire (2.5s) and install its rescue sheet.
      await expect
        .poll(() => page.evaluate(() => window.__ngRevealRescued === 1), {
          timeout: 15_000,
        })
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
    // Healthy boot ⇒ content becomes visible once the reveals have run. A
    // rescue installed because hydration legitimately took longer than 2.5s on
    // a cold server stays installed by design — it never re-hides content it
    // already showed — so this asserts the end state, not the mechanism.
    const leftovers = await waitForNoHiddenContent(page);
    expect(
      leftovers,
      `invisible content on a healthy boot:\n  ${leftovers.join("\n  ")}`
    ).toEqual([]);
  });
});

/**
 * Slow boot — the failure mode that used to break hydration.
 *
 * The watchdog cannot tell "the bundle will never boot" from "the bundle is
 * slow", and 2.5s is well inside the range where a cold compile, a slow device
 * or a slow network is still booting. So the rescue has to fire *and* leave the
 * document exactly as the server rendered it: anything it rewrites on an
 * element React rendered — `class` on `<html>`, the inline `style` motion
 * starts from — is compared during hydration and reported as "A tree hydrated
 * but some attributes of the server rendered HTML didn't match. This won't be
 * patched up."
 *
 * The bundle is delayed past the timer, so the window is deterministic: when
 * the rescue has fired, the chunk that hydrates the page is still in flight.
 */
test.describe("slow boot: the bundle lands after the watchdog", () => {
  const BUNDLE_DELAY_MS = 6_000;

  test("the rescue fires without rewriting what React rendered", async ({
    page,
  }) => {
    const hydrationErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const text = msg.text();
      // A development build names the mismatch in words; a production build
      // logs the minified code for the same recovery.
      if (/hydrat/i.test(text) || /React error #(418|422|423|425)/.test(text)) {
        hydrationErrors.push(text.replace(/\s+/g, " ").slice(0, 200));
      }
    });

    let delayed = 0;
    await page.route(
      (url) => /\/_next\/static\/.*\.js(\?|$)/.test(url.href),
      async (route) => {
        delayed += 1;
        await new Promise((resolve) => setTimeout(resolve, BUNDLE_DELAY_MS));
        await route.continue();
      }
    );

    // Deliberately not `gotoClean`: that waits for the `load` event, which
    // waits for the very chunks this test delays, so the sample would land
    // after hydration and measure nothing.
    await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(
      delayed,
      "no chunk was delayed — the probe would pass vacuously"
    ).toBeGreaterThan(0);

    // ~2.5s in, with the hydrating chunk still seconds away.
    await expect
      .poll(() => page.evaluate(() => window.__ngRevealRescued === 1), {
        timeout: 15_000,
      })
      .toBe(true);

    const during = await page.evaluate(() => {
      const reveal = document.querySelector<HTMLElement>("[data-reveal]");
      return {
        htmlClass: document.documentElement.className,
        inlineOpacity: reveal ? reveal.style.opacity : null,
        inlineTransform: reveal ? reveal.style.transform : null,
        computedOpacity: reveal ? getComputedStyle(reveal).opacity : null,
      };
    });

    // The attributes React hydrates must be exactly as the server left them…
    expect(
      during.htmlClass,
      "the watchdog wrote a class onto <html>, which React hydrates"
    ).not.toContain("no-hydration");
    // …including the block's own hidden start state.
    expect(
      during.inlineOpacity,
      "the watchdog rewrote the reveal block's own style, which React hydrates"
    ).toBe("0");
    expect(
      during.inlineTransform,
      "the watchdog rewrote the reveal block's transform, which React hydrates"
    ).not.toBe("none");

    // …while the rescue still does its job, from a stylesheet.
    expect(
      Number(during.computedOpacity),
      "the rescue did not render a reveal block the server left hidden"
    ).toBeGreaterThan(0.9);

    // Let the delayed bundle arrive, hydrate and animate.
    await page
      .waitForFunction(
        () =>
          [...document.querySelectorAll<HTMLElement>("[data-reveal]")].every(
            (el) => parseFloat(getComputedStyle(el).opacity) > 0.9
          ),
        undefined,
        { timeout: 30_000 }
      )
      .catch(() => {
        /* asserted below, with a readable message */
      });

    const hidden = await findHiddenContent(page);
    expect(
      hidden,
      `content never became visible after a slow boot:\n  ${hidden.join("\n  ")}`
    ).toEqual([]);
    expect(
      hydrationErrors,
      `hydration mismatch after a slow boot:\n  ${hydrationErrors.join("\n  ")}`
    ).toEqual([]);
  });
});
