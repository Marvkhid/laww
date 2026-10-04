import { chromium } from "playwright";

const B = process.env.PROBE_BASE ?? "http://localhost:3100";
const FIELD = "existing_image_1_url";
const t0 = Date.now();
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();

p.on("console", (m) => {
  const t = m.text();
  if (t.includes("[img-upload]") || t.includes("[SET]") || t.includes("[RESET]"))
    console.log("+%dms", Date.now() - t0, t.slice(0, 300));
});
p.on("request", (r) => {
  if (r.method() !== "POST") return;
  const data = r.postData() ?? "";
  const i = data.indexOf(FIELD);
  if (i < 0) return;
  console.log("+%dms POST", Date.now() - t0, JSON.stringify(data.slice(i, i + 60)));
});

await p.goto(`${B}/admin/login`, { waitUntil: "domcontentloaded" });
await p.locator('input[type="email"]').fill(process.env.E2E_ADMIN_EMAIL);
await p.locator('input[type="password"]').fill(process.env.E2E_ADMIN_PASSWORD);
await p.locator('button[type="submit"]').click();
await p.waitForURL((u) => !u.pathname.endsWith("/admin/login"), { timeout: 30000 });
await p.goto(`${B}/admin/articles/new`, { waitUntil: "domcontentloaded" });
await p.locator('input[name="title"]').first().fill(`[E2E] probe6 ${Date.now()}`);
await p.locator(".ProseMirror").first().click();
await p.keyboard.type("body");
await p.waitForTimeout(2500);

await p.evaluate((field) => {
  const el = document.querySelector(`input[name="${field}"]`);
  const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  Object.defineProperty(el, "value", {
    configurable: true,
    get() {
      return proto.get.call(this);
    },
    set(v) {
      console.log("[SET]", JSON.stringify(v), new Error().stack?.split("\n").slice(2, 5).join(" | "));
      proto.set.call(this, v);
    },
  });
  const form = el.closest("form");
  form.addEventListener("reset", () => console.log("[RESET] own form"), true);
  document.addEventListener(
    "reset",
    (e) => console.log("[RESET] document, form=", e.target === form ? "article-form" : "other"),
    true
  );
}, FIELD);

await p.locator('input[name="image_1_file"]').setInputFiles({
  name: "p.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
    "base64"
  ),
});

for (let i = 0; i < 25; i++) {
  const v = await p.evaluate((f) => document.querySelector(`input[name="${f}"]`).value, FIELD);
  console.log("+%dms value=%s", Date.now() - t0, JSON.stringify(v.slice(-12)));
  await p.waitForTimeout(250);
}
await b.close();
