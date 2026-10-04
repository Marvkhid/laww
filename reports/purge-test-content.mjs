import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

/** Delete leftover `[E2E]` test rows from every admin content table. */
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
const { error: ae } = await sb.auth.signInWithPassword({
  email: process.env.E2E_ADMIN_EMAIL,
  password: process.env.E2E_ADMIN_PASSWORD,
});
if (ae) {
  console.log("AUTH ERROR", ae.message);
  process.exit(0);
}

const TEXT_COLUMNS = {
  articles: "title",
  events: "title",
  legal_updates: "headline",
  legal_insights: "title",
  contributors: "name",
  practice_areas: "name",
  sponsors: "name",
  lawyer_in_the_news: "headline",
  call_for_papers: "contact_email",
};

for (const [table, column] of Object.entries(TEXT_COLUMNS)) {
  const { data, error } = await sb.from(table).select("id," + column).like(column, "[E2E]%");
  if (error) {
    console.log(`${table}: ${error.message}`);
    continue;
  }
  if (!data?.length) {
    console.log(`${table}: clean`);
    continue;
  }
  for (const row of data) {
    const { error: de } = await sb.from(table).delete().eq("id", row.id);
    console.log(`${table}: deleted ${row[column]} ${de?.message ?? ""}`);
  }
}
