import { chromium } from "playwright";
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
const resp = [];
p.on("response", (r) => { if (r.url().includes("/admin") && r.status() >= 400) resp.push(`${r.status()} ${r.url()}`); });

await p.goto("http://localhost:3100/admin/login", { waitUntil: "domcontentloaded" });
await p.locator('input[type="email"]').fill(process.env.E2E_ADMIN_EMAIL);
await p.locator('input[type="password"]').fill(process.env.E2E_ADMIN_PASSWORD);
await p.locator('button[type="submit"]').click();
await p.waitForTimeout(6000);
console.log("URL after login:", p.url());

await p.goto("http://localhost:3100/admin/articles", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(4000);
console.log("URL after /admin/articles:", p.url());
console.log("has <main> count:", await p.locator("main").count());
console.log("article edit links:", await p.locator('a[href*="/admin/articles/"]').count());
console.log("all anchors:", (await p.locator("a").evaluateAll((els) => els.map((e) => e.getAttribute("href")))).filter(Boolean).slice(0, 20));
console.log("body text (first 300):", (await p.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 300));
if (resp.length) console.log("admin HTTP errors:", resp);
await b.close();
