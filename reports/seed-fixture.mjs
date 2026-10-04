import { chromium } from "playwright";

/**
 * Publishes a throwaway public fixture article so the PUBLIC Playwright suite
 * has something to render against (those specs are hard-coded to
 * /articles/the-headline and fail with "Page Unavailable" when the CMS holds
 * no published article).
 *
 * Throwaway: `reports/delete-fixture.mjs` removes it again, and this file is
 * deleted with the rest of the scratch artifacts. Nothing here is part of the
 * committed suite.
 */
const BASE = process.env.E2E_BASE_URL || "http://localhost:3100";
const EMAIL = process.env.E2E_ADMIN_EMAIL;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;

const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64"
);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${BASE}/admin/login`, { waitUntil: "load" });
await page.locator('input[type="email"]').fill(EMAIL);
await page.locator('input[type="password"]').fill(PASSWORD);
await page.locator('button[type="submit"]').click();
await page.waitForURL((u) => !u.pathname.endsWith("/admin/login"), {
  timeout: 30_000,
});

await page.goto(`${BASE}/admin/articles/new`, { waitUntil: "load" });
await page.locator('input[name="title"]').first().fill("The Headline");
await page.locator('input[name="slug"]').first().fill("the-headline");

const body = [
  "This fixture article exists so the public regression suite has real content to render: it carries body copy, a cover image and the four optional inline images, each placed in a different band.",
  "A second paragraph gives the layout tests enough flowing text for the figures to float beside the column and for the wrap to be measurable.",
  "A third paragraph closes the piece so there is content after the last figure as well.",
].join("\n\n");

const box = page.locator(".ProseMirror").first();
await box.click();
await page.keyboard.type(body);
await page
  .getByText(/all changes saved/i)
  .first()
  .waitFor({ timeout: 40_000 });

await page.locator('input[name="cover_image_file"]').setInputFiles({
  name: "cover.png",
  mimeType: "image/png",
  buffer: PNG_1PX,
});
await page
  .locator('img[alt="Upload cover image"], img[alt="Replace cover image"]')
  .first()
  .waitFor({ timeout: 30_000 });

const positions = ["top-left", "bottom-right", "full-width", "center-left"];
for (let i = 1; i <= 4; i++) {
  await page.locator(`input[name="image_${i}_file"]`).setInputFiles({
    name: `img${i}.png`,
    mimeType: "image/png",
    buffer: PNG_1PX,
  });
  await page
    .locator(`img[alt="Image ${i}"]`)
    .waitFor({ timeout: 30_000 });
  await page
    .locator(`select[name="image_${i}_position"]`)
    .selectOption(positions[i - 1]);
}

await page.waitForTimeout(4000);
await page.getByRole("button", { name: /^Publish$/ }).click();
await page.waitForURL(/\/admin\/articles(\/)?$/, { timeout: 40_000 });

const row = page.locator("li").filter({ hasText: "The Headline" });
console.log("rows in list:", await row.count());
console.log("row text:", (await row.first().innerText()).replace(/\n/g, " | "));

const pub = await page.goto(`${BASE}/articles/the-headline`, {
  waitUntil: "load",
});
console.log("public page:", pub.status());
console.log("images on page:", await page.locator("img").count());

await browser.close();
