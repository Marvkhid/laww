import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { test, expect, gotoClean, waitForAppReady, clickStable } from "./fixtures";

/** A signed-in Supabase client, for asserting what actually reached the DB. */
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
  const sb = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
  await sb.auth.signInWithPassword({ email: EMAIL!, password: PASSWORD! });
  return sb;
}

/**
 * The complete "New -> content -> images -> Save & Publish -> live" workflow,
 * driven through the real admin UI against the real database.
 *
 * This is the acceptance test for the publishing fixes: the suite that used to
 * pass while every article silently stayed a DRAFT (because `save_mode` was an
 * uncontrolled hidden input React reset mid-submit), or lost its images
 * (because an uncontrolled hidden URL field was reset the same way), or
 * produced duplicates on a re-submit.
 *
 * It writes only throwaway `[E2E]` articles and deletes them in `finally`.
 */

const EMAIL = process.env.E2E_ADMIN_EMAIL;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const HAS_CREDS = Boolean(EMAIL && PASSWORD);

const SAVED = /all changes saved/i;

/** A valid 1x1 PNG — exercises the real storage path without weight. */
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64"
);

async function login(page: Page) {
  await gotoClean(page, "/admin/login");
  await page.locator('input[type="email"]').fill(EMAIL!);
  await page.locator('input[type="password"]').fill(PASSWORD!);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.endsWith("/admin/login"), {
    timeout: 30_000,
  });
}

/** Wait until no network response has arrived for `quietMs`. */
async function waitForQuiet(page: Page, quietMs = 1_500, timeout = 40_000) {
  let last = Date.now();
  const bump = () => {
    last = Date.now();
  };
  page.on("response", bump);
  const start = Date.now();
  try {
    while (Date.now() - start < timeout) {
      if (Date.now() - last >= quietMs) return;
      await page.waitForTimeout(150);
    }
  } finally {
    page.off("response", bump);
  }
}

async function deleteByTitle(page: Page, title: string) {
  try {
    await gotoClean(page, "/admin/articles");
    const row = page.locator("li").filter({ hasText: title });
    if (!(await row.count())) return;
    page.once("dialog", (d) => d.accept());
    await row.first().getByRole("button", { name: /^Delete$/ }).click();
    await expect(page.locator("li").filter({ hasText: title })).toHaveCount(0, {
      timeout: 20_000,
    });
  } catch {
    // Cleanup must never mask the real result.
  }
}

/** The columns this test asserts on, typed explicitly (PostgREST cannot infer
 *  a row type from a concatenated select string). */
type SavedArticle = {
  id: string;
  slug: string;
  status: string;
  body: unknown;
  cover_image_url: string | null;
  show_on_pages: string[] | null;
} & Record<string, unknown>;

test.describe("article publish workflow", () => {
  test.skip(
    !HAS_CREDS,
    "No E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD supplied — the publish workflow " +
      "could not be executed end to end."
  );

  test("New -> long body + cover + four images -> Publish -> one live article", async ({
    page,
    useFaults,
  }) => {
    await login(page);
    const ts = Date.now();
    const title = `[E2E] publish workflow ${ts}`;
    const marker = `E2EPUB${ts}`;

    // Several paragraphs, headings, punctuation — "long body content".
    const paragraphs = [
      `${marker} alpha paragraph with punctuation: commas, colons; and (parentheses) plus "quotes".`,
      `${marker} beta paragraph — wait, ASCII only: hyphens and dashes like this -- are fine.`,
      `${marker} gamma paragraph with a longer run of words so the body is not trivially short, repeated a few times to push past a couple of hundred characters.`,
      `${marker} delta paragraph, final line of the body content.`,
    ].join("\n\n");

    try {
      await gotoClean(page, "/admin/articles/new");
      await page.locator('input[name="title"]').first().fill(title);

      const box = page.locator(".ProseMirror").first();
      await expect(box, "the rich-text editor did not render").toBeVisible({
        timeout: 20_000,
      });
      await box.click();
      await page.keyboard.type(paragraphs);
      await expect(page.getByText(SAVED).first()).toBeVisible({
        timeout: 30_000,
      });

      // Cover + four inline images, each with a distinct position.
      await page
        .locator('input[name="cover_image_file"]')
        .setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: PNG_1PX });
      await expect(page.locator('img[alt="Upload cover image"], img[alt="Replace cover image"]').first()).toBeVisible({
        timeout: 30_000,
      });

      const positions = ["top-left", "bottom-right", "full-width", "center-left"];
      for (let i = 1; i <= 4; i++) {
        await page
          .locator(`input[name="image_${i}_file"]`)
          .setInputFiles({ name: `img${i}.png`, mimeType: "image/png", buffer: PNG_1PX });
        await expect(
          page.locator(`img[alt="Image ${i}"]`),
          `image ${i} never produced a preview`
        ).toBeVisible({ timeout: 30_000 });
        await page.locator(`select[name="image_${i}_position"]`).selectOption(positions[i - 1]);
      }

      await waitForQuiet(page);
      await expect(page.getByText(SAVED).first()).toBeVisible({ timeout: 40_000 });

      // ── Save & Publish ────────────────────────────────────────────────
      await clickStable(page.getByRole("button", { name: /^Publish$/ }));
      await page.waitForURL(/\/admin\/articles(\/)?$/, { timeout: 40_000 });

      // Exactly one row, and it is published (not left as a draft).
      const row = page.locator("li").filter({ hasText: title });
      await expect(row, "the article was not created exactly once").toHaveCount(
        1,
        { timeout: 20_000 }
      );
      await expect(
        row,
        "Publish left the article as a draft instead of publishing it"
      ).toContainText(/published/i);

      // ── What actually reached the database ───────────────────────────
      const sb = await adminClient();
      const { data: raw } = await sb
        .from("articles")
        .select(
          "id,slug,status,body,cover_image_url,show_on_pages,image_1_url,image_2_url,image_3_url,image_4_url,image_1_position,image_2_position,image_3_position,image_4_position"
        )
        .eq("title", title);
      const rows = raw as unknown as SavedArticle[] | null;
      expect(rows?.length, "the database must hold exactly one article").toBe(1);
      const saved = rows![0];
      expect(saved.status, "the article was not published in the database").toBe(
        "published"
      );
      expect(
        JSON.stringify(saved.body),
        "the persisted body is missing content"
      ).toContain(marker);
      expect(saved.cover_image_url, "the cover image was not persisted").toBeTruthy();
      for (const i of [1, 2, 3, 4]) {
        expect(saved[`image_${i}_url`], `image ${i} was not persisted`).toBeTruthy();
      }
      expect(
        [
          saved.image_1_position,
          saved.image_2_position,
          saved.image_3_position,
          saved.image_4_position,
        ],
        "the chosen image positions were not preserved"
      ).toEqual(positions);
      expect(saved.show_on_pages, "homepage visibility was not applied").toContain(
        "homepage"
      );

      // Re-submitting Publish must not duplicate it. Open the editor and
      // publish again; the list must still hold exactly one row.
      await row.getByRole("link", { name: "Edit" }).click();
      await page.waitForURL(/\/admin\/articles\/.+\/edit/, { timeout: 30_000 });
      const slug = saved.slug;
      await clickStable(page.getByRole("button", { name: /Save & Publish|^Publish$/ }));
      await page.waitForURL(/\/admin\/articles(\/)?$/, { timeout: 40_000 });
      await expect(
        page.locator("li").filter({ hasText: title }),
        "a second Publish created a duplicate article"
      ).toHaveCount(1, { timeout: 20_000 });
      const { data: after } = await sb
        .from("articles")
        .select("id")
        .eq("title", title);
      expect(
        after?.length,
        "a second Publish created a duplicate database record"
      ).toBe(1);

      // ── The public page carries the complete content ──────────────────
      await gotoClean(page, `/articles/${slug}`);
      const bodyText = await page.locator("body").innerText();
      expect(bodyText, "the published page is missing the body content").toContain(
        marker
      );
      expect(
        bodyText,
        "the published page dropped part of the body"
      ).toContain(`${marker} delta paragraph`);

      // The positioned inline images are revealed after hydration, so a
      // count taken on the first paint is premature. Assert on the content
      // that must be present: the page has to reference every image URL we
      // just persisted. (Counting bare <img> tags is not reliable here —
      // SafeImage swaps a <img> for a fallback box when a transient storage
      // request fails, which Firefox does intermittently.)
      await waitForAppReady(page);
      const html = await page.content();
      expect(
        html,
        "the published page does not reference the saved cover image"
      ).toContain(saved.cover_image_url);
      for (const i of [1, 2, 3, 4]) {
        expect(
          html,
          `the published page does not reference image ${i}`
        ).toContain(saved[`image_${i}_url`]);
      }
      // NB: the images are embedded in the body (EditorialBody) when there is
      // body text, and by PositionedImageGrid when there is not — so assert on
      // the referenced URLs rather than on one component's markup.

      expect(useFaults.pageErrors, "the publish flow threw").toEqual([]);

      // ── Unpublishing must take the public page offline ───────────────
      // `/articles/[slug]` is statically prerendered with a one-year
      // s-maxage, so a page that has already been served survives in the ISR
      // cache. Only the admin action's revalidatePath can retire it. The
      // regression this guards: toggleArticleStatusAction used to revalidate
      // the listing paths but not the article's own slug, so an unpublished
      // article kept serving its public URL for up to a year.
      await gotoClean(page, "/admin/articles");
      const listRow = page.locator("li").filter({ hasText: title });
      await expect(listRow, "the article vanished from the admin list").toHaveCount(1, {
        timeout: 20_000,
      });
      await clickStable(listRow.getByRole("button", { name: /^Unpublish$/ }));
      await expect(
        listRow,
        "Unpublish did not take effect in the admin list"
      ).toContainText(/draft/i, { timeout: 20_000 });

      const { data: afterUnpublish } = await sb
        .from("articles")
        .select("status")
        .eq("title", title);
      expect(
        afterUnpublish?.[0]?.status,
        "the database row was not set back to draft"
      ).toBe("draft");

      const gone = await page.request.get(`/articles/${slug}`, {
        headers: { "cache-control": "no-cache" },
      });
      expect(
        gone.status(),
        "the public page survived unpublishing — a stale ISR entry is still being served " +
          `(cache-control: ${gone.headers()["x-nextjs-cache"] ?? "n/a"})`
      ).toBe(404);
    } finally {
      await deleteByTitle(page, title);
    }
  });

  test("a new legal insight honours the Published checkbox and saves once", async ({
    page,
  }) => {
    await login(page);
    const ts = Date.now();
    const question = `[E2E] insight ${ts}`;
    const sb = await adminClient();
    try {
      await gotoClean(page, "/admin/legal-insights/new");
      await page.locator('input[name="title"]').fill(question);
      await page
        .locator('textarea[name="content"]')
        .fill(`Explanation that must survive for ${question}.`);
      await page.locator('input[name="option_0"]').fill("First option");
      await page.locator('input[name="option_1"]').fill("Second option");
      const correct = page.locator('input[name="correct_option_radio"]').first();
      // Firefox intermittently lands the click on a node the AnimatePresence
      // row is about to re-create: the click reports success but React's
      // onChange never runs, so the radio stays unticked. Retrying the click
      // until it sticks is the honest fix — a single click is not a
      // reliable assertion here in any engine.
      await expect(async () => {
        await clickStable(correct, 2);
        await expect(correct).toBeChecked({ timeout: 2_000 });
      }).toPass({ timeout: 20_000 });
      await expect(correct, "the correct-option radio did not get ticked").toBeChecked();
      // "Published" is ticked by default; the server used to ignore it.
      await clickStable(page.getByRole("button", { name: "Create Question" }));
      await page.waitForURL(/\/admin\/legal-insights(\/)?$/, {
        timeout: 40_000,
      });

      const { data } = await sb
        .from("legal_insights")
        .select("id,title,content,published,answer_options")
        .eq("title", question);
      expect(data?.length, "the insight was not saved exactly once").toBe(1);
      expect(
        data![0].published,
        "the Published checkbox was ignored (row stayed unpublished)"
      ).toBe(true);
      expect(JSON.stringify(data![0].content)).toContain(question);
      expect(data![0].answer_options?.length).toBe(2);
    } finally {
      await sb.from("legal_insights").delete().eq("title", question);
    }
  });
});
