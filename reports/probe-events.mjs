import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const anon = createClient(url, key);
const auth = createClient(url, key);
await auth.auth.signInWithPassword({
  email: process.env.E2E_ADMIN_EMAIL,
  password: process.env.E2E_ADMIN_PASSWORD,
});

for (const [label, sb] of [
  ["anon", anon],
  ["authenticated", auth],
]) {
  const { data, error, count } = await sb
    .from("events")
    .select("id,title,slug,published,cover_image_url,show_on_pages", {
      count: "exact",
    });
  console.log(`\n${label}: count=${count} error=${error?.message ?? null}`);
  for (const r of data ?? []) {
    console.log(
      `  ${r.title} | published=${r.published} | pages=${JSON.stringify(r.show_on_pages)} | ${(r.cover_image_url ?? "").slice(-46)}`
    );
  }
}
