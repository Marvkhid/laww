import { chromium } from "playwright";
const B = "http://localhost:3100";
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
await p.goto(`${B}/admin/login`, { waitUntil: "domcontentloaded" });
await p.locator('input[type="email"]').fill(process.env.E2E_ADMIN_EMAIL);
await p.locator('input[type="password"]').fill(process.env.E2E_ADMIN_PASSWORD);
await p.locator('button[type="submit"]').click();
await p.waitForURL((u) => !u.pathname.endsWith("/admin/login"), { timeout: 30000 });
await p.goto(`${B}/admin/articles/new`, { waitUntil: "domcontentloaded" });
await p.locator('input[name="title"]').first().fill(`[E2E] probe3 ${Date.now()}`);
await p.locator(".ProseMirror").first().click();
await p.keyboard.type("body");
await p.waitForTimeout(2500);

// Reset the form's value so any leftover state is visible.
await p.evaluate(() => {
  const el = document.querySelector('input[name="existing_image_1_url"]');
  el.value = "";
});

await p.locator('input[name="image_1_file"]').setInputFiles({
  name: "p.png", mimeType: "image/png",
  buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==", "base64"),
});

// Poll the hidden input every 300ms for 9s to see the timeline.
for (let i = 0; i < 30; i++) {
  const state = await p.evaluate(() => {
    const el = document.querySelector('input[name="existing_image_1_url"]');
    const body = document.body.innerText;
    return {
      v: el ? el.value.slice(-24) : "NO-INPUT",
      up: body.includes("Uploading"),
      done: body.includes("Uploaded — saving"),
      alert: (document.querySelector('[role="alert"]')?.textContent ?? "").trim().slice(0, 60),
    };
  });
  if (i % 2 === 0 || state.v !== "") console.log(`${i * 300}ms v=${JSON.stringify(state.v)} uploading=${state.up} uploadedText=${state.done} alert=${JSON.stringify(state.alert)}`);
  if (state.v !== "") break;
  await p.waitForTimeout(300);
}
await b.close();
