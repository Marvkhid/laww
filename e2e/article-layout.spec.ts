import { test, expect, gotoClean, revealAll } from "./fixtures";

/**
 * Article image layout.
 *
 * An article renders one of two ways depending on its content:
 *   - `EditorialBody`  — body text present: images float and the text wraps.
 *   - `PositionedImageGrid` — body not written yet: images sit in a responsive
 *     grid honouring the admin's band/column choice.
 *
 * The suite below detects which one is on the page and asserts the invariants
 * for that mode. Which mode is active depends on the article's content, so the
 * float assertions are skipped with an explicit reason when the grid fallback
 * is in use — reported as skipped, never silently passed.
 */


type Mode = "flow" | "grid" | "none";

/** The suite provisions its own article; skip loudly if it could not. */
function articleUrl(article: { slug: string; provisioned: boolean }): string {
  test.skip(
    !article.provisioned,
    "Could not provision the published fixture article — no E2E_ADMIN_EMAIL / " +
      "E2E_ADMIN_PASSWORD, or the database rejected the seed."
  );
  return `/articles/${article.slug}`;
}

async function detectMode(
  page: import("@playwright/test").Page
): Promise<Mode> {
  return page.evaluate(() => {
    if (document.querySelector(".prose-article")) return "flow" as const;
    if (document.querySelector('[data-testid="positioned-image-grid"]'))
      return "grid" as const;
    return "none" as const;
  });
}

test.describe("article layout on desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test.setTimeout(120_000);

  test("images render, are positioned, and are never cropped", async ({
    page,
    publicArticle,
  }) => {
    await gotoClean(page, articleUrl(publicArticle));
    await revealAll(page);

    const mode = await detectMode(page);
    expect(
      mode,
      "the article rendered neither a body flow nor an image grid"
    ).not.toBe("none");

    // Only the inline editorial artwork is required to be uncropped. The
    // cover hero and the author avatar are deliberately framed/cropped
    // treatments and are checked separately.
    const images = await page.evaluate(() =>
      [
        ...document.querySelectorAll<HTMLImageElement>(
          ".editorial-figure img, [data-testid='positioned-image'] img"
        ),
      ].map((i) => {
        const r = i.getBoundingClientRect();
        return {
          natW: i.naturalWidth,
          natH: i.naturalHeight,
          w: Math.round(r.width),
          h: Math.round(r.height),
          src: (i.currentSrc || i.src).slice(0, 90),
        };
      })
    );

    expect(images.length, "the article rendered no images").toBeGreaterThan(0);
    for (const i of images) {
      expect(i.natW, `image did not decode: ${i.src}`).toBeGreaterThan(0);
      expect(i.h, `image has no height: ${i.src}`).toBeGreaterThan(4);
      expect(i.w, `image has no width: ${i.src}`).toBeGreaterThan(4);
      // object-contain must preserve the source ratio within 2%.
      const natRatio = i.natW / i.natH;
      const boxRatio = i.w / i.h;
      expect(
        Math.abs(boxRatio - natRatio) / natRatio,
        `image is cropped or stretched: ${i.src}`
      ).toBeLessThan(0.02);
    }
  });

  test("cover hero and author avatar are present and inside the viewport", async ({
    page,
    publicArticle,
  }) => {
    await gotoClean(page, articleUrl(publicArticle));
    await revealAll(page);

    const geometry = await page.evaluate(() => {
      const list = [...document.querySelectorAll<HTMLImageElement>("main img")];
      return list.map((i) => {
        const r = i.getBoundingClientRect();
        return {
          alt: (i.alt || "").slice(0, 40),
          w: Math.round(r.width),
          h: Math.round(r.height),
          right: Math.round(r.right),
          natW: i.naturalWidth,
        };
      });
    });

    expect(geometry.length, "the article rendered no imagery at all").toBeGreaterThan(0);
    for (const g of geometry) {
      expect(g.natW, `image did not decode: ${g.alt}`).toBeGreaterThan(0);
      expect(g.h, `image has no height: ${g.alt}`).toBeGreaterThan(4);
      expect(
        g.right,
        `image escapes the viewport: ${g.alt}`
      ).toBeLessThanOrEqual(1442);
    }
  });

  test("float flow: figures float, stay inset, and text wraps beside them", async ({
    page,
    publicArticle,
  }) => {
    await gotoClean(page, articleUrl(publicArticle));
    await revealAll(page);

    const mode = await detectMode(page);
    test.skip(
      mode !== "flow",
      `This article is using the ${
        mode === "grid" ? "PositionedImageGrid" : "no image"
      } fallback (no body text yet), so there is nothing to float or wrap. ` +
        `The float assertions apply to an article with a written body.`
    );

    const figures = await page.evaluate(() => {
      // "Text wraps beside a figure" is a statement about rendered LINES, not
      // about paragraph boxes. A paragraph whose lines stop short of a
      // right-hand float still has a bounding box spanning the full column
      // (the union of its line boxes includes the lines below the float), so
      // measuring paragraphs cannot detect wrapping and reports a healthy
      // float layout as broken. Measure per line with a Range instead.
      const lines: Array<{ top: number; bottom: number; left: number; right: number }> =
        [];
      for (const p of document.querySelectorAll(".prose-article p")) {
        const textNode = [...p.childNodes].find(
          (n) => n.nodeType === 3 && (n.textContent ?? "").trim().length > 0
        );
        if (!textNode) continue;
        const range = document.createRange();
        range.selectNodeContents(textNode);
        for (const r of range.getClientRects()) {
          if (r.width > 4 && r.height > 4) {
            lines.push({
              top: r.top,
              bottom: r.bottom,
              left: r.left,
              right: r.right,
            });
          }
        }
      }

      const out: Array<{
        floatSide: string;
        w: number;
        x: number;
        linesBeside: number;
      }> = [];
      for (const fig of document.querySelectorAll<HTMLElement>(
        ".editorial-figure"
      )) {
        const r = fig.getBoundingClientRect();
        const floatSide = getComputedStyle(fig).float;
        const box = {
          top: r.top,
          bottom: r.bottom,
          left: r.left,
          right: r.right,
          width: r.width,
          x: r.left,
        };
        // A LEFT float pushes text to its right; a RIGHT float pushes text to
        // its left. Either way the line must share vertical space with it.
        const linesBeside = lines.filter((l) => {
          if (!(l.bottom > box.top && l.top < box.bottom)) return false;
          return floatSide === "left"
            ? l.left >= box.left + box.width - 2
            : l.right <= box.left + 2;
        }).length;
        out.push({
          floatSide,
          w: Math.round(r.width),
          x: Math.round(r.left),
          linesBeside,
        });
      }
      return out;
    });

    expect(figures.length, "no editorial figures found").toBeGreaterThan(0);
    const floated = figures.filter(
      (f) => f.floatSide === "left" || f.floatSide === "right"
    );
    expect(
      floated.length,
      "no figures float on desktop — the float layout did not apply"
    ).toBeGreaterThan(0);
    for (const f of floated) {
      expect(f.w, "a floated figure is not inset from the column").toBeLessThan(
        700
      );
    }
    expect(
      figures.some((f) => f.linesBeside > 0),
      "no text wraps beside a floated figure"
    ).toBe(true);
  });

  test("grid fallback: full-width images span the row, others do not", async ({
    page,
    publicArticle,
  }) => {
    await gotoClean(page, articleUrl(publicArticle));
    await revealAll(page);

    const mode = await detectMode(page);
    test.skip(
      mode !== "grid",
      "This article has a written body, so the float layout is used instead of the grid."
    );

    const items = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("[data-testid='positioned-image']")].map(
        (el) => {
          const r = el.getBoundingClientRect();
          return {
            fullWidth: el.getAttribute("data-full-width"),
            w: Math.round(r.width),
          };
        }
      )
    );
    expect(items.length).toBeGreaterThan(0);
    const full = items.filter((i) => i.fullWidth === "true");
    if (full.length) {
      const max = Math.max(...items.map((i) => i.w));
      expect(full[0].w).toBeGreaterThan(max * 0.95);
    }
  });
});

test.describe("article layout on mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.setTimeout(120_000);

  test("figures drop the float and take the full column", async ({ page, publicArticle }) => {
    await gotoClean(page, articleUrl(publicArticle));
    await revealAll(page);

    const mode = await detectMode(page);
    const figures = await page.evaluate(() => {
      const els = [
        ...document.querySelectorAll<HTMLElement>(".editorial-figure"),
        ...document.querySelectorAll<HTMLElement>(
          "[data-testid='positioned-image']"
        ),
      ];
      return els.map((f) => {
        const r = f.getBoundingClientRect();
        return {
          float: getComputedStyle(f).float,
          width: Math.round(r.width),
          parentWidth: Math.round(
            (f.parentElement as HTMLElement).getBoundingClientRect().width
          ),
        };
      });
    });

    expect(
      figures.length,
      `no figures rendered on mobile (mode: ${mode})`
    ).toBeGreaterThan(0);
    for (const f of figures) {
      expect(f.float, "a figure still floats on a 390px viewport").toBe("none");
      expect(
        f.width,
        "a figure is not full width on a 390px viewport"
      ).toBeGreaterThan(f.parentWidth * 0.9);
    }
  });
});
