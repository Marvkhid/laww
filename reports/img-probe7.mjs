import { chromium } from "playwright";

const B = process.env.PROBE_BASE ?? "http://localhost:3100";
const FIELD = "existing_image_1_url";
const t0 = Date.now();
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();

p.on("console", (m) => {
  const t = m.text();
  if (/\[img-upload\]|\[SET\]|\[FORM\.RESET\]|\[DEFVAL\]|\[ATTR\]/.test(t))
    console.log("+%dms", Date.now() - t0, t.slice(0, 400));
});

await p.goto(`${B}/admin/login`, { waitUntil: "domcontentloaded" });
await p.locator('input[type="email"]').fill(process.env.E2E_ADMIN_EMAIL);
await p.locator('input[type="password"]').fill(process.env.E2E_ADMIN_PASSWORD);
await p.locator('button[type="submit"]').click();
await p.waitForURL((u) => !u.pathname.endsWith("/admin/login"), { timeout: 30000 });
await p.goto(`${B}/admin/articles/new`, { waitUntil: "domcontentloaded" });
await p.locator('input[name="title"]').first().fill(`[E2E] probe7 ${Date.now()}`);
await p.locator(".ProseMirror").first().click();
await p.keyboard.type("body");
await p.waitForTimeout(2500);

await p.evaluate((field) => {
  const stack = () => new Error().stack?.split("\n").slice(2, 6).join(" | ");
  const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  const dproto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "defaultValue");

  const FR = HTMLFormElement.prototype.reset;
  HTMLFormElement.prototype.reset = function () {
    console.log("[FORM.RESET]", stack());
    return FR.apply(this, arguments);
  };
  const SA = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (n, v) {
    if (this instanceof HTMLInputElement && n === "value") console.log("[ATTR]", JSON.stringify(v), stack());
    return SA.apply(this, arguments);
  };

  const el = document.querySelector(`input[name="${field}"]`);
  Object.defineProperty(el, "value", {
    configurable: true,
    get() {
      return proto.get.call(this);
    },
    set(v) {
      console.log("[SET]", JSON.stringify(v), stack());
      proto.set.call(this, v);
    },
  });
  Object.defineProperty(el, "defaultValue", {
    configurable: true,
    get() {
      return dproto.get.call(this);
    },
    set(v) {
      console.log("[DEFVAL]", JSON.stringify(v), stack());
      dproto.set.call(this, v);
    },
  });
  window.__el = el;
  document.addEventListener("reset", () => console.log("[RESET-CTOR]"), true);
}, FIELD);

await p.locator('input[name="image_1_file"]').setInputFiles({
  name: "p.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
    "base64"
  ),
});

await p.waitForTimeout(3500);
const info = await p.evaluate((f) => {
  const el = window.__el;
  return {
    value: el.value,
    defaultValue: el.defaultValue,
    attr: el.getAttribute("value"),
    getterTrap: !!Object.getOwnPropertyDescriptor(el, "value"),
  };
}, FIELD);
console.log("FINAL", JSON.stringify(info));
await b.close();
