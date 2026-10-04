import { chromium } from "playwright";
const B = "http://localhost:3100";
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
await p.goto(`${B}/admin/login`, { waitUntil: "domcontentloaded" });
await p.locator('input[type="email"]').fill(process.env.E2E_ADMIN_EMAIL);
await p.locator('input[type="password"]').fill(process.env.E2E_ADMIN_PASSWORD);
await p.locator('button[type="submit"]').click();
await p.waitForURL((u) => !u.pathname.endsWith("/admin/login"), { timeout: 30000 });
await p.goto(`${B}/admin/articles`, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1500);
const rows = await p.evaluate(() =>
  Array.from(document.querySelectorAll("li")).map((li) => li.innerText.replace(/\s+/g, " ").trim()).filter(Boolean)
);
console.log("ROWS", JSON.stringify(rows, null, 1));
await b.close();
