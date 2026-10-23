import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import {
  test,
  expect,
  gotoClean,
  clickUntilNavigation,
} from "./fixtures";
import { SNAPSHOT_PREFIX } from "../src/lib/autosave";

/**
 * Content isolation in the admin dashboard — the regression suite for two
 * reported production defects:
 *
 *  1. "Publishing a new article deletes or replaces an existing article."
 *     Two causes: the previous article's local recovery snapshot (content +
 *     its row id) survived a completed save under the shared
 *     `/admin/articles/new` key and was silently restored into the next new
 *     editor; and every create action adopted whatever row its `autosave_id`
 *     named, published or not.
 *  2. "The new-article form shows the previous article's headline, body and
 *     images."
 *     The same snapshot restore, with no way to tell whose work it was.
 *
 * Fixes: snapshots are stamped with a per-tab editor-session token and are
 * cleared everywhere except an editor route (`AutosaveSessionGC`); create
 * actions only continue an UNPUBLISHED draft.
 *
 * This file drives the real admin UI against the real database and writes
 * only throwaway `[E2E] isolation …` rows, deleted in `finally`.
 */

const EMAIL = process.env.E2E_ADMIN_EMAIL;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const HAS_CREDS = Boolean(EMAIL && PASSWORD);

const SAVED = /all changes saved/i;

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

async function login(page: Page) {
  await gotoClean(page, "/admin/login");
  await page.locator('input[type="email"]').fill(EMAIL!);
  await page.locator('input[type="password"]').fill(PASSWORD!);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.endsWith("/admin/login"), {
    timeout: 30_000,
  });
}

/** Keys of every local recovery snapshot the browser is holding. */
async function snapshotKeys(page: Page): Promise<string[]> {
  return page.evaluate(
    (prefix) =>
      Object.keys(window.localStorage).filter((key) => key.startsWith(prefix)),
    SNAPSHOT_PREFIX
  );
}

/** Leave a stale recovery copy behind — exactly what the old bug did. */
async function seedSnapshot(
  page: Page,
  scope: string,
  snapshot: Record<string, unknown>
) {
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key, JSON.stringify(value)),
    [`${SNAPSHOT_PREFIX}${scope}`, snapshot] as const
  );
}

/**
 * Delete every row whose title matches, through the admin list (so the
 * server action revalidates the public caches). Cleanup never masks a result.
 */
async function deleteByTitle(page: Page, listPath: string, title: string) {
  try {
    await gotoClean(page, listPath);
    if (/\/admin\/login/.test(page.url())) {
      await login(page);
      await gotoClean(page, listPath);
    }
    const row = page.locator("li, div").filter({ hasText: title });
    if (!(await row.count())) return;
    page.once("dialog", (d) => d.accept());
    await row.first().getByRole("button", { name: /^Delete$/ }).click();
    await expect(page.locator("li, div").filter({ hasText: title })).toHaveCount(
      0,
      { timeout: 20_000 }
    );
  } catch {
    // best effort only
  }
}

test.describe("content isolation", () => {
  test.setTimeout(240_000);

  test.skip(
    !HAS_CREDS,
    "No E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD supplied — the isolation " +
      "workflow could not be executed end to end."
  );

  test("publishing a new article never replaces a published one", async ({ page }) => {
    await login(page);
    const ts = Date.now();
    const titleA = `[E2E] isolation article A ${ts}`;
    const titleB = `[E2E] isolation article B ${ts}`;
    const markerA = `E2EISOA${ts}`;
    const markerB = `E2EISOB${ts}`;

    try {
      // ── Article A: created and published ────────────────────────────────
      await gotoClean(page, "/admin/articles/new");
      await page.locator('input[name="title"]').first().fill(titleA);
      const box = page.locator(".ProseMirror").first();
      await box.click();
      await page.keyboard.type(`${markerA} article A body`);
      await expect(page.getByText(SAVED).first()).toBeVisible({ timeout: 30_000 });
      await clickUntilNavigation(
        page,
        page.getByRole("button", { name: /^Publish$/ }),
        /\/admin\/articles(\/)?$/
      );
      await expect(
        page.locator("li").filter({ hasText: titleA }),
        "article A was not published"
      ).toContainText(/published/i);

      const sb = await adminClient();
      const { data: aRows } = await sb
        .from("articles")
        .select("id, title, status")
        .eq("title", titleA);
      expect(aRows?.length, "article A must exist exactly once").toBe(1);
      const idA = (aRows![0] as { id: string }).id;

      // ── The new form starts clean, and stays clean ──────────────────────
      await gotoClean(page, "/admin/articles/new");
      await expect(page.locator('input[name="title"]').first()).toHaveValue("");
      await expect(page.locator('input[name="autosave_id"]')).toHaveValue("");
      // The completed save left no recovery copy to resurrect.
      expect(await snapshotKeys(page)).toEqual([]);

      // A leftover snapshot from ANOTHER tab-session (the old defect): it
      // must not pre-fill the form and must not donate its row id.
      await seedSnapshot(page, "/admin/articles/new", {
        id: idA,
        data: { title: [titleA], slug: ["e2e-isolation-article-a"] },
        savedAt: Date.now(),
        token: "another-tab-session",
      });
      await page.reload();
      await expect(page.locator('input[name="title"]').first()).toHaveValue(
        "",
        { timeout: 20_000 }
      );
      await expect(page.locator('input[name="autosave_id"]')).toHaveValue("");

      // ── Article B: published while the form is handed A's row id ───────
      // That is exactly what the stale snapshot used to inject. The server
      // must refuse to write INTO article A and produce its own row.
      await page.locator('input[name="title"]').first().fill(titleB);
      await page.locator(".ProseMirror").first().click();
      await page.keyboard.type(`${markerB} article B body`);
      await expect(page.getByText(SAVED).first()).toBeVisible({ timeout: 30_000 });
      await page
        .locator('input[name="autosave_id"]')
        .evaluate((el, id) => ((el as HTMLInputElement).value = id), idA);
      await clickUntilNavigation(
        page,
        page.getByRole("button", { name: /^Publish$/ }),
        /\/admin\/articles(\/)?$/
      );

      // ── Article A is untouched ─────────────────────────────────────────
      const { data: afterA } = await sb
        .from("articles")
        .select("id, title, status, body")
        .eq("id", idA);
      expect(afterA?.length, "article A was deleted").toBe(1);
      expect(afterA![0].title, "article A's headline was overwritten").toBe(titleA);
      expect(afterA![0].status).toBe("published");
      expect(
        JSON.stringify(afterA![0].body),
        "article A's body was overwritten"
      ).toContain(markerA);
      expect(
        JSON.stringify(afterA![0].body),
        "article B's content was written into article A"
      ).not.toContain(markerB);

      // ── Article B exists as its own published row ──────────────────────
      const { data: afterB } = await sb
        .from("articles")
        .select("id, title, status, body")
        .eq("title", titleB)
        .eq("status", "published");
      expect(
        afterB?.length,
        "article B was not published as its own record"
      ).toBe(1);
      expect((afterB![0] as { id: string }).id).not.toBe(idA);
      expect(JSON.stringify(afterB![0].body)).toContain(markerB);

      // ── Each editor loads its own saved content ────────────────────────
      await gotoClean(page, "/admin/articles");
      await page
        .locator("li")
        .filter({ hasText: titleA })
        .getByRole("link", { name: "Edit" })
        .click();
      await page.waitForURL(/\/admin\/articles\/.+\/edit/);
      await expect(page.locator('input[name="title"]').first()).toHaveValue(
        titleA
      );
      await expect(page.locator(".ProseMirror").first()).toContainText(markerA);

      await gotoClean(page, "/admin/articles");
      await page
        .locator("li")
        .filter({ hasText: titleB })
        .getByRole("link", { name: "Edit" })
        .click();
      await page.waitForURL(/\/admin\/articles\/.+\/edit/);
      await expect(page.locator('input[name="title"]').first()).toHaveValue(
        titleB
      );
      await expect(page.locator(".ProseMirror").first()).toContainText(markerB);
      await expect(
        page.locator(".ProseMirror").first(),
        "the editor showed another article's body"
      ).not.toContainText(markerA);
    } finally {
      await deleteByTitle(page, "/admin/articles", titleA);
      await deleteByTitle(page, "/admin/articles", titleB);
    }
  });

  test("a published interview is never taken over by a new one", async ({ page }) => {
    await login(page);
    const ts = Date.now();
    const nameA = `[E2E] isolation lawyer A ${ts}`;
    const nameB = `[E2E] isolation lawyer B ${ts}`;

    try {
      // ── Interview A: created and published ─────────────────────────────
      await gotoClean(page, "/admin/lawyer-news/new");
      await page.locator('input[name="lawyer_name"]').fill(nameA);
      // The visible Q&A textareas are nameless by design — each keeps its
      // value in a same-named hidden input (see QaTextarea).
      await page.locator("#qa_q_0").fill("What drives your practice?");
      await page.locator("#qa_a_0").fill("E2EISOA answers the question.");
      await expect(page.getByText(SAVED).first()).toBeVisible({ timeout: 30_000 });
      await clickUntilNavigation(
        page,
        page.getByRole("button", { name: /^Publish$/ }),
        /\/admin\/lawyer-news(\/)?$/
      );
      await expect(
        page.locator("div").filter({ hasText: nameA }).last(),
        "interview A was not published"
      ).toContainText(/Published/i);

      const sb = await adminClient();
      const { data: aRows } = await sb
        .from("lawyer_in_the_news")
        .select("id, lawyer_name, status")
        .eq("lawyer_name", nameA);
      expect(aRows?.length, "interview A must exist exactly once").toBe(1);
      const idA = (aRows![0] as { id: string }).id;

      // ── The new-entry form starts clean ────────────────────────────────
      await gotoClean(page, "/admin/lawyer-news/new");
      await expect(page.locator('input[name="lawyer_name"]')).toHaveValue("");
      await expect(page.locator('input[name="autosave_id"]')).toHaveValue("");

      // ── Interview B, with the form handed A's (published) row id ───────
      await page.locator('input[name="lawyer_name"]').fill(nameB);
      await page.locator("#qa_q_0").fill("And now?");
      await page.locator("#qa_a_0").fill("E2EISOB answers instead.");
      await expect(page.getByText(SAVED).first()).toBeVisible({ timeout: 30_000 });
      await page
        .locator('input[name="autosave_id"]')
        .evaluate((el, id) => ((el as HTMLInputElement).value = id), idA);
      await clickUntilNavigation(
        page,
        page.getByRole("button", { name: /^Create Interview$/ }),
        /\/admin\/lawyer-news(\/)?$/
      );

      // A is intact; B is its own pending-review row.
      const { data: afterA } = await sb
        .from("lawyer_in_the_news")
        .select("id, lawyer_name, status")
        .eq("id", idA);
      expect(afterA?.length, "interview A was deleted").toBe(1);
      expect(afterA![0].lawyer_name, "interview A was overwritten").toBe(nameA);
      expect(afterA![0].status).toBe("published");

      const { data: afterB } = await sb
        .from("lawyer_in_the_news")
        .select("id, lawyer_name, status")
        .eq("lawyer_name", nameB);
      expect(afterB?.length, "interview B was not created on its own").toBeGreaterThanOrEqual(1);
      expect(
        afterB!.some((row: { id: string }) => row.id !== idA),
        "interview B reused interview A's record"
      ).toBe(true);
    } finally {
      await deleteByTitle(page, "/admin/lawyer-news", nameA);
      await deleteByTitle(page, "/admin/lawyer-news", nameB);
    }
  });

  test("publishing a new event never removes an earlier one", async ({ page }) => {
    await login(page);
    const ts = Date.now();
    const titleA = `[E2E] isolation event A ${ts}`;
    const titleB = `[E2E] isolation event B ${ts}`;

    // The events admin list renders rows as direct children of a
    // `div.space-y-4` container; scoping to `> div` keeps a row assertion
    // from matching the container (which holds every row, drafts included).
    const rows = (p: Page, title: string) =>
      p.locator("div.space-y-4 > div").filter({ hasText: title });

    try {
      // ── Event A: created and published ────────────────────────────────
      await gotoClean(page, "/admin/events/new");
      await page.locator('input[name="title"]').fill(titleA);
      await expect(page.getByText(SAVED).first()).toBeVisible({ timeout: 30_000 });
      await clickUntilNavigation(
        page,
        page.getByRole("button", { name: /^Publish$/ }),
        /\/admin\/events(\/)?$/
      );
      await expect(rows(page, titleA), "event A was not published").toHaveCount(1);
      await expect(rows(page, titleA)).not.toContainText(/· Draft/);

      const sb = await adminClient();
      const { data: aRows } = await sb
        .from("events")
        .select("id, title, slug, published")
        .eq("title", titleA);
      expect(aRows?.length, "event A must exist exactly once").toBe(1);
      const idA = (aRows![0] as { id: string }).id;

      // ── The new-event form starts clean ───────────────────────────────
      await gotoClean(page, "/admin/events/new");
      await expect(page.locator('input[name="title"]')).toHaveValue("");
      await expect(page.locator('input[name="autosave_id"]')).toHaveValue("");

      // ── Event B: published while the form is handed A's row id ────────
      // That is what a stale recovery snapshot used to inject. The server
      // must refuse to write INTO event A and produce its own row instead.
      await page.locator('input[name="title"]').fill(titleB);
      await expect(page.getByText(SAVED).first()).toBeVisible({ timeout: 30_000 });
      await page
        .locator('input[name="autosave_id"]')
        .evaluate((el, id) => ((el as HTMLInputElement).value = id), idA);
      await clickUntilNavigation(
        page,
        page.getByRole("button", { name: /^Publish$/ }),
        /\/admin\/events(\/)?$/
      );

      // ── Event A is untouched; event B is its own published row ────────
      const { data: afterA } = await sb
        .from("events")
        .select("id, title, published")
        .eq("id", idA);
      expect(afterA?.length, "event A was deleted").toBe(1);
      expect(afterA![0].title, "event A's title was overwritten").toBe(titleA);
      expect(afterA![0].published, "event A was unpublished").toBe(true);

      const { data: afterB } = await sb
        .from("events")
        .select("id, title, published")
        .eq("title", titleB);
      expect(afterB?.length, "event B was not created exactly once").toBe(1);
      expect(
        (afterB![0] as { id: string }).id,
        "event B reused event A's record"
      ).not.toBe(idA);
      expect(afterB![0].published, "event B was not published").toBe(true);

      // ── Both events are listed in the admin ───────────────────────────
      await gotoClean(page, "/admin/events");
      await expect(rows(page, titleA)).toHaveCount(1);
      await expect(rows(page, titleB)).toHaveCount(1);
      await expect(rows(page, titleB)).not.toContainText(/· Draft/);

      // ── Both appear on the public events page ─────────────────────────
      await gotoClean(page, "/events");
      await expect(
        page.getByRole("heading", { name: titleA }),
        "event A is missing from /events"
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: titleB }),
        "event B is missing from /events"
      ).toBeVisible();

      // ── And both appear on the homepage events section ────────────────
      // The section used to be capped at the 4 newest events, so publishing
      // B pushed A off the homepage — which read as "the old event was
      // deleted". The cap is gone; every homepage-ticked event shows.
      await gotoClean(page, "/");
      const homeEvents = page
        .locator("section")
        .filter({ hasText: "Upcoming & recent events" });
      await expect(
        homeEvents.getByRole("heading", { name: titleA }),
        "event A is missing from the homepage events section"
      ).toBeVisible();
      await expect(
        homeEvents.getByRole("heading", { name: titleB }),
        "event B is missing from the homepage events section"
      ).toBeVisible();
    } finally {
      // Scoped delete: the shared deleteByTitle helper matches `li, div`,
      // whose first match on this page is the container holding every row.
      for (const title of [titleA, titleB]) {
        try {
          await gotoClean(page, "/admin/events");
          if (/\/admin\/login/.test(page.url())) {
            await login(page);
            await gotoClean(page, "/admin/events");
          }
          const row = rows(page, title);
          if (!(await row.count())) continue;
          page.once("dialog", (d) => d.accept());
          await row.first().getByRole("button", { name: /^Delete$/ }).click();
          await expect(rows(page, title)).toHaveCount(0, { timeout: 20_000 });
        } catch {
          // best effort only — cleanup must never mask a result
        }
      }
    }
  });
});
