import { chromium } from "playwright";

const B = process.env.PROBE_BASE ?? "http://localhost:3000";
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();

p.on("console", (m) => {
  const t = m.text();
  if (t.includes("[img-upload]")) console.log("CONSOLE", t);
});
p.on("pageerror", (e) => console.log("PAGEERROR", e.message));
p.on("request", async (r) => {
  if (r.method() !== "POST") return;
  try {
    const data = r.postData() ?? "";
    if (data.includes("existing_image_1_url")) {
      const idx = data.indexOf("existing_image_1_url");
      console.log("POST", r.url(), "…", JSON.stringify(data.slice(idx, idx + 120)));
    }
  } catch {}
});

await p.goto(`${B}/admin/login`, { waitUntil: "domcontentloaded" });
await p.locator('input[type="email"]').fill(process.env.E2E_ADMIN_EMAIL);
await p.locator('input[type="password"]').fill(process.env.E2E_ADMIN_PASSWORD);
await p.locator('button[type="submit"]').click();
await p.waitForURL((u) => !u.pathname.endsWith("/admin/login"), { timeout: 30000 });
await p.goto(`${B}/admin/articles/new`, { waitUntil: "domcontentloaded" });
await p.locator('input[name="title"]').first().fill(`[E2E] probe4 ${Date.now()}`);
await p.locator(".ProseMirror").first().click();
await p.keyboard.type("body");
await p.waitForTimeout(2500);

await p.locator('input[name="image_1_file"]').setInputFiles({
  name: "p.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
    "base64"
  ),
});

await p.waitForTimeout(6000);

const info = await p.evaluate(() => {
  const nodes = Array.from(document.querySelectorAll('input[name="existing_image_1_url"]'));
  return {
    count: nodes.length,
    values: nodes.map((n) => n.value),
    onForm: nodes.map((n) => Boolean(n.closest("form"))),
    slot: nodes.map((n) => n.closest("[data-image-slot]")?.getAttribute("data-image-slot")),
  };
});
console.log("FINAL", JSON.stringify(info));
await b.close();
