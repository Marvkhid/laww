import { chromium } from "playwright";
const B = "http://localhost:3100";
const b = await chromium.launch();
const ctx = await b.newContext();
const p = await ctx.newPage();

const posts = [];
p.on("request", (r) => {
  if (r.method() === "POST") {
    const d = r.postData() ?? "";
    if (d.includes("existing_image") || d.includes("image_1")) {
      posts.push(d.replace(/\s+/g, " ").slice(0, 400));
    }
  }
});

await p.goto(`${B}/admin/login`, { waitUntil: "domcontentloaded" });
await p.locator('input[type="email"]').fill(process.env.E2E_ADMIN_EMAIL);
await p.locator('input[type="password"]').fill(process.env.E2E_ADMIN_PASSWORD);
await p.locator('button[type="submit"]').click();
await p.waitForURL((u) => !u.pathname.endsWith("/admin/login"), { timeout: 30000 });

const title = `[E2E] img probe ${Date.now()}`;
await p.goto(`${B}/admin/articles/new`, { waitUntil: "domcontentloaded" });
await p.locator('input[name="title"]').first().fill(title);
await p.locator(".ProseMirror").first().click();
await p.keyboard.type("probe body");
await p.waitForTimeout(3000);

const hiddenSel = 'input[name="existing_image_1_url"]';
console.log("hidden input count:", await p.locator(hiddenSel).count());
console.log("hidden value BEFORE upload:", JSON.stringify(await p.locator(hiddenSel).inputValue()));

await p.locator('input[name="image_1_file"]').setInputFiles({
  name: "p.png", mimeType: "image/png",
  buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==", "base64"),
});
await p.waitForTimeout(6000);
console.log("preview visible:", await p.locator('img[alt="Image 1"]').count());
console.log("hidden value AFTER upload:", JSON.stringify(await p.locator(hiddenSel).inputValue()));
console.log("autosave status text:", (await p.locator('[role="status"]').allInnerTexts()).join(" | ").slice(0, 200));
console.log("--- POST bodies of interest ---");
posts.forEach((d, i) => console.log(`[${i}]`, d.slice(0, 350)));
await b.close();
