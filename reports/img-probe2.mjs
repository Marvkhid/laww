import { chromium } from "playwright";
const B = "http://localhost:3100";
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
const reqs = [];
p.on("request", (r) => { if (r.method() === "POST") reqs.push([r.url(), (r.postData() ?? "").slice(0, 200)]); });
const errs = [];
p.on("response", async (r) => {
  if (r.request().method() === "POST" && r.status() >= 400) errs.push(`${r.status()} ${(await r.text().catch(() => "")).slice(0, 300)}`);
});
p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 200)); });

await p.goto(`${B}/admin/login`, { waitUntil: "domcontentloaded" });
await p.locator('input[type="email"]').fill(process.env.E2E_ADMIN_EMAIL);
await p.locator('input[type="password"]').fill(process.env.E2E_ADMIN_PASSWORD);
await p.locator('button[type="submit"]').click();
await p.waitForURL((u) => !u.pathname.endsWith("/admin/login"), { timeout: 30000 });

await p.goto(`${B}/admin/articles/new`, { waitUntil: "domcontentloaded" });
await p.locator('input[name="title"]').first().fill(`[E2E] probe2 ${Date.now()}`);
await p.locator(".ProseMirror").first().click();
await p.keyboard.type("body");
await p.waitForTimeout(2500);
reqs.length = 0; errs.length = 0;

await p.locator('input[name="image_1_file"]').setInputFiles({
  name: "p.png", mimeType: "image/png",
  buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==", "base64"),
});
await p.waitForTimeout(8000);
console.log("hidden existing_image_1_url =", JSON.stringify(await p.locator('input[name="existing_image_1_url"]').inputValue()));
console.log("file input value =", JSON.stringify(await p.locator('input[name="image_1_file"]').inputValue()));
console.log("preview count =", await p.locator('img[alt="Image 1"]').count());
console.log("alerts =", JSON.stringify(await p.locator('[role="alert"]').allInnerTexts()));
console.log("uploading text present =", (await p.locator("body").innerText()).includes("Uploading"));
console.log("--- POSTs after upload ---");
reqs.forEach(([u, d]) => console.log(u.replace(B, ""), "|", d.slice(0, 160)));
console.log("--- errors ---"); errs.forEach((e) => console.log(e));
await b.close();
