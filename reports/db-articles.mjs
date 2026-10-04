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

const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);
const { data: auth, error: ae } = await sb.auth.signInWithPassword({
  email: process.env.E2E_ADMIN_EMAIL,
  password: process.env.E2E_ADMIN_PASSWORD,
});
if (ae) {
  console.log("AUTH ERROR", ae.message);
  process.exit(0);
}
console.log("SIGNED IN", auth.user?.email, "token?", Boolean(auth.session?.access_token));

const { data, error, count } = await sb
  .from("articles")
  .select("id,title,slug,status", { count: "exact" });
console.log("ERROR", error?.message ?? null, "COUNT", count);
console.log(
  JSON.stringify((data ?? []).map((r) => `${r.status} | ${r.title} | /${r.slug}`), null, 1)
);

if (process.env.PURGE_E2E === "1") {
  const doomed = (data ?? []).filter((r) => r.title.startsWith("[E2E]"));
  console.log("DELETING", doomed.length);
  for (const r of doomed) {
    const { error: de } = await sb.from("articles").delete().eq("id", r.id);
    console.log("  del", r.title, de?.message ?? "ok");
  }
}
