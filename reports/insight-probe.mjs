import { chromium } from "playwright";
const B = "http://localhost:3100";
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
p.on("pageerror", (e) => console.log("PAGEERROR", e.message.slice(0, 300)));
p.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text().slice(0, 300)); });
await p.goto(`${B}/admin/login`, { waitUntil: "domcontentloaded" });
await p.locator('input[type="email"]').fill(process.env.E2E_ADMIN_EMAIL);
await p.locator('input[type="password"]').fill(process.env.E2E_ADMIN_PASSWORD);
await p.locator('button[type="submit"]').click();
await p.waitForURL((u) => !u.pathname.endsWith("/admin/login"), { timeout: 30000 });
const resp = await p.goto(`${B}/admin/legal-insights/new`, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(2500);
const info = await p.evaluate(() => ({
  url: location.href,
  forms: document.querySelectorAll("form").length,
  buttons: Array.from(document.querySelectorAll("button")).map((b) => `${b.type}:${b.textContent?.trim().slice(0, 24)}`),
  inputs: Array.from(document.querySelectorAll("input,textarea")).map((i) => i.getAttribute("name")).filter(Boolean),
  text: document.body.innerText.replace(/\s+/g, " ").slice(0, 200),
}));
console.log("HTTP", resp?.status());
console.log(JSON.stringify(info, null, 1));
await b.close();
