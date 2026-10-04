import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

/**
 * Audit every admin content table for leftover test/E2E data.
 *
 * The articles list was found polluted with `[E2E] probe*` drafts; this checks
 * whether the other content types were polluted too (a 1x1 test image was
 * referenced by a live events row, which is how a broken image reached the
 * public /events page).
 */
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

const TABLES = [
  ["articles", "title,slug,status,cover_image_url"],
  ["events", "title,slug,published,cover_image_url,event_date"],
  ["legal_updates", "headline,slug,status,cover_image_url"],
  ["legal_insights", "title,published"],
  ["issues", "issue_number,year,season,cover_image_url"],
  ["issues_archive", "issue_number,year,season"],
  ["call_for_papers", "issue_number,issue_month,contact_email"],
  ["contributors", "name,slug"],
  ["homepage_highlights", "title,published"],
  ["lawyer_in_the_news", "name,headline"],
  ["practice_areas", "name,slug"],
  ["sponsors", "name,active"],
];

for (const [table, cols] of TABLES) {
  const { data, error, count } = await sb
    .from(table)
    .select(cols, { count: "exact" });
  if (error) {
    console.log(`${table}: ERROR ${error.message}`);
    continue;
  }
  const rows = data ?? [];
  console.log(`\n=== ${table} (${count ?? rows.length} rows)`);
  for (const r of rows) {
    const img = Object.entries(r).find(([k, v]) =>
      /url$/.test(k) && typeof v === "string" && v.includes("supabase")
    );
    console.log(
      `  ${JSON.stringify(r)}` + (img ? `\n     image: ${img[1].slice(-60)}` : "")
    );
  }
}
