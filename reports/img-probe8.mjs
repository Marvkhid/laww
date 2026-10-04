import { chromium } from "playwright";

const B = process.env.PROBE_BASE ?? "http://localhost:3100";
const FIELD = "existing_image_1_url";
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
p.on("console", (m) => {
  const t = m.text();
  if (t.includes("[img-upload]")) console.log("C", t.slice(0, 140));
});
p.on("pageerror", (e) => console.log("PAGEERROR", e.message.slice(0, 200)));

const login = async () => {
  await p.goto(`${B}/admin/login`, { waitUntil: "domcontentloaded" });
  await p.locator('input[type="email"]').fill(process.env.E2E_ADMIN_EMAIL);
  await p.locator('input[type="password"]').fill(process.env.E2E_ADMIN_PASSWORD);
  await p.locator('button[type="submit"]').click();
  await p.waitForURL((u) => !u.pathname.endsWith("/admin/login"), { timeout: 30000 });
};
await login();

const title = `[E2E] probe8 ${Date.now()}`;
await p.goto(`${B}/admin/articles/new`, { waitUntil: "domcontentloaded" });
await p.locator('input[name="title"]').first().fill(title);
await p.locator(".ProseMirror").first().click();
await p.keyboard.type("probe8 body");
await p.waitForTimeout(2500);

await p.goto(`${B}/admin/articles`, { waitUntil: "domcontentloaded" });
const row = p.locator("li").filter({ hasText: title });
await row.getByRole("link", { name: "Edit" }).click();
await p.waitForURL(/\/admin\/articles\/.+\/edit/, { timeout: 30000 });
const editUrl = p.url();
console.log("EDIT", editUrl);

await p.locator('input[name="image_1_file"]').setInputFiles({
  name: "p.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
    "base64"
  ),
});
await p.waitForTimeout(4000);
console.log(
  "BEFORE-REOPEN hidden=",
  JSON.stringify(await p.locator(`input[name="${FIELD}"]`).inputValue())
);

await p.goto(editUrl, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1500);
const st = await p.evaluate((f) => {
  const el = document.querySelector(`input[name="${f}"]`);
  return {
    url: location.href,
    hidden: el?.value,
    def: el?.defaultValue,
    inputCount: document.querySelectorAll("input").length,
    prose: !!document.querySelector(".ProseMirror"),
    imgs: Array.from(document.querySelectorAll('img[alt^="Image "]')).map((i) => i.getAttribute("alt")),
    text: document.body.innerText.replace(/\s+/g, " ").slice(0, 260),
  };
}, FIELD);
console.log("AFTER-REOPEN", JSON.stringify(st, null, 0));

// cleanup
await p.goto(`${B}/admin/articles`, { waitUntil: "domcontentloaded" });
const row2 = p.locator("li").filter({ hasText: title });
if (await row2.count()) {
  p.once("dialog", (d) => d.accept());
  await row2.getByRole("button", { name: /^Delete$/ }).click();
  await p.waitForTimeout(1500);
}
console.log("cleaned");
await b.close();
