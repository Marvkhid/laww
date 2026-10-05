import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { test, expect, gotoClean, clickUntilNavigation } from "./fixtures";

/**
 * Cross-content-type regression: the same workflow the article specs assert,
 * run against the other admin content types that share the autosave /
 * image-upload / publish layer.
 *
 * Every admin form uses the same three shared pieces —
 *   useAutosave          (draft id, debounce, submit hand-off)
 *   ImageUploadZone      (upload-on-select, committed URL field)
 *   SaveButtons          (save_mode) or a plain SubmitButton
 * — so a fix at those layers has to hold for all of them. This spec picks one
 * representative per *shape* rather than duplicating near-identical journeys:
 *
 *   legal-updates   body editor + cover image + save_mode publish
 *                   (the only other type with a rich-text Body, and the one
 *                   that shares SaveButtons with articles)
 *   events          cover + gallery upload + a `published` flag instead of a
 *                   status string, plus an auto-slug
 *   call-for-papers no draft/publish concept at all — every save is live, so
 *                   this is the case where "autosave created a duplicate" would
 *                   be most visible
 *
 * What each asserts, in the database rather than the UI:
 *   exactly one row, the body/description/fields present, publication state
 *   correct, and a reopen of /edit restoring everything.
 *
 * Cleanup goes through the admin UI, not straight to the database. The public
 * listing pages are statically prerendered (`○ /events`, `○ /articles` in the
 * build output), so they are only refreshed when an admin action calls
 * `revalidatePath`. Deleting the row with PostgREST leaves the prerendered HTML
 * in place — which is how a deleted event's cover image survived on the public
 * /events page as a broken image, and made the resilience spec's storage-block
 * assertion see zero requests. Clicking Delete in the admin runs the real
 * action, which revalidates, so the CMS is left exactly as it was found.
 */

const EMAIL = process.env.E2E_ADMIN_EMAIL;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const HAS_CREDS = Boolean(EMAIL && PASSWORD);

const SAVED = /all changes saved/i;
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64"
);

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

/** Wait until no response has arrived for `quietMs` (uploads are POSTs too). */
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

async function waitForSaved(page: Page) {
  await expect(
    page.getByText(SAVED).first(),
    "autosave never reported a confirmed save"
  ).toBeVisible({ timeout: 30_000 });
}

/**
 * Delete the row that contains `rowText` by clicking its Delete button.
 *
 * The three list pages mark up their rows differently (`li` on legal updates
 * and call for papers, a bordered `div` on events), so the row is found by
 * asking for the innermost element that both contains the text and holds a
 * Delete button, rather than by assuming one container shape.
 */
async function deleteRowViaUi(
  page: Page,
  listPath: string,
  rowText: string
) {
  try {
    await gotoClean(page, listPath);
    const row = page
      .locator(
        `xpath=//*[contains(normalize-space(string(.)), ${JSON.stringify(rowText)})][.//button[normalize-space()='Delete']][last()]`
      )
      .first();
    if (!(await row.count())) return;
    page.once("dialog", (d) => d.accept());
    await row.getByRole("button", { name: /^Delete$/ }).click();
    await expect(
      page.getByText(rowText).first(),
      "the row was not removed from the admin list"
    ).toHaveCount(0, { timeout: 20_000 });
  } catch {
    // Cleanup must never mask the real result; the rows are prefixed [E2E].
  }
}

/** Type into the shared rich-text editor. */
async function typeBody(page: Page, text: string) {
  const box = page.locator(".ProseMirror").first();
  await expect(box, "the rich-text editor did not render").toBeVisible({
    timeout: 20_000,
  });
  await box.click();
  // ASCII only: `keyboard.type` with a non-ASCII glyph hangs in Firefox.
  await page.keyboard.type(text);
}

test.describe("cross-content-type autosave and publish", () => {
  test.skip(
    !HAS_CREDS,
    "No E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD supplied — the cross-content " +
      "regression could not be executed."
  );

  test("legal updates: body + cover survive autosave, publish exactly once, and reopen", async ({
    page,
    useFaults,
  }) => {
    await login(page);
    const ts = Date.now();
    const headline = `[E2E] legal update ${ts}`;
    const marker = `E2E-LU-${ts}`;
    const sb = await adminClient();

    try {
      await gotoClean(page, "/admin/legal-updates/new");
      await page.locator('input[name="headline"]').fill(headline);
      await page.locator('textarea[name="summary"]').fill(`Summary ${marker}`);
      await page.locator('input[name="source_name"]').fill("E2E Source");
      await typeBody(page, `${marker} body text that must reach the database.`);
      await waitForSaved(page);

      // Cover image: uploaded on selection, then autosaved like any field.
      await page
        .locator('input[name="cover_image_file"]')
        .setInputFiles({
          name: "cover.png",
          mimeType: "image/png",
          buffer: PNG_1PX,
        });
      await expect(
        page
          .locator(
            'img[alt="Upload cover image"], img[alt="Replace cover image"]'
          )
          .first(),
        "the cover upload never produced a preview"
      ).toBeVisible({ timeout: 30_000 });
      await waitForQuiet(page);
      await waitForSaved(page);

      // The upload above re-rendered the form. That must not have disturbed
      // the editor's hidden `body` field: React used to rewrite an
      // uncontrolled hidden input's live value from `defaultValue` on every
      // commit, so the typed document was silently reset to "" while
      // `body_state` fell back to "" as well — and the server, seeing an
      // untrusted body, kept the stored one, which is null for a new record.
      await expect
        .poll(() => page.locator('input[name="body"]').inputValue(), {
          timeout: 15_000,
          message: "the body field was emptied by a re-render",
        })
        .toContain(marker);
      await expect(page.locator('input[name="body_state"]')).toHaveValue("ready");

      await clickUntilNavigation(
        page,
        page.getByRole("button", { name: /^Publish$/ }),
        /\/admin\/legal-updates(\/)?$/
      );
      await expect(
        page.getByText(headline).first(),
        "the update does not appear in the admin list"
      ).toBeVisible({ timeout: 20_000 });

      const { data: raw } = await sb
        .from("legal_updates")
        .select("id,slug,status,body,summary,cover_image_url,headline")
        .eq("headline", headline);
      const rows = raw as unknown as Record<string, unknown>[] | null;
      expect(
        rows?.length,
        "the legal update was not created exactly once"
      ).toBe(1);
      const saved = rows![0];
      expect(
        saved.status,
        "Publish left the legal update as a draft"
      ).toBe("published");
      expect(
        JSON.stringify(saved.body),
        "the persisted body is missing content"
      ).toContain(marker);
      expect(String(saved.summary)).toContain(marker);
      expect(saved.cover_image_url, "the cover image was not persisted").toBeTruthy();

      // Reopen /edit: everything must still be there. Navigating by the id the
      // database returned keeps this assertion about hydration rather than
      // about the list page's markup (which differs per content type).
      await gotoClean(page, `/admin/legal-updates/${saved.id}/edit`);
      await expect(
        page.locator(".ProseMirror").first(),
        "the body was not restored after reopening the editor"
      ).toContainText(marker, { timeout: 20_000 });
      await expect(
        page.locator('input[name="headline"]').first()
      ).toHaveValue(headline);

      expect(useFaults.pageErrors, "the legal-update flow threw").toEqual([]);
    } finally {
      await deleteRowViaUi(page, "/admin/legal-updates", headline);
      await sb.from("legal_updates").delete().eq("headline", headline);
    }
  });

  test("events: cover upload autosaves and Publish creates one published row", async ({
    page,
  }) => {
    await login(page);
    const ts = Date.now();
    const title = `[E2E] event ${ts}`;
    const sb = await adminClient();

    try {
      await gotoClean(page, "/admin/events/new");
      await page.locator('input[name="title"]').first().fill(title);
      await page
        .locator('textarea[name="description"]')
        .fill(`Description ${title} must survive.`);
      await page.locator('input[name="event_date"]').fill("2026-11-20");
      await page.locator('input[name="page_number"]').fill("42");

      await page
        .locator('input[name="cover_image_file"]')
        .setInputFiles({
          name: "cover.png",
          mimeType: "image/png",
          buffer: PNG_1PX,
        });
      await expect(
        page
          .locator(
            'img[alt="Upload cover image"], img[alt="Replace cover image"]'
          )
          .first(),
        "the event cover never produced a preview"
      ).toBeVisible({ timeout: 30_000 });
      await waitForQuiet(page);
      await waitForSaved(page);

      await clickUntilNavigation(
        page,
        page.getByRole("button", { name: /^Publish$/ }),
        /\/admin\/events(\/)?$/
      );
      await expect(
        page.getByText(title).first(),
        "the event does not appear in the admin list"
      ).toBeVisible({ timeout: 20_000 });

      const { data: raw } = await sb
        .from("events")
        .select(
          "id,slug,title,description,published,cover_image_url,event_date,page_number"
        )
        .eq("title", title);
      const rows = raw as unknown as Record<string, unknown>[] | null;
      expect(rows?.length, "the event was not created exactly once").toBe(1);
      const saved = rows![0];
      expect(saved.published, "Publish left the event unpublished").toBe(true);
      expect(String(saved.description)).toContain("must survive");
      expect(saved.cover_image_url, "the event cover was not persisted").toBeTruthy();
      expect(String(saved.event_date)).toContain("2026-11-20");
      expect(saved.page_number).toBe(42);

      // Reopen /edit and confirm the saved values come back from the server.
      await gotoClean(page, `/admin/events/${saved.id}/edit`);
      await expect(page.locator('input[name="title"]').first()).toHaveValue(title);
      await expect(page.locator('input[name="page_number"]')).toHaveValue("42");
      await expect(
        page.locator('textarea[name="description"]'),
        "the description was lost on reopen"
      ).toHaveValue(new RegExp("must survive"));
    } finally {
      await deleteRowViaUi(page, "/admin/events", title);
      await sb.from("events").delete().eq("title", title);
    }
  });

  test("call for papers: autosave then Create leaves exactly one record", async ({
    page,
  }) => {
    await login(page);
    const ts = Date.now();
    // This type has no title, so the unique issue month identifies the row.
    const issueMonth = `E2E-March-${ts}`;
    const email = `e2e-${ts}@example.com`;
    const sb = await adminClient();

    try {
      await gotoClean(page, "/admin/call-for-papers/new");
      await page.locator('input[name="issue_number"]').fill("77");
      await page.locator('input[name="word_limit"]').fill("1500");
      await page.locator('input[name="issue_month"]').fill(issueMonth);
      await page.locator('input[name="deadline"]').fill("2026-12-31");
      await page.locator('input[name="contact_email"]').fill(email);
      await waitForSaved(page);

      // The submit races an in-flight autosave by design (autosave has already
      // created the row), so this is exactly where a duplicate would appear.
      await clickUntilNavigation(
        page,
        page.getByRole("button", { name: /^Create$/ }),
        /\/admin\/call-for-papers(\/)?$/
      );

      const { data } = await sb
        .from("call_for_papers")
        .select("id,issue_number,issue_month,deadline,word_limit,contact_email")
        .eq("issue_month", issueMonth);
      expect(
        data?.length,
        "the call for papers was saved more than once"
      ).toBe(1);
      expect(data![0].contact_email).toBe(email);
      expect(data![0].word_limit).toBe(1500);
      expect(String(data![0].deadline)).toContain("2026-12-31");

      // Reopen /edit and confirm every field is restored from the server.
      await gotoClean(page, `/admin/call-for-papers/${data![0].id}/edit`);
      await expect(page.locator('input[name="issue_month"]')).toHaveValue(issueMonth);
      await expect(page.locator('input[name="contact_email"]')).toHaveValue(email);
      await expect(page.locator('input[name="word_limit"]')).toHaveValue("1500");
    } finally {
      await deleteRowViaUi(page, "/admin/call-for-papers", issueMonth);
      await sb.from("call_for_papers").delete().eq("issue_month", issueMonth);
    }
  });
});
