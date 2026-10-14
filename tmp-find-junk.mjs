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

const tables = [
  "articles",
  "contributors",
  "practice_areas",
  "legal_updates",
  "lawyer_news",
  "events",
  "issues",
];

for (const table of tables) {
  const { data, error } = await sb.from(table).select("*").limit(500);
  if (error) {
    console.log(`${table}: ERROR ${error.message}`);
    continue;
  }
  const hits = data.filter((row) =>
    JSON.stringify(row).includes("aaaaaaaa")
  );
  console.log(`${table}: ${data.length} rows, ${hits.length} with junk`);
  for (const h of hits) {
    const brief = Object.fromEntries(
      Object.entries(h).filter(
        ([k, v]) =>
          typeof v === "string" &&
          (v.includes("aaaaaaaa") || ["id", "slug", "title", "name", "status", "published"].includes(k))
      )
    );
    console.log("   ", JSON.stringify(brief).slice(0, 400));
  }
}
