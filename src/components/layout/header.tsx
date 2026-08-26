import Link from "next/link";
import { NAV_LINKS } from "@/lib/constants";
import { MobileNav } from "@/components/layout/mobile-nav";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getCurrentIssue } from "@/lib/supabase/queries/issues";

export async function Header() {
  const supabase = createSupabaseServerClient();
  const issueMeta = await getCurrentIssue(supabase);

  return (
    <header className="sticky top-0 z-50">
      {/* Dark charcoal top bar — ISSUE centered */}
      <div className="bg-ink px-6 py-2">
        <div className="relative mx-auto flex max-w-6xl items-center justify-center">
          {issueMeta ? (
            <span className="font-admin text-[10px] font-semibold uppercase tracking-widest text-paper">
              Issue {issueMeta.issueNumber}
            </span>
          ) : null}
          <span className="absolute right-0 hidden font-admin text-[10px] font-semibold uppercase tracking-widest text-stone sm:inline">
            {issueMeta ? `${issueMeta.season} ${issueMeta.year}` : "Legal Insights"}
          </span>
        </div>
      </div>

      {/* Cream navigation bar */}
      <div className="border-b border-hairline bg-paper-warm/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          {/* Logo — bold block caps */}
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="bg-digest-red px-2 py-0.5 font-admin text-xs font-bold text-paper">
              LAW
            </span>
            <span className="font-admin text-lg font-bold uppercase tracking-wider text-ink">
              DIGEST
            </span>
          </Link>

          {/* Centered navigation links */}
          <nav aria-label="Primary" className="mx-8 hidden flex-1 justify-center md:flex">
            <ul className="flex items-center gap-6 font-admin text-[14px] font-semibold uppercase text-ink">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition-colors duration-200 hover:text-digest-red"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <MobileNav />
        </div>
      </div>
    </header>
  );
}
