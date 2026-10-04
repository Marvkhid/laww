import type { Page } from "@playwright/test";
import { test, expect, gotoClean } from "./fixtures";

/**
 * Authenticated persistence journeys — the end-to-end half of the CMS
 * persistence work. They drive the real admin UI in a real browser and assert
 * that content written into it survives leaving the page, reopening it, and
 * reloading.
 *
 * Credentials come from the environment:
 *
 *   E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... npx playwright test admin-persistence.spec.ts
 *
 * Without them every test reports as SKIPPED with the reason, never silently
 * passing. With wrong ones, the login helper fails loudly.
 *
 * SAFETY: these journeys write to the real database and storage, so they
 * never touch published content. Each test creates its own `[E2E]` DRAFT
 * article, runs against that, and deletes it again in a `finally` block. The
 * draft is never published, so nothing here is ever publicly visible.
 *
 * Caveat: deleting the draft removes its image *references*. The uploaded
 * storage objects themselves are left in place — deleting shared bucket
 * objects is deliberately not something this app does (see ImageUploadZone).
 */

const EMAIL = process.env.E2E_ADMIN_EMAIL;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const HAS_CREDS = Boolean(EMAIL && PASSWORD);

/** A valid 1x1 PNG — enough to exercise the real upload path without weight. */
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64"
);

const SAVED = /all changes saved/i;

/**
 * NB: address the editor link by its exact role/name. A loose
 * `a[href*="/admin/articles/"]` ALSO matches the "NEW" button
 * (`/admin/articles/new`), which comes first in the DOM — so a loose selector
 * clicks "create an article" instead of opening one.
 */

/**
 * Wait for sign-in to actually complete.
 *
 * A naive `waitForURL(/\/admin(\/login)?$/)` returns immediately, because the
 * login page's own URL matches it — the test then races the in-flight session,
 * navigates too early, is bounced back to the login page, and fails much later
 * with a confusing "no article in the admin list". Assert on what we are
 * moving away from instead.
 */
async function waitForLogin(page: Page) {
  await page.waitForURL((url) => !url.pathname.endsWith("/admin/login"), {
    timeout: 30_000,
  });
}

async function login(page: Page) {
  await gotoClean(page, "/admin/login");
  await page.locator('input[type="email"]').fill(EMAIL!);
  await page.locator('input[type="password"]').fill(PASSWORD!);
  await page.locator('button[type="submit"]').click();
  await waitForLogin(page);
}

/** Wait for autosave to report a server-confirmed save. */
async function waitForSaved(page: Page) {
  await expect(
    page.getByText(SAVED).first(),
    "autosave never reported a confirmed save"
  ).toBeVisible({ timeout: 30_000 });
}

/**
 * Run an action that should trigger an autosave, and wait for that save to
 * actually complete.
 *
 * Watching for "All changes saved" ALONE is not enough — and this is a real
 * trap. The status line keeps showing that text from the PREVIOUS save, so
 * `waitForSaved` returns instantly after an upload even though the new save
 * has not started. The test then navigates away, the debounced save is
 * cancelled by the unload, and the write is lost — producing a failure that
 * looks like an application bug but is actually the test racing.
 *
 * Arming a response waiter first removes the ambiguity: we wait for the
 * autosave server-action POST itself, then confirm the status line.
 */
/**
 * Wait until no network response has arrived for `quietMs`.
 *
 * Waiting for a single POST is not enough here: an image upload is ITSELF a
 * server-action POST, so that waiter is satisfied by the upload while the
 * save is still in flight. Waiting for the traffic to actually settle is the
 * only unambiguous signal.
 */
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

async function actAndAwaitAutosave(page: Page, action: () => Promise<void>) {
  await action();
  await waitForQuiet(page);
  await expect(
    page.getByText(SAVED).first(),
    "autosave did not settle after the change"
  ).toBeVisible({ timeout: 40_000 });
}

const editor = (page: Page) => page.locator(".ProseMirror").first();

/** Open /admin/articles/new, give it a title and a body, and let autosave run. */
async function createDraft(page: Page, title: string, body: string) {
  await gotoClean(page, "/admin/articles/new");
  await page.locator('input[name="title"]').first().fill(title);
  const box = editor(page);
  await expect(box, "the rich-text editor did not render").toBeVisible({
    timeout: 20_000,
  });
  await box.click();
  await page.keyboard.type(body);
  await waitForSaved(page);
}

/** The list row for a given title. */
const rowFor = (page: Page, title: string) =>
  page.locator("li").filter({ hasText: title });

async function openDraft(page: Page, title: string) {
  await gotoClean(page, "/admin/articles");
  const row = rowFor(page, title);
  await expect(row, `the draft "${title}" is missing from the list`).toHaveCount(
    1,
    { timeout: 20_000 }
  );
  await row.getByRole("link", { name: "Edit" }).click();
  await page.waitForURL(/\/admin\/articles\/.+\/edit/, { timeout: 30_000 });
  return page.url();
}

/** Delete a test draft so the CMS is left as it was found. */
async function deleteDraft(page: Page, title: string) {
  try {
    await gotoClean(page, "/admin/articles");
    const row = rowFor(page, title);
    if (!(await row.count())) return;
    page.once("dialog", (d) => d.accept());
    await row.getByRole("button", { name: /^Delete$/ }).click();
    await expect(
      rowFor(page, title),
      "the test draft was not removed"
    ).toHaveCount(0, { timeout: 20_000 });
  } catch {
    // Cleanup must never mask the real result; the title is flagged [E2E]
    // so it is obvious which row to remove by hand if this ever fails.
  }
}

/** One slot's remove button, addressed by the field it belongs to. */
const removeButton = (page: Page, slot: string) =>
  page.locator(`[data-image-slot="${slot}"] [data-testid="image-remove"]`);

async function uploadImage(page: Page, slot: string, alt: string) {
  await actAndAwaitAutosave(page, async () => {
    await page
      .locator(`input[name="${slot}"]`)
      .setInputFiles({ name: `${slot}.png`, mimeType: "image/png", buffer: PNG_1PX });
    // Upload-on-select must resolve into a preview for this slot.
    await expect(
      page.locator(`img[alt="${alt}"]`),
      `${slot} never produced a preview`
    ).toBeVisible({ timeout: 30_000 });
  });
}

test.describe("authenticated content persistence", () => {
  test.skip(
    !HAS_CREDS,
    "No E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD supplied — authenticated CMS " +
      "journeys (body, images, delete, new draft) could not be executed."
  );

  // ── Tests A/B/H: the body survives leave, reopen and reload ────────────

  test("body: a typed edit survives leaving, reopening and a hard reload", async ({
    page,
    useFaults,
  }) => {
    await login(page);
    const title = `[E2E] body persistence ${Date.now()}`;
    const marker = `E2E-BODY-${Date.now()}`;

    try {
      // ASCII only: `keyboard.type` with a non-ASCII glyph (an em dash) hangs
      // in Firefox, which turned a healthy app into a 90s test timeout.
      await createDraft(page, title, `${marker} - the rule of law.`);

      // Autosave must not have published it, and must not have duplicated it.
      await gotoClean(page, "/admin/articles");
      await expect(
        rowFor(page, title),
        "autosave created duplicate draft rows"
      ).toHaveCount(1, { timeout: 20_000 });
      await expect(rowFor(page, title)).toContainText(/draft/i);

      await openDraft(page, title);
      await expect(
        editor(page),
        "the body was not restored after reopening the editor"
      ).toContainText(marker, { timeout: 20_000 });

      // A hard reload must still show it — proving it is server state, not
      // surviving React state.
      await page.reload();
      await expect(
        editor(page),
        "the body did not survive a full page reload"
      ).toContainText(marker, { timeout: 20_000 });

      expect(useFaults.pageErrors, "the editor threw").toEqual([]);
    } finally {
      await deleteDraft(page, title);
    }
  });

  test("body: editing only the title does not disturb the body", async ({
    page,
  }) => {
    await login(page);
    const title = `[E2E] title-only edit ${Date.now()}`;
    const marker = `E2E-KEEP-${Date.now()}`;

    try {
      await createDraft(page, title, `${marker} body text that must survive.`);
      const editUrl = await openDraft(page, title);

      const titleField = page.locator('input[name="title"]').first();
      const original = await titleField.inputValue();
      await titleField.fill(`${original} (renamed)`);
      await waitForSaved(page);

      await gotoClean(page, "/admin/articles");
      await gotoClean(page, editUrl);
      await expect(
        editor(page),
        "a title-only edit destroyed the body"
      ).toContainText(marker, { timeout: 20_000 });
    } finally {
      await deleteDraft(page, title);
      await deleteDraft(page, `${title} (renamed)`);
    }
  });

  // ── Test C: four images persist together ───────────────────────────────

  test("images: all four survive a reopen and none are dropped", async ({
    page,
  }) => {
    await login(page);
    const title = `[E2E] four images ${Date.now()}`;

    try {
      await createDraft(page, title, `E2E-IMG-${Date.now()}`);
      const editUrl = await openDraft(page, title);

      for (let i = 1; i <= 4; i++) {
        await uploadImage(page, `image_${i}_file`, `Image ${i}`);
      }
      // Let any in-flight save finish before navigating away.
      await waitForQuiet(page);

      await gotoClean(page, "/admin/articles");
      await gotoClean(page, editUrl);
      for (let i = 1; i <= 4; i++) {
        await expect(
          page.locator(`img[alt="Image ${i}"]`),
          `image ${i} was lost after reopening the editor`
        ).toBeVisible({ timeout: 20_000 });
      }
    } finally {
      await deleteDraft(page, title);
    }
  });

  // ── Test D: deletion sticks and is scoped to one slot ──────────────────

  test("images: deleting one persists and leaves the others intact", async ({
    page,
  }) => {
    await login(page);
    const title = `[E2E] delete image ${Date.now()}`;

    try {
      await createDraft(page, title, `E2E-DEL-${Date.now()}`);
      const editUrl = await openDraft(page, title);

      await uploadImage(page, "image_1_file", "Image 1");
      await uploadImage(page, "image_2_file", "Image 2");

      await actAndAwaitAutosave(page, async () => {
        page.once("dialog", (d) => d.accept());
        await removeButton(page, "image_1_file").click();
        await expect(
          page.locator('img[alt="Image 1"]'),
          "the deleted preview is still showing"
        ).toHaveCount(0, { timeout: 15_000 });
      });

      await gotoClean(page, "/admin/articles");
      await gotoClean(page, editUrl);
      await expect(
        page.locator('img[alt="Image 1"]'),
        "the deleted image came back after reopening"
      ).toHaveCount(0, { timeout: 20_000 });
      await expect(
        page.locator('img[alt="Image 2"]'),
        "deleting image 1 also removed image 2"
      ).toBeVisible({ timeout: 20_000 });
    } finally {
      await deleteDraft(page, title);
    }
  });
});
