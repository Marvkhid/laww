/**
 * The failure the client reported, end to end, against the real database.
 *
 * Reported symptom: at /admin/articles/new the editor said
 *
 *   Save failed. Retry. That slug is already in use by another article.
 *
 * while the console repeated `category=save_failed detail="That slug is
 * already in use by another article."` — for an article whose slug was brand
 * new and could not possibly be taken.
 *
 * The real obstacle was the Cover Story tick: migration 0009 keeps at most one
 * cover story with a partial unique index, and the write order introduced by
 * migration 0026 sets the new flag before clearing the previous one, so the
 * statement raises `unique_violation(23505)` on the constraint
 * `one_cover_story_at_a_time` — and the application reported every 23505 as a
 * slug problem.
 *
 * This test pins the part that must hold whatever state the database function
 * is in:
 *
 *   · the slug generated from a fresh title is free, so a refusal can only
 *     come from the cover-story rule, never from the slug;
 *   · when the save IS refused, the message names the Cover Story and never
 *     the slug;
 *   · the real constraint reaches the browser console (that is what made the
 *     original report so hard to diagnose);
 *   · once migration 0027 is applied the same save succeeds instead.
 *
 * It is hermetic: the draft it may create is deleted afterwards, exactly like
 * the autosave journey in admin.spec.ts. Needs editor credentials:
 *
 *   E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... npx playwright test admin-cover-story.spec.ts
 */

import type { Page } from "@playwright/test";
import { test, expect, gotoClean } from "./fixtures";

const EMAIL = process.env.E2E_ADMIN_EMAIL;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const HAS_CREDS = Boolean(EMAIL && PASSWORD);

async function login(page: Page) {
  await gotoClean(page, "/admin/login");
  await page.locator('input[type="email"]').fill(EMAIL!);
  await page.locator('input[type="password"]').fill(PASSWORD!);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.endsWith("/admin/login"), {
    timeout: 30_000,
  });
}

/** Remove the throwaway draft so the CMS is left as it was found. */
async function deleteDraft(page: Page, title: string) {
  try {
    await gotoClean(page, "/admin/articles");
    const row = page.locator("li").filter({ hasText: title });
    if (!(await row.count())) return;
    page.once("dialog", (dialog) => dialog.accept());
    await row.getByRole("button", { name: /^Delete$/ }).click();
    await expect(row).toHaveCount(0, { timeout: 20_000 });
  } catch {
    // Cleanup must never mask the real result.
  }
}

test.describe("an article that claims the cover story", () => {
  test.skip(
    !HAS_CREDS,
    "No E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD supplied — this is the reported " +
      "failure itself, so it cannot be inferred from a code path."
  );

  test("saves, or names the cover story as the obstacle — never the slug", async ({
    page,
  }) => {
    const title = `[E2E] cover story ${Date.now()}`;
    const diagnostics: string[] = [];
    page.on("console", (message) => {
      const text = message.text();
      if (text.startsWith("[admin]")) diagnostics.push(text);
    });

    try {
      await login(page);
      await gotoClean(page, "/admin/articles/new");

      await page.locator('input[name="title"]').first().fill(title);
      // The slug comes from the title and is brand new: a slug clash is
      // impossible, which is exactly why the reported message was nonsense.
      await expect(page.locator('input[name="slug"]').first()).toHaveValue(
        /e2e-cover-story/
      );

      // Same tick the client had on screen when it failed. The kit renders a
      // styled label over a visually hidden input, so this clicks the label —
      // the same gesture a person makes.
      await page
        .locator("label")
        .filter({ hasText: /Cover Story/ })
        .first()
        .click();
      await expect(
        page.locator('input[name="is_cover_story"]'),
        "the Cover Story tick did not register"
      ).toBeChecked();

      const status = page
        .getByRole("status")
        .filter({ hasText: /All changes saved|Save failed/ })
        .first();
      await expect(status).toContainText(/All changes saved|Save failed/i, {
        timeout: 45_000,
      });

      const text = await status.innerText();
      const slugClashLines = diagnostics.filter((line) =>
        line.includes("constraint=articles_slug_key")
      );
      expect(
        slugClashLines,
        `a slug clash was reported for a brand-new slug:\n  ${slugClashLines.join("\n  ")}`
      ).toEqual([]);

      if (/Save failed/i.test(text)) {
        // The truthful diagnosis …
        expect(text, `the editor blamed the slug: "${text}"`).not.toMatch(/slug/i);
        expect(text).toMatch(/Cover Story/i);
        // … and the real constraint in the console, which is what the
        // original devtools capture could not show.
        const coverStoryLines = diagnostics.filter((line) =>
          line.includes("constraint=one_cover_story_at_a_time")
        );
        expect(
          coverStoryLines.length,
          `no cover-story cause in the console:\n  ${diagnostics.join("\n  ")}`
        ).toBeGreaterThan(0);
        expect(coverStoryLines.join("\n")).toContain("cover_story_conflict");
      } else {
        // Migration 0027 applied: the same tick now saves.
        expect(text).toMatch(/All changes saved/i);
      }
    } finally {
      await deleteDraft(page, title);
    }
  });
});
