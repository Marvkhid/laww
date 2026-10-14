import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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

const { data, error } = await sb
  .from("articles")
  .select("id, slug, title, status, is_cover_story, created_at")
  .order("created_at", { ascending: true });

if (error) {
  console.log("ERROR", error.message);
  process.exit(1);
}
for (const r of data) {
  console.log(
    `${r.created_at?.slice(0, 19)}  ${String(r.status).padEnd(9)} cover=${r.is_cover_story}  /${r.slug}  ::  ${r.title}`
  );
}
console.log(`\n${data.length} rows`);
