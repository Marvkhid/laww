import { chromium } from "playwright";

/**
 * Does text actually wrap beside a floated figure on the article page?
 *
 * `article-layout` answers this with paragraph bounding boxes, which cannot
 * express wrapping: a paragraph whose lines stop short of a right-hand float
 * still has a bounding box spanning the full column. This measures the real
 * per-line boxes with a Range over the paragraph's text.
 */
const BASE = process.env.E2E_BASE_URL || "http://localhost:3100";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${BASE}/articles/the-headline`, { waitUntil: "load" });
await page.waitForTimeout(3000);

const report = await page.evaluate(() => {
  const figs = [...document.querySelectorAll(".editorial-figure")].map((f) => {
    const r = f.getBoundingClientRect();
    const cs = getComputedStyle(f);
    return {
      float: cs.float,
      width: Math.round(r.width),
      x: Math.round(r.x),
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
    };
  });

  // Per-line boxes: walk each paragraph's text with a Range and collect the
  // client rects, which is one box per rendered line.
  const lines = [];
  for (const p of document.querySelectorAll(".prose-article p")) {
    const textNode = [...p.childNodes].find(
      (n) => n.nodeType === 3 && n.textContent.trim().length > 0
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

  const beside = [];
  for (const f of figs) {
    // A line is beside the figure if it shares vertical space with it and sits
    // on the correct side: a LEFT float pushes text to its right, a RIGHT float
    // pushes text to its left.
    const matches = lines.filter((l) => {
      const overlapsY = l.bottom > f.top && l.top < f.bottom;
      if (!overlapsY) return false;
      return f.float === "left"
        ? l.left >= f.x + f.width - 2
        : l.right <= f.x + 2;
    });
    beside.push({ ...f, linesBeside: matches.length });
  }
  return { figs, totalLines: lines.length, beside };
});

console.log(JSON.stringify(report, null, 1));
await browser.close();
