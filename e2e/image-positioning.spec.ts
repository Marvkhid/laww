import { test, expect, gotoClean, clickStable } from "./fixtures";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

/**
 * The Image 1–4 position system, end to end.
 *
 * The defect this pins down: `Centre / Left` and `Centre / Right` were being
 * read as "full width", so those images rendered as breakouts appended after
 * the whole article — which is what an administrator sees as "Images 2, 3 and
 * 4 ignore their position and stack vertically after the text". Image 1's
 * default (`Top / Right`) was unaffected, which is why only some slots seemed
 * broken. The vertical band (top / centre / bottom) was ignored as well, so
 * `Top / Left` landed three quarters of the way down.
 *
 * Positions are asserted two ways, because the report is really two claims:
 *
 *   1. correct TREATMENT — a centred image floats beside the text, only
 *      `Full Width` breaks out of the flow;
 *   2. correct BAND — top lands early, centre mid-article, bottom late.
 *
 * It also covers the two things that make this a real-world risk: a legacy row
 * with no position stored at all, and the grid fallback used when an article
 * has no body text yet.
 */

const EMAIL = process.env.E2E_ADMIN_EMAIL;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const HAS_CREDS = Boolean(EMAIL && PASSWORD);

type Band = "top" | "center" | "bottom";
const BAND_RANGE: Record<Band, readonly [number, number]> = {
  top: [0, 0.35],
  center: [0.3, 0.75],
  bottom: [0.7, 1],
};

async function adminClient() {
  const env = Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      })
  );
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  await sb.auth.signInWithPassword({ email: EMAIL!, password: PASSWORD! });
  return sb;
}

/** Long enough that a float has somewhere to sit and the bands are distinguishable. */
const BODY_TEXT = Array.from(
  { length: 24 },
  (_, i) =>
    `${i + 1}. This paragraph gives the layout planner enough text to work with. ` +
    `A short article leaves nowhere for a floated figure to sit beside, so every ` +
    `image collapses into a breakout at the end instead of honouring its band. ` +
    `Realistic copy length is what makes the positioning choices observable at all.`
).join("\n\n");

/**
 * Read, in document order, how each image actually rendered.
 *
 * Text beside a float lives INSIDE the floated section, so it has to be
 * counted there too — otherwise every image after the first looks as though it
 * sits at the very end of the article.
 */
async function readPlacement(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const bodyEl = document.querySelector(".editorial-body");
    if (!bodyEl) return null;
    const items: Array<{ slot: number; kind: string; side: string | null; before: number }> = [];
    let chars = 0;
    const textOf = (el: Element) => {
      const prose = el.querySelector(".prose-article");
      return ((prose && (prose as HTMLElement).innerText) || (el as HTMLElement).innerText || "")
        .length;
    };
    for (const child of Array.from(bodyEl.children)) {
      const cls = (child as HTMLElement).className || "";
      const fig = child.querySelector("figure");
      const img = fig && fig.querySelector("img");
      const src = img ? (img as HTMLImageElement).src : "";
      const m = src.match(/-(\d+)\.png$/);
      const slot = m ? Number(m[1]) : 0;
      if (fig && cls.includes("editorial-flow")) {
        items.push({
          slot,
          kind: "float",
          side: getComputedStyle(fig).float,
          before: chars,
        });
        chars += textOf(child);
      } else if (fig) {
        items.push({ slot, kind: "full", side: null, before: chars });
      } else {
        chars += textOf(child);
      }
    }
    return { items, total: chars };
  });
}

/* ── a real, viewable PNG per slot ──────────────────────────────────────
 * The positions can only be measured on images the browser actually loads:
 * a broken URL renders a fallback box with no <img>, so there is nothing to
 * float. Encoded here with zlib rather than pulled in as a dependency. */

function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function solidPng(width: number, height: number, rgb: [number, number, number]): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 3);
    for (let x = 0; x < width; x++) {
      const p = rowStart + 1 + x * 3;
      // A gradient, so a mis-sized or cropped render is visible to the eye.
      raw[p] = Math.max(0, rgb[0] - ((x * 90) / width) | 0);
      raw[p + 1] = rgb[1];
      raw[p + 2] = Math.max(0, rgb[2] - ((y * 90) / height) | 0);
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

async function uploadSlotImage(
  sb: Awaited<ReturnType<typeof adminClient>>,
  slot: number
): Promise<string> {
  const path = `e2e-fixture/position-probe-${slot}.png`;
  const rgb: [number, number, number] = [40 + slot * 50, 60 + slot * 25, 120];
  const { error } = await sb.storage
    .from("article-images")
    .upload(path, solidPng(1200, 800, rgb), { contentType: "image/png", upsert: true });
  if (error) throw new Error(`storage upload failed: ${error.message}`);
  return sb.storage.from("article-images").getPublicUrl(path).data.publicUrl;
}

/** Create a published article directly, then invalidate the public cache. */
async function seedArticle(
  sb: Awaited<ReturnType<typeof adminClient>>,
  opts: {
    title: string;
    positions: Array<string | null>;
    body: string | null;
  }
) {
  const slug = `e2e-pos-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const row: Record<string, unknown> = {
    slug,
    title: opts.title,
    status: "published",
    published_at: new Date().toISOString(),
    body: opts.body
      ? {
          type: "doc",
          content: opts.body.split("\n\n").map((text) => ({
            type: "paragraph",
            content: [{ type: "text", text }],
          })),
        }
      : null,
  };
  for (let i = 0; i < opts.positions.length; i++) {
    row[`image_${i + 1}_url`] = await uploadSlotImage(sb, i + 1);
    row[`image_${i + 1}_alt`] = `Position probe ${i + 1}`;
    // Always written, including an explicit NULL: the articles table has
    // column defaults, so omitting the key would silently substitute one.
    // An explicit null is the real legacy case — legal_updates and
    // lawyer_in_the_news have no defaults at all.
    row[`image_${i + 1}_position`] = opts.positions[i];
  }
  const { data, error } = await sb.from("articles").insert(row).select("id,slug").single();
  if (error) throw new Error(error.message);
  return { id: data.id, slug: data.slug };
}

test.describe("image positioning (Images 1–4)", () => {
  test.setTimeout(240_000);
  test.skip(!HAS_CREDS, "No E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD supplied.");

  test("every position renders in its own band, and only Full Width breaks out", async ({
    page,
  }) => {
    await gotoClean(page, "/admin/login");
    await page.locator('input[type="email"]').fill(EMAIL!);
    await page.locator('input[type="password"]').fill(PASSWORD!);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.endsWith("/admin/login"), { timeout: 30_000 });

    const sb = await adminClient();

    // Four images at four deliberately different positions.
    const chosen: Array<{ position: string; band: Band; side: string | null }> = [
      { position: "top-left", band: "top", side: "left" },
      { position: "center-right", band: "center", side: "right" },
      { position: "full-width", band: "center", side: null },
      { position: "bottom-right", band: "bottom", side: "right" },
    ];
    const title = `[E2E] positions ${Date.now()}`;

    const created = await seedArticle(sb, {
      title,
      positions: chosen.map((c) => c.position),
      body: BODY_TEXT,
    });

    try {
      // Publish the probe image files under the names the seeded rows point
      // at, so the browser actually loads them.
      await page.goto(`${process.env.E2E_BASE_URL ?? "http://localhost:3100"}/admin/articles`);
      const row = page.locator("li").filter({ hasText: title });
      await row.first().waitFor({ state: "visible", timeout: 20_000 });
      // A DB write does not invalidate the ISR cache; an admin action does.
      for (const label of [/^Unpublish$/i, /^Publish$/i]) {
        const btn = row.first().locator("button").filter({ hasText: label });
        if ((await btn.count()) === 0) continue;
        await clickStable(btn.first());
        await page.waitForTimeout(2_500);
      }

      await gotoClean(page, `/articles/${created.slug}`);
      await page.waitForSelector(".editorial-body", { timeout: 20_000 });
      await page.waitForTimeout(1_000);

      const result = await readPlacement(page);
      expect(result, "the article body did not render").not.toBeNull();
      const items = result!.items;
      expect(items.length, "not every image rendered").toBe(4);

      for (const want of chosen) {
        const slot = chosen.indexOf(want) + 1;
        const got = items.find((i) => i.slot === slot);
        expect(got, `Image ${slot} did not render at all`).toBeTruthy();
        const fraction = got!.before / Math.max(1, result!.total);
        const [lo, hi] = BAND_RANGE[want.band];

        if (want.side === null) {
          expect(
            got!.kind,
            `Image ${slot} (${want.position}) should break out of the text flow`
          ).toBe("full");
        } else {
          expect(
            got!.kind,
            `Image ${slot} (${want.position}) must float beside the text — only Full Width breaks out`
          ).toBe("float");
          expect(
            got!.side,
            `Image ${slot} (${want.position}) floated to the wrong side`
          ).toBe(want.side);
        }

        expect(
          fraction,
          `Image ${slot} (${want.position}) rendered at ${Math.round(
            fraction * 100
          )}% through the article, outside its ${want.band} band`
        ).toBeGreaterThanOrEqual(lo);
        expect(
          fraction,
          `Image ${slot} (${want.position}) rendered at ${Math.round(
            fraction * 100
          )}% through the article, outside its ${want.band} band`
        ).toBeLessThanOrEqual(hi);
      }

      // The headline symptom: images must not all pile up after the text.
      const afterAllText = items.filter((i) => i.before / Math.max(1, result!.total) > 0.98);
      expect(
        afterAllText.length,
        "images are stacking vertically after the article text"
      ).toBeLessThanOrEqual(1);
    } finally {
      await sb.from("articles").delete().eq("id", created.id);
    }
  });

  test("a legacy row with no position stored still renders in the flow", async ({ page }) => {
    await gotoClean(page, "/admin/login");
    await page.locator('input[type="email"]').fill(EMAIL!);
    await page.locator('input[type="password"]').fill(PASSWORD!);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.endsWith("/admin/login"), { timeout: 30_000 });

    const sb = await adminClient();
    const title = `[E2E] legacy positions ${Date.now()}`;
    // `null` here models a row written before the position columns existed —
    // legal_updates and lawyer_in_the_news have no SQL default at all.
    const created = await seedArticle(sb, {
      title,
      positions: [null, null, null, null],
      body: BODY_TEXT,
    });

    try {
      await page.goto(`${process.env.E2E_BASE_URL ?? "http://localhost:3100"}/admin/articles`);
      const row = page.locator("li").filter({ hasText: title });
      await row.first().waitFor({ state: "visible", timeout: 20_000 });
      for (const label of [/^Unpublish$/i, /^Publish$/i]) {
        const btn = row.first().locator("button").filter({ hasText: label });
        if ((await btn.count()) === 0) continue;
        await clickStable(btn.first());
        await page.waitForTimeout(2_500);
      }

      await gotoClean(page, `/articles/${created.slug}`);
      await page.waitForSelector(".editorial-body", { timeout: 20_000 });
      await page.waitForTimeout(1_000);

      const result = await readPlacement(page);
      expect(result).not.toBeNull();
      const stacked = result!.items.filter(
        (i) => i.kind === "full" && i.before / Math.max(1, result!.total) > 0.98
      );
      expect(
        stacked.length,
        "rows with no stored position fell back to stacking after the text"
      ).toBe(0);
    } finally {
      await sb.from("articles").delete().eq("id", created.id);
    }
  });

  test("the editor restores the saved position for each slot", async ({ page }) => {
    await gotoClean(page, "/admin/login");
    await page.locator('input[type="email"]').fill(EMAIL!);
    await page.locator('input[type="password"]').fill(PASSWORD!);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.endsWith("/admin/login"), { timeout: 30_000 });

    const sb = await adminClient();
    const chosen = ["bottom-left", "top-right", "center-left", "center-right"];
    const title = `[E2E] editor positions ${Date.now()}`;
    const created = await seedArticle(sb, {
      title,
      positions: chosen,
      body: BODY_TEXT,
    });

    try {
      await gotoClean(page, `/admin/articles/${created.id}/edit`);
      const selects = page.locator('select[name="image_1_position"], select[name="image_2_position"], select[name="image_3_position"], select[name="image_4_position"]');
      await expect(selects).toHaveCount(4, { timeout: 20_000 });
      for (let i = 0; i < 4; i++) {
        await expect(
          selects.nth(i),
          `Image ${i + 1} did not restore its saved position (${chosen[i]})`
        ).toHaveValue(chosen[i]);
      }
    } finally {
      await sb.from("articles").delete().eq("id", created.id);
    }
  });
});