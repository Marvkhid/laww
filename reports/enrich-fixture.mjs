import { chromium } from "playwright";

/**
 * Appends body copy to the public fixture article.
 *
 * `article-layout` asserts that text wraps BESIDE a floated figure. That is
 * only measurable with a text-rich article: with three short paragraphs no
 * line can fit alongside a figure, so the assertion cannot hold regardless of
 * whether the float CSS is correct.
 */
const BASE = process.env.E2E_BASE_URL || "http://localhost:3100";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${BASE}/admin/login`, { waitUntil: "load" });
await page
  .locator('input[type="email"]')
  .fill(process.env.E2E_ADMIN_EMAIL);
await page
  .locator('input[type="password"]')
  .fill(process.env.E2E_ADMIN_PASSWORD);
await page.locator('button[type="submit"]').click();
await page.waitForURL((u) => !u.pathname.endsWith("/admin/login"), {
  timeout: 30_000,
});

await page.goto(`${BASE}/articles/the-headline`, { waitUntil: "load" });
await page.goto(`${BASE}/admin/articles`, { waitUntil: "load" });
await page
  .locator("li")
  .filter({ hasText: "The Headline" })
  .first()
  .getByRole("link", { name: "Edit" })
  .click();
await page.waitForURL(/\/admin\/articles\/.+\/edit/, { timeout: 30_000 });

const extra = [
  "The fourth paragraph exists so the article carries enough continuous prose for the layout suite to measure how a paragraph wraps beside a floated figure. Without a column of text next to the artwork there is nothing to wrap, and the measurement would be testing an empty page rather than the float behaviour it claims to cover.",
  "A fifth paragraph follows the second figure in the flow. Editorial layout only becomes interesting once there is more copy than artwork: the text has to find its way around each floated element, close the gap cleanly, and return to the full column width once the float ends.",
  "A sixth paragraph keeps the same rhythm on the other side of the page. Each of these paragraphs is deliberately longer than a couple of lines, because a single short line can always fit beside a figure and would prove nothing at all.",
  "A seventh paragraph sits after the last figure, where the column must return to full width. This is the part that catches a float that never clears, which would otherwise push the closing copy off the side of the column entirely.",
  "An eighth and final paragraph closes the fixture. The article is published, targeted at the same pages as any other article, and exists purely so the public regression suite has realistic content to render.",
].join("\n\n");

// Put the caret at the very end of the existing body and keep typing.
const box = page.locator(".ProseMirror").first();
await box.click();
await page.keyboard.press("Control+End");
await page.keyboard.press("Enter");
await page.keyboard.type(extra);

await page
  .getByText(/all changes saved/i)
  .first()
  .waitFor({ timeout: 40_000 });
await page.waitForTimeout(3000);
await page.getByRole("button", { name: /Save & Publish|^Publish$/ }).click();
await page.waitForURL(/\/admin\/articles(\/)?$/, { timeout: 40_000 });

const pub = await page.goto(`${BASE}/articles/the-headline`, {
  waitUntil: "load",
});
const text = await page.locator("body").innerText();
console.log("public status:", pub.status());
console.log("has final paragraph:", text.includes("eighth and final paragraph"));

await browser.close();
