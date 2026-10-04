import { webkit } from "playwright";

/**
 * Reproduce the WebKit RSC-prefetch failure and capture whether the failed
 * fetches were aborted by the Next.js router (i.e. benign) or genuinely
 * rejected by a CORS check.
 */
const EMAIL = process.env.E2E_ADMIN_EMAIL;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;

const browser = await webkit.launch();
const page = await browser.newPage();

await page.addInitScript(() => {
  const original = window.fetch;
  window.__probe = [];
  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : input?.url ?? "";
    const signal = init?.signal ?? (input instanceof Request ? input.signal : null);
    return original.call(this, input, init).catch((err) => {
      window.__probe.push({
        url: String(url).slice(0, 90),
        hadSignal: Boolean(signal),
        aborted: signal ? signal.aborted : null,
        reason: signal?.reason ? String(signal.reason) : null,
        message: err.message,
        stack: String(err.stack).split("\n").slice(0, 4).join(" | "),
        at: Math.round(performance.now()),
      });
      throw err;
    });
  };
});

page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("requestfailed", (r) => {
  const u = r.url();
  if (!u.includes("_rsc=")) return;
  console.log(`REQFAILED ${r.failure()?.errorText} ${u.slice(0, 100)}`);
});

await page.goto("http://localhost:3100/admin/login", { waitUntil: "load" });
await page.locator('input[type="email"]').fill(EMAIL);
await page.locator('input[type="password"]').fill(PASSWORD);
await page.locator('button[type="submit"]').click();
await page.waitForURL((u) => !u.pathname.endsWith("/admin/login"), { timeout: 30_000 });
console.log("logged in");

await page.goto("http://localhost:3100/admin/articles/new", { waitUntil: "load" });
await page.locator('input[name="title"]').first().fill("[E2E] cors probe");
await page.locator(".ProseMirror").first().click();
await page.keyboard.type("probe body text");
await page
  .getByText(/all changes saved/i)
  .first()
  .waitFor({ timeout: 30_000 });

page.on("response", async (r) => {
  if (!r.url().includes("_rsc=")) return;
  console.log(`RSC-RESPONSE ${r.status()} ${r.url().slice(0, 100)}`);
});

await page.goto("http://localhost:3100/admin/articles", { waitUntil: "load" });
await page.waitForTimeout(4000);

const probe2 = await page.evaluate(async () => {
  const out = [];
  for (const path of ["/admin", "/admin/articles", "/admin/highlights"]) {
    try {
      const r = await fetch(`${path}?_rsc=probeXYZ`, { credentials: "include" });
      out.push(`${path} -> ${r.status} ${r.type} ${r.redirected} ${r.url}`);
    } catch (e) {
      out.push(`${path} -> THROW ${e.message}`);
    }
  }
  return out;
});
console.log("MANUAL FETCHES:", JSON.stringify(probe2, null, 1));

const probe = await page.evaluate(() => window.__probe);
console.log(`\nFAILED FETCHES: ${probe.length}`);
for (const p of probe.slice(0, 12)) console.log(JSON.stringify(p, null, 1));

await browser.close();
