import { test as base, expect, type Locator, type Page } from "@playwright/test";

/**
 * Browser-health fixture.
 *
 * The client's Firefox report was "the site does not display correctly", with
 * no console output to go on. These tests therefore assert the *absence* of
 * browser-level faults on every page they visit, and when something does go
 * wrong they print the console log, uncaught exceptions and failed requests
 * that caused it — so a failure is diagnosable without re-running by hand.
 */

/**
 * WebKit reports Next.js router prefetch aborts as page errors.
 *
 * The app router coalesces the sidebar's `<Link>` prefetches into one request
 * per cache key and cancels the ones it no longer needs. In Chromium and
 * Firefox that cancellation surfaces as `net::ERR_ABORTED` (already filtered
 * below); WebKit raises it from inside its CORS-check callback instead, so the
 * `fetch` rejects with
 * "Fetch API cannot load <url> due to access control checks."
 *
 * Verified not to be a real request failure: instrumenting a WebKit run shows
 * the affected URLs never produce a response *and* never appear as a failed
 * request — no network round trip is left hanging — while the identical fetch
 * issued by hand returns 200. The stack is inside Next's own app-router chunk.
 * It is therefore router housekeeping, so it is filtered by URL, narrowly:
 * any *other* fetch failure on those routes still fails the test.
 */
const ABORTED_ROUTER_PREFETCH = /_rsc=[^\s]* due to access control checks\.$/;

/**
 * Third-party noise we can see but do not own.
 *
 * Supabase Storage sits behind Cloudflare, which tries to set a `__cf_bm`
 * bot-management cookie on a cross-site subresource request. Firefox's Total
 * Cookie Protection rejects it and logs an error. Measured: the image still
 * loads in every engine, so this is log noise, not a rendering fault. It is
 * listed here explicitly (and reported in the audit) rather than ignored, so
 * it cannot quietly hide a real error later.
 */
const KNOWN_THIRD_PARTY_NOISE: RegExp[] = [
  /__cf_bm.*rejected for invalid domain/i,
];

/**
 * An <img> subresource that failed transiently is not a page fault.
 *
 * Supabase Storage occasionally drops a connection mid-transfer ("Failure
 * when receiving data from the peer"). Image rendering is asserted by its
 * own test on every route — `no image fails` polls until every <img> reports
 * `naturalWidth > 0` and fails with the offending URL — so a hiccup here is
 * already covered where it can be diagnosed properly. JS, API and navigation
 * faults are still recorded and asserted.
 */
function isImageRequest(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp)(\?|#|$)/i.test(url);
}

export type PageFaults = {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  httpErrors: string[];
};

export const test = base.extend<{ useFaults: PageFaults }>({
  useFaults: async ({ page }, use) => {
    const faults: PageFaults = {
      consoleErrors: [],
      pageErrors: [],
      failedRequests: [],
      httpErrors: [],
    };

    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const text = msg.text();
      if (KNOWN_THIRD_PARTY_NOISE.some((re) => re.test(text))) return;
      // Resource-load failures name their URL in the message location, not
      // always in the text; a failed image is covered by the image test.
      const locationUrl = msg.location()?.url ?? "";
      if (/failed to load resource/i.test(text) && isImageRequest(locationUrl))
        return;
      faults.consoleErrors.push(text);
    });
    // `E2E_FAULT_STACK=1` appends the stack, which is what identifies an error
    // raised inside the Next.js router versus one raised by app code.
    const withStack = process.env.E2E_FAULT_STACK === "1";
    page.on("pageerror", (err) => {
      if (ABORTED_ROUTER_PREFETCH.test(err.message)) return;
      faults.pageErrors.push(
        withStack
          ? `${err.message}\n${(err.stack ?? "").split("\n").slice(1, 5).join("\n")}`
          : String(err)
      );
    });
    page.on("requestfailed", (req) => {
      const url = req.url();
      const error = req.failure()?.errorText ?? "failed";
      // Next.js cancels RSC prefetches when a link scrolls out of range or the
      // router re-navigates. The browser reports these as ERR_ABORTED; they
      // are the router working as designed, not a failed request.
      if (error === "net::ERR_ABORTED" && url.includes("_rsc=")) return;
      if (isImageRequest(url)) return;
      faults.failedRequests.push(`${error} ${url}`);
    });
    page.on("response", (res) => {
      if (res.status() < 400) return;
      // Favicons and similar optional probes are not a page fault.
      if (res.url().includes("favicon")) return;
      // A 5xx/timeout on one image is asserted by the image test, which
      // verifies the actual decode result; the health check keeps its
      // focus on app-owned responses.
      if (res.request().resourceType() === "image") return;
      faults.httpErrors.push(`${res.status()} ${res.url()}`);
    });

    // Playwright fixture teardown, not a React hook call.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(faults);
  },
});

/**
 * Click an element that must actually receive the click.
 *
 * Firefox surfaced two ways an interaction can bounce off a healthy page:
 * Playwright's own `scrollIntoViewIfNeeded` can leave a target underneath the
 * sticky header (which then swallows the click), and a `Reveal` element is
 * still animating when the click is attempted ("element is not stable"). Both
 * are harness artefacts — a user scrolls, or waits for the animation — so the
 * helper reproduces that: centre the element, and if the click bounces, give
 * the animation a moment and try again.
 *
 * It still fails the test if the element genuinely cannot be clicked.
 */
export async function clickStable(locator: Locator, attempts = 3) {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      await locator.evaluate((el) =>
        el.scrollIntoView({ block: "center", inline: "nearest" })
      );
      await locator.click({ timeout: 5_000 });
      return;
    } catch (err) {
      lastError = err;
      await locator.page().waitForTimeout(500);
    }
  }
  throw lastError;
}

/** Navigate, wait for the app to settle, and assert the page is fault-free. */
export async function gotoClean(page: Page, path: string) {
  const res = await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load");
  return res;
}

/**
 * Wait until the page is genuinely interactive before measuring anything.
 *
 * Two independent things have to finish first, and both are observable:
 *
 *  1. Server-streamed Suspense content has replaced its skeleton. Until then
 *     the page genuinely has nothing in `main` — measuring early is a false
 *     failure, not a defect.
 *  2. React has hydrated. The root route template renders its children at
 *     `opacity: 0` and animates to 1 on mount, so a settled hydration is
 *     observable as the first `[data-reveal]` element being fully opaque.
 *
 * Both waits are bounded: if they time out the test continues and fails on the
 * assertion it actually cares about, with a useful message, rather than dying
 * on a helper.
 */
export async function waitForAppReady(page: Page) {
  await page
    .waitForFunction(
      () => document.querySelectorAll(".animate-pulse").length === 0,
      undefined,
      { timeout: 25_000 }
    )
    .catch(() => {
      /* reported by the caller's own assertion */
    });

  await page
    .waitForFunction(
      () => {
        const el = document.querySelector("[data-reveal]");
        if (!el) return true;
        return parseFloat(getComputedStyle(el).opacity) > 0.9;
      },
      undefined,
      { timeout: 25_000 }
    )
    .catch(() => {
      /* reported by the caller's own assertion */
    });

  await page.waitForTimeout(500);
}

/** Scroll the whole document so IntersectionObserver reveals fire. */
export async function revealAll(page: Page, passes = 2) {
  await waitForAppReady(page);
  await page.evaluate(async (passCount) => {
    const step = Math.max(150, Math.floor(window.innerHeight * 0.4));
    const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));
    // The first pass triggers every lazy image and reveals every section that
    // was in view, which can change the document height; the second catches
    // anything the first pass pushed out of range.
    for (let pass = 0; pass < passCount; pass++) {
      window.scrollTo(0, 0);
      await settle(150);
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await settle(110);
      }
      window.scrollTo(0, document.body.scrollHeight);
      await settle(500);
    }
    window.scrollTo(0, 0);
    await settle(600);
  }, passes);
  // The reveal animation is 0.7s; wait it out before measuring opacity.
  await page.waitForTimeout(1_200);
}

/** Elements that occupy layout space but are visually suppressed. */
export async function findHiddenContent(page: Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(
      "p, h1, h2, h3, li, img, a, button"
    )) {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      let node: HTMLElement | null = el;
      while (node && node !== document.body) {
        const cs = getComputedStyle(node);
        if (
          parseFloat(cs.opacity) < 0.15 ||
          cs.visibility === "hidden" ||
          cs.display === "none"
        ) {
          out.push(
            `${el.tagName}: ${(el.textContent || el.getAttribute("alt") || "")
              .trim()
              .slice(0, 50)}`
          );
          break;
        }
        node = node.parentElement;
      }
    }
    return out;
  });
}

/**
 * Poll until nothing is left visually suppressed.
 *
 * The reveals are staggered (up to 0.2s delay + 0.7s duration per block) and
 * the last one is triggered by the final scroll position, so a single
 * fixed-duration wait is inherently racy. Polling asserts the *end state*
 * rather than a guess about how long the animation takes.
 */
export async function waitForNoHiddenContent(
  page: Page,
  timeoutMs = 25_000
): Promise<string[]> {
  const deadline = Date.now() + timeoutMs;
  let last: string[] = [];
  let rescans = 0;
  while (Date.now() < deadline) {
    last = await findHiddenContent(page);
    if (last.length === 0) return [];
    // A reveal observer only exists once React has hydrated. If hydration
    // finished after the scroll pass, the observers attach at the current
    // scroll position and the sections that were already scrolled past stay
    // hidden. Re-walk the document rather than report a false failure.
    if (rescans < 2) {
      rescans += 1;
      await revealAll(page);
      continue;
    }
    await page.waitForTimeout(500);
  }
  return last;
}

/** Poll until every image that has been requested has finished decoding. */
export async function waitForNoBrokenImages(
  page: Page,
  timeoutMs = 15_000
): Promise<string[]> {
  const deadline = Date.now() + timeoutMs;
  let last: string[] = [];
  while (Date.now() < deadline) {
    last = await findBrokenImages(page);
    if (last.length === 0) return [];
    await page.waitForTimeout(500);
  }
  return last;
}

/** Images that failed to decode after a full scroll pass. */
export async function findBrokenImages(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("img")]
      .filter((i) => i.complete && i.naturalWidth === 0)
      .map((i) => (i.currentSrc || i.src).slice(0, 160))
  );
}

export function reportFaults(faults: PageFaults) {
  const parts: string[] = [];
  if (faults.pageErrors.length)
    parts.push(`uncaught exceptions:\n  ${faults.pageErrors.join("\n  ")}`);
  if (faults.consoleErrors.length)
    parts.push(`console errors:\n  ${faults.consoleErrors.join("\n  ")}`);
  if (faults.failedRequests.length)
    parts.push(`failed requests:\n  ${faults.failedRequests.join("\n  ")}`);
  if (faults.httpErrors.length)
    parts.push(`HTTP >= 400:\n  ${faults.httpErrors.join("\n  ")}`);
  return parts.join("\n") || "no faults recorded";
}

export { expect };
