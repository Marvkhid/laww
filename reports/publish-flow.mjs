import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const B = "http://localhost:3100";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);
const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);
await sb.auth.signInWithPassword({
  email: process.env.E2E_ADMIN_EMAIL,
  password: process.env.E2E_ADMIN_PASSWORD,
});

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64"
);

const ts = Date.now();
const title = `[E2E] publish flow ${ts}`;
const marker = `E2EPUB${ts}`;

const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
p.on("pageerror", (e) => console.log("PAGEERROR", e.message.slice(0, 160)));
p.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE-ERR", m.text().slice(0, 160));
});
const posts = [];
p.on("request", (r) => {
  if (r.method() === "POST") posts.push(r.url());
});

await p.goto(`${B}/admin/login`, { waitUntil: "domcontentloaded" });
await p.locator('input[type="email"]').fill(process.env.E2E_ADMIN_EMAIL);
await p.locator('input[type="password"]').fill(process.env.E2E_ADMIN_PASSWORD);
await p.locator('button[type="submit"]').click();
await p.waitForURL((u) => !u.pathname.endsWith("/admin/login"), { timeout: 30000 });
// Visit the list first so the session GC clears any stale recovery snapshot.
await p.goto(`${B}/admin/articles`, { waitUntil: "domcontentloaded" });

await p.goto(`${B}/admin/articles/new`, { waitUntil: "domcontentloaded" });
await p.locator('input[name="title"]').first().fill(title);
const box = p.locator(".ProseMirror").first();
await box.click();
await p.keyboard.type(`${marker} first paragraph with some length to it.`);
await p.keyboard.press("Enter");
await p.keyboard.type(`${marker} second paragraph.`);
await p.waitForTimeout(1200);

// Publish button (new article: label is "Publish").
const publish = p.getByRole("button", { name: /^Publish$/ });

// Upload cover + images 1..4 BEFORE publishing, like a real user.
await p.locator('input[name="cover_image_file"]').setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: PNG });
await p.waitForTimeout(1500);
for (let i = 1; i <= 4; i++) {
  await p.locator(`input[name="image_${i}_file"]`).setInputFiles({ name: `i${i}.png`, mimeType: "image/png", buffer: PNG });
  await p.waitForTimeout(400);
}
// Give autosave a moment to settle.
await p.waitForTimeout(3000);

console.log("HIDDEN cover=", JSON.stringify((await p.locator('input[name="existing_cover_image_url"]').inputValue()).slice(-20)));
for (let i = 1; i <= 4; i++) {
  console.log(`HIDDEN image_${i}=`, JSON.stringify((await p.locator(`input[name="existing_image_${i}_url"]`).inputValue()).slice(-16)));
}

// Click Publish three times in quick succession (idempotency check).
await publish.click();
await p.waitForTimeout(150);
await publish.click({ force: true }).catch(() => {});
await publish.click({ force: true }).catch(() => {});

await p.waitForURL(/\/admin\/articles(\/)?$/, { timeout: 40000 }).catch(() => console.log("NO REDIRECT, url=", p.url()));
await p.waitForTimeout(2000);

const { data: rows } = await sb.from("articles").select("id,title,slug,status,body,image_1_url,image_2_url,image_3_url,image_4_url,image_1_position,image_2_position,image_3_position,image_4_position,cover_image_url,show_on_pages").eq("title", title);
console.log("DB ROWS", rows?.length);
for (const r of rows ?? []) {
  const bodyText = JSON.stringify(r.body ?? null);
  console.log(
    JSON.stringify({
      id: r.id.slice(0, 8),
      slug: r.slug,
      status: r.status,
      bodyHasMarker: bodyText.includes(marker),
      bodyLen: bodyText.length,
      img: [r.image_1_url, r.image_2_url, r.image_3_url, r.image_4_url].map((u) => (u ? "Y" : "-")),
      cover: r.cover_image_url ? "Y" : "-",
      pos: [r.image_1_position, r.image_2_position, r.image_3_position, r.image_4_position],
      show_on_pages: r.show_on_pages,
    })
  );
}

// Public page.
if (rows?.[0]) {
  const pub = await p.goto(`${B}/articles/${rows[0].slug}`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(800);
  const info = await p.evaluate((m) => ({
    status: document.title,
    hasMarker: document.body.innerText.includes(m),
    imgs: Array.from(document.querySelectorAll("img")).map((i) => i.alt || i.src.slice(-24)),
    text: document.body.innerText.replace(/\s+/g, " ").slice(0, 300),
  }), marker);
  console.log("PUBLIC", JSON.stringify(info));
  console.log("PUBLIC HTTP", pub?.status());
}

console.log("POSTS", posts.length, posts.slice(-4).map((u) => u.replace(B, "")).join(" , "));

// cleanup
if (rows?.length) {
  for (const r of rows) await sb.from("articles").delete().eq("id", r.id);
  console.log("cleaned", rows.length);
}
await b.close();
