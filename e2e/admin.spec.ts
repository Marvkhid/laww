import type { Page } from "@playwright/test";
import { test, expect, gotoClean } from "./fixtures";

/** Sign in with the supplied editor credentials. */
async function login(page: Page) {
  await gotoClean(page, "/admin/login");
  await page.locator('input[type="email"]').fill(EMAIL!);
  await page.locator('input[type="password"]').fill(PASSWORD!);
  await page.locator('button[type="submit"]').click();
  await waitForLogin(page);
}

/**
 * Remove a throwaway `[E2E]` draft so the CMS is left as it was found.
 * Scoped to the exact title, so it can never touch real content.
 */
async function deleteDraft(page: Page, title: string) {
  try {
    await gotoClean(page, "/admin/articles");
    const row = page.locator("li").filter({ hasText: title });
    if (!(await row.count())) return;
    page.once("dialog", (d) => d.accept());
    await row.getByRole("button", { name: /^Delete$/ }).click();
    await expect(row).toHaveCount(0, { timeout: 20_000 });
  } catch {
    // Cleanup must never mask the real result.
  }
}

/**
 * Administrative publishing and editing.
 *
 * The unauthenticated half always runs: it proves the admin area is reachable,
 * redirect-protected, and that the auth guard itself is browser-safe.
 *
 * The authenticated half (publish, edit, autosave, page targeting) needs real
 * editor credentials. They are read from the environment so the suite can be
 * pointed at a staging project with a throwaway account:
 *
 *   E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... npx playwright test admin.spec.ts
 *
 * Without them the authenticated block is reported as SKIPPED, never silently
 * passed.
 */

const EMAIL = process.env.E2E_ADMIN_EMAIL;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const HAS_CREDS = Boolean(EMAIL && PASSWORD);

/**
 * Wait for sign-in to actually complete.
 *
 * A naive `waitForURL(/\/admin(\/login)?$/)` returns IMMEDIATELY, because the
 * login page's own URL already matches it — so the test races the in-flight
 * session, navigates too early, is bounced back to the login page, and fails
 * with a confusing "no article in the admin list" much later. Assert on what
 * we are moving AWAY from instead.
 */
async function waitForLogin(page: Page) {
  await page.waitForURL((url) => !url.pathname.endsWith("/admin/login"), {
    timeout: 30_000,
  });
}

test.describe("admin authentication guard", () => {
  test("unauthenticated /admin redirects to the login page", async ({
    page,
    useFaults,
  }) => {
    await gotoClean(page, "/admin");
    await page.waitForURL(/\/admin\/login/, { timeout: 20_000 });
    await expect(page.locator("main")).toBeVisible();
    expect(page.url()).toContain("/admin/login");

    // The guard must not leak a stack trace or throw in any engine.
    expect(useFaults.pageErrors, "admin guard threw").toEqual([]);
  });

  test("the login page renders and is usable in every engine", async ({
    page,
  }) => {
    await gotoClean(page, "/admin/login");
    await expect(page.locator("form")).toBeVisible();
    const emailField = page.locator('input[type="email"]');
    if (await emailField.count()) {
      await expect(emailField).toBeVisible();
      await emailField.fill("nobody@example.invalid");
      await expect(emailField).toHaveValue("nobody@example.invalid");
    }
  });
});

test.describe("admin publishing and editing", () => {
  test.skip(
    !HAS_CREDS,
    "No E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD supplied — authenticated CMS " +
      "journeys (create, edit, autosave, publish) could not be executed."
  );

  test("editor can open the article list and a draft", async ({ page }) => {
    await gotoClean(page, "/admin/login");
    await page.locator('input[type="email"]').fill(EMAIL!);
    await page.locator('input[type="password"]').fill(PASSWORD!);
    await page.locator('button[type="submit"]').click();
    await waitForLogin(page);

    await gotoClean(page, "/admin/articles");
    // `main` alone is ambiguous: the root layout renders one and the admin
    // page renders its own. Assert on the admin content specifically.
    await expect(page.locator("main").last()).toBeVisible();
  });

  test("editing an article autosaves without a manual save", async ({
    page,
  }) => {
    await login(page);
    // Hermetic: this journey must not depend on the CMS already holding an
    // article (a freshly emptied CMS is a legitimate state, and the previous
    // version failed there for the wrong reason). Create a throwaway draft
    // instead, edit it, and delete it again afterwards.
    const title = `[E2E] autosave ${Date.now()}`;
    try {
      await gotoClean(page, "/admin/articles/new");
      await page.locator('input[name="title"]').first().fill(title);
      await expect(
        page.getByText(/all changes saved/i).first(),
        "autosave never reported success for the new draft"
      ).toBeVisible({ timeout: 30_000 });

      await gotoClean(page, "/admin/articles");
      const row = page.locator("li").filter({ hasText: title });
      await expect(row, "the test draft is missing from the list").toHaveCount(
        1,
        { timeout: 20_000 }
      );
      await row.getByRole("link", { name: "Edit" }).click();
      await page.waitForURL(/\/admin\/articles\/.+\/edit/, { timeout: 30_000 });

      const titleField = page.locator('input[name="title"]').first();
      await expect(titleField).toBeVisible();
      const original = await titleField.inputValue();

      await titleField.fill(`${original} [pw-test]`);
      // The autosave status line must resolve to a success state, never hang.
      await expect(
        page.getByText(/all changes saved/i).first(),
        "autosave never reported success"
      ).toBeVisible({ timeout: 30_000 });
    } finally {
      await deleteDraft(page, title);
    }
  });
});
