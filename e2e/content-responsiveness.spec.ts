import { test, expect, gotoClean, revealAll } from "./fixtures";
import type { Page } from "@playwright/test";

/**
 * Admin-uploaded content must not be able to break the layout.
 *
 * The client pasted text into a Lawyer in the News answer that contained runs
 * of hundreds of characters with no whitespace in them. With the default
 * `overflow-wrap: normal` such a run is unbreakable, so the line extended past
 * its column and the whole document scrolled sideways — measured at 3653px
 * wide inside a 375px viewport, at every width from 320px up. The inline
 * article images were also rendering at full column width (740px wide and
 * 973px tall on a 1440px screen). Both are fixed in `globals.css`, and these
 * tests pin the behaviour so neither can come back:
 *
 *   · no page scrolls sideways, at the six widths the client asked for;
 *   · a hostile pasted run (a 400-character word, a long URL) wraps instead of
 *     widening the page, and is not truncated;
 *   · inline article images stay inside their container and the viewport, keep
 *     their aspect ratio, stay modestly sized, and keep the position the admin
 *     chose on every screen size.
 *
 * The content-dependent checks read the real published story from the listing
 * page and skip when nothing is published (the same convention the admin specs
 * use when credentials are absent).
 */

const WIDTHS = [320, 375, 430, 768, 1024, 1440];
const CONTENT_ROUTES = [
  "/",
  "/articles",
  "/lawyer-in-the-news",
  "/legal-updates",
  "/events",
  "/issues",
];

/** The first published Lawyer in the News story, or null when none exists. */
async function firstStoryPath(page: Page): Promise<string | null> {
  const res = await page.goto("/lawyer-in-the-news", {
    waitUntil: "domcontentloaded",
  });
  if (!res || res.status() !== 200) return null;
  const href = await page
    .locator('a[href^="/lawyer-in-the-news/"]')
    .first()
    .getAttribute("href", { timeout: 10_000 })
    .catch(() => null);
  return href ?? null;
}

for (const width of WIDTHS) {
  test.describe(`content at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test("no page scrolls sideways", async ({ page }) => {
      for (const route of CONTENT_ROUTES) {
        await gotoClean(page, route);
        const overflow = await page.evaluate(() => {
          const d = document.documentElement;
          const offenders: string[] = [];
          for (const el of document.querySelectorAll<HTMLElement>("body *")) {
            const r = el.getBoundingClientRect();
            if (r.width < 2 || r.height < 2) continue;
            if (r.right <= window.innerWidth + 2) continue;
            // Carousels and table scrollers are deliberately wider than the
            // viewport inside their own overflow container.
            let p: HTMLElement | null = el.parentElement;
            let clipped = false;
            while (p && p !== document.body) {
              const o = getComputedStyle(p).overflowX;
              if (o === "hidden" || o === "auto" || o === "scroll") {
                clipped = true;
                break;
              }
              p = p.parentElement;
            }
            if (clipped) continue;
            offenders.push(
              `${el.tagName}.${String(el.className).slice(0, 40)} right=${Math.round(r.right)}`
            );
          }
          return {
            scrollW: d.scrollWidth,
            clientW: d.clientWidth,
            offenders: offenders.slice(0, 5),
          };
        });

        expect(
          overflow.offenders,
          `content escapes the viewport on ${route} @ ${width}px`
        ).toEqual([]);
        expect(
          overflow.scrollW,
          `the document scrolls sideways on ${route} @ ${width}px`
        ).toBeLessThanOrEqual(overflow.clientW + 1);
      }
    });

    test("pasted runs wrap and inline images stay bounded", async ({ page }) => {
      const story = await firstStoryPath(page);
      test.skip(!story, "no published Lawyer in the News story to measure");
      await gotoClean(page, story as string);
      // Scroll the article so lazy images decode: Firefox and WebKit leave
      // below-the-fold images at naturalWidth 0 until they are near the
      // viewport, and an undecoded image has no aspect ratio to check.
      await revealAll(page, 1);

      // ── 1. A hostile paste wraps instead of widening the page ──────────
      const injected = await page.evaluate(() => {
        const host = document.querySelector<HTMLElement>(".prose-article");
        if (!host) return null;
        const wordText = "L".repeat(400);
        const urlText = "https://example.com/" + "a".repeat(300);
        const word = document.createElement("p");
        word.id = "e2e-long-word";
        word.textContent = wordText;
        const url = document.createElement("p");
        url.id = "e2e-long-url";
        url.textContent = urlText;
        host.append(word, url);
        return { wordLength: wordText.length, urlLength: urlText.length };
      });
      expect(
        injected,
        "no .prose-article body found — the probe would pass vacuously"
      ).not.toBeNull();

      const wrapped = await page.evaluate(() => {
        const read = (id: string) => {
          const el = document.getElementById(id) as HTMLElement;
          const cs = getComputedStyle(el);
          return {
            textLength: (el.textContent ?? "").length,
            wrap: cs.overflowWrap,
            textOverflow: cs.textOverflow,
            boxScrollW: el.scrollWidth,
            boxClientW: el.clientWidth,
            right: Math.round(el.getBoundingClientRect().right),
          };
        };
        const d = document.documentElement;
        return {
          pageScrolls: d.scrollWidth > d.clientWidth + 1,
          viewport: window.innerWidth,
          word: read("e2e-long-word"),
          url: read("e2e-long-url"),
        };
      });

      // The content is never truncated…
      expect(wrapped.word.textLength, "the pasted word was altered").toBe(
        injected!.wordLength
      );
      expect(wrapped.url.textLength, "the pasted URL was altered").toBe(
        injected!.urlLength
      );
      // …it is not hidden with an ellipsis…
      expect(wrapped.word.textOverflow).toBe("clip");
      // …it is allowed to break…
      expect(
        wrapped.word.wrap,
        "the shared wrap rule is missing from the prose body"
      ).toBe("anywhere");
      // …and neither paste widens its own box or the page.
      for (const [label, box] of [
        ["400-character word", wrapped.word],
        ["long URL", wrapped.url],
      ] as const) {
        expect(
          box.boxScrollW,
          `the ${label} overflows its own paragraph box`
        ).toBeLessThanOrEqual(box.boxClientW + 1);
        expect(
          box.right,
          `the ${label} extends past the viewport`
        ).toBeLessThanOrEqual(wrapped.viewport + 1);
      }
      expect(
        wrapped.pageScrolls,
        "a pasted run made the document scroll sideways"
      ).toBe(false);

      // ── 2. Inline images: bounded, ratio preserved, position kept ──────
      const figures = await page.evaluate(() => {
        const mobile = window.innerWidth < 768;
        return [...document.querySelectorAll<HTMLElement>(".editorial-figure")].map(
          (fig) => {
            const cs = getComputedStyle(fig);
            const img = fig.querySelector("img") as HTMLImageElement | null;
            const host = (fig.closest(".editorial-figure--full") ?? fig) as HTMLElement;
            const hostRect = host.getBoundingClientRect();
            const rect = fig.getBoundingClientRect();
            const isFloat =
              fig.classList.contains("editorial-figure--float-left") ||
              fig.classList.contains("editorial-figure--float-right");
            return {
              loaded: !!img && img.naturalWidth > 0 && img.naturalHeight > 0,
              isFloat,
              wantsLeft: fig.classList.contains("editorial-figure--float-left"),
              float: cs.float,
              width: fig.offsetWidth,
              hostWidth: host.offsetWidth,
              hostLeft: Math.round(hostRect.left),
              hostRight: Math.round(hostRect.right),
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              imgWidth: img?.offsetWidth ?? null,
              imgHeight: img?.offsetHeight ?? null,
              naturalRatio: img ? img.naturalWidth / img.naturalHeight : null,
              renderedRatio:
                img && img.offsetHeight ? img.offsetWidth / img.offsetHeight : null,
              cappedAt: mobile ? 17 * 16 : 19 * 16,
            };
          }
        );
      });

      test.skip(figures.length === 0, "this story has no inline images");
      const mobile = width < 768;
      const measured = figures.filter((f) => f.loaded);
      expect(
        measured.length,
        "no inline image had decoded — every geometry assertion below would be vacuous"
      ).toBeGreaterThan(0);

      for (const fig of measured) {
        expect(
          fig.imgWidth,
          "an image is wider than the box it sits in"
        ).toBeLessThanOrEqual(fig.hostWidth + 1);
        expect(
          fig.width,
          "an image box is wider than the viewport"
        ).toBeLessThanOrEqual(width + 1);
        // Aspect ratio is preserved within a pixel of rounding.
        expect(
          Math.abs((fig.renderedRatio ?? 0) - (fig.naturalRatio ?? 0)),
          `aspect ratio changed (${fig.renderedRatio} vs ${fig.naturalRatio})`
        ).toBeLessThan(0.02);

        if (!fig.isFloat) continue;

        // The client asked for these to be noticeably smaller: the floated
        // figures are capped by CSS at 19rem (desktop) / 17rem (mobile).
        expect(
          fig.width,
          `a floated inline image renders larger than the ${fig.cappedAt}px cap`
        ).toBeLessThanOrEqual(fig.cappedAt + 1);

        if (mobile) {
          // No float on small screens (a wrap beside a 320px column would be
          // unreadable) — but the side the admin chose is still honoured.
          expect(fig.float, "a float survived into the mobile layout").toBe("none");
          if (fig.wantsLeft) {
            expect(
              Math.abs(fig.left - fig.hostLeft),
              "a left-positioned image drifted away from the left edge"
            ).toBeLessThanOrEqual(2);
          } else {
            expect(
              Math.abs(fig.right - fig.hostRight),
              "a right-positioned image drifted away from the right edge"
            ).toBeLessThanOrEqual(2);
          }
        } else {
          expect(
            fig.float,
            "a positioned image lost its float on desktop"
          ).toBe(fig.wantsLeft ? "left" : "right");
        }
      }

      // ── 3. The no-body grid path shares those sizes ────────────────────
      // `PositionedImageGrid` renders the same Image 1–4 slots when an entry
      // has images but no body text yet, and it had drifted to 42% while the
      // floated figures were 46%. It is not reachable in every environment
      // (it needs such an entry), but its size contract is pinned here so the
      // two renderers cannot diverge again.
      const gridSizes = await page.evaluate(() => {
        const measure = (cls: string) => {
          const el = document.createElement("figure");
          el.className = cls;
          document.body.appendChild(el);
          const w = parseFloat(getComputedStyle(el).width);
          el.remove();
          return w;
        };
        return {
          half: measure("article-image--half"),
          full: measure("article-image--full"),
        };
      });
      const halfCap = (width < 768 ? 17 : 19) * 16;
      expect(
        gridSizes.half,
        "the no-body image grid uses a different size than the article figures"
      ).toBeLessThanOrEqual(halfCap + 1);
      expect(
        gridSizes.full,
        "a full-width grid image is not bounded to the shared cap"
      ).toBeLessThanOrEqual(40 * 16 + 1);
      expect(
        gridSizes.half,
        "the half-width grid size is not smaller than the full-width one"
      ).toBeLessThan(gridSizes.full);

      // ── 4. On desktop, text really wraps beside a floated image ────────
      if (!mobile) {
        const flow = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>(".editorial-flow")].map((s) => {
            const fig = s.querySelector(".editorial-figure");
            const text = s.querySelector(".prose-article p");
            if (!fig || !text) return null;
            const fr = fig.getBoundingClientRect();
            const tr = text.getBoundingClientRect();
            return {
              overlap: Math.min(fr.bottom, tr.bottom) - Math.max(fr.top, tr.top),
              flowRoot: getComputedStyle(s).display,
              figureRight: Math.round(fr.right),
              textLeft: Math.round(tr.left),
            };
          })
        );
        for (const section of flow.filter(Boolean) as {
          overlap: number;
          flowRoot: string;
          figureRight: number;
          textLeft: number;
        }[]) {
          expect(
            section.flowRoot,
            "the flowed section is not a block formatting context"
          ).toBe("flow-root");
          expect(
            section.overlap,
            "no line of text shares a band with the floated image, so nothing wraps beside it"
          ).toBeGreaterThan(0);
        }
      }
    });
  });
}
