import { chromium } from "playwright";

const B = process.env.PROBE_BASE ?? "http://localhost:3100";
const FIELD = "existing_image_1_url";
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();

p.on("console", (m) => {
  const t = m.text();
  if (t.includes("[img-upload]") || t.includes("[SET]") || t.includes("[RESET]"))
    console.log("CONSOLE", t.slice(0, 1200));
});
p.on("pageerror", (e) => console.log("PAGEERROR", e.message));
p.on("request", (r) => {
  if (r.method() !== "POST") return;
  const data = r.postData() ?? "";
  const i = data.indexOf(FIELD);
  if (i < 0) return;
  console.log("POST", JSON.stringify(data.slice(i, i + 70)));
});

await p.goto(`${B}/admin/login`, { waitUntil: "domcontentloaded" });
await p.locator('input[type="email"]').fill(process.env.E2E_ADMIN_EMAIL);
await p.locator('input[type="password"]').fill(process.env.E2E_ADMIN_PASSWORD);
await p.locator('button[type="submit"]').click();
await p.waitForURL((u) => !u.pathname.endsWith("/admin/login"), { timeout: 30000 });
await p.goto(`${B}/admin/articles/new`, { waitUntil: "domcontentloaded" });
await p.locator('input[name="title"]').first().fill(`[E2E] probe5 ${Date.now()}`);
await p.locator(".ProseMirror").first().click();
await p.keyboard.type("body");
await p.waitForTimeout(2500);

// Trap every assignment to the hidden field's .value, with a stack trace.
await p.evaluate((field) => {
  const el = document.querySelector(`input[name="${field}"]`);
  const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  Object.defineProperty(el, "value", {
    configurable: true,
    get() {
      return proto.get.call(this);
    },
    set(v) {
      console.log("[SET]", JSON.stringify(v), new Error().stack?.split("\n").slice(1, 6).join(" | "));
      proto.set.call(this, v);
    },
  });
  document.querySelector("form").addEventListener("reset", () => console.log("[RESET] form"), true);
  window.__trapped = el;
}, FIELD);

await p.locator('input[name="image_1_file"]').setInputFiles({
  name: "p.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
    "base64"
  ),
});

await p.waitForTimeout(6000);
const info = await p.evaluate((field) => {
  const nodes = Array.from(document.querySelectorAll(`input[name="${field}"]`));
  return {
    count: nodes.length,
    values: nodes.map((n) => n.value),
    sameNode: nodes.map((n) => n === window.__trapped),
  };
}, FIELD);
console.log("FINAL", JSON.stringify(info));
await b.close();
