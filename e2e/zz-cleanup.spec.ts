import { test, expect } from "./fixtures";

/**
 * TEMPORARY: remove throwaway `[E2E] …` rows that earlier runs left published.
 *
 * A failed publish-flow test ends after the admin has already left the admin
 * area (reading the article's public page ends the session by design), so its
 * `finally` cleanup landed on the sign-in page, deleted nothing, and left the
 * throwaway row live on the homepage — where it also pushed real cards out of
 * the "Latest Stories" rail. Deleting through the admin list keeps the
 * revalidation the public pages need.
 *
 * Run once, then delete this file:
 *   E2E_BASE_URL=http://localhost:3000 npx playwright test zz-cleanup \
 *     --project=chromium
 */
const EMAIL = process.env.E2E_ADMIN_EMAIL;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;

test("remove leftover [E2E] articles", async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, "needs admin credentials");
  test.setTimeout(180_000);

  await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').fill(EMAIL!);
  await page.locator('input[type="password"]').fill(PASSWORD!);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.endsWith("/admin/login"), {
    timeout: 30_000,
  });

  for (let round = 0; round < 12; round++) {
    await page.goto("/admin/articles", { waitUntil: "domcontentloaded" });
    const leftovers = page.locator("li").filter({ hasText: /\[E2E\]/ });
    const before = await leftovers.count();
    if (before === 0) break;
    console.log(`round ${round}: ${before} throwaway row(s) left`);
    page.once("dialog", (d) => d.accept());
    await leftovers
      .first()
      .getByRole("button", { name: /^Delete$/ })
      .click();
    await expect(leftovers).toHaveCount(before - 1, { timeout: 20_000 });
  }

  await page.goto("/admin/articles", { waitUntil: "domcontentloaded" });
  const remaining = await page.locator("li").filter({ hasText: /\[E2E\]/ }).count();
  console.log(`remaining throwaway rows: ${remaining}`);
  expect(remaining).toBe(0);
});
