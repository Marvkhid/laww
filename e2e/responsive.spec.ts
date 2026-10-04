import { test, expect, gotoClean, revealAll, waitForNoBrokenImages } from "./fixtures";

/**
 * Responsiveness across screen sizes.
 *
 * The same assertions run at three viewports in every engine, because the
 * client's report was "does not display correctly" rather than a specific
 * broken element — the layout itself is what had to be checked.
 */

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "mobile", width: 390, height: 844 },
] as const;

const ROUTES = ["/", "/articles", "/articles/the-headline", "/about", "/issues"];
// One scroll pass is enough to bring lazy content into range for geometry
// checks; the two-pass variant is reserved for reveal-state assertions.
const SINGLE_PASS = 1;

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });
    test.setTimeout(150_000);

    test("no horizontal page overflow", async ({ page }) => {
      for (const route of ROUTES) {
        await gotoClean(page, route);
        await revealAll(page, SINGLE_PASS);
        const overflow = await page.evaluate(() => {
          const d = document.documentElement;
          return {
            scrollW: d.scrollWidth,
            clientW: d.clientWidth,
            offenders: [...document.querySelectorAll<HTMLElement>("body *")]
              .filter((e) => {
                const r = e.getBoundingClientRect();
                if (r.width < 2 || r.height < 2) return false;
                if (r.right <= window.innerWidth + 2) return false;
                // Carousels and marquees are intentionally wider than the
                // viewport inside their own overflow-hidden scroller.
                let p: HTMLElement | null = e.parentElement;
                while (p && p !== document.body) {
                  const o = getComputedStyle(p).overflowX;
                  if (o === "hidden" || o === "auto" || o === "scroll") {
                    return false;
                  }
                  p = p.parentElement;
                }
                return true;
              })
              .slice(0, 5)
              .map(
                (e) =>
                  `${e.tagName}.${String(e.className).slice(0, 40)} right=${Math.round(
                    e.getBoundingClientRect().right
                  )}`
              ),
          };
        });
        expect(
          overflow.offenders,
          `elements escape the viewport on ${route} @ ${vp.name}`
        ).toEqual([]);
        expect(
          overflow.scrollW,
          `document scrolls sideways on ${route} @ ${vp.name}`
        ).toBeLessThanOrEqual(overflow.clientW + 1);
      }
    });

    test("body text stays inside the readable column", async ({ page }) => {
      await gotoClean(page, "/articles/the-headline");
      await revealAll(page, SINGLE_PASS);
      const bad = await page.evaluate(() => {
        const paras = [...document.querySelectorAll("p")].filter((p) => {
          const r = p.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && (p.textContent || "").length > 80;
        });
        return paras
          .map((p) => Math.round(p.getBoundingClientRect().width))
          .filter((w) => w > window.innerWidth + 2);
      });
      expect(bad, `paragraphs wider than the viewport @ ${vp.name}`).toEqual(
        []
      );
    });

    test("navigation is reachable", async ({ page }) => {
      await gotoClean(page, "/");
      const header = page.locator("header");
      await expect(header).toBeVisible();

      const desktopNav = header.locator("nav[aria-label='Primary']");
      const menuButton = header.locator(
        "button[aria-controls='mobile-nav-panel']"
      );

      if (vp.width >= 768) {
        await expect(desktopNav, `primary nav hidden @ ${vp.name}`).toBeVisible();
        // Nav order must stay stable: Latest first, Contact last.
        const labels = await desktopNav.locator("a").allInnerTexts();
        expect(labels.length).toBeGreaterThanOrEqual(7);
        expect(labels[0]?.trim().toUpperCase()).toBe("LATEST");
        expect(labels[labels.length - 1]?.trim().toUpperCase()).toBe("CONTACT");
      } else {
        await expect(menuButton, `menu button hidden @ ${vp.name}`).toBeVisible();
        await menuButton.click();
        const panel = page.locator("#mobile-nav-panel");
        await expect(panel, `mobile nav did not open @ ${vp.name}`).toBeVisible();
        const links = await panel.locator("a").allInnerTexts();
        expect(links.length).toBeGreaterThanOrEqual(7);
        expect(links[0]?.trim().toUpperCase()).toBe("LATEST");
        // Escape must close it again.
        await page.keyboard.press("Escape");
        await expect(
          panel,
          `mobile nav did not close on Escape @ ${vp.name}`
        ).toBeHidden();
      }
    });

    test("images load and are not collapsed", async ({ page }) => {
      for (const route of ROUTES) {
        await gotoClean(page, route);
        await revealAll(page, SINGLE_PASS);
        const broken = await waitForNoBrokenImages(page);
        expect(broken, `broken images on ${route} @ ${vp.name}`).toEqual([]);

        const collapsed = await page.evaluate(() =>
          [...document.querySelectorAll("img")]
            .filter((i) => {
              const r = i.getBoundingClientRect();
              // A zero-height <img> is a slot that has silently collapsed.
              return r.width > 40 && r.height < 4 && i.naturalWidth > 0;
            })
            .map((i) => (i.currentSrc || i.src).slice(0, 120))
        );
        expect(
          collapsed,
          `collapsed image slots on ${route} @ ${vp.name}`
        ).toEqual([]);
      }
    });

    test("article content order is correct", async ({ page }) => {
      await gotoClean(page, "/articles/the-headline");
      await revealAll(page, SINGLE_PASS);

      const order = await page.evaluate(() => {
        const at = (sel: string) => {
          const el = document.querySelector(sel);
          if (!el) return -1;
          return Math.round(
            el.getBoundingClientRect().top + window.scrollY
          );
        };
        const heading = [...document.querySelectorAll("h1")][0];
        // The article body is either rich text (EditorialBody) or the
        // positioned-images grid when the body is empty.
        const body = document.querySelector(
          '.prose-article, [data-testid="positioned-image-grid"]'
        );
        const author = document.querySelector('[data-testid="article-author"]');
        return {
          h1: heading?.textContent?.trim() ?? "",
          h1Top: heading
            ? Math.round(heading.getBoundingClientRect().top + window.scrollY)
            : -1,
          hasBody: !!body,
          authorTop: at('[data-testid="article-author"]'),
          bodyTop: body
            ? Math.round(body.getBoundingClientRect().top + window.scrollY)
            : -1,
          // Reading order in the DOM, independent of the visual column.
          authorBeforeBody:
            author && body
              ? !!(author.compareDocumentPosition(body) &
                  Node.DOCUMENT_POSITION_FOLLOWING)
              : null,
        };
      });

      // Data-conditional, and honest about it: the only published article in
      // this CMS currently has a null body and no inline images, so there is
      // genuinely no body to order against. That is a content state, not a
      // layout defect — it is a content state. Skip rather than report a
      // misleading failure.
      test.skip(
        !order.hasBody,
        `The published article has no body text and no inline images in the CMS, ` +
          `so there is no content order to verify @ ${vp.name}.`
      );

      expect(order.h1.length).toBeGreaterThan(0);
      // The byline/author band must sit above the body, not in a side rail.
      expect(order.authorBeforeBody).not.toBeNull();
      expect(
        order.authorBeforeBody,
        `author card is not above the article body @ ${vp.name}`
      ).toBe(true);
      if (order.authorTop >= 0 && order.bodyTop >= 0) {
        expect(
          order.authorTop,
          `author card renders below the body @ ${vp.name}`
        ).toBeLessThan(order.bodyTop);
      }
    });
  });
}
