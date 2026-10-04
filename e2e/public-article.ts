import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

/**
 * The public suite needs one real, published, fully-populated article: body
 * text long enough for lines to wrap beside a floated figure, a cover hero,
 * and four inline images at different positions.
 *
 * It used to be a hand-seeded row that quietly rotted — once the row was gone
 * every layout and journey assertion was running against the not-found page
 * (and, before the soft-404 fix, passing it as a 200). So the fixture
 * provisions it instead, and re-provisions it whenever it has drifted (no
 * body, no images, unpublished). A public spec can no longer pass or fail
 * because of missing seed data.
 */

export const PUBLIC_ARTICLE_SLUG = "the-headline";
const BUCKET = "article-images";

type Env = Record<string, string>;

function readEnv(): Env {
  return Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      })
  );
}

export async function adminClient(): Promise<SupabaseClient | null> {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password) return null;
  const env = readEnv();
  const sb = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
  const { error } = await sb.auth.signInWithPassword({ email, password });
  return error ? null : sb;
}

/* ── A real, viewable PNG ────────────────────────────────────────────────
 * The layout specs assert bounding boxes and "not cropped", so a 1x1 pixel
 * (fine for the admin upload specs, which only check the preview rendered)
 * is not enough here. This encodes a solid-colour RGB image with a single
 * zlib stream — no image dependency needed. */

function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

export function solidPng(width: number, height: number, rgb: [number, number, number]): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 3);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const p = rowStart + 1 + x * 3;
      // A faint vertical gradient so a crop or a mis-sized render is visible.
      raw[p] = Math.max(0, rgb[0] - ((x * 90) / width) | 0);
      raw[p + 1] = rgb[1];
      raw[p + 2] = Math.max(0, rgb[2] - ((y * 90) / height) | 0);
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function upload(sb: SupabaseClient, name: string, rgb: [number, number, number]) {
  const path = `e2e-fixture/${PUBLIC_ARTICLE_SLUG}-${name}.png`;
  const { error } = await sb.storage
    .from(BUCKET)
    .upload(path, solidPng(1200, 800, rgb), { contentType: "image/png", upsert: true });
  if (error) throw new Error(`storage upload failed: ${error.message}`);
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * A sentinel string the fixture body must contain.
 *
 * Without it, a leftover row from an earlier session — published, with a body
 * and five images — satisfies every completeness check, so the fixture
 * silently keeps testing *that* row instead of the content it just claimed to
 * have written.
 */
const BODY_SENTINEL = "e2e-fixture-article";

/** Body long enough that lines genuinely wrap beside a floated figure. */
const BODY_TEXT = [
  `${BODY_SENTINEL} This fixture article exists so the public layout suite has something real to measure. It carries several long paragraphs of prose on purpose: the desktop layout assertions count the line boxes that sit beside a floated figure, and that count is only meaningful when there is enough text for the text column to wrap around the image rather than simply ending.`,
  "This fixture article exists so the public layout suite has something real to measure. It carries several long paragraphs of prose on purpose: the desktop layout assertions count the line boxes that sit beside a floated figure, and that count is only meaningful when there is enough text for the text column to wrap around the image rather than simply ending.",
  "A floated figure is the classic case where a bounding box tells you nothing. The paragraph's own box spans the full column whether or not the text wraps, so the old assertion proved nothing about wrapping and was in fact left/right inverted. The suite now walks the text node with Range.getClientRects() and counts the individual line boxes, which is the only measurement that actually expresses the invariant under test.",
  "The same care is needed on the narrow viewport, where the figure is expected to drop out of the float entirely and take the full column. Below the breakpoint the figure becomes a block, the text stops wrapping, and every line box should sit in the single remaining column without overlapping the image.",
  "Finally the article carries a cover image and four inline images at different positions, because the admin lets an editor choose where each one sits. Those choices are persisted, and the public page has to honour all of them rather than rendering every figure the same way.",
].join("\n\n");

export type PublicArticle = { slug: string; provisioned: boolean };

/**
 * Ensure a published, fully-populated fixture article exists and return it.
 * Never throws: if the environment cannot provision one, the returned
 * `provisioned: false` lets the caller skip with an explicit reason rather
 * than fail on missing seed data.
 */
export async function ensurePublicArticle(): Promise<PublicArticle> {
  const sb = await adminClient();
  if (!sb) return { slug: PUBLIC_ARTICLE_SLUG, provisioned: false };

  try {
    const { data: existing } = await sb
      .from("articles")
      .select("id,status,body,cover_image_url,image_1_url,image_2_url,image_3_url,image_4_url")
      .eq("slug", PUBLIC_ARTICLE_SLUG)
      .maybeSingle();

    const complete =
      existing &&
      existing.status === "published" &&
      !!existing.body &&
      JSON.stringify(existing.body ?? {}).includes(BODY_SENTINEL) &&
      !!existing.cover_image_url &&
      !!(existing.image_1_url && existing.image_2_url && existing.image_3_url && existing.image_4_url);
    if (complete) return { slug: PUBLIC_ARTICLE_SLUG, provisioned: true };

    const cover = existing?.cover_image_url
      ? existing.cover_image_url
      : await upload(sb, "cover", [150, 40, 40]);
    const positions = ["top-left", "bottom-right", "full-width", "center-left"];
    const stored = (existing ?? {}) as Record<string, unknown>;
    const images: string[] = [];
    for (let i = 1; i <= 4; i++) {
      const previous = stored[`image_${i}_url`];
      images.push(
        typeof previous === "string" && previous
          ? previous
          : await upload(sb, `image-${i}`, [40, 60 + i * 25, 120])
      );
    }

    const body = {
      type: "doc",
      content: BODY_TEXT.split("\n\n").map((text) => ({
        type: "paragraph",
        content: [{ type: "text", text }],
      })),
    };

    const row = {
      slug: PUBLIC_ARTICLE_SLUG,
      title: "The Headline",
      dek: "Fixture article for the public layout suite.",
      status: "published",
      published_at: new Date().toISOString(),
      body,
      cover_image_url: cover,
      show_on_pages: ["homepage", "articles", "issues"],
      image_1_url: images[0],
      image_1_position: positions[0],
      image_2_url: images[1],
      image_2_position: positions[1],
      image_3_url: images[2],
      image_3_position: positions[2],
      image_4_url: images[3],
      image_4_position: positions[3],
    };

    if (existing) {
      const { error } = await sb.from("articles").update(row).eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb.from("articles").insert(row);
      if (error) throw new Error(error.message);
    }
    return { slug: PUBLIC_ARTICLE_SLUG, provisioned: true };
  } catch (err) {
    console.warn(
      `[fixture] could not provision /articles/${PUBLIC_ARTICLE_SLUG}:`,
      err instanceof Error ? err.message : err
    );
    return { slug: PUBLIC_ARTICLE_SLUG, provisioned: false };
  }
}

/**
 * A row written straight to the database does NOT invalidate the public
 * route — `/articles/[slug]` is statically prerendered with a one-year
 * s-maxage, so the next request can still be served whatever render was
 * cached before the fixture existed. Only an admin action calls
 * `revalidatePath`.
 *
 * So the fixture finishes by driving one real admin status toggle: Unpublish,
 * then Publish. Both go through `toggleArticleStatusAction`, which
 * revalidates the article's own slug — so the public route is left holding a
 * render of the fixture rather than of the row that used to be there.
 */
export async function revalidateThroughAdmin(
  browser: import("@playwright/test").Browser
): Promise<boolean> {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password) return false;

  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto(`${process.env.E2E_BASE_URL ?? "http://localhost:3100"}/admin/login`);
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.endsWith("/admin/login"), {
      timeout: 30_000,
    });

    const base = process.env.E2E_BASE_URL ?? "http://localhost:3100";
    const statusButton = async () => {
      await page.goto(`${base}/admin/articles`);
      const row = page.locator("li").filter({ hasText: "The Headline" });
      await row.first().waitFor({ state: "visible", timeout: 20_000 });
      return row.first().locator("button").filter({ hasText: /^(Un)?[Pp]ublish$/ });
    };

    // Each step waits for the button to actually flip, rather than assuming
    // the click landed — a `count() === 0` skip would leave the fixture
    // article unpublished and every public assertion would then run against a
    // 404.
    for (const step of ["down", "up"] as const) {
      const button = await statusButton();
      const label = step === "down" ? "Unpublish" : "Publish";
      await button.first().waitFor({ state: "visible", timeout: 20_000 });
      if ((await button.first().innerText()).trim().toLowerCase() !== label.toLowerCase())
        continue;
      await button.first().click({ timeout: 15_000 });
      await page
        .locator("li")
        .filter({ hasText: "The Headline" })
        .first()
        .getByRole("button", { name: step === "down" ? /^Publish$/ : /^Unpublish$/ })
        .waitFor({ state: "visible", timeout: 20_000 });
    }
    return true;
  } catch (err) {
    console.warn(
      "[fixture] could not revalidate through the admin UI:",
      err instanceof Error ? err.message : err
    );
    return false;
  } finally {
    await context.close();
  }
}